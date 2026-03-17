const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const blockList = [
  /[\/\\]\.local[\/\\]/,
  /[\/\\]\.git[\/\\]/,
];

config.resolver = {
  ...config.resolver,
  blockList: [
    ...(Array.isArray(config.resolver?.blockList) ? config.resolver.blockList : []),
    ...blockList,
  ],
};

module.exports = config;
