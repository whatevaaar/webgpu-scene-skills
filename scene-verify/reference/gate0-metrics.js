// Gate 0 — mechanical correctness checks (NO LLM). Runs BEFORE the aesthetic critic.
//
// Why this exists (postmortem P0): a 1-line camera-orientation bug (180° roll) survived ~16
// capture rounds because the aesthetic critic never prioritised correctness; the user caught it
// by eye in seconds. These checks make correctness cheap, mechanical and deterministic.
//
// Checks:
//   1. ORIENTATION via the scene's ?calib markers — green=world-UP, red=world-DOWN,
//      yellow=world-+X(right). Asserts up is above down on screen, and +X is to the right.
//      Catches vertical flips AND horizontal mirrors. (~5 s.)
//   2. VOID / EMPTY-FRAME per pose — luminance histogram (darkFrac) + spatial variance (flatness).
//      Catches black voids, camera-buried-in-wall, and camera-pointing-at-empty-sky frames.
//
// Requires: `npm i puppeteer-core pngjs`, a Chromium/Edge path, and a scene built by
// /scene-build with the sanity hooks (?calib, ?pose=N, window.__ready).
// Usage:   node gate0-metrics.js "file:///ABS/PATH/index.html"
//
// Exit code 0 = PASS (proceed to the aesthetic critic). Non-zero = FAIL (fix mechanically first;
// do NOT spend critic tokens on an objectively broken frame).

const puppeteer = require('puppeteer-core');
const { PNG } = require('pngjs');

const EDGE = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = process.argv[2] || 'file:///C:/Users/emili/Documents/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function metrics(png) {
  const { width: W, height: H, data } = png;
  const step = 6;                                      // downsample for speed
  let sum = 0, sum2 = 0, dark = 0, n = 0;
  let gx = 0, gy = 0, gn = 0, rx = 0, ry = 0, rn = 0, yx = 0, yy = 0, yn = 0;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const i = (y * W + x) * 4, R = data[i], G = data[i + 1], B = data[i + 2];
    const L = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255; sum += L; sum2 += L * L; if (L < 0.06) dark++; n++;
    if (G > 120 && R < 90 && B < 90) { gx += x; gy += y; gn++; }                 // green  = up
    else if (R > 120 && G < 90 && B < 90) { rx += x; ry += y; rn++; }            // red    = down
    else if (R > 120 && G > 120 && B < 90) { yx += x; yy += y; yn++; }           // yellow = right (+X)
  }
  const mean = sum / n, varr = sum2 / n - mean * mean;
  return {
    mean: +mean.toFixed(4), varr: +varr.toFixed(5), darkFrac: +(dark / n).toFixed(3),
    green: gn ? { x: gx / gn, y: gy / gn } : null,
    red: rn ? { x: rx / rn, y: ry / rn } : null,
    yellow: yn ? { x: yx / yn, y: yy / yn } : null
  };
}
async function shot(page) { return PNG.sync.read(Buffer.from(await page.screenshot())); }

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: false,
    defaultViewport: { width: 1280, height: 720 }, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan'] });
  const page = await browser.newPage();
  const checks = [];

  // 1) orientation
  await page.goto(`${URL}?calib=1`, { waitUntil: 'load' });
  try { await page.waitForFunction('window.__ready===true', { timeout: 20000 }); } catch {}
  await sleep(1200);
  const c = metrics(await shot(page));
  let ok = false, msg = `markers missing (up:${!!c.green} down:${!!c.red} right:${!!c.yellow})`;
  if (c.green && c.red && c.yellow) {
    const vertical = c.green.y < c.red.y - 4;          // up above down
    const horizontal = c.yellow.x > c.green.x + 8;     // +X to the right of centre
    ok = vertical && horizontal;
    msg = `up.y=${c.green.y.toFixed(0)} down.y=${c.red.y.toFixed(0)} up<down:${vertical} | right.x=${c.yellow.x.toFixed(0)} centre.x=${c.green.x.toFixed(0)} right:${horizontal}`;
  }
  checks.push({ check: 'orientation', pass: ok, detail: msg });

  // 2) void / empty per pose
  for (let i = 0; i < 6; i++) {
    await page.goto(`${URL}?pose=${i}`, { waitUntil: 'load' });
    try { await page.waitForFunction('window.__ready===true', { timeout: 20000 }); } catch {}
    await sleep(1400);
    const m = metrics(await shot(page));
    const notVoid = m.darkFrac < 0.55;
    const notFlat = m.varr > 0.0015;
    checks.push({ check: `pose${i}`, pass: notVoid && notFlat,
      detail: `darkFrac=${m.darkFrac} void<0.55:${notVoid} | varr=${m.varr} flat>0.0015:${notFlat}` });
  }

  await browser.close();
  const failed = checks.filter(c => !c.pass);
  console.log('=== GATE 0 (mechanical correctness) ===');
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.check.padEnd(12)} ${c.detail}`);
  console.log(`\nGATE 0: ${failed.length ? 'FAIL (' + failed.map(f => f.check).join(', ') + ') — fix mechanically BEFORE spending critic tokens' : 'PASS — proceed to the aesthetic critic'}`);
  process.exit(failed.length ? 1 : 0);
}
main().catch(e => { console.error('GATE0 ERROR:', e); process.exit(2); });
