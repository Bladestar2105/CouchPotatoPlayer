const path = require('path');
const webpack = require('webpack');
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
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(js|jsx|ts|tsx|mjs)$/,
        exclude: /node_modules\/(?!(react-native-vector-icons|react-native-video|react-native-svg|lucide-react-native|@react-native-async-storage|@react-navigation|react-native-screens|react-native-safe-area-context|zustand|m3u8-parser|react-native-file-access)\/).*/,
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
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    static: path.join(__dirname, 'public'),
    compress: true,
    port: 8080,
    // Dynamic proxy: forwards /proxy/{url} to the actual target URL
    // This is required for IPTV-Manager API calls and stream URLs (CORS bypass)
    setupMiddlewares: (middlewares, devServer) => {
      devServer.app.use('/proxy', (req, res) => {
        // Extract the target URL from the path after /proxy/
        const targetUrl = req.url.slice(1); // remove leading /
        if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
          res.status(400).send('Invalid proxy target URL');
          return;
        }

        // Build full URL with query string
        const http = require(targetUrl.startsWith('https') ? 'https' : 'http');
        const parsedUrl = new URL(targetUrl);

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: req.method,
          headers: {
            ...req.headers,
            host: parsedUrl.host,
          },
          // Don't verify SSL for IPTV servers with self-signed certs
          rejectUnauthorized: false,
        };

        // Remove browser-specific headers that cause issues
        delete options.headers.origin;
        delete options.headers.referer;
        delete options.headers['accept-encoding'];

        const proxyReq = http.request(options, (proxyRes) => {
          // Set CORS headers on the response
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');

          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
          console.error('Proxy error:', err.message);
          if (!res.headersSent) {
            res.status(502).send(`Proxy error: ${err.message}`);
          }
        });

        // Handle OPTIONS preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.status(204).end();
          return;
        }

        req.pipe(proxyReq, { end: true });
      });

      return middlewares;
    },
  },
};