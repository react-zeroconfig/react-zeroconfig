import { patchConsole } from '@ssen/patch-console';
import fs from 'fs-extra';
import { Box, render, Text } from 'ink';
import path from 'path';
import React, { ReactNode } from 'react';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import tmp from 'tmp';
import { Configuration as WebpackConfiguration } from 'webpack';
import { ProxyConfigArray, ProxyConfigMap } from 'webpack-dev-server';
import { DevServer, DevServerParams } from './DevServer';
import { DevServerUI } from './DevServerUI';
import { TimeMessage } from './types';
import { patchProxyLogger } from './utils/patchProxyLogger';

export type WebpackConfigs =
  | {
      /**
       * @deprecated use instead webpackConfigs
       */
      webpackConfig: WebpackConfiguration;
    }
  | { webpackConfigs: WebpackConfiguration[] };

export type DevServerStartParams = WebpackConfigs &
  Omit<DevServerParams, 'webpackConfigs'> & {
    stdout?: NodeJS.WriteStream;
    stdin?: NodeJS.ReadStream;
    header?: ReactNode;
    cwd?: string;
    logfile?: string;
    restartAlarm?: Observable<string[]>;
    children?: ReactNode;
  };

export async function devServerStart({
  stdout = process.stdout,
  stdin = process.stdin,
  header,
  cwd = process.cwd(),
  logfile = tmp.fileSync({ mode: 0o644, postfix: '.log' }).name,
  port,
  hostname,
  devServerConfig,
  restartAlarm,
  children,
  ..._webpackConfigs
}: DevServerStartParams): Promise<() => Promise<void>> {
  const webpackConfigs =
    'webpackConfigs' in _webpackConfigs
      ? _webpackConfigs.webpackConfigs
      : [_webpackConfigs.webpackConfig];

  if (!fs.existsSync(path.dirname(logfile))) {
    fs.mkdirpSync(path.dirname(logfile));
  }

  const interactiveUI = !process.env.CI && process.env.NODE_ENV !== 'test';
  const clearUI: (() => void)[] = [];

  if (interactiveUI) {
    console.clear();
    const stream: NodeJS.WritableStream = fs.createWriteStream(logfile);
    const restoreConsole = patchConsole({
      stdout: stream,
      stderr: stream,
      colorMode: false,
    });
    clearUI.push(restoreConsole);
  }

  let proxy: ProxyConfigMap | ProxyConfigArray | undefined = undefined;
  let proxySubject: Subject<TimeMessage[]> | undefined = undefined;
  if (devServerConfig.proxy) {
    proxySubject = new BehaviorSubject<TimeMessage[]>([]);
    proxy = patchProxyLogger({
      proxyConfig: devServerConfig.proxy,
      subject: proxySubject,
    });
  }

  const server: DevServer = new DevServer({
    port,
    hostname,
    webpackConfigs,
    devServerConfig: {
      ...devServerConfig,
      proxy,
    },
  });

  if (interactiveUI) {
    const { unmount, rerender } = render(
      <DevServerUI
        header={header}
        devServer={server}
        cwd={cwd}
        proxyMessage={proxySubject}
        logfile={logfile}
        restartAlarm={restartAlarm}
        children={children}
        exit={() => {
          rerender(
            <Box height={3}>
              <Text color="blueBright">[DevServer Closed] {logfile}</Text>
            </Box>,
          );
          process.exit();
        }}
      />,
      {
        stdout,
        stdin,
        patchConsole: false,
        exitOnCtrlC: false,
      },
    );
    clearUI.push(unmount);
  }

  await server.waitUntilStart();

  return async () => {
    server.close();
    await server.waitUntilClose();
    if (proxySubject) proxySubject.unsubscribe();
    clearUI.forEach((fn) => fn());
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };
}
