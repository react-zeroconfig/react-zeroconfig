import { BehaviorSubject } from 'rxjs';
import webpack, {
  Configuration as WebpackConfiguration,
  MultiCompiler,
} from 'webpack';
import WebpackDevServer, {
  Configuration as WebpackDevServerConfiguration,
} from 'webpack-dev-server';
import { DevServerStatus, WebpackStats } from './types';

export interface DevServerParams {
  port: number;
  hostname: string;
  webpackConfigs: WebpackConfiguration[];
  devServerConfig: WebpackDevServerConfiguration;
}

export class DevServer {
  readonly compiler: MultiCompiler;
  readonly devServer: WebpackDevServer;
  readonly url: string;

  private readonly statusSubject: BehaviorSubject<DevServerStatus>;
  private readonly webpackStatsSubject: BehaviorSubject<WebpackStats>;

  private readonly startResolvers: Set<() => void> = new Set();
  private readonly closeResolvers: Set<() => void> = new Set();

  constructor({
    port,
    hostname,
    devServerConfig,
    webpackConfigs,
  }: DevServerParams) {
    this.url =
      (devServerConfig.https ? 'https://' : 'http://') + hostname + ':' + port;

    this.compiler = webpack(webpackConfigs);

    this.statusSubject = new BehaviorSubject<DevServerStatus>(
      DevServerStatus.STARTING,
    );
    this.webpackStatsSubject = new BehaviorSubject<WebpackStats>({
      status: 'waiting',
    });

    this.devServer = new WebpackDevServer(this.compiler, devServerConfig);
    this.devServer.listen(port, hostname, this.onStart);

    this.compiler.hooks.invalid.tap('invalid', () => {
      this.webpackStatsSubject.next({
        status: 'invalid',
      });
    });

    this.compiler.hooks.done.tap('done', (statsData) => {
      this.webpackStatsSubject.next({
        status: 'done',
        statsData,
      });
    });
  }

  public status = () => this.statusSubject.asObservable();

  public webpackStats = () => this.webpackStatsSubject.asObservable();

  public waitUntilStart = () =>
    new Promise<void>((resolve) => {
      if (this.statusSubject.getValue() >= DevServerStatus.STARTED) {
        resolve();
      } else {
        this.startResolvers.add(resolve);
      }
    });

  private onStart = (error?: Error) => {
    if (error) {
      throw error;
    }

    for (const resolve of this.startResolvers) {
      resolve();
    }
    this.startResolvers.clear();

    this.statusSubject.next(DevServerStatus.STARTED);
  };

  public close = () => {
    if (this.statusSubject.getValue() !== DevServerStatus.STARTED) {
      return;
    }

    this.statusSubject.next(DevServerStatus.CLOSING);

    this.devServer.close(this.onClose);
  };

  public waitUntilClose = () =>
    new Promise<void>((resolve) => {
      if (
        this.statusSubject.isStopped ||
        this.statusSubject.getValue() >= DevServerStatus.CLOSED
      ) {
        resolve();
      } else {
        this.closeResolvers.add(resolve);
      }
    });

  private onClose = () => {
    for (const resolve of this.closeResolvers) {
      resolve();
    }
    this.closeResolvers.clear();

    this.webpackStatsSubject.unsubscribe();

    this.statusSubject.next(DevServerStatus.CLOSED);

    this.statusSubject.unsubscribe();
  };
}
