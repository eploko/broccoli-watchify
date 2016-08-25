var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var RSVP = require('rsvp');
var mkdirp = require('mkdirp');
var browserify = require('browserify');
var watchify = require('watchify');
var Writer = require('broccoli-writer');

module.exports = Watchify;
function Watchify(inputTree, options) {
  if (!(this instanceof Watchify)) {
    return new Watchify(inputTree, options);
  }
  this.options = _.extend(this.getDefaultOptions(), options);
  this.inputTree = inputTree;
  this.watchifyData = watchify.args;
}

Watchify.prototype = Object.create(Writer.prototype);
Watchify.prototype.constructor = Watchify;
Watchify.prototype.getDefaultOptions = function () {
  return {
    outputFile: '/browserify.js',
    browserify: {},
    cache: true,
    init: function (browserify) {}
  };
};

Watchify.prototype.write = function (readTree, destDir) {
  var plugin = this;
  var options = this.options;

  return readTree(this.inputTree).then(function (srcDir) {
    var outputFile = destDir + '/' + options.outputFile;
    mkdirp.sync(path.basename(outputFile));

    options.browserify.basedir = srcDir;

    var browserifyOptions;

    if (options.cache) {
      browserifyOptions = _.extend(options.browserify, plugin.watchifyData);
    } else {
      browserifyOptions = options.browserify;
    }

    var w = browserify(browserifyOptions);
    if (options.cache) { w = watchify(w); }

    console.log(browserifyOptions)
    options.init(w);
    return new RSVP.Promise(function (resolve, reject) {
      w.bundle(function (err, data) {
        if (err) {
          reject(err);
        } else {
          try {
            fs.writeFileSync(outputFile, data);
            resolve(destDir);
          } catch (e) {
            reject(e);
          }
        }
      });
    });
  });
};
