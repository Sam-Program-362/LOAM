const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');

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
  const viteBin = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
  const server = spawn('node', [viteBin, '--port', '5173', '--strictPort'], { cwd: process.cwd(), detached: true });
  let serverLog = '';
  server.stdout.on('data', d => serverLog += d.toString());
  server.stderr.on('data', d => serverLog += d.toString());

  const logs = [];
  try {
    await waitForServer('http://localhost:5173/', 20000);
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    page.on('console', msg => logs.push(`[console.${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => logs.push(`[pageerror] ${err.message}\n${err.stack}`));

    await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Start Ride'));
      if (btn) { btn.click(); return true; }
      return false;
    });
    logs.push(`clicked start: ${clicked}`);
    await new Promise(r => setTimeout(r, 2500));
    await browser.close();
  } catch (e) {
    logs.push('TEST ERROR ' + e.message);
  }
  console.log('----LOGS----');
  console.log(logs.join('\n'));
  console.log('----SERVER LOG----');
  console.log(serverLog);
  try { process.kill(-server.pid, 'SIGKILL'); } catch (e) {}
  process.exit(0);
})();
