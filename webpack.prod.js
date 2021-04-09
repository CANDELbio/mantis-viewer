/* eslint-disable @typescript-eslint/no-var-requires */
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

// Mode production breaks better-sqlite3 in webworkers.
// Can go through this to try applying optimizations individually
// https://v4.webpack.js.org/configuration/mode/
// Maybe try upgrading to webpack v5 too.
module.exports = merge(common, {
    mode: 'development',
    // Enable sourcemaps for debugging webpack's output.
    devtool: 'source-map',
})
