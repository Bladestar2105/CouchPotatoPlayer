const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './index.web.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx|mjs)$/,
        exclude: /node_modules\/(?!(react-native-vector-icons|react-native-video|react-native-svg|lucide-react-native|@react-native-async-storage|@react-navigation|react-native-screens|react-native-safe-area-context|zustand|m3u8-parser)\/).*/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['module:@react-native/babel-preset', { disableImportExportTransform: true }],
            ],
            plugins: ['react-native-web'],
            sourceType: 'unambiguous'
          },
        },
        resolve: {
          fullySpecified: false,
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
    },
    extensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.ts', '.tsx', '.json', '.mjs'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    static: path.join(__dirname, 'public'),
    compress: true,
    port: 8080,
  },
};
