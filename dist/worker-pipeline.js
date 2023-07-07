require('./sourcemap-register.js');module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 56:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { realImport, realRequire } = __nccwpck_require__(80)

module.exports = loadTransportStreamBuilder

/**
 * Loads & returns a function to build transport streams
 * @param {string} target
 * @returns {function(object): Promise<import('stream').Writable>}
 * @throws {Error} In case the target module does not export a function
 */
async function loadTransportStreamBuilder (target) {
  let fn
  try {
    const toLoad = 'file://' + target

    if (toLoad.endsWith('.ts') || toLoad.endsWith('.cts')) {
      // TODO: add support for the TSM modules loader ( https://github.com/lukeed/tsm ).
      if (process[Symbol.for('ts-node.register.instance')]) {
        realRequire('ts-node/register')
      } else if (process.env && process.env.TS_NODE_DEV) {
        realRequire('ts-node-dev')
      }
      // TODO: Support ES imports once tsc, tap & ts-node provide better compatibility guarantees.
      fn = realRequire(decodeURIComponent(target))
    } else {
      fn = (await realImport(toLoad))
    }
  } catch (error) {
    // See this PR for details: https://github.com/pinojs/thread-stream/pull/34
    if ((error.code === 'ENOTDIR' || error.code === 'ERR_MODULE_NOT_FOUND')) {
      fn = realRequire(target)
    } else if (error.code === undefined) {
      // When bundled with pkg, an undefined error is thrown when called with realImport
      fn = realRequire(decodeURIComponent(target))
    } else {
      throw error
    }
  }

  // Depending on how the default export is performed, and on how the code is
  // transpiled, we may find cases of two nested "default" objects.
  // See https://github.com/pinojs/pino/issues/1243#issuecomment-982774762
  if (typeof fn === 'object') fn = fn.default
  if (typeof fn === 'object') fn = fn.default
  if (typeof fn !== 'function') throw Error('exported worker is not a function')

  return fn
}


/***/ }),

/***/ 761:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const EE = __nccwpck_require__(614)
const loadTransportStreamBuilder = __nccwpck_require__(56)
const { pipeline, PassThrough } = __nccwpck_require__(413)

// This file is not checked by the code coverage tool,
// as it is not reliable.

/* istanbul ignore file */

module.exports = async function ({ targets }) {
  const streams = await Promise.all(targets.map(async (t) => {
    const fn = await loadTransportStreamBuilder(t.target)
    const stream = await fn(t.options)
    return stream
  }))
  const ee = new EE()

  const stream = new PassThrough({
    autoDestroy: true,
    destroy (_, cb) {
      ee.on('error', cb)
      ee.on('closed', cb)
    }
  })

  pipeline(stream, ...streams, function (err) {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      ee.emit('error', err)
      return
    }

    ee.emit('closed')
  })

  return stream
}


/***/ }),

/***/ 80:
/***/ ((module) => {

/* eslint-disable no-new-func, camelcase */
/* globals __non_webpack__require__ */

const realImport = new Function('modulePath', 'return import(modulePath)')

function realRequire(modulePath) {
  if (typeof __non_webpack__require__ === 'function') {
    return __non_webpack__require__(modulePath)
  }

  return require(modulePath)
}

module.exports = { realImport, realRequire }


/***/ }),

/***/ 614:
/***/ ((module) => {

"use strict";
module.exports = require("events");;

/***/ }),

/***/ 413:
/***/ ((module) => {

"use strict";
module.exports = require("stream");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	__nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __nccwpck_require__(761);
/******/ })()
;
//# sourceMappingURL=worker-pipeline.js.map