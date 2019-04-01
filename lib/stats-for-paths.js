'use strict';

const fs = require('fs');

module.exports = function statsForPaths(paths) {
  return paths.map(path => {
    let stat;
    try {
      stat = fs.statSync(path);
    } catch (e) {
      if (e.code !== 'ENOENT') { throw e; }
      return {
        exists: false,
        path,
        mtime: -1,
        mode: -1,
        size: -1
      };
    }

    return {
      exists: true,
      path,
      mtime: stat.mtime,
      mode: stat.mode,
      size: stat.size
    };
  });
}
