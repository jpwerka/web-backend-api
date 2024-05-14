import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

export default {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.ts?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              "assumptions": {
                "setPublicClassFields": true,
                "privateFieldsAsSymbols": true
              },
              presets: [
                ['@babel/preset-typescript']
              ],
              plugins: [
                ["@babel/plugin-transform-class-properties"]
              ]
            }
          }
        ],
      },
      {
        loader: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  experiments: {
    outputModule: true,
  },
  optimization: {
    minimize: false
  },
  target: ['web', 'es2020'],
  output: {
    clean: true,
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    chunkFilename: '[chunkhash].js',
    chunkFormat: 'module',
    globalObject: 'this',
    library: {
      type: 'module',
    },
  },
  externals: [
    'uuid',
    'json.date-extensions'
  ],
};