// webpack.config.js  (или .cjs)
const path = require('path');
const webpack = require('webpack'); // Needed for some Node.js specific configurations
const nodeExternals = require('webpack-node-externals');

/** @type import('webpack').Configuration */
const extensionConfig = {
  target: 'node',
  mode: 'none',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.cjs',
    libraryTarget: 'commonjs2'
  },
  //externals:{vscode: 'commonjs vscode'},
  
 
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Learn more: https://webpack.js.org/configuration/externals/
    // Add sqlite3 to externals. This tells Webpack not to bundle it,
    // assuming it will be available at runtime.
    // However, for native modules like sqlite3, you *also* need to ensure it's built
    // for the correct Node.js version, which npm install/rebuild usually handles.
    'sqlite3': 'commonjs sqlite3', // Explicitly declare sqlite3 as external
    // If you have other native modules, add them here too
    ...nodeExternals({ // This helps exclude other modules found in node_modules
        modulesDir: path.resolve(__dirname, 'node_modules'),
        // You might need to explicitly allow certain modules if they are not native
        // and you want Webpack to bundle them.
        // allowlist: []
    })
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: { level: 'log' }
};

module.exports = [ extensionConfig ];
