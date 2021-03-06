/**
 * Webpack configuration for production.
 * 
 * Optimizes and minifies bundle.
 */

const webpack = require("webpack");
const merge = require("webpack-merge");
const commonConfig = require("./webpack.common.js");

module.exports = merge.multiple(commonConfig, {
  main: {
    devtool: "source-map",
    plugins: [
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false
      }),
      new webpack.DefinePlugin({
        "process.env": {
          NODE_ENV: JSON.stringify("production")
        }
      }),
      new webpack.optimize.UglifyJsPlugin({
        beautify: false,
        compress: {
          warnings: false,
          drop_console: true
        },
        comments: false,
        sourceMap: true
      }),
      new webpack.optimize.OccurrenceOrderPlugin(),
      new webpack.optimize.ModuleConcatenationPlugin()
    ]
  }
});
