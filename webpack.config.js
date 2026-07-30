const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      ...(Array.isArray(options.externals) ? options.externals : []),
      nodeExternals({
        modulesDir: path.resolve(__dirname, 'apps/core-service/node_modules'),
        additionalModuleDirs: [path.resolve(__dirname, 'node_modules')],
        allowlist: [/^@lib\//], // bundle internal workspace libs, don't externalize them
      }),
    ],
    resolve: {
      ...options.resolve,
      plugins: [
        ...(options.resolve.plugins || []),
        new TsconfigPathsPlugin({
          configFile: './tsconfig.json',
        }),
      ],
    },
  };
};