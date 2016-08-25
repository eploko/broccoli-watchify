var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var RSVP = require('rsvp');
var mkdirp = require('mkdirp');
var browserify = require('browserify');
var watchify = require('watchify');
var Plugin = require('broccoli-plugin');
var md5Hex = require('md5hex');

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

Watchify.prototype.build = function () {
  var plugin = this;

  var srcDir = this.inputPaths[0];
  var destDir = this.outputPath;

  var outputFile = destDir + '/' + this.options.outputFile;

  mkdirp.sync(path.basename(outputFile));

  this.options.browserify.basedir = srcDir;

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
