var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var RSVP = require('rsvp');
var mkdirp = require('mkdirp');
var browserify = require('browserify');
var watchify = require('watchify');
var Plugin = require('broccoli-plugin');
var md5Hex = require('md5hex');
var TreeSync = require('tree-sync');

module.exports = Watchify;
function Watchify(inputTree, options) {
  if (!(this instanceof Watchify)) {
    return new Watchify(inputTree, options);
  }
  Plugin.call(this, [inputTree], options);
  this._persistentOutput = true;
  this.options = _.extend(this.getDefaultOptions(), options);
  this.watchifyData = watchify.args;

  this._fileToChecksumMap = Object.create(null); // TODO: extract SP
  this._tree = undefined;
}

Watchify.prototype = Object.create(Plugin.prototype);
Watchify.prototype.constructor = Watchify;
Watchify.prototype.getDefaultOptions = function () {
  return {
    outputFile: '/browserify.js',
    browserify: {},
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

  var outputFile = destDir + '/' + this.options.outputFile;

  mkdirp.sync(this.outputPath + '/' + path.dirname(outputFile));

  this.options.browserify.basedir = this.cachePath;

  var browserifyOptions;

  if (this.options.cache) {
    browserifyOptions = _.extend(this.options.browserify, this.watchifyData);
  } else {
    browserifyOptions = this.options.browserify;
  }

  var w = browserify(browserifyOptions);
  if (this.options.cache) { w = watchify(w); }

  this.options.init(w);

  return new RSVP.Promise(function (resolve, reject) {
    w.bundle(function (err, data) {
      if (err) {
        reject(err);
      } else {
        try {
          plugin.writeFileIfContentChanged(outputFile, data);
          resolve(destDir);
        } catch (e) {
          reject(e);
        }
      }
    });
  });
};
