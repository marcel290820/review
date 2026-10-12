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
  return { child, url, base, token, output: () => output, state: async () => (await fetch(`${base}/api/state`, { headers: { Authorization: `Bearer ${token}` } })).json(), stop: () => child.kill('SIGINT') };
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
  await expect(page.getByRole('navigation', { name: 'Files' })).toBeVisible();
  return { context, page, external, errors };
}
async function save(page, s) {
  await page.getByRole('button', { name: 'Save feedback', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved ');
  const state = await s.state();
  assert.equal(state.dirty, false);
  return { path: state.last_saved, feedback: JSON.parse(readFileSync(state.last_saved, 'utf8')) };
}
/** Opens the composer on the chosen lines or passage, then records `text`. */
async function comment(page, text) {
  await page.keyboard.press('c');
  await page.getByLabel('Comment', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Comment recorded');
}
const tab = (page, name) => page.getByRole('navigation', { name: 'Files' }).getByRole('button', { name: new RegExp(`^${name}`) });

try {
  browser = await chromium.launch({ headless: true });
  writeFileSync(join(root, 'plan.md'), '# Plan\n\nCafé 🦀 is old.\nNext step.\n\n<script>window.reviewExecuted=true</script>\n![alt](https://example.invalid/image)\n');
  writeFileSync(join(root, 'other.txt'), 'Other file\nSecond line\n');
  writeFileSync(join(root, 'feedback.json'), 'unrelated content');
  const s = await server(['plan.md', 'other.txt', '--output', 'feedback.json']);
  const { page, context, external, errors } = await open(s);
  await expect(page).toHaveTitle('plan.md · review');

  assert.equal((await fetch(`${s.base}/api/state`)).status, 401);
  assert.equal((await fetch(`${s.base}/api/state`, { headers: { Authorization: `Bearer ${s.token}`, Origin: 'https://unrelated.invalid' } })).status, 403);
  assert.equal((await fetch(`${s.base}/VISION.md`)).status, 404);
  assert.equal((await fetch(`${s.base}/fonts/mono.woff2`)).headers.get('content-type'), 'font/woff2');
  assert.equal((await fetch(`${s.base}/fonts/other.woff2`)).status, 404);

  // A real mouse drag uses browser UTF-16 carets; saved targets use UTF-8 bytes.
  const box = await page.locator('#r2 [data-start]').evaluate(span => {
    const text = [...span.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.length > 0);
    const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 7);
    const r = range.getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, right: r.right };
  });
  await page.mouse.move(box.x + 0.2, box.y); await page.mouse.down();
  await page.mouse.move(box.right - 0.2, box.y, { steps: 15 }); await page.mouse.up();
  await page.keyboard.press('c');
  await expect(page.getByLabel('Selected quote')).toHaveText('Café 🦀');
  assert.equal(await page.locator('#r2').evaluate(row => getComputedStyle(row).backgroundColor), 'rgba(0, 0, 0, 0)', 'A passage marks its text, not its line');
  await page.getByLabel('Comment', { exact: true }).fill('Explain the original wording\nKeep the accent and emoji.');
  await page.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Comment recorded');
  let state = await s.state();
  assert.equal(state.comments[0].target.quote, 'Café 🦀');
  assert.equal(state.comments[0].target.start_byte, Buffer.byteLength('# Plan\n\n'));
  assert.equal(state.comments[0].target.end_byte - state.comments[0].target.start_byte, Buffer.byteLength('Café 🦀'));
  const originalTarget = state.comments[0].target;

  await page.getByRole('button', { name: 'Edit this comment', exact: true }).click();
  await page.getByLabel('Edit comment').fill('Updated request from browser');
  await page.getByRole('button', { name: 'Update comment' }).click();
  await expect(page.getByRole('status')).toContainText('Comment recorded');
  // Edits within one second, which share a timestamp, still show the latest text.
  for (const body of ['Same second A', 'Same second B']) {
    await page.getByRole('button', { name: 'Edit this comment', exact: true }).first().click();
    await page.getByLabel('Edit comment').fill(body);
    await page.getByRole('button', { name: 'Update comment' }).click();
    await expect(page.locator('.composer')).toHaveCount(0);
  }
  await expect(page.locator('.comment').first()).toContainText('Same second B');
  await expect(page).toHaveTitle('● plan.md · review');
  const gap = await page.locator('.comment').first().evaluate(c => c.querySelector('.comment-actions').getBoundingClientRect().left - c.querySelector('p').getBoundingClientRect().right);
  assert.ok(gap >= 0 && gap < 16, `Comment actions sit beside the text, ${gap}px away`);
  await page.getByRole('button', { name: 'Select line 3', exact: true }).click();
  await page.getByRole('button', { name: 'Select line 4', exact: true }).click({ modifiers: ['Shift'] });
  await expect(page.locator('.row.sel')).toHaveCount(2);
  await comment(page, 'Temporary range comment');
  state = await s.state();
  assert.equal(state.comments[1].target.quote, 'Café 🦀 is old.\nNext step.\n');
  await page.getByRole('button', { name: 'Delete this comment', exact: true }).last().click();
  await expect(page.locator('.comment')).toHaveCount(1);

  // Keys alone: move, select two lines, comment, and find it in the list.
  await page.keyboard.press('g'); await page.keyboard.press('j'); await page.keyboard.press('j');
  await page.keyboard.press('v'); await page.keyboard.press('j');
  await page.keyboard.press('c');
  await expect(page.locator('.composer-title')).toHaveText('plan.md:3-4');
  // Enter records and Shift+Enter starts a new line, as in chat.
  await page.keyboard.type('Keyboard'); await page.keyboard.press('Shift+Enter'); await page.keyboard.type('range');
  // An Enter that ends an IME composition, as Safari reports it, leaves the draft open.
  await page.getByLabel('Comment', { exact: true }).evaluate(area => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(event, 'keyCode', { get: () => 229 });
    area.dispatchEvent(event);
  });
  await page.waitForTimeout(300);
  await expect(page.locator('.composer')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Comment recorded');
  assert.ok((await s.state()).comments.some(c => c.body === 'Keyboard\nrange'), 'Shift+Enter starts a new line');
  await page.keyboard.press('a');
  await expect(page.locator('.listed')).toHaveCount(2);
  await page.keyboard.press('j'); await page.keyboard.press('d');
  await expect(page.locator('.listed')).toHaveCount(1);
  await page.keyboard.press('a');
  // Going to a comment drops a key selection in progress.
  await page.keyboard.press('g'); await page.keyboard.press('v'); await page.keyboard.press('j');
  await page.keyboard.press('a'); await page.keyboard.press('Enter');
  await page.keyboard.press('c');
  await expect(page.locator('.composer-title')).toHaveText('plan.md:3');
  await page.keyboard.press('Escape');

  await page.locator('main').evaluate(main => main.scrollTo(0, 200));
  await tab(page, 'other.txt').click();
  assert.equal(await page.locator('main').evaluate(main => main.scrollTop), 0, 'Another file starts at its top');
  await page.getByRole('button', { name: 'Select line 2', exact: true }).click();
  await comment(page, 'Second file request');
  let saved = await save(page, s);
  assert.equal(readFileSync(join(root, 'feedback.json'), 'utf8'), 'unrelated content');
  assert.equal(saved.feedback.files.length, 2); assert.equal(saved.feedback.comments.length, 2);
  // Saving again updates the session's own file; the unrelated file stays untouched.
  assert.equal((await save(page, s)).path, saved.path);
  assert.equal(readFileSync(join(root, 'feedback.json'), 'utf8'), 'unrelated content');

  await tab(page, 'plan.md').click();
  await page.getByRole('button', { name: 'preview', exact: true }).click();
  await expect(page.locator('.preview h1')).toHaveText('Plan');
  await page.setViewportSize({ width: 1360, height: 260 });
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.locator('main').evaluate(main => main.scrollTop)).toBeGreaterThan(0);
  await page.setViewportSize({ width: 1360, height: 960 });
  assert.equal(await page.evaluate(() => window.reviewExecuted), undefined);
  assert.equal(await page.locator('.preview script, .preview img, .preview iframe, .preview a').count(), 0);
  assert.deepEqual(external, []);
  await page.getByRole('button', { name: 'source', exact: true }).click();

  // Tabs share one session; the last recorded edit wins.
  await page.getByRole('button', { name: 'Edit this comment', exact: true }).first().click();
  await page.getByLabel('Edit comment').fill('Draft from this tab');
  state = await s.state(); const id = state.comments[0].id;
  const concurrent = await fetch(`${s.base}/api/comments/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${s.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ body: 'Other tab edit' }) });
  assert.equal(concurrent.status, 200);
  await page.getByRole('button', { name: 'Update comment' }).click();
  await expect(page.getByRole('status')).toContainText('Comment recorded');
  assert.equal((await s.state()).comments[0].body, 'Draft from this tab');
  saved = await save(page, s);
  await context.close(); s.stop();

  writeFileSync(join(root, 'plan.md'), 'Inserted line\n# Plan\nRevised café content.\n');
  // Browser feedback is edited through actual TUI keys, then reopened in a browser.
  const bridge = JSON.parse(execFileSync('python3', [join(project, 'tests/tui_smoke.py'), '--bin', binary, '--bridge', saved.path, join(root, 'tui.json'), root], { encoding: 'utf8', timeout: 30000 }));
  const re = await server(['--reopen', bridge.saved, '--root', root, '--output', 'reopened.json']);
  const opened = await open(re); const p = opened.page;
  await p.keyboard.press('a');
  await expect(p.locator('.listed')).toHaveCount(3);
  await expect(p.locator('.listed', { hasText: 'edited in TUI' })).toHaveCount(1);
  await p.keyboard.press('a');
  await p.getByRole('button', { name: 'changed on disk' }).click();
  await expect(p.locator('main')).toContainText('Inserted line');
  // Comments hang beside the changes on disk, beneath the lines they were written on.
  await expect(p.locator('main .comment', { hasText: 'edited in TUI' })).toHaveCount(1);
  await p.keyboard.press('c');
  await expect(p.locator('.composer')).toHaveCount(0);
  await p.getByRole('button', { name: 'back to review' }).click();
  await p.keyboard.press('a');
  await p.locator('.listed', { hasText: 'edited in TUI' }).click();
  await expect(p.locator('#r2.sel')).toContainText('Café 🦀 is old.');
  const transferred = await re.state(); assert.deepEqual(transferred.comments[0].target, originalTarget);
  assert.equal(transferred.comments.length, 3);
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
  assert.equal((await failed.state()).comments[0].body, 'Retained across failed save and server stop');
  assert.equal(failed.child.exitCode, null, 'Server exited despite unsaved feedback');
  mkdirSync(join(root, 'missing'));
  const lastSave = await save(failureUI.page, failed);
  await failureUI.page.getByRole('button', { name: 'Select line 2', exact: true }).click();
  await comment(failureUI.page, 'Discarded on stop');
  await failureUI.context.close();
  const exited = new Promise(resolve => failed.child.once('exit', resolve));
  failed.stop(); await new Promise(r => setTimeout(r, 200)); failed.stop();
  await exited;
  assert.match(failed.output(), new RegExp(`Feedback: ${lastSave.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), 'Stopping names the last saved feedback');

  const repo = join(root, 'git'); mkdirSync(repo);
  const git = args => execFileSync('git', ['-C', repo, ...args], { stdio: 'pipe' });
  git(['init', '-q']); git(['config', 'user.name', 'Local test']); git(['config', 'user.email', 'test@example.invalid']);
  const long = Array.from({ length: 30 }, (_, i) => `line ${i + 1}\n`).join('');
  writeFileSync(join(repo, 'note.txt'), 'context\nold 🦀\nlast'); writeFileSync(join(repo, 'shift.txt'), 'a\nkeep me\n');
  writeFileSync(join(repo, 'long.txt'), long);
  git(['add', '.']); git(['commit', '-qm', 'fixture']);
  writeFileSync(join(repo, 'note.txt'), 'context\nnew 🦀\nlast'); writeFileSync(join(repo, 'shift.txt'), 'inserted\na\nkeep me\n');
  writeFileSync(join(repo, 'long.txt'), long.replace('line 30', 'line thirty'));
  const dif = await server(['--diff', '--output', 'diff.json'], repo); const diffUI = await open(dif);
  await tab(diffUI.page, 'note.txt').click();
  const noNewline = diffUI.page.locator('.row.note').first();
  await expect(noNewline).toContainText('No newline at end of file');
  assert.equal(await noNewline.evaluate(row => getComputedStyle(row, '::before').content), 'none', 'A diff note row is not a comment');
  await diffUI.page.getByRole('button', { name: 'Select old line 2', exact: true }).click();
  await comment(diffUI.page, 'Old side concern');
  // While a comment is being recorded, its text cannot change and get lost, and other
  // changes wait for it.
  await diffUI.page.route('**/api/comments', async route => { await new Promise(r => setTimeout(r, 800)); await route.continue(); });
  await diffUI.page.getByRole('button', { name: 'Select new line 2', exact: true }).click();
  await diffUI.page.keyboard.press('c');
  await diffUI.page.getByLabel('Comment', { exact: true }).fill('New side concern');
  await diffUI.page.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(diffUI.page.getByLabel('Comment', { exact: true })).toHaveAttribute('readonly', '');
  await diffUI.page.locator('header .brand').click();
  await diffUI.page.keyboard.press('a'); await diffUI.page.keyboard.press('d');
  await expect(diffUI.page.getByRole('status')).toContainText('Wait for the current change');
  await expect(diffUI.page.getByRole('status')).toContainText('Comment recorded');
  assert.equal((await dif.state()).comments.length, 2);
  await diffUI.page.keyboard.press('a');
  await diffUI.page.unroute('**/api/comments');
  const diffSave = await save(diffUI.page, dif);
  assert.equal(diffSave.feedback.comments[0].target.side, 'old'); assert.equal(diffSave.feedback.comments[0].target.quote, 'old 🦀\n');
  assert.equal(diffSave.feedback.comments[1].target.side, 'new'); assert.equal(diffSave.feedback.comments[1].target.quote, 'new 🦀\n');
  // A drag from the old side into the new side is rejected and drops the earlier target.
  const textEdge = (text, atEnd) => diffUI.page.locator('.doc [data-snapshot]', { hasText: text }).evaluate((span, atEnd) => {
    const range = document.createRange(); range.selectNodeContents(span);
    const r = range.getBoundingClientRect(); return { x: atEnd ? r.right - 0.2 : r.x + 0.2, y: r.y + r.height / 2 };
  }, atEnd);
  // A draft keeps its target while the composer is not focused.
  await diffUI.page.getByRole('button', { name: 'Select new line 2', exact: true }).click();
  await diffUI.page.keyboard.press('c');
  await diffUI.page.getByLabel('Comment', { exact: true }).fill('pending');
  await diffUI.page.locator('header .brand').click();
  await diffUI.page.keyboard.press('o');
  await expect(diffUI.page.getByRole('status')).toContainText('Record or cancel');
  await expect(diffUI.page.getByLabel('Comment', { exact: true })).toHaveValue('pending');
  await diffUI.page.keyboard.press('Escape');
  await expect(diffUI.page.locator('.composer')).toHaveCount(0);
  await diffUI.page.getByRole('button', { name: 'Select new line 2', exact: true }).click();
  await expect(diffUI.page.locator('.row.sel')).toHaveCount(1);
  const from = await textEdge('old 🦀', false); const to = await textEdge('new 🦀', true);
  await diffUI.page.mouse.move(from.x, from.y); await diffUI.page.mouse.down();
  await diffUI.page.mouse.move(to.x, to.y, { steps: 15 }); await diffUI.page.mouse.up();
  await expect(diffUI.page.getByRole('status')).toContainText('Select one diff side');
  await expect(diffUI.page.locator('.row.sel')).toHaveCount(0);
  // The rejection also ends a key selection in progress.
  await diffUI.page.keyboard.press('g'); await diffUI.page.keyboard.press('j');
  await diffUI.page.keyboard.press('v'); await diffUI.page.keyboard.press('j');
  await expect(diffUI.page.locator('.row.sel')).toHaveCount(2);
  // A selection that spans both sides at once, as a triple-click or keys can make.
  await diffUI.page.evaluate(() => {
    const text = (content) => [...[...document.querySelectorAll('.doc [data-snapshot]')].find(s => s.textContent === content).childNodes]
      .find(node => node.nodeType === Node.TEXT_NODE && node.length > 0);
    getSelection().setBaseAndExtent(text('old 🦀'), 1, text('new 🦀'), 2);
  });
  await expect(diffUI.page.locator('.row.sel')).toHaveCount(0);
  // A comment whose first line lies outside the diff opens in its side's full source.
  const files = (await (await fetch(`${dif.base}/api/content`, { headers: { Authorization: `Bearer ${dif.token}` } })).json()).files;
  const longFile = files.find(f => f.path === 'long.txt');
  const longNew = longFile.snapshots.find(s => s.side === 'new');
  await fetch(`${dif.base}/api/comments`, { method: 'POST', headers: { Authorization: `Bearer ${dif.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: longFile.id, snapshot_id: longNew.id, start_byte: long.indexOf('line 10\n'), end_byte: longNew.text.length, body: 'Long range' }) });
  await expect(diffUI.page.locator('.state .count')).toContainText('3 comments', { timeout: 8000 });
  await diffUI.page.keyboard.press('a');
  await diffUI.page.locator('.listed', { hasText: 'Long range' }).click();
  await expect(diffUI.page.locator('.row.sel')).toHaveCount(21);
  await expect(diffUI.page.locator('.row.sel').first()).toContainText('line 10');
  // The content scrolls inside the page, so PageDown moves the cursor by a screen.
  await diffUI.page.keyboard.press('g'); await diffUI.page.keyboard.press('PageDown');
  await expect(diffUI.page.locator('.row.cur')).toHaveAttribute('id', 'r29');
  await diffUI.page.keyboard.press('Escape');
  // After scrolling away from the cursor, moving goes on from the rows in view.
  await diffUI.page.setViewportSize({ width: 1360, height: 360 });
  await diffUI.page.keyboard.press('g');
  await expect.poll(() => diffUI.page.locator('main').evaluate(main => main.scrollTop)).toBe(0);
  await diffUI.page.locator('main').evaluate(main => main.scrollTo(0, main.scrollHeight));
  await expect.poll(() => diffUI.page.locator('main').evaluate(main => main.scrollTop)).toBeGreaterThan(0);
  await diffUI.page.keyboard.press('j');
  const movedTo = Number((await diffUI.page.locator('.row.cur').getAttribute('id')).slice(1));
  assert.ok(movedTo > 10, `Moving after a scroll went back to row ${movedTo}`);
  // Deleting the chosen comment in the list shows the comment chosen next.
  await fetch(`${dif.base}/api/comments`, { method: 'POST', headers: { Authorization: `Bearer ${dif.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: longFile.id, snapshot_id: longNew.id, start_byte: 0, end_byte: 'line 1\n'.length, body: 'Top line' }) });
  await expect(diffUI.page.locator('.state .count')).toContainText('4 comments', { timeout: 8000 });
  await diffUI.page.keyboard.press('a');
  await diffUI.page.locator('.listed', { hasText: 'Top line' }).focus();
  await expect.poll(() => diffUI.page.locator('main').evaluate(main => main.scrollTop)).toBe(0);
  await diffUI.page.keyboard.press('d');
  await expect(diffUI.page.locator('.state .count')).toContainText('3 comments');
  await expect.poll(() => diffUI.page.locator('main').evaluate(main => main.scrollTop)).toBeGreaterThan(0);
  await diffUI.page.keyboard.press('Escape');
  // Deleting another comment keeps the list's choice and the scroll, and a choice made while
  // the deletion is pending stands.
  const addLong = (start, end, body) => fetch(`${dif.base}/api/comments`, { method: 'POST', headers: { Authorization: `Bearer ${dif.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: longFile.id, snapshot_id: longNew.id, start_byte: start, end_byte: end, body }) });
  await addLong(0, 7, 'First line'); await addLong(7, 14, 'Second line');
  await expect(diffUI.page.locator('.state .count')).toContainText('5 comments', { timeout: 8000 });
  await diffUI.page.setViewportSize({ width: 1360, height: 600 });
  await diffUI.page.keyboard.press('a');
  await diffUI.page.locator('.listed', { hasText: 'Long range' }).focus();
  await expect.poll(() => diffUI.page.locator('main').evaluate(main => main.scrollTop)).toBeGreaterThan(0);
  await diffUI.page.locator('main').evaluate(main => main.scrollTo(0, 0));
  await expect.poll(() => diffUI.page.locator('main').evaluate(main => main.scrollTop)).toBe(0);
  await diffUI.page.locator('.comment', { hasText: 'Second line' }).getByRole('button', { name: 'Delete this comment' }).click();
  await expect(diffUI.page.locator('.state .count')).toContainText('4 comments');
  await expect(diffUI.page.locator('.listed.chosen')).toContainText('Long range');
  await diffUI.page.waitForTimeout(250);
  assert.equal(await diffUI.page.locator('main').evaluate(main => main.scrollTop), 0, 'Deleting another comment moved the content');
  await diffUI.page.route('**/api/comments/*', async route => { await new Promise(r => setTimeout(r, 800)); await route.continue(); });
  await diffUI.page.locator('.comment', { hasText: 'First line' }).getByRole('button', { name: 'Delete this comment' }).click();
  await diffUI.page.locator('.listed', { hasText: 'New side concern' }).focus();
  await expect(diffUI.page.locator('.state .count')).toContainText('3 comments');
  await expect(diffUI.page.locator('.listed.chosen')).toContainText('New side concern');
  await diffUI.page.unroute('**/api/comments/*');
  await diffUI.page.keyboard.press('Escape');
  await diffUI.page.setViewportSize({ width: 1360, height: 960 });
  await diffUI.page.keyboard.press('Escape');
  // An old-side passage on a context line, whose new-side line number differs, highlights cleanly.
  const shifted = files.find(f => f.path === 'shift.txt');
  const oldSide = shifted.snapshots.find(s => s.side === 'old');
  await fetch(`${dif.base}/api/comments`, { method: 'POST', headers: { Authorization: `Bearer ${dif.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: shifted.id, snapshot_id: oldSide.id, start_byte: 2, end_byte: 6, body: 'Old passage' }) });
  await expect(diffUI.page.locator('.state .count')).toContainText('4 comments', { timeout: 8000 });
  await diffUI.page.keyboard.press('a');
  await diffUI.page.locator('.listed', { hasText: 'Old passage' }).click();
  await expect(diffUI.page.locator('.row.sel')).toContainText('keep me');
  const noteFile = files.find(f => f.path === 'note.txt');
  const noteNew = noteFile.snapshots.find(s => s.side === 'new');
  await fetch(`${dif.base}/api/comments`, { method: 'POST', headers: { Authorization: `Bearer ${dif.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: noteFile.id, snapshot_id: noteNew.id, start_byte: 0, end_byte: Buffer.byteLength(noteNew.text), body: 'Across the change' }) });
  await expect(diffUI.page.locator('.state .count')).toContainText('5 comments', { timeout: 8000 });
  await diffUI.page.keyboard.press('a');
  await diffUI.page.locator('.listed', { hasText: 'Across the change' }).click();
  await expect(diffUI.page.getByRole('button', { name: 'new', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(diffUI.page.locator('.row.sel')).toHaveCount(3);
  await tab(diffUI.page, 'note.txt').click();
  // Another tab deletes the comment being edited: the text stays and records as a new comment.
  await diffUI.page.getByRole('button', { name: 'Edit this comment', exact: true }).first().click();
  await diffUI.page.getByLabel('Edit comment').fill('Kept after deletion');
  const doomed = (await dif.state()).comments[0];
  await fetch(`${dif.base}/api/comments/${doomed.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${dif.token}` } });
  await expect(diffUI.page.getByRole('status')).toContainText('deleted elsewhere', { timeout: 8000 });
  await expect(diffUI.page.getByLabel('Edit comment')).toHaveValue('Kept after deletion');
  await diffUI.page.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(diffUI.page.getByRole('status')).toContainText('Comment recorded');
  const kept = (await dif.state()).comments.find(c => c.body === 'Kept after deletion');
  assert.deepEqual([kept.target.side, kept.target.start_byte, kept.target.end_byte], [doomed.target.side, doomed.target.start_byte, doomed.target.end_byte]);
  // An unchanged edit whose comment another tab deletes is the text's only copy: leaving asks first.
  await diffUI.page.getByRole('button', { name: 'Edit this comment', exact: true }).first().click();
  const orphan = await diffUI.page.getByLabel('Edit comment').inputValue();
  const gone = (await dif.state()).comments.find(c => c.body === orphan);
  await fetch(`${dif.base}/api/comments/${gone.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${dif.token}` } });
  await expect(diffUI.page.getByRole('status')).toContainText('deleted elsewhere', { timeout: 8000 });
  diffUI.page.removeAllListeners('dialog');
  const asked = new Promise(resolve => diffUI.page.once('dialog', dialog => { resolve(dialog.message()); void dialog.dismiss(); }));
  await tab(diffUI.page, 'shift.txt').click();
  assert.match(await asked, /Discard this comment draft/);
  diffUI.page.on('dialog', dialog => dialog.accept());
  await expect(diffUI.page.getByLabel('Edit comment')).toHaveValue(orphan);
  await diffUI.page.getByLabel('Edit comment').press('Escape');
  await expect(diffUI.page.locator('.composer')).toHaveCount(0);
  // With focus on a listed comment, the list keys still choose, and e edits the chosen one.
  await diffUI.page.keyboard.press('a');
  await diffUI.page.locator('.listed').first().focus();
  await diffUI.page.keyboard.press('j');
  await expect(diffUI.page.locator('.listed').nth(1)).toHaveClass(/chosen/);
  await expect(diffUI.page.locator('.listed').nth(1)).toBeFocused();
  const editedBody = await diffUI.page.locator('.listed.chosen .excerpt').textContent();
  await diffUI.page.keyboard.press('e');
  await expect(diffUI.page.getByLabel('Edit comment')).toHaveValue(editedBody);
  await diffUI.page.keyboard.press('Escape');
  // The paging keys move through the list, as in the terminal, not the content behind it.
  await diffUI.page.keyboard.press('Escape'); await diffUI.page.keyboard.press('a');
  await diffUI.page.keyboard.press('g'); await diffUI.page.keyboard.press('End');
  await expect(diffUI.page.locator('.listed').last()).toHaveClass(/chosen/);
  await diffUI.page.keyboard.press('Home');
  await expect(diffUI.page.locator('.listed').first()).toHaveClass(/chosen/);
  await diffUI.page.keyboard.press('a');
  // Opened from the comment count, the list still answers its keys while that button has focus.
  await diffUI.page.locator('.state .count').click();
  await diffUI.page.keyboard.press('k');
  const chosenLine = await diffUI.page.locator('.listed.chosen .target').textContent();
  await diffUI.page.keyboard.press('Enter');
  await expect(diffUI.page.locator('.card')).toHaveCount(0);
  await expect(diffUI.page.locator('.row.sel').first()).toContainText(chosenLine);
  assert.deepEqual(errors, []); assert.deepEqual(diffUI.errors, []); assert.deepEqual(diffUI.external, []);
  await diffUI.context.close(); dif.stop();
  console.log(JSON.stringify({ browser: 'passed', checks: ['actual mouse selection', 'Unicode byte targets', 'range selection', 'keyboard selection and list', 'create/edit/delete', 'multi-file', 'save collisions', 'safe Markdown', 'session security', 'last edit wins across tabs', 'browser → TUI → browser', 'revision inspection', 'mobile layout', 'old/new Git targets', 'mixed-side drag rejection', 'bundled offline assets and fonts', 'failed save retention', 'server quit guard'] }));
} finally {
  for (const server of servers) if (server.exitCode === null) server.kill('SIGTERM');
  await browser?.close();
  rmSync(root, { recursive: true, force: true });
}
