import { start } from '@rocket-scripts/web/start';
import { exec } from '@ssen/promised';
import { copyTmpDirectory, createTmpDirectory } from '@ssen/tmp-directory';
import path from 'path';

(async () => {
  const cwd: string = await copyTmpDirectory(path.join(process.cwd(), 'test/fixtures/web/start'));
  const out: string = await createTmpDirectory();

  await exec(`npm install`, { cwd });

  await start({
    cwd,
    staticFileDirectories: ['{cwd}/public'],
    app: 'app',
    https: false,
    outDir: out,
  });
})();
