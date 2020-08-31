module.exports = {
  entry: {
    main: './main.js',
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { pragma: 'createElement' }],
            ],
          },
        },
      },
    ],
  },
};
