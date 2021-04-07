/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const createElectronReloadWebpackPlugin = require('electron-reload-webpack-plugin')

const ElectronReloadWebpackPlugin = createElectronReloadWebpackPlugin({
    path: path.join(__dirname, './main.js'),
    logLevel: 0,
})

module.exports = {
    mode: 'development',
    entry: {
        main: './main.ts',
        'app/mainWindow': './src/app/mainWindow.tsx',
        'app/plotWindow': './src/app/plotWindow.tsx',
        'app/configurationWindow': './src/app/preferencesWindow.tsx',
    },
    output: {
        path: __dirname + '/',
        filename: '[name].js',
    },
    // Enable sourcemaps for debugging webpack's output.
    devtool: 'eval',
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js'],
    },
    node: {
        fs: 'empty',
        net: 'empty',
        tls: 'empty',
        __dirname: false,
        __filename: false,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /(node_modules)/,
            },
            // For Plotly https://github.com/plotly/plotly.js/blob/master/BUILDING.md
            {
                test: /\.js$/,
                loader: 'ify-loader',
            },
            /*
            {
                test: /node_modules/,
                loader: 'ify-loader',
                enforce: 'post'
            },*/
            /*{
                test: /\.(html|css)?$/,
                loader: 'file-loader?name=[name].[ext]'
            },*/
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader',
                include: /flexboxgrid/,
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: ['file-loader'],
            },
            {
                enforce: 'pre',
                test: /\.js?$/,
                loader: 'source-map-loader',
                exclude: /(node_modules)/,
            },
            {
                test: /\.worker\.js$/,
                use: { loader: 'worker-loader' },
            },
        ],
    },
    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
    // externals: {
    //     "react": "React",
    //     "react-dom": "ReactDOM",
    // },
    externals: {
        'better-sqlite3': 'commonjs better-sqlite3',
    },
    target: 'electron-main',
    plugins: [ElectronReloadWebpackPlugin()],
}
