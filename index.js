var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var RSVP = require('rsvp');
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
};

Watchify.prototype = Object.create(Writer.prototype);
Watchify.prototype.constructor = Watchify;
Watchify.prototype.getDefaultOptions = function () {
  return {
    entries: [],
    outputFile: '/browserify.js',
    browserify: {},
    require: {}
  };
};

Watchify.prototype.write = function (readTree, destDir) {
  var self = this;
  var o = this.options;

  return readTree(this.inputTree).then(function (srcDir) {
    mkdirp.sync(path.join(destDir, path.dirname(o.outputFile)));

    o.browserify.basedir = srcDir;
    var b = browserify(_.extend(o.browserify, self.watchifyData));
    var w = watchify(b);

    for (var i = 0; i < o.entries.length; i++) {
      w.add(o.entries[i]);
    }
    for(var i = 0; i < o.require.length; i++){
      w.require.apply(w, o.require[i]);
    }

    return new RSVP.Promise(function (resolve, reject) {
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
