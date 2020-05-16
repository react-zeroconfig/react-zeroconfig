interface BuildParams {
    cwd: string;
    outDir: string;
    tsconfig?: string;
    mode?: 'production' | 'development';
}
export declare function build({ cwd, outDir, tsconfig, mode }: BuildParams): Promise<void>;
export {};