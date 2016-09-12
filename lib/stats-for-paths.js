'use strict';
var fs = require('fs');

module.exports = function statsForPaths(paths) {
  return paths.map(function (path) {
    var stat;
    try {
      stat = fs.statSync(path);
    } catch (e) {
      if (e.code !== 'ENOENT') { throw e; }
      return {
        exists: false,
        path: path,
        mtime: -1,
        mode: -1,
        size: -1
      };
    }

    return {
      exists: true,
      path: path,
      mtime: stat.mtime,
      mode: stat.mode,
      size: stat.size
    };
  });
}
