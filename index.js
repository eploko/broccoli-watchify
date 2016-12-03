var assignIn = require('lodash.assignin');
var fs = require('fs-extra');
var path = require('path');
var RSVP = require('rsvp');
var mkdirp = require('mkdirp');
var browserify = require('browserify');
var Plugin = require('broccoli-plugin');
var md5Hex = require('md5hex');
var TreeSync = require('tree-sync');

var statsForPaths = require('./lib/stats-for-paths');
var updateCacheFromStats = require('./lib/update-cache-from-stats');
var through = require('through2');
var xtend = require('xtend');

module.exports = Watchify;
function Watchify(inputTree, options) {
  if (!(this instanceof Watchify)) {
    return new Watchify(inputTree, options);
  }
  Plugin.call(this, [inputTree], options);
  this._persistentOutput = true;
  this.options = assignIn(this.getDefaultOptions(), options);
  this.clearCache();

  this._fileToChecksumMap = Object.create(null); // TODO: extract SP
  this._tree = undefined;
  this._last = false;
}

Watchify.prototype = Object.create(Plugin.prototype);
Watchify.prototype.constructor = Watchify;
Watchify.prototype.getDefaultOptions = function () {
  return {
    outputFile: '/browserify.js',
    browserify: {
      entries: ['index.js'],
    },
    cache: true,
    init: function (browserify) {}
  };
};

Watchify.prototype.writeFileIfContentChanged = function(fullPath, content) {
  var previous = this._fileToChecksumMap[fullPath];
  var next = md5Hex(content);

  if (previous === next) {
    // hit
  } else {
    fs.mkdirpSync(path.dirname(fullPath));
    fs.writeFileSync(fullPath, content);
    this._fileToChecksumMap[fullPath] = next; // update map
  }
};

Watchify.prototype.syncInputAndCache = function() {
  // node doesn't like symlinks, specifically node x, where x is a symlink will
  // actually execute with __dirname of the realpath of that symlink. So to
  // make this work, we deference our inputPath[0] into our cachePath, where we
  // run browserify/watchify without browserify being aware it is actually
  // operating on symlinked copies of stuff.
  //
  // Note: we likely though, don't want to materialize something like
  // node_modules. We should investigate this in the future.
  if (this._tree === undefined) {
    this._tree = new TreeSync(this.inputPaths[0], this.cachePath);
  }

  this._tree.sync();
};

Watchify.prototype.build = function () {
  this.syncInputAndCache();

  var plugin = this;

  var srcDir = this.inputPaths[0];
  var destDir = this.outputPath;

  var outputDir = path.dirname(this.options.outputFile);
  var outputFile = destDir + '/' + this.options.outputFile;

  mkdirp.sync(this.outputPath + '/' + path.dirname(outputDir));

  this.options.browserify.basedir = this.cachePath;

  var browserifyOptions = assignIn(this.options.browserify, this.watchifyData);

  if (this.options.cache && this._last) {
    var skipBuild = this.updateCaches();
    if (skipBuild) { return; }
  }

  var b = browserify(browserifyOptions);

  if (this.options.cache) {
    b.on('reset', collect.bind(null, b));
    collect(b);
  }

  this.options.init(b);

  return new RSVP.Promise(function (resolve, reject) {
    b.bundle(function (err, data) {
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
};

Watchify.prototype.statDependencies = function() {
  this._last = statsForPaths(Object.keys(this.watchifyData.cache));
  this._lastPackages = statsForPaths(Object.keys(this.watchifyData.packageCache));
};

Watchify.prototype.updateCaches = function() {
  var last = updateCacheFromStats(this._last, this.watchifyData.cache);
  var lastPackages = updateCacheFromStats(this._lastPackages, this.watchifyData.packageCache);

  return last && lastPackages;
};

Watchify.prototype.clearCache = function() {
  this._last = false;
  this._lastPackages = false;
  this.watchifyData = {
    cache: {},
    packageCache: {}
  };
};

// extracted from watchify
function collect (b) {
  b.pipeline.get('deps').push(through.obj(function(row, enc, next) {
    var file = row.expose ? b._expose[row.id] : row.file;
    b._options.cache[file] = {
      source: row.source,
      deps: xtend(row.deps)
    };
    this.push(row);
    next();
  }));
}
