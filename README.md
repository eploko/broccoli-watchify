# broccoli-watchify [![Build Status](https://travis-ci.org/eploko/broccoli-watchify.svg)](https://travis-ci.org/eploko/broccoli-watchify)
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/eploko/broccoli-watchify?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

The broccoli-watchify plugin bundles your assets with
[watchify](https://github.com/substack/watchify).

## Installation

```bash
npm install --save-dev broccoli-watchify
```

## Example

```js
var watchify = require('broccoli-watchify');

var options = {
  browserify: {
    entries: ['./app.js'],
    debug: true
  },
  outputFile: 'bundled/app.js',
  cache: true,
  init: function (b) {
    b.transform('reactify', {'es6': true});
    b.external('$');
  }
};

var tree = watchify(tree, options);
```

## API

### watchify(tree, options)

* `tree`: A [broccoli tree](https://github.com/broccolijs/broccoli#plugin-api-specification) or a directory path as a string

####Options

* `browserify`: (defaults to `{}`) Options passed to the [browserify constructor](https://github.com/substack/node-browserify#var-b--browserifyfiles-or-opts)
* `outputFile`: (defaults to `"./browserify.js"`) Output file
* `cache`: (defaults to `true`) A boolean flag to potentially switch the caching off and act like a plain browserify. Can be helpful in assembling bundles for production and _not_ including all the full local path names in the bundle, which is not possible in the watchify mode.
* `init`: (defaults to a no-op) A callback function that receives the browserify instance after it's created. Use this to call any of the [browserify API methods](https://github.com/substack/node-browserify#methods) on the instance, including `add`, `require`, `external`, `exclude` and so on.

## Changelog

### 1.0.0

* no longer use watchify directly, as we do not require its watcher and it is not configurable. Rather we populate the cache, the same way watchify does.
* stable output, so downstream plugins don't invalidated if our output doesn't change
* much faster
* basic tests
* browserified files are browserified relative to the broccoli inputPath not the realpath.

### 0.2.0

* Add the `init` option to provide a possibility of configuration of the browserify instance with a custom function.
* Remove the `entries` and `require` options.
* Add the `cache` option to turn off the watchify behavior and act like a plain browserify.

### 0.1.3

* Initial release

## Contributors

The code of this plugin is originally based on the [broccoli-browserify](https://github.com/gingerhendrix/broccoli-browserify) plugin by [Gareth Andrew](http://github.com/gingerhendrix).

## License

The MIT License (MIT). See [LICENSE](LICENSE) for details.

Copyright © 2014 Andrey Subbotin.
