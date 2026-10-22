const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      ...(Array.isArray(options.externals) ? options.externals : []),
      nodeExternals({
        modulesDir: path.resolve(__dirname, 'apps/api-service/node_modules'),
        additionalModuleDirs: [path.resolve(__dirname, 'node_modules')],
        allowlist: [/^@lib\//], // bundle internal workspace libs, don't externalize them
      }),
      // Force webpack to leave argon2 alone and load it from node_modules at runtime
      {
        argon2: 'commonjs argon2',
      },
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
