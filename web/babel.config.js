// babel.config.js
module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
  plugins: [
    'babel-plugin-styled-components',
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-class-properties',
  ],
  env: {
    production: {
      plugins: [
        [
          'babel-plugin-styled-components',
          {
            displayName: false,
            pure: true,
            ssr: true,
            fileName: false,
          },
        ],
      ],
    },
    development: {
      plugins: [
        [
          'babel-plugin-styled-components',
          {
            displayName: true,
            ssr: true,
          },
        ],
      ],
    },
  },
};
