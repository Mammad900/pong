const path = require('path');
module.exports = {
  mode: "development",
  entry: './script.ts',
  output: {
    filename: './script.js',
    path: path.resolve(__dirname, '.'),
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
};