/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const createElectronReloadWebpackPlugin = require('electron-reload-webpack-plugin')

const ElectronReloadWebpackPlugin = createElectronReloadWebpackPlugin({
    path: path.join(__dirname, './app/main.js'),
    logLevel: 0,
})

const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
    mode: 'development',
    devtool: 'cheap-source-map', //Would use eval, but all of the eval options cause issues with sqlite in web workers.
    plugins: [ElectronReloadWebpackPlugin()],
})
