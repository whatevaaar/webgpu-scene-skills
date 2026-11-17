// Record a short video of a procedural scene — vertical or horizontal, parameterizable duration.
// Uses in-browser MediaRecorder over canvas.captureStream() (no ffmpeg). Output: .webm (VP9).
//
// Usage: node record-video.js <fileURL> <horizontal|vertical> <seconds> <outPath.webm>
//   node record-video.js "file:///.../index.html" horizontal 5 video_h.webm
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const EDGE = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = process.argv[2];
const ORIENT = (process.argv[3] || 'horizontal').toLowerCase();
const SECS = Math.max(1, +(process.argv[4] || 5));
const OUT = process.argv[5] || 'video.webm';
const W = ORIENT === 'vertical' ? 1080 : 1920;
const H = ORIENT === 'vertical' ? 1920 : 1080;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: false,
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
    args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=default',
           '--force-color-profile=srgb', '--hide-scrollbars', `--window-size=${W+16},${H+90}`,
           '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  // ?flythrough=1 = deterministic scripted camera; perfect for a clean clip.
  await page.goto(`${URL}?flythrough=1`, { waitUntil: 'load' });
  try { await page.waitForFunction('window.__ready===true', { timeout: 20000 }); } catch {}
  await sleep(600);

  const dataUrl = await page.evaluate((secs) => new Promise((resolve, reject) => {
    const canvas = document.getElementById('c');
    if (!canvas || !canvas.captureStream) { reject('no canvas.captureStream'); return; }
    const stream = canvas.captureStream(60);
    let mime = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16_000_000 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result);
      fr.onerror = () => reject('filereader error');
      fr.readAsDataURL(blob);
    };
    rec.start();
    setTimeout(() => rec.stop(), secs * 1000);
  }), SECS);

  const b64 = dataUrl.split(',')[1];
  fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
  console.log(`VIDEO ${OUT} ${ORIENT} ${W}x${H} ${SECS}s ${(fs.statSync(OUT).size/1024/1024).toFixed(2)}MB`);
  await browser.close();
})().catch(e => { console.error('VIDEO ERROR:', e); process.exit(2); });
