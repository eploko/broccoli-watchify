'use strict';

const fs = require('fs')

module.exports = function updateCacheFromStats(stats, cache) {
  var skipBuild = true;
  for (let i = 0; i < stats.length; i++) {
    const last = stats[i];
    const didExist = last.exists;
    let stat;

    try {
      stat = fs.statSync(last.path);
    } catch(e) {
      if (e.code !== 'ENOENT') { throw e; }
      if (didExist) {
        // if it once existed, but now does not:
        skipBuild = false;
        delete cache[last.path];
      }

      continue; // otherwise, its a load-path file we can ignore
    }

    if (
        (+last.mtime) !== (+stat.mtime) ||
        (last.mode)   !== (stat.mode)   ||
        (last.size)   !== (stat.size)
    ) {

      skipBuild = false;
      delete cache[last.path];
    }
  }

  return skipBuild;
}
