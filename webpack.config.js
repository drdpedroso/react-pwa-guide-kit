'use strict';

const path = require('path');
const {LoaderOptionsPlugin, DefinePlugin, optimize} = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const isWebpack = require('is-webpack');
const SWPrecacheWebpackPlugin = isWebpack ? require('sw-precache-webpack-plugin') : require('sw-precache-webpack-plugin');
const pkg = require('./package.json');
const dotenvSafe = require('dotenv-safe').load();

module.exports = ({production = false}) => {
  process.env.NODE_ENV = production ? 'production' : 'development';

  const firebaseConfig = JSON.stringify({
    apiKey: process.env.FIREBASE_API_KEY,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID
  });

  const webpackConfig = {
    entry: {
      main: ['./src/index.js'],
      vendor: ['react', 'react-dom', 'react-router', 'material-ui', 'firebase']
    },
    output: {
      path: path.resolve(__dirname, './build'),
			filename: '[name].js'
    },
    module: {
      loaders: [{
        test: /\.(js|jsx)$/,
        include: path.resolve(__dirname, './src'),
        loaders: 'babel-loader'
      }]
    },
    plugins: [
      new DefinePlugin({
        FIREBASE_CONFIG: firebaseConfig,
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }),
      new CopyWebpackPlugin([{
        context: './public',
        from: '*.*'
      }, {
        from: './src/firebase-messaging-sw.js',
        to: 'firebase-messaging-sw.js',
        transform: (content, from) => {
          return content.toString().replace(/FIREBASE_CONFIG/, firebaseConfig);
        }
      }]),
      new SWPrecacheWebpackPlugin({
        cacheId: `${pkg.name}-${pkg.version}`,
        stripPrefix: './build',
        staticFileGlobs: [
          path.join(path.resolve(__dirname, './build'), '**/*')
        ],
        runtimeCaching: [{
          urlPattern: /https:\/\/.+.firebaseio.com/,
          handler: 'networkFirst'
        }],
        logger: function () {},
        filename: 'sw.js',
        minify: production
      }),
      new optimize.CommonsChunkPlugin({
        name: ['vendor']
      })
    ],
    devServer: {
      contentBase: './public',
      inline: true,
      host: 'localhost',
      port: 8080
    }
  };

  if (production) {
    webpackConfig.plugins = webpackConfig.plugins.concat([
       new LoaderOptionsPlugin({
        minimize: true,
        debug: false
      }),
      new optimize.UglifyJsPlugin()
    ]);
  }

  return webpackConfig;
};