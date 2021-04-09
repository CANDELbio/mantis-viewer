/* eslint-disable @typescript-eslint/no-var-requires */
const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
    mode: 'production',
    // Enable sourcemaps for debugging webpack's output.
    devtool: 'source-map',
    optimization: {
        // Optimization from production mode that breaks better-sqlite3 in web workers so we disable it.
        minimize: false,
    },
})
