module.exports = {
    entry: {
        main: './main.ts',
        mainWindow: './src/app/mainWindow.tsx',
        plotWindow: './src/app/plotWindow.tsx',
        configurationWindow: './src/app/preferencesWindow.tsx',
    },
    output: {
        path: __dirname + '/app',
        filename: '[name].js',
    },
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
                loader: 'file-loader',
            },
            {
                test: /\.(vert|frag|glsl)$/i,
                use: 'raw-loader',
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
}
