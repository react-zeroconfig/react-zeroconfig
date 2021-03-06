# `@rocket-scripts/react-preset`

## webpack

- rules
    - `enforce: pre`
        - `eslint-loader`  
    - `oneOf[]`
        - `url-loader` samll image to data uri (bmp, gif, jpe?g, png, webp < 10000)
        - `esbuild-loader + workder-loader` process script (ts, tsx, js, mjs, jsx)
        - `esbuild-loader + @mdx-js/loader` process mdx document (mdx)
        - `raw-loader` plain text (html, ejs, txt, md)
        - `json-loader + yaml-loader` process yaml (yaml, yml)
        - `<mini-css-extract-plugin|style-loader> + css-loader + postcss-loader + [scss-loader|less-loader]` process css (css, module.css, scss, module.scss, less, module.scss)
        - `file-loader` every fallback imports to files
    - `plugins`
        - `WatchIgnorePlugin from 'webpack'` exclude watching `node_modules`
        - `fork-ts-checker-webpack-plugin` check typescript syntax
        
## jest preset

- `transform`
    - `ts|tsx|js|jsx` ‣ esbuild transform
    - `svg` ‣ url and react component 
    - `html|ejs|txt|md` ‣ plain text
    - `yaml|yml` ‣ object
- `moduleNameMapper`
    - `bmp|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga` ‣ mockup string `__FILE__`
    - `css|less|sass|scss` ‣ mockup object `{}`
    - `mdx` ‣ mockup react component
- `setupFilesAfterEnv`
    - `fetch()` from `node-fetch`