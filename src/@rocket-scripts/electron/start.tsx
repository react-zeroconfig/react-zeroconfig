import { getBrowserslistQuery } from '@rocket-scripts/browserslist';
import {
  mainWebpackConfig as webpackReactElectronMainConfig,
  rendererWebpackConfig as webpackReactElectronRendererConfig,
} from '@rocket-scripts/react-electron-preset';
import { getWebpackAlias, icuFormat, rocketTitle } from '@rocket-scripts/utils';
import { observeAliasChange } from '@rocket-scripts/web/utils/observeAliasChange';
import { devServerStart, DevServerStartParams } from '@ssen/electron-dev-server';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import InterpolateHtmlPlugin from 'react-dev-utils/InterpolateHtmlPlugin';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import tmp from 'tmp';
import { Configuration as WebpackConfiguration, DefinePlugin } from 'webpack';
import { merge as webpackMerge } from 'webpack-merge';
import nodeExternals from 'webpack-node-externals';

export interface StartParams
  extends Omit<
    DevServerStartParams,
    'mainWebpackConfig' | 'rendererWebpackConfig' | 'restartAlarm' | 'header'
  > {
  // cli
  app: string;
  tsconfig?: string;
  mainWebpackConfig?: string | WebpackConfiguration;
  rendererWebpackConfig?: string | WebpackConfiguration;

  // api
  cwd: string;
  env?: NodeJS.ProcessEnv;
}

export interface Start extends DevServerStartParams {
  close: () => Promise<void>;
}

export async function start({
  cwd,
  app,
  outDir: _outDir = '{cwd}/out/{app}',
  staticFileDirectories: _staticFileDirectories = ['{cwd}/public'],
  electronSwitches = {},
  env = process.env,
  logfile: _logfile = tmp.fileSync({ mode: 0o644, postfix: '.log' }).name,
  mainWebpackConfig: _mainWebpackConfig,
  rendererWebpackConfig: _rendererWebpackConfig,
  stdout = process.stdout,
  stdin = process.stdin,
  tsconfig: _tsconfig = '{cwd}/tsconfig.json',
}: StartParams): Promise<Start> {
  console.log('Start Server...');

  const staticFileDirectories: string[] = _staticFileDirectories.map((dir) => icuFormat(dir, { cwd, app }));
  const outDir: string = icuFormat(_outDir, { cwd, app });
  const tsconfig: string = icuFormat(_tsconfig, { cwd, app });
  const alias = getWebpackAlias(cwd);
  const logfile: string = icuFormat(_logfile, { cwd, app });
  const publicPath: string = '';
  const chunkPath: string = '';

  const userMainWebpackConfig: WebpackConfiguration | {} =
    typeof _mainWebpackConfig === 'string'
      ? require(icuFormat(_mainWebpackConfig, { cwd, app }))
      : _mainWebpackConfig ?? {};

  const userRendererWebpackConfig: WebpackConfiguration | {} =
    typeof _rendererWebpackConfig === 'string'
      ? require(icuFormat(_rendererWebpackConfig, { cwd, app }))
      : _rendererWebpackConfig ?? {};

  const reactAppEnv: NodeJS.ProcessEnv = Object.keys(env)
    .filter((key) => /^REACT_APP_/i.test(key))
    .reduce((e, key) => {
      e[key] = env[key];
      return e;
    }, {});

  const webpackEnv = {
    ...reactAppEnv,
    PUBLIC_PATH: publicPath,
    PUBLIC_URL: publicPath,
    NODE_ENV: env['NODE_ENV'] || 'development',
  };

  const babelLoaderOptions: object = {
    presets: [
      [
        require.resolve('@rocket-scripts/react-preset/babelPreset'),
        {
          modules: false,
          targets: getBrowserslistQuery({ cwd }),
        },
      ],
    ],
  };

  const mainWebpackConfig: WebpackConfiguration = webpackMerge(
    userMainWebpackConfig,
    webpackReactElectronMainConfig({
      cwd,
      babelLoaderOptions,
      tsconfig,
    }),
    {
      mode: 'development',
      devtool: 'source-map',

      output: {
        path: outDir,
        filename: `[name].js`,
        chunkFilename: `[name].js`,
        pathinfo: false,
      },

      resolve: {
        symlinks: false,
        alias,
      },

      entry: {
        main: path.join(cwd, `src/${app}/main`),
        preload: path.join(cwd, `src/${app}/preload`),
      },

      externals: [
        nodeExternals({
          allowlist: [
            // include asset files
            /\.(?!(?:jsx?|json)$).{1,5}$/i,
          ],
        }),
      ],

      plugins: [
        new DefinePlugin({
          'process.env': Object.keys(webpackEnv).reduce((stringifiedEnv, key) => {
            stringifiedEnv[key] = JSON.stringify(webpackEnv[key]);
            return stringifiedEnv;
          }, {}),
        }),
      ],

      performance: {
        hints: false,
      },

      optimization: {
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,

        moduleIds: 'named',
        noEmitOnErrors: true,
      },
    },
  );

  const rendererWebpackConfig: WebpackConfiguration = webpackMerge(
    userRendererWebpackConfig,
    webpackReactElectronRendererConfig({
      cwd,
      tsconfig,
      babelLoaderOptions,
      chunkPath,
      publicPath,
    }),
    {
      mode: 'development',
      devtool: 'source-map',

      output: {
        path: outDir,
        filename: `[name].js`,
        chunkFilename: `[name].js`,
        pathinfo: false,
      },

      resolve: {
        symlinks: false,
        alias,
      },

      entry: {
        renderer: path.join(cwd, `src/${app}/renderer`),
      },

      plugins: [
        new MiniCssExtractPlugin({
          filename: `[name].css`,
        }),

        new HtmlWebpackPlugin({
          template: path.join(cwd, `src/${app}/index.html`),
          filename: 'index.html',
        }),

        new InterpolateHtmlPlugin(HtmlWebpackPlugin, webpackEnv),

        new DefinePlugin({
          'process.env': Object.keys(webpackEnv).reduce((stringifiedEnv, key) => {
            stringifiedEnv[key] = JSON.stringify(webpackEnv[key]);
            return stringifiedEnv;
          }, {}),
        }),
      ],

      performance: {
        hints: false,
      },

      optimization: {
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,

        moduleIds: 'named',
        noEmitOnErrors: true,
      },
    },
  );

  const restartAlarm: Observable<string[]> = combineLatest([
    observeAliasChange({ cwd, current: alias }),
  ]).pipe(
    map<(string | null)[], string[]>((changes) => changes.filter((change): change is string => !!change)),
  );

  let version: string = '';

  try {
    version = '\n ' + require('@rocket-scripts/electron/package.json').version;
  } catch {}

  const startParams: DevServerStartParams = {
    header: rocketTitle + version,
    cwd,
    outDir,
    staticFileDirectories,
    mainWebpackConfig,
    rendererWebpackConfig,
    electronSwitches,
    stdin,
    stdout,
    restartAlarm,
    logfile,
  };

  const close = await devServerStart(startParams);

  return {
    ...startParams,
    close,
  };
}