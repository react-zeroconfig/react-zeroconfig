import reactWebpackConfig, {
  WebpackConfigOptions,
} from '@rocket-scripts/react-preset/webpackConfig';
import { Configuration } from 'webpack';
import { merge } from 'webpack-merge';

export interface RendererWebpackConfigOptions extends WebpackConfigOptions {}

export default function ({
  cwd,
  babelLoaderOptions,
  chunkPath,
  publicPath,
  tsconfig,
  extractCss,
}: RendererWebpackConfigOptions): Configuration {
  return merge(
    reactWebpackConfig({
      cwd,
      babelLoaderOptions,
      chunkPath,
      publicPath,
      tsconfig,
      extractCss,
    }),
    {
      target: 'electron-renderer',
    },
  );
}
