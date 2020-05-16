export const collectPackageScripts: { extensions: string[]; excludes: string[]; includes: string[] } = {
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  excludes: [
    // exclude tests
    '**/*.spec.js',
    '**/*.spec.jsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.test.js',
    '**/*.test.jsx',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/__tests__',
    '**/__test__',

    // exclude public
    '**/public',
  ],
  includes: ['**/*'],
};
