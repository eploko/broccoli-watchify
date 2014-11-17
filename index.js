var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var es6 = require('es6-promise');
var mkdirp = require('mkdirp');
var browserify = require('browserify');
var watchify = require('watchify');
var Writer = require('broccoli-writer');

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
  var self = this;
  var o = this.options;

  return readTree(this.inputTree).then(function (srcDir) {
    mkdirp.sync(path.join(destDir, path.dirname(o.outputFile)));

    o.browserify.basedir = srcDir;

    var browserifyOptions = o.cache ? _.extend(o.browserify, self.watchifyData) : o.browserify;
    var w = browserify(browserifyOptions);
    if (o.cache) { w = watchify(w); }
      
    o.init(w);

    return new es6.Promise(function (resolve, reject) {
      w.bundle(function (err, data) {
        if (err) {
          reject(err);
        } else {
          fs.writeFileSync(path.join(destDir, o.outputFile), data);
          resolve(destDir);
        }
      });
    });
  });
};

module.exports = Watchify;
