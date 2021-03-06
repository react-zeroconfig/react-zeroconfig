import { start } from '@rocket-scripts/electron';
import { copyFixture } from '@ssen/copy-fixture';
import fs from 'fs-extra';
import path from 'path';
import puppeteer, { Browser } from 'puppeteer-core';

const timeout = (t: number) => new Promise((resolve) => setTimeout(resolve, t));

(async () => {
  const cwd: string = await copyFixture('test/fixtures/electron/start');
  const remoteDebuggingPort: number = 9366;

  await start({
    cwd,
    staticFileDirectories: ['{cwd}/public'],
    app: 'app',
    electronSwitches: {
      'remote-debugging-port': remoteDebuggingPort,
    },
  });

  await timeout(1000 * 5);

  // Arrange : connect electron
  let browser: Browser | null = null;
  const connectTimeout: number = Date.now() + 1000 * 30;

  while (!browser) {
    try {
      browser = await puppeteer.connect({
        browserURL: `http://localhost:${remoteDebuggingPort}`,
      });
    } catch (error) {
      console.log(
        'start.test.ts..()',
        error,
        remoteDebuggingPort,
        Date.now(),
        connectTimeout,
        browser,
      );
      if (Date.now() > connectTimeout) {
        throw error;
      }
    }
  }

  const browserPages = await browser.pages();

  const indexPage = browserPages.find((page) =>
    /index\.html$/.test(page.url()),
  );
  if (!indexPage) throw new Error(`Undefined index.html`);

  await indexPage.waitForSelector('#app h1', { timeout: 1000 * 60 });
  //const text = await page.$eval('#app h1', (e) => e.innerHTML);

  const file: string = path.join(cwd, 'src/app/preload.ts');
  const source: string = await fs.readFile(file, 'utf8');
  await fs.writeFile(file, source.replace(/(Hello)/g, 'Hi'), {
    encoding: 'utf8',
  });

  await timeout(1000 * 5);

  await indexPage.reload();
})();
