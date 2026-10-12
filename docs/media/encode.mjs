// Turns a timeline of frames into a GIF with gifski (https://gif.ski).
// Frames are PNG screenshots or terminal screens drawn as HTML, which Chromium renders here.
// Usage as a script: node docs/media/encode.mjs FRAMES_DIR OUT.gif, where FRAMES_DIR holds
// timeline.json: [["frame.html" or "frame.png", seconds], ...].
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const FPS = 10;
const playwright = new URL('../../frontend/node_modules/@playwright/test/index.mjs', import.meta.url);

export async function encode(dir, timeline, out) {
  const { chromium } = await import(playwright);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pngs = [];
  for (const [file, seconds] of timeline) {
    let png = join(dir, file);
    if (file.endsWith('.html')) {
      png = png.replace(/\.html$/, '.png');
      await page.goto(`file://${join(dir, file)}`);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.s').screenshot({ path: png });
    }
    pngs.push([png, seconds]);
  }
  await browser.close();
  // gifski takes frames at a fixed rate and merges repeated ones, so holding a frame is
  // repeating it.
  const sequence = mkdtempSync(join(tmpdir(), 'review-gif-'));
  const frames = [];
  for (const [png, seconds] of pngs) {
    for (let i = 0; i < Math.max(1, Math.round(seconds * FPS)); i++) {
      const frame = join(sequence, `${String(frames.length).padStart(5, '0')}.png`);
      symlinkSync(resolve(png), frame);
      frames.push(frame);
    }
  }
  // gifski shrinks large frames unless told their width, read from the PNG header.
  const width = String(readFileSync(pngs[0][0]).readUInt32BE(16));
  execFileSync('gifski', ['--fps', String(FPS), '--quality', '100', '--width', width, '--output', out, ...frames], { stdio: 'inherit' });
  rmSync(sequence, { recursive: true });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, out] = process.argv.slice(2);
  await encode(resolve(dir), JSON.parse(readFileSync(join(dir, 'timeline.json'), 'utf8')), resolve(out));
}
