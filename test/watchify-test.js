var chai = require('chai');
var chaiFiles = require('chai-files');
var fixturify = require('fixturify');
var builder = require('broccoli-builder');
var path = require('path');
var fs = require('fs-extra');
var expect = chai.expect;
var Watchify = require('../');
var RSVP = require('rsvp');

chai.use(chaiFiles);
var file = chaiFiles.file;
var dir = chaiFiles.dir;

require('mocha-jshint')({
  paths: [
    'index.js',
    'test/watchify-test.js'
  ]
});

describe('broccoli-watchify', function() {
  var INPUT_PATH = path.resolve(__dirname , '../tmp/testdir');
  var pipeline;
  beforeEach(function() {
    fs.mkdirpSync(INPUT_PATH);
  });

  afterEach(function() {
    fs.removeSync(INPUT_PATH);
    if (pipeline) {
      pipeline.cleanup();
    }
  });

  it('supports output path with directory', function() {
    fixturify.writeSync(INPUT_PATH, {
      'index.js': "__invoke(require('./a'))",
      'a.js' : "module.exports = 1;"
    });

    var node = new Watchify(INPUT_PATH, {
      outputFile: 'bundled/app.js'
    });

    pipeline = new builder.Builder(node);

    return pipeline.build().then(function(results) {
      fs.statSync(results.directory + '/bundled/app.js');
    });
  });

  it('has stable output', function() {
    fixturify.writeSync(INPUT_PATH, {
      'index.js': "__invoke(require('./a'))",
      'a.js' : "module.exports = 1;"
    });

    var node = new Watchify(INPUT_PATH);

    pipeline = new builder.Builder(node);

    var first;
    return pipeline.build().then(function(results) {
      first = fs.statSync(results.directory + '/browserify.js');
      return new RSVP.Promise(function(resolve){
        // just make sure system with low mtime resolutions are considered,
        // Most legitimate changes include both mtime/size changes, or one of
        // the other, rarely just mtime. So although mtime can be stale, in
        // practice it does not appear to be an issue.
        setTimeout(resolve, 1000);
      }).then(function() {
        return pipeline.build();
      });
    }).then(function(results) {
      var second = fs.statSync(results.directory + '/browserify.js');
      expect(first).to.eql(second);
    });
  });

  it('defaults work', function() {
    fixturify.writeSync(INPUT_PATH, {
      'index.js': "__invoke(require('./a'))",
      'a.js' : "module.exports = 1;"
    });

    var node = new Watchify(INPUT_PATH);

    pipeline = new builder.Builder(node);

    return pipeline.build().then(function(results) {
      var outputFile = results.directory + '/browserify.js';

      expect(file(outputFile)).to.exist; // jshint ignore:line

      var returnResult = evalAndInvoke(outputFile);

      expect(returnResult.value).to.eql(1);
      expect(returnResult.wasCalled).to.eql(1);

      fixturify.writeSync(INPUT_PATH, {
        'a.js' : "module.exports = 222",
      });

      return pipeline.build();
    }).then(function(results) {
      var outputFile = results.directory + '/browserify.js';

      expect(file(outputFile)).to.exist; // jshint ignore:line

      var returnResult = evalAndInvoke(outputFile);

      expect(returnResult.value).to.eql(222);
      expect(returnResult.wasCalled).to.eql(1);
    });
  });


  function evalAndInvoke(file) {
    var wasCalled = 0;
    var value;

    function __invoke(a) {
      wasCalled++;
      value = a;
    }

    var source = fs.readFileSync(file, 'UTF8');
    eval(source); // jshint ignore:line

    return {
      value: value,
      wasCalled: wasCalled,
      source: source
    };
  }
});

