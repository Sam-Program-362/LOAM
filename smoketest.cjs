const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const http = require('http');

function waitForServer(url, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      http.get(url, res => { res.resume(); resolve(); })
        .on('error', () => {
          if (Date.now() - start > timeout) reject(new Error('timeout waiting for server'));
          else setTimeout(check, 300);
        });
    })();
  });
}

(async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: process.cwd() });
  let serverLog = '';
  server.stdout.on('data', d => serverLog += d.toString());
  server.stderr.on('data', d => serverLog += d.toString());

  try {
    await waitForServer('http://localhost:4173/', 15000);
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const logs = [];
    page.on('console', msg => logs.push(`[console.${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => logs.push(`[pageerror] ${err.message}`));
    page.on('requestfailed', req => logs.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`));

    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: '/tmp/menu.png' });

    // click Start Ride button
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Start Ride'));
      if (btn) { btn.click(); return true; }
      return false;
    });
    logs.push(`clicked start: ${clicked}`);

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: '/tmp/playing_start.png' });

    // simulate holding forward/pedal + steering for a bit using keyboard
    await page.keyboard.down('KeyW');
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (i === 15) await page.keyboard.down('ArrowRight');
      if (i === 20) { await page.keyboard.up('ArrowRight'); await page.keyboard.down('ArrowLeft'); }
      if (i === 25) await page.keyboard.up('ArrowLeft');
      if (i === 10) await page.keyboard.press('Space');
      if (i === 30) await page.keyboard.press('Space');
    }
    await page.keyboard.up('KeyW');
    await page.screenshot({ path: '/tmp/playing_mid.png' });

    const hudText = await page.evaluate(() => document.body.innerText);

    console.log('----LOGS----');
    console.log(logs.join('\n'));
    console.log('----HUD TEXT SNIPPET----');
    console.log(hudText.slice(0, 500));

    await browser.close();
  } catch (e) {
    console.error('TEST ERROR', e);
    console.log('----SERVER LOG----');
    console.log(serverLog);
  } finally {
    server.kill();
    process.exit(0);
  }
})();
