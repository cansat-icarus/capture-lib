import test from 'ava'
import Serial from '../src/serial'

const dummyParser = (emitter, buf) => emitter.emit('data', buf)

function emitTest (event) {
  return t => {
    t.context.serial.on(event, ::t.end)
    t.context.serial._port.emit(event)
  }
}

function stateTest (state, event = state) {
  return t => {
    t.context.serial.on('stateChange', newState => {
      t.is(newState, state)
      t.is(t.context.serial._state, state)
      t.end()
    })
    t.context.serial._port.emit(event)
  }
}

test.beforeEach(t => {
  t.context.serial = new Serial(dummyParser)
  return t.context.serial.setPath('do not use me')
    .then(::t.context.serial._createPort)
})

test('constructor()', t => {
  t.is(t.context.serial._baud, 19200)
  t.is(t.context.serial._parser, dummyParser)
  t.is(t.context.serial._state, 'close')

  const serial = new Serial(dummyParser, 9600)
  t.true(!serial._port)
  t.true(!serial._path)
  t.is(serial._baud, 9600)
})

test('setPath() with no port setup', t => {
  // Simple change, no stopping or destroying ports
  return t.context.serial._destroyPort()
    .then(() => t.context.serial.setPath('a path'))
    .then(() => t.is(t.context.serial._path, 'a path'))
})

test('setPath() with a closed port', t => {
  // Change, with a port created
  return t.context.serial._createPort()
    .then(() => t.context.serial.setPath('another path'))
    .then(() => {
      t.is(t.context.serial._path, 'another path')
      t.is(t.context.serial._port.path, 'another path')
    })
})

test('setPath() with an open port', t => {
  let fakeOpenCalled = false

  // Fake port opening (and close safeguard)
  t.context.serial._port.isOpen = () => true
  t.context.serial._port.close = cb => cb()

  // Inject serial.open() watcher
  t.context.serial.open = () => {
    fakeOpenCalled = true
    return Promise.resolve()
  }

  // Set a path with an open port
  return t.context.serial.setPath('yet another path')
    .then(() => {
      t.is(t.context.serial._path, 'yet another path')
      t.true(fakeOpenCalled)
    })
})

test('open() creates the port if it does not exist', t => {
  // _createPort watcher
  let createPortCalled = false
  t.context.serial._createPort = () => {
    createPortCalled = true
    t.context.serial._port = { isOpen: () => false, open: (cb) => cb() }
    return Promise.resolve()
  }

  // Try opening a port, after its destruction
  return t.context.serial._destroyPort()
    .then(::t.context.serial.open)
    .then(() => t.is(createPortCalled, true))
})

test('open() opens the port when it is closed', t => {
  let portOpenCalled = false
  t.context.serial._port = {
    _open: true,
    isOpen () { return this._open },
    open: (cb) => {
      portOpenCalled = true
      return cb()
    }
  }

  return t.context.serial.open()
    .then(() => {
      // It was already opened, so nothing should happen
      t.is(portOpenCalled, false)

      // Close it
      t.context.serial._port._open = false

      // Try again
      return t.context.serial.open()
    })
    .then(() => t.is(portOpenCalled, true))
})

test('close() closes the port when it is open', t => {
  let portCloseCalled = false

  // If we try to close a inexistent port this should just fail...
  return t.context.serial._destroyPort()
    .then(::t.context.serial.close)
    .then(() => {
      // Now create a fake, closed port
      t.context.serial._port = {
        _open: false,
        isOpen () { return this._open },
        close (cb) {
          portCloseCalled = true
          return cb()
        }
      }

      // Try closing again, should not call close
      return t.context.serial.close()
    })
    .then(() => {
      t.is(portCloseCalled, false)

      // Make the port open
      t.context.serial._port._open = true

      // Try yet again, it should call port.close()
      return t.context.serial.close()
    })
    .then(() => t.is(portCloseCalled, true))
})

test('_destroyPort() removes all listeners', t => {
  let removeAllListenersCalled = false

  // Inject removeAllListeners watcher in serial._port
  const oldRemoveAllListeners = t.context.serial._port.removeAllListeners
  t.context.serial._port.removeAllListeners = () => {
    removeAllListenersCalled = true
    return oldRemoveAllListeners.call(t.context.serial._port)
  }

  return t.context.serial._destroyPort()
    .then(() => t.is(removeAllListenersCalled, true))
})

test('_destroyPort() removes all listeners', t => {
  let removeAllListenersCalled = false

  // Inject removeAllListeners watcher in serial._port
  const oldRemoveAllListeners = t.context.serial._port.removeAllListeners
  t.context.serial._port.removeAllListeners = () => {
    removeAllListenersCalled = true
    return oldRemoveAllListeners.call(t.context.serial._port)
  }

  return t.context.serial._destroyPort()
    .then(() => t.is(removeAllListenersCalled, true))
})

test('_destroyPort() destroys an open port', t => {
  let fakeCloseCalled = false

  // Fake port opening (and close safeguard)
  t.context.serial._port.isOpen = () => true

  // Inject close watcher
  t.context.serial._port.close = cb => {
    fakeCloseCalled = true
    return cb()
  }

  // Port should be closed when trying to destroy it
  return t.context.serial._destroyPort()
    .then(() => {
      t.is(fakeCloseCalled, true)
      t.falsy(t.context.serial._port)
    })
})

test('_destroyPort() destroys a closed port', t => {
  return t.context.serial._destroyPort()
    .then(() => t.falsy(t.context.serial._port))
})

test('_createPort() creates a port if it does not exist', t => {
  // Save the current port
  const oldPort = t.context.serial._port

  // Run _createPort(), see if it changed
  return t.context.serial._createPort()
    .then(() => t.is(t.context.serial._port, oldPort))
    // Now see if it creates a port with the old one destroyed
    .then(::t.context.serial._destroyPort)
    .then(::t.context.serial._createPort)
    .then(() => {
      t.truthy(t.context.serial._port)
      t.not(t.context.serial._port, oldPort)
    })
})

test('_updateState() updates state and emits stateChange', t => {
  t.plan(2)

  // Listen for stateChange
  t.context.serial.on('stateChange', newState => t.is(newState, 'the new state'))

  // Call _updateState and check serial._state
  t.context.serial._updateState('the new state')
  t.is(t.context.serial._state, 'the new state')
})

test.cb('emits #data, when data arrives', emitTest('data'))

test.cb('emits #error, when an error ocurrs', emitTest('error'))

test.cb('detects state change: open', stateTest('open'))

test.cb('detects state change: disconnect_forced', stateTest('disconnect_force', 'disconnect'))

test.cb('detects state change: close', stateTest('close'))

test.cb('detects state change: disconnect', t => {
  // State disconnect may only happen after state disconnect_forced
  t.context.serial._state = 'disconnect_force'

  // Now run the state test
  stateTest('disconnect', 'close')(t)
})
