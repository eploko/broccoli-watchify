'use strict';

const assignIn = require('lodash.assignin');
const fs = require('fs-extra');
const path = require('path');
const RSVP = require('rsvp');
const mkdirp = require('mkdirp');
const browserify = require('browserify');
const Plugin = require('broccoli-plugin');
const md5Hex = require('md5hex');
const TreeSync = require('tree-sync');
const nodeModulesPath = require('node-modules-path');
const symlinkOrCopySync = require('symlink-or-copy').sync;

const statsForPaths = require('./lib/stats-for-paths');
const updateCacheFromStats = require('./lib/update-cache-from-stats');
const through = require('through2');
const xtend = require('xtend');

module.exports = function(inputTree, options) {
  return new Watchify(inputTree, options);
}

class Watchify extends Plugin {
  constructor(inputTree, options) {
    super([inputTree], options);
    this._persistentOutput = true;
    this.options = assignIn(this.getDefaultOptions(), options);
    this.clearCache();

    this._fileToChecksumMap = Object.create(null); // TODO: extract SP
    this._tree = undefined;
    this._last = false;
  }

  getDefaultOptions() {
    return {
      outputFile: '/browserify.js',
      browserify: {
        entries: ['index.js'],
      },
      cache: true,
      init: function (browserify) {},
      nodeModulesPath: nodeModulesPath(process.cwd())
    };
  }

  writeFileIfContentChanged(fullPath, content) {
    const previous = this._fileToChecksumMap[fullPath];
    const next = md5Hex(content);

    if (previous === next) {
      // hit
    } else {
      fs.mkdirpSync(path.dirname(fullPath));
      fs.writeFileSync(fullPath, content);
      this._fileToChecksumMap[fullPath] = next; // update map
    }
  }

  syncInputAndCache() {
    // node doesn't like symlinks, specifically node x, where x is a symlink will
    // actually execute with __dirname of the realpath of that symlink. So to
    // make this work, we deference our inputPath[0] into our cachePath, where we
    // run browserify/watchify without browserify being aware it is actually
    // operating on symlinked copies of stuff.
    //
    // Note: we likely though, don't want to materialize something like
    // node_modules. We should investigate this in the future.
    if (this._tree === undefined) {
      symlinkOrCopySync(this.options.nodeModulesPath, this.cachePath + '/node_modules');
      this._tree = new TreeSync(this.inputPaths[0], this.cachePath + '/build');
    }

    this._tree.sync();
  }

  build() {
    this.syncInputAndCache();

    const plugin = this;

    const srcDir = this.inputPaths[0];
    const destDir = this.outputPath;

    const outputDir = path.dirname(this.options.outputFile);
    const outputFile = destDir + '/' + this.options.outputFile;

    mkdirp.sync(this.outputPath + '/' + path.dirname(outputDir));

    this.options.browserify.paths = [ this.cachePath + '/node_modules' ];
    this.options.browserify.basedir = this.cachePath + '/build';

    const browserifyOptions = assignIn(this.options.browserify, this.watchifyData);

    if (this.options.cache && this._last) {
      const skipBuild = this.updateCaches();
      if (skipBuild) { return; }
    }

    const b = browserify(browserifyOptions);

    if (this.options.cache) {
      b.on('reset', collect.bind(null, b));
      collect(b);
    }

    this.options.init(b);

    return new RSVP.Promise((resolve, reject) => {
      b.bundle((err, data) => {
        try {
          if (err) {
            plugin.clearCache();
            reject(err);
          } else {
            plugin.statDependencies();
            plugin.writeFileIfContentChanged(outputFile, data);
            resolve(destDir);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  statDependencies() {
    this._last = statsForPaths(Object.keys(this.watchifyData.cache));
    this._lastPackages = statsForPaths(Object.keys(this.watchifyData.packageCache));
  }

  updateCaches() {
    const last = updateCacheFromStats(this._last, this.watchifyData.cache);
    const lastPackages = updateCacheFromStats(this._lastPackages, this.watchifyData.packageCache);

    return last && lastPackages;
  }

  clearCache() {
    this._last = false;
    this._lastPackages = false;
    this.watchifyData = {
      cache: {},
      packageCache: {}
    };
  }
}

module.exports.Class = Watchify;
// extracted from watchify
function collect (b) {
  b.pipeline.get('deps').push(through.obj(function(row, enc, next) {
    let file = row.expose ? b._expose[row.id] : row.file;
    b._options.cache[file] = {
      source: row.source,
      deps: xtend(row.deps)
    };
    this.push(row);
    next();
  }));
}
