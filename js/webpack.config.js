var webpack = require('webpack');
var version = require('./package.json').version;
const path = require('path');

rules = [{
    test: /\.ts$/,
    enforce: 'pre',
    loader: 'tslint-loader'
}, {
    test: /\.ts?$/,
    loader: "ts-loader",
    exclude: path.resolve(__dirname, "node_modules")
}, {
    test: /\.html$/,
    use: [{
        loader: 'html-loader'
    }],
}, {
    test: /\.css$/,
    loader: "style-loader!css-loader"
}, {
    test: /\.json$/,
    loader: 'json-loader'
}];

module.exports = [{ // Notebook extension
        //
        // This bundle only contains the part of the JavaScript that is run on
        // load of the notebook. This section generally only performs
        // some configuration for requirejs, and provides the legacy
        // "load_ipython_extension" function which is required for any notebook
        // extension.
        //
        entry: './src/extension.js',
        output: {
            filename: 'extension.js',
            path: path.resolve(__dirname, '..', 'aispace', 'static'),
            libraryTarget: 'amd'
        }
    },
    { // Bundle for the notebook containing the custom widget views and models
        //
        // This bundle contains the implementation for the custom widget views and
        // custom widget.
        // It must be an amd module
        //
        entry: './src/index.ts',
        output: {
            filename: 'index.js',
            path: path.resolve(__dirname, '..', 'aispace', 'static'),
            libraryTarget: 'amd'
        },
        devtool: 'source-map',
        module: {
            rules: rules
        },
        resolve: {
            extensions: [".tsx", ".ts", ".js"]
        },
        externals: ['jupyter-js-widgets'],
        plugins: [new webpack.optimize.ModuleConcatenationPlugin()]
    },
    { // Embeddable aispace bundle
        //
        // This bundle is generally almost identical to the notebook bundle
        // containing the custom widget views and models.
        //
        // The only difference is in the configuration of the webpack public path
        // for the static assets.
        //
        // It will be automatically distributed by unpkg to work with the static
        // widget embedder.
        //
        // The target bundle is always `dist/index.js`, which is the path required
        // by the custom widget embedder.
        //
        entry: './src/embed.js',
        output: {
            filename: 'index.js',
            path: path.resolve(__dirname, 'dist'),
            libraryTarget: 'amd',
            publicPath: 'https://unpkg.com/aispace@' + version + '/dist/'
        },
        devtool: 'source-map',
        module: {
            rules: rules
        },
        externals: ['jupyter-js-widgets']
    }
];