# broccoli-watchify

The broccoli-watchify plugin bundles your assets with 
[watchify](https://github.com/substack/watchify).

## Installation

```bash
npm install --save-dev broccoli-watchify
```

## Example

```js
var watchify = require('broccoli-watchify');
tree = watchify(tree, options);
```

## API

### watchify(tree, options) 

* `tree`: A [broccoli tree](https://github.com/broccolijs/broccoli#plugin-api-specification) or a directory path as a string

####Options
 
* `entries`: (default `[]`) Array of files to be used as entry points
* `outputFile`: (default `"./browserify.js"`) Output file
* `browserify`: (default `{}`) Options passed to the [browserify constructor](https://github.com/substack/node-browserify#var-b--browserifyfiles-or-opts)
* `require`: (default []) An array of file, option pairs passed to [browserify require method](https://github.com/substack/node-browserify#brequirefile-opts)

## Changelog

### 0.1.0

* Initial release

## Contributors

* [Andrey Subbotin](http://github.com/eploko)
* [Gareth Andrew](http://github.com/gingerhendrix)

## License

The MIT License (MIT). See [LICENSE](LICENSE) for details.

Copyright (c) 2014 Andrey Subbotin
