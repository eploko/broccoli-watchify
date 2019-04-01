'use strict';

const chai = require('chai');
const chaiFiles = require('chai-files');
const fixturify = require('fixturify');
const Builder = require('broccoli').Builder;
const path = require('path');
const fs = require('fs-extra');
const expect = chai.expect;
const Watchify = require('../');
const RSVP = require('rsvp');

chai.use(chaiFiles);
const file = chaiFiles.file;
const dir = chaiFiles.dir;

describe('broccoli-watchify', function() {
  const INPUT_PATH = path.resolve(__dirname , '../tmp/testdir');
  let pipeline;
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
      'index.js': "__invoke(require('./a')); require('chai')",
      'a.js' : "module.exports = 1;"
    });

    const node = new Watchify(INPUT_PATH, {
      outputFile: 'bundled/app.js'
    });

    pipeline = new Builder(node);

    return pipeline.build().then(() => {
      fs.statSync(pipeline.outputPath + '/bundled/app.js');
    });
  });

  it('has stable output', function() {
    fixturify.writeSync(INPUT_PATH, {
      'index.js': "__invoke(require('./a')); require('chai')",
      'a.js' : "module.exports = 1;"
    });

    const node = new Watchify(INPUT_PATH);

    pipeline = new Builder(node);

    let first;
    return pipeline.build().then(function() {
      first = fs.statSync(pipeline.outputPath + '/browserify.js');
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
      var second = fs.statSync(pipeline.outputPath + '/browserify.js');
      expect(first).to.eql(second);
    });
  });

  it('defaults work', function() {
    fixturify.writeSync(INPUT_PATH, {
      'index.js': "__invoke(require('./a')); require('chai')",
      'a.js' : "module.exports = 1;"
    });

    const node = new Watchify(INPUT_PATH);

    pipeline = new Builder(node);

    return pipeline.build().then(function() {
      const outputFile = pipeline.outputPath + '/browserify.js';

      expect(file(outputFile)).to.exist; // jshint ignore:line

      const returnResult = evalAndInvoke(outputFile);

      expect(returnResult.value).to.eql(1);
      expect(returnResult.wasCalled).to.eql(1);

      fixturify.writeSync(INPUT_PATH, {
        'a.js' : "module.exports = 222",
      });

      return pipeline.build();
    }).then(function(results) {
      const outputFile = pipeline.outputPath + '/browserify.js';

      expect(file(outputFile)).to.exist; // jshint ignore:line

      const returnResult = evalAndInvoke(outputFile);

      expect(returnResult.value).to.eql(222);
      expect(returnResult.wasCalled).to.eql(1);
    });
  });


  function evalAndInvoke(file) {
    let wasCalled = 0;
    let value;

    function __invoke(a) {
      wasCalled++;
      value = a;
    }

    const source = fs.readFileSync(file, 'UTF8');
    eval(source); // jshint ignore:line

    return {
      value: value,
      wasCalled: wasCalled,
      source: source
    };
  }
});
