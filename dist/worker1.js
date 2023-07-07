require('./sourcemap-register.js');module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

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

/***/ 212:
/***/ ((module) => {

"use strict";


const WRITE_INDEX = 4
const READ_INDEX = 8

module.exports = {
  WRITE_INDEX,
  READ_INDEX
}


/***/ }),

/***/ 916:
/***/ ((module) => {

"use strict";


const MAX_TIMEOUT = 1000

function wait (state, index, expected, timeout, done) {
  const max = Date.now() + timeout
  let current = Atomics.load(state, index)
  if (current === expected) {
    done(null, 'ok')
    return
  }
  let prior = current
  const check = (backoff) => {
    if (Date.now() > max) {
      done(null, 'timed-out')
    } else {
      setTimeout(() => {
        prior = current
        current = Atomics.load(state, index)
        if (current === prior) {
          check(backoff >= MAX_TIMEOUT ? MAX_TIMEOUT : backoff * 2)
        } else {
          if (current === expected) done(null, 'ok')
          else done(null, 'not-equal')
        }
      }, backoff)
    }
  }
  check(1)
}

// let waitDiffCount = 0
function waitDiff (state, index, expected, timeout, done) {
  // const id = waitDiffCount++
  // process._rawDebug(`>>> waitDiff ${id}`)
  const max = Date.now() + timeout
  let current = Atomics.load(state, index)
  if (current !== expected) {
    done(null, 'ok')
    return
  }
  const check = (backoff) => {
    // process._rawDebug(`${id} ${index} current ${current} expected ${expected}`)
    // process._rawDebug('' + backoff)
    if (Date.now() > max) {
      done(null, 'timed-out')
    } else {
      setTimeout(() => {
        current = Atomics.load(state, index)
        if (current !== expected) {
          done(null, 'ok')
        } else {
          check(backoff >= MAX_TIMEOUT ? MAX_TIMEOUT : backoff * 2)
        }
      }, backoff)
    }
  }
  check(1)
}

module.exports = { wait, waitDiff }


/***/ }),

/***/ 705:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { realImport, realRequire } = __nccwpck_require__(80)
const { workerData, parentPort } = __nccwpck_require__(13)
const { WRITE_INDEX, READ_INDEX } = __nccwpck_require__(212)
const { waitDiff } = __nccwpck_require__(916)

const {
  dataBuf,
  filename,
  stateBuf
} = workerData

let destination

const state = new Int32Array(stateBuf)
const data = Buffer.from(dataBuf)

async function start () {
  let worker
  try {
    if (filename.endsWith('.ts') || filename.endsWith('.cts')) {
      // TODO: add support for the TSM modules loader ( https://github.com/lukeed/tsm ).
      if (!process[Symbol.for('ts-node.register.instance')]) {
        realRequire('ts-node/register')
      } else if (process.env.TS_NODE_DEV) {
        realRequire('ts-node-dev')
      }
      // TODO: Support ES imports once tsc, tap & ts-node provide better compatibility guarantees.
      // Remove extra forwardslash on Windows
      worker = realRequire(decodeURIComponent(filename.replace(process.platform === 'win32' ? 'file:///' : 'file://', '')))
    } else {
      worker = (await realImport(filename))
    }
  } catch (error) {
    // A yarn user that tries to start a ThreadStream for an external module
    // provides a filename pointing to a zip file.
    // eg. require.resolve('pino-elasticsearch') // returns /foo/pino-elasticsearch-npm-6.1.0-0c03079478-6915435172.zip/bar.js
    // The `import` will fail to try to load it.
    // This catch block executes the `require` fallback to load the module correctly.
    // In fact, yarn modifies the `require` function to manage the zipped path.
    // More details at https://github.com/pinojs/pino/pull/1113
    // The error codes may change based on the node.js version (ENOTDIR > 12, ERR_MODULE_NOT_FOUND <= 12 )
    if ((error.code === 'ENOTDIR' || error.code === 'ERR_MODULE_NOT_FOUND') &&
     filename.startsWith('file://')) {
      worker = realRequire(decodeURIComponent(filename.replace('file://', '')))
    } else if (error.code === undefined) {
      // When bundled with pkg, an undefined error is thrown when called with realImport
      worker = realRequire(decodeURIComponent(filename.replace(process.platform === 'win32' ? 'file:///' : 'file://', '')))
    } else {
      throw error
    }
  }

  // Depending on how the default export is performed, and on how the code is
  // transpiled, we may find cases of two nested "default" objects.
  // See https://github.com/pinojs/pino/issues/1243#issuecomment-982774762
  if (typeof worker === 'object') worker = worker.default
  if (typeof worker === 'object') worker = worker.default

  destination = await worker(workerData.workerData)

  destination.on('error', function (err) {
    Atomics.store(state, WRITE_INDEX, -2)
    Atomics.notify(state, WRITE_INDEX)

    Atomics.store(state, READ_INDEX, -2)
    Atomics.notify(state, READ_INDEX)

    parentPort.postMessage({
      code: 'ERROR',
      err
    })
  })

  destination.on('close', function () {
    // process._rawDebug('worker close emitted')
    const end = Atomics.load(state, WRITE_INDEX)
    Atomics.store(state, READ_INDEX, end)
    Atomics.notify(state, READ_INDEX)
    setImmediate(() => {
      process.exit(0)
    })
  })
}

// No .catch() handler,
// in case there is an error it goes
// to unhandledRejection
start().then(function () {
  parentPort.postMessage({
    code: 'READY'
  })

  process.nextTick(run)
})

function run () {
  const current = Atomics.load(state, READ_INDEX)
  const end = Atomics.load(state, WRITE_INDEX)

  // process._rawDebug(`pre state ${current} ${end}`)

  if (end === current) {
    if (end === data.length) {
      waitDiff(state, READ_INDEX, end, Infinity, run)
    } else {
      waitDiff(state, WRITE_INDEX, end, Infinity, run)
    }
    return
  }

  // process._rawDebug(`post state ${current} ${end}`)

  if (end === -1) {
    // process._rawDebug('end')
    destination.end()
    return
  }

  const toWrite = data.toString('utf8', current, end)
  // process._rawDebug('worker writing: ' + toWrite)

  const res = destination.write(toWrite)

  if (res) {
    Atomics.store(state, READ_INDEX, end)
    Atomics.notify(state, READ_INDEX)
    setImmediate(run)
  } else {
    destination.once('drain', function () {
      Atomics.store(state, READ_INDEX, end)
      Atomics.notify(state, READ_INDEX)
      run()
    })
  }
}

process.on('unhandledRejection', function (err) {
  parentPort.postMessage({
    code: 'ERROR',
    err
  })
  process.exit(1)
})

process.on('uncaughtException', function (err) {
  parentPort.postMessage({
    code: 'ERROR',
    err
  })
  process.exit(1)
})


/***/ }),

/***/ 13:
/***/ ((module) => {

"use strict";
module.exports = require("worker_threads");;

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
/******/ 	return __nccwpck_require__(705);
/******/ })()
;
//# sourceMappingURL=worker1.js.map