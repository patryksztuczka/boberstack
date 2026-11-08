import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getDefaultConfig } from "expo/metro-config";
import { withUniwindConfig } from "uniwind/metro";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...new Set([...config.watchFolders, resolve(projectRoot, "../..")])];

export default withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});
