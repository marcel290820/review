import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, chmodSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const project = fileURLToPath(new URL('../..', import.meta.url));
const sourceBinary = resolve(process.env.REVIEW_BIN || join(project, 'target/debug/review'));
const root = mkdtempSync(join(tmpdir(), 'review-browser-'));
const binary = join(root, 'review');
copyFileSync(sourceBinary, binary); chmodSync(binary, 0o700);
const runtimePath = join(root, 'runtime-bin'); mkdirSync(runtimePath);
const gitBinary = process.env.PATH.split(delimiter).map(directory => join(directory, 'git')).find(existsSync);
assert.ok(gitBinary, 'Git is required for the local diff fixtures');
symlinkSync(gitBinary, join(runtimePath, 'git'));
const servers = [];
let browser;
async function server(args, cwd = root) {
  // Only Git is on the application's PATH: Node and a frontend installation are absent.
  const child = spawn(binary, ['--browser', ...args], { cwd, env: { ...process.env, PATH: runtimePath }, stdio: ['ignore', 'pipe', 'pipe'] });
  servers.push(child);
  let output = '', errors = '';
  child.stdout.on('data', data => output += data);
  child.stderr.on('data', data => errors += data);
  const deadline = Date.now() + 10000;
  while (!output.match(/Review: (http:\/\/[^\s]+)/) && Date.now() < deadline && child.exitCode === null) await new Promise(r => setTimeout(r, 30));
  const url = output.match(/Review: (http:\/\/[^\s]+)/)?.[1];
  assert.ok(url, `Server failed: ${errors}`);
  const parsed = new URL(url); const token = new URLSearchParams(parsed.hash.slice(1)).get('token');
  const base = parsed.origin;
  return { child, url, base, token, state: async () => (await fetch(`${base}/api/state`, { headers: { Authorization: `Bearer ${token}` } })).json(), stop: () => child.kill('SIGINT') };
}
async function open(s) {
  const context = await browser.newContext({ viewport: { width: 1360, height: 960 } });
  const external = [];
  await context.route('**/*', route => { if (!route.request().url().startsWith(s.base + '/')) { external.push(route.request().url()); return route.abort(); } return route.continue(); });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(String(error)));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(s.url);
  await expect(page.getByRole('button', { name: 'Save feedback', exact: true })).toBeVisible();
  await expect(page.getByLabel('File', { exact: true })).toBeVisible();
  return { context, page, external, errors };
}
async function save(page, s) {
  await page.getByRole('button', { name: 'Save feedback', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved ');
  const state = await s.state();
  assert.equal(state.dirty, false);
  return { path: state.last_saved, feedback: JSON.parse(readFileSync(state.last_saved, 'utf8')) };
}
async function comment(page, text) {
  await page.getByLabel('Comment', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Comment recorded');
}

try {
  browser = await chromium.launch({ headless: true });
  writeFileSync(join(root, 'plan.md'), '# Plan\n\nCafé 🦀 is old.\nNext step.\n\n<script>window.reviewExecuted=true</script>\n![alt](https://example.invalid/image)\n');
  writeFileSync(join(root, 'other.txt'), 'Other file\nSecond line\n');
  writeFileSync(join(root, 'feedback.json'), 'unrelated content');
  const s = await server(['plan.md', 'other.txt', '--output', 'feedback.json']);
  const { page, context, external, errors } = await open(s);

  assert.equal((await fetch(`${s.base}/api/state`)).status, 401);
  assert.equal((await fetch(`${s.base}/api/state`, { headers: { Authorization: `Bearer ${s.token}`, Origin: 'https://unrelated.invalid' } })).status, 403);
  assert.equal((await fetch(`${s.base}/VISION.md`)).status, 404);

  // A real mouse drag uses browser UTF-16 carets; saved targets use UTF-8 bytes.
  const box = await page.locator('#line-3 [data-start]').evaluate(span => {
    const range = document.createRange(); range.setStart(span.firstChild, 0); range.setEnd(span.firstChild, 7);
    const r = range.getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, right: r.right };
  });
  await page.mouse.move(box.x + 0.2, box.y); await page.mouse.down();
  await page.mouse.move(box.right - 0.2, box.y, { steps: 15 }); await page.mouse.up();
  await expect(page.getByLabel('Selected quote')).toHaveText('Café 🦀');
  await comment(page, 'Explain the original wording\nKeep the accent and emoji.');
  let state = await s.state();
  assert.equal(state.feedback.comments[0].target.quote, 'Café 🦀');
  assert.equal(state.feedback.comments[0].target.start_byte, Buffer.byteLength('# Plan\n\n'));
  assert.equal(state.feedback.comments[0].target.end_byte - state.feedback.comments[0].target.start_byte, Buffer.byteLength('Café 🦀'));
  const originalTarget = state.feedback.comments[0].target;

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Edit comment').fill('Updated request from browser');
  await page.getByRole('button', { name: 'Update comment' }).click();
  await expect(page.getByRole('status')).toContainText('Comment recorded');
  await page.getByRole('button', { name: 'Select line 3', exact: true }).click();
  await page.getByRole('button', { name: 'Select line 4', exact: true }).click({ modifiers: ['Shift'] });
  await expect(page.getByLabel('Selected quote')).toHaveText('Café 🦀 is old.\nNext step.');
  await comment(page, 'Temporary range comment');
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await expect(page.locator('.comment')).toHaveCount(1);

  await page.getByLabel('File', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Select line 2', exact: true }).click();
  await comment(page, 'Second file request');
  let saved = await save(page, s);
  assert.equal(readFileSync(join(root, 'feedback.json'), 'utf8'), 'unrelated content');
  assert.equal(saved.feedback.files.length, 2); assert.equal(saved.feedback.comments.length, 2);
  const firstSavedBytes = readFileSync(saved.path, 'utf8');
  await save(page, s); assert.equal(readFileSync(saved.path, 'utf8'), firstSavedBytes);

  await page.getByLabel('File', { exact: true }).selectOption('0');
  await page.getByRole('button', { name: 'Markdown preview' }).click();
  await expect(page.locator('.markdown h1')).toHaveText('Plan');
  assert.equal(await page.evaluate(() => window.reviewExecuted), undefined);
  assert.equal(await page.locator('.markdown script, .markdown img, .markdown iframe, .markdown a').count(), 0);
  assert.deepEqual(external, []);
  await page.getByRole('button', { name: 'Source', exact: true }).click();

  // An edit captured before another tab's mutation must fail without losing its draft.
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await page.getByLabel('Edit comment').fill('Retry draft retained');
  state = await s.state(); const id = state.feedback.comments[0].id;
  const concurrent = await fetch(`${s.base}/api/comments/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${s.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ body: 'Other tab edit', expected_revision: state.revision }) });
  assert.equal(concurrent.status, 200);
  await page.getByRole('button', { name: 'Update comment' }).click();
  await expect(page.getByRole('status')).toContainText('Feedback changed in another tab');
  await expect(page.getByLabel('Edit comment')).toHaveValue('Retry draft retained');
  await page.getByRole('button', { name: 'Update comment' }).click();
  await expect(page.getByRole('status')).toContainText('Comment recorded');
  saved = await save(page, s);
  await context.close(); s.stop();

  writeFileSync(join(root, 'plan.md'), 'Inserted line\n# Plan\nRevised café content.\n');
  // Browser feedback is edited through actual TUI keys, then reopened in a browser.
  const bridge = JSON.parse(execFileSync('python3', [join(project, 'tests/tui_smoke.py'), '--bin', binary, '--bridge', saved.path, join(root, 'tui.json'), root], { encoding: 'utf8', timeout: 30000 }));
  const re = await server(['--reopen', bridge.saved, '--root', root, '--output', 'reopened.json']);
  const opened = await open(re); const p = opened.page;
  await expect(p.locator('.revision-status')).toContainText('changed');
  await expect(p.locator('.comment')).toHaveCount(3);
  await expect(p.locator('.comment').first()).toContainText('edited in TUI');
  await p.getByRole('button', { name: 'Inspect revisions' }).click();
  await expect(p.locator('.content')).toContainText('Inserted line');
  await expect(p.getByLabel('Comment', { exact: true })).toBeDisabled();
  await p.locator('.comment-target').first().click();
  await expect(p.getByLabel('Selected quote')).toHaveText('Café 🦀');
  await expect(p.locator('.content')).toContainText('Café 🦀 is old.');
  const transferred = await re.state(); assert.deepEqual(transferred.feedback.comments[0].target, originalTarget);
  assert.equal(transferred.feedback.comments.length, 3);
  await save(p, re);
  mkdirSync('/tmp/review-artifacts', { recursive: true });
  await p.screenshot({ path: '/tmp/review-artifacts/browser.png', fullPage: true });
  await p.setViewportSize({ width: 480, height: 900 });
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile layout overflows');
  assert.deepEqual(opened.errors, []); await opened.context.close(); re.stop();

  const failed = await server(['plan.md', '--output', 'missing/feedback.json']);
  const failureUI = await open(failed);
  await failureUI.page.getByRole('button', { name: 'Select line 1', exact: true }).click();
  await comment(failureUI.page, 'Retained across failed save and server stop');
  await failureUI.page.getByRole('button', { name: 'Save feedback', exact: true }).click();
  await expect(failureUI.page.getByRole('status')).toContainText('Save directory does not exist');
  failed.child.kill('SIGINT');
  await new Promise(r => setTimeout(r, 100));
  assert.equal((await failed.state()).feedback.comments[0].body, 'Retained across failed save and server stop');
  assert.equal(failed.child.exitCode, null, 'Server exited despite unsaved feedback');
  mkdirSync(join(root, 'missing'));
  await save(failureUI.page, failed);
  await failureUI.context.close(); failed.stop();

  const repo = join(root, 'git'); mkdirSync(repo);
  const git = args => execFileSync('git', ['-C', repo, ...args], { stdio: 'pipe' });
  git(['init', '-q']); git(['config', 'user.name', 'Local test']); git(['config', 'user.email', 'test@example.invalid']);
  writeFileSync(join(repo, 'note.txt'), 'context\nold 🦀\nlast'); git(['add', '.']); git(['commit', '-qm', 'fixture']);
  writeFileSync(join(repo, 'note.txt'), 'context\nnew 🦀\nlast');
  const dif = await server(['--diff', '--output', 'diff.json'], repo); const diffUI = await open(dif);
  await diffUI.page.getByRole('button', { name: 'Select old line 2', exact: true }).click();
  await comment(diffUI.page, 'Old side concern');
  await diffUI.page.getByRole('button', { name: 'Select new line 2', exact: true }).click();
  await comment(diffUI.page, 'New side concern');
  const diffSave = await save(diffUI.page, dif);
  assert.equal(diffSave.feedback.comments[0].target.side, 'old'); assert.equal(diffSave.feedback.comments[0].target.quote, 'old 🦀\n');
  assert.equal(diffSave.feedback.comments[1].target.side, 'new'); assert.equal(diffSave.feedback.comments[1].target.quote, 'new 🦀\n');
  assert.deepEqual(errors, []); assert.deepEqual(diffUI.errors, []); assert.deepEqual(diffUI.external, []);
  await diffUI.context.close(); dif.stop();
  console.log(JSON.stringify({ browser: 'passed', checks: ['actual mouse selection', 'Unicode byte targets', 'range selection', 'create/edit/delete', 'multi-file', 'save collisions', 'safe Markdown', 'session security', 'stale draft preservation', 'browser → TUI → browser', 'revision inspection', 'mobile layout', 'old/new Git targets', 'bundled offline assets', 'failed save retention', 'server quit guard'] }));
} finally {
  for (const server of servers) if (server.exitCode === null) server.kill('SIGTERM');
  await browser?.close();
  rmSync(root, { recursive: true, force: true });
}
