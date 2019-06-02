"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const getBabelConfig_1 = require("../transpile/getBabelConfig");
/** @return RuleSetRule[] for oneOf */
function getWebpackScriptLoaders(params) {
    const { cwd } = params;
    const scriptRegex = /\.(ts|tsx|js|mjs|jsx)$/;
    const workerRegex = /\.worker.(ts|tsx|js|mjs|jsx)$/;
    const src = path_1.default.join(cwd, 'src');
    const babelLoader = {
        loader: require.resolve('babel-loader'),
        options: {
            babelrc: false,
            configFile: false,
            ...getBabelConfig_1.getBabelConfig({
                cwd,
                modules: false,
            }),
        },
    };
    if (params.useWebWorker) {
        const { chunkPath, publicPath } = params;
        return [
            {
                test: workerRegex,
                include: src,
                use: [
                    {
                        loader: require.resolve('worker-loader'),
                        options: {
                            name: `${chunkPath}[hash].worker.js`,
                            publicPath,
                        },
                    },
                    babelLoader,
                ],
            },
            {
                test: scriptRegex,
                include: src,
                use: babelLoader,
            },
        ];
    }
    else {
        return [
            {
                test: scriptRegex,
                include: src,
                use: babelLoader,
            },
        ];
    }
}
exports.getWebpackScriptLoaders = getWebpackScriptLoaders;
//# sourceMappingURL=getWebpackScriptLoaders.js.map