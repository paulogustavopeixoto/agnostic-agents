// src/tools/adapters/PluginLoader.js
const path = require('path');
const fs = require('fs');

class PluginLoader {
  static loadFromFolder(folderPath) {
    const tools = [];

    const dirs = fs.readdirSync(folderPath);
    for (const dir of dirs) {
      const pluginPath = path.join(folderPath, dir);
      if (fs.existsSync(path.join(pluginPath, 'index.js'))) {
        const plugin = require(pluginPath);
        if (plugin.tools) {
          tools.push(...plugin.tools);
        }
      }
    }

    return tools;
  }
}

module.exports = { PluginLoader };