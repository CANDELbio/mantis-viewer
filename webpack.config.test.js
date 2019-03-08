module.exports = {
    mode: 'development',
    entry: {
        mainWindow: './src/app/mainWindow.tsx',
        plotWindow: './src/app/plotWindow.tsx',
    },
    output: {
        path: __dirname + '/app-test',
        filename: '[name].js',
    },
    // Enable sourcemaps for debugging webpack's output.
    devtool: 'source-map',
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
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader',
                include: /flexboxgrid/,
            },
            {
                enforce: 'pre',
                test: /\.js?$/,
                loader: 'source-map-loader',
                exclude: /(node_modules)/,
            },
        ],
    },
    externals: {
        canvas: 'commonjs canvas', // Excludes canvas from being bundled. Use canvas for pixi
    },
    target: 'node',
}
