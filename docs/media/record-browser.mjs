// Record docs/media/browser.gif: a scripted review in the real browser interface.
// Usage: node docs/media/record-browser.mjs target/release/review
// Needs gifski and the frontend's Playwright (npm ci in frontend/). The browser runs headless,
// so a drawn pointer shows where the mouse goes.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { encode } from './encode.mjs';

const { chromium } = await import(new URL('../../frontend/node_modules/@playwright/test/index.mjs', import.meta.url));
const PLAN = `# Plan: rate-limit the public API

## Approach
1. Add a token-bucket limiter in \`middleware/limit.rs\`.
2. Key buckets by client IP address.
3. Store buckets in a global \`HashMap\` behind a \`Mutex\`.
4. Return HTTP 429 with a \`Retry-After\` header.

## Rollout
- Enable for all routes at once.
- Log rejected requests at \`info\` level.

## Tests
- Unit test the bucket refill math.
`;
const POINTER = `
  addEventListener('DOMContentLoaded', () => {
    const pointer = document.createElement('div');
    pointer.innerHTML = '<svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2 L2 21 L7 16.5 L10.5 24 L14 22.5 L10.5 15 L17 15 Z" fill="#fff" stroke="#1d2833" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(pointer.style, { position: 'fixed', left: '-40px', top: '-40px', zIndex: 2147483647, pointerEvents: 'none' });
    document.body.append(pointer);
    addEventListener('mousemove', (e) => Object.assign(pointer.style, { left: e.clientX - 2 + 'px', top: e.clientY - 2 + 'px' }), true);
  });`;

const binary = resolve(process.argv[2]);
const work = mkdtempSync(join(tmpdir(), 'demo-'));
const frames = join(work, 'frames');
mkdirSync(frames);
writeFileSync(join(work, 'plan.md'), PLAN);
const server = spawn(binary, ['--browser', 'plan.md'], { cwd: work, stdio: ['ignore', 'pipe', 'inherit'] });
const exited = new Promise((done) => server.once('exit', done));
let output = '';
server.stdout.on('data', (data) => (output += data));
const timeline = [];
let browser;
try {
  const deadline = Date.now() + 10000;
  while (!/Review is running at (http:\/\/\S+)/.test(output)) {
    if (server.exitCode !== null || Date.now() > deadline) throw new Error(`Review did not start: ${output}`);
    await new Promise((r) => setTimeout(r, 50));
  }
  const url = output.match(/Review is running at (http:\/\/\S+)/)[1];
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 720 }, colorScheme: 'light' });
  await page.addInitScript(POINTER);
  let mouse = { x: 900, y: 600 };

  async function snap(seconds) {
    const name = `${String(timeline.length).padStart(4, '0')}.png`;
    await page.screenshot({ path: join(frames, name) });
    timeline.push([name, seconds]);
  }
  async function glide(x, y, steps = 7) {
    const from = mouse;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, ease = t * t * (3 - 2 * t);
      await page.mouse.move(from.x + (x - from.x) * ease, from.y + (y - from.y) * ease);
      await snap(0.05);
    }
    mouse = { x, y };
  }
  async function center(locator) {
    const box = await locator.boundingBox();
    return [box.x + box.width / 2, box.y + box.height / 2];
  }
  async function click(locator, modifiers = []) {
    await glide(...(await center(locator)));
    await locator.click({ modifiers });
    await snap(0.5);
  }
  async function write(text) {
    await page.keyboard.press('c');
    await snap(0.5);
    for (let i = 0; i < text.length; i += 3) {
      await page.keyboard.type(text.slice(i, i + 3));
      await snap(0.1);
    }
    await snap(0.5);
    await page.keyboard.press('Enter');
    await page.getByRole('status').filter({ hasText: 'Comment recorded' }).waitFor();
    await snap(1.3);
  }
  /** The screen position of `text` in line `line`'s source text, at its start or end. */
  async function textEdge(line, text, atEnd) {
    return page.locator(`#r${line - 1} [data-snapshot]`).evaluate((span, [text, atEnd]) => {
      const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
      let offset = span.textContent.indexOf(text) + (atEnd ? text.length : 0);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (offset <= node.length) {
          const range = document.createRange();
          range.setStart(node, offset);
          const r = range.getClientRects()[0] ?? node.parentElement.getBoundingClientRect();
          return [r.x, r.y + r.height / 2];
        }
        offset -= node.length;
      }
    }, [text, atEnd]);
  }

  await page.goto(url);
  await page.getByRole('button', { name: 'Save feedback', exact: true }).waitFor();
  await page.mouse.move(mouse.x, mouse.y);
  await snap(1.4);
  // A line, by its number.
  await click(page.getByRole('button', { name: 'Select line 5', exact: true }));
  await write('Key by API token instead; many clients share one IP behind NAT.');
  // An exact passage, by dragging across it.
  const [startX, startY] = await textEdge(6, 'global', false);
  const [endX, endY] = await textEdge(6, 'Mutex`', true);
  await glide(startX, startY);
  await page.mouse.down();
  await glide(endX, endY, 9);
  await page.mouse.up();
  await snap(0.6);
  await write('One global lock serializes every request. Shard the buckets.');
  // A range: a line number, then Shift and another.
  await click(page.getByRole('button', { name: 'Select line 10', exact: true }));
  await click(page.getByRole('button', { name: 'Select line 11', exact: true }), ['Shift']);
  await write('Roll out on /search first, behind a flag, then widen.');
  // Every comment, on the document's grid.
  await page.keyboard.press('a');
  await snap(2.4);
  await page.keyboard.press('a');
  await snap(0.4);
  await click(page.getByRole('button', { name: 'preview', exact: true }));
  await snap(1.6);
  await click(page.getByRole('button', { name: 'source', exact: true }));
  await click(page.getByRole('button', { name: 'Save feedback', exact: true }));
  await page.getByRole('status').filter({ hasText: 'Saved to' }).waitFor();
  await snap(2.6);
} finally {
  try {
    await browser?.close();
  } finally {
    server.kill('SIGKILL');
    await exited;
  }
}

const saved = JSON.parse(readFileSync(join(work, 'review-feedback.json'), 'utf8'));
const quotes = saved.comments.map((c) => c.target.quote);
if (quotes.join('|') !== '2. Key buckets by client IP address.\n|global `HashMap` behind a `Mutex`|- Enable for all routes at once.\n- Log rejected requests at `info` level.\n') {
  throw new Error(`Unexpected feedback: ${JSON.stringify(quotes)}`);
}
await encode(frames, timeline, resolve(new URL('browser.gif', import.meta.url).pathname));
rmSync(work, { recursive: true });
