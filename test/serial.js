import test from 'ava'

import {default as Serial, listPorts, __Rewire__, __ResetDependency__} from '../src/serial'
import fakeLogger from './helpers/fakelog'

const dummyParser = (emitter, buf) => emitter.emit('data', buf)

function emitTest(event) {
	return t => {
		t.context.serial.on(event, ::t.end)
		t.context.serial._port.emit(event)
	}
}

function stateTest(state, event = state) {
	return t => {
		t.context.serial.on('stateChange', newState => {
			t.is(newState, state)
			t.is(t.context.serial._state, state)
			t.end()
		})
		t.context.serial._port.emit(event)
	}
}

test.beforeEach(async t => {
	t.context.serial = new Serial(fakeLogger, dummyParser)
	await t.context.serial.setPath('do not use me')
	await t.context.serial._createPort()
})

test('constructor()', t => {
	t.is(t.context.serial._baud, 19200)
	t.is(t.context.serial._parser, dummyParser)
	t.is(t.context.serial._state, 'close')

	const serial = new Serial(fakeLogger, dummyParser, 9600)
	t.true(!serial._port)
	t.true(!serial._path)
	t.is(serial._baud, 9600)
})

test('setPath() with no port setup', async t => {
	// Simple change, no stopping or destroying ports
	await t.context.serial._destroyPort()
	await t.context.serial.setPath('a path')
	t.is(t.context.serial._path, 'a path')
})

test('setPath() with a closed port', async t => {
	// Change, with a port created
	await t.context.serial.setPath('another path')
	t.is(t.context.serial._path, 'another path')
	t.is(t.context.serial._port.path, 'another path')
})

test('setPath() with an open port', async t => {
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
	await t.context.serial.setPath('yet another path')
	t.is(t.context.serial._path, 'yet another path')
	t.true(fakeOpenCalled)
})

test('open() creates the port if it does not exist', async t => {
	// _createPort watcher
	let createPortCalled = false
	t.context.serial._createPort = () => {
		createPortCalled = true
		t.context.serial._port = {isOpen: () => false, open: cb => cb()}
		return Promise.resolve()
	}

	// Try opening a port, after its destruction
	await t.context.serial._destroyPort()
	await t.context.serial.open()
	t.is(createPortCalled, true)
})

test('open() opens the port when it is closed', async t => {
	let portOpenCalled = false
	t.context.serial._port = {
		_open: true,
		isOpen() {
			return this._open
		},
		open: cb => {
			portOpenCalled = true
			return cb()
		}
	}

	await t.context.serial.open()
	// It was already opened, so nothing should happen
	t.is(portOpenCalled, false)

	// Close it
	t.context.serial._port._open = false

	// Try again
	await t.context.serial.open()
	t.is(portOpenCalled, true)
})

test('close() closes the port when it is open', async t => {
	let portCloseCalled = false

	// If we try to close a inexistent port this should just fail...
	await t.context.serial._destroyPort()
	await t.context.serial.close()
	// Now create a fake, closed port
	t.context.serial._port = {
		_open: false,
		isOpen() {
			return this._open
		},
		close(cb) {
			portCloseCalled = true
			return cb()
		}
	}

	// Try closing again, should not call close
	await t.context.serial.close()
	t.is(portCloseCalled, false)

	// Make the port open
	t.context.serial._port._open = true

	// Try yet again, it should call port.close()
	await t.context.serial.close()
	t.is(portCloseCalled, true)
})

test('_destroyPort() removes all listeners', async t => {
	let removeAllListenersCalled = false

	// Inject removeAllListeners watcher in serial._port
	const oldRemoveAllListeners = t.context.serial._port.removeAllListeners
	t.context.serial._port.removeAllListeners = () => {
		removeAllListenersCalled = true
		return oldRemoveAllListeners.call(t.context.serial._port)
	}

	await t.context.serial._destroyPort()
	t.is(removeAllListenersCalled, true)
})

test('_destroyPort() destroys an open port', async t => {
	let fakeCloseCalled = false

	// Fake port opening (and close safeguard)
	t.context.serial._port.isOpen = () => true

	// Inject close watcher
	t.context.serial._port.close = cb => {
		fakeCloseCalled = true
		return cb()
	}

	// Port should be closed when trying to destroy it
	await t.context.serial._destroyPort()
	t.is(fakeCloseCalled, true)
	t.falsy(t.context.serial._port)
})

test('_destroyPort() destroys a closed port', async t => {
	await t.context.serial._destroyPort()
	t.falsy(t.context.serial._port)
})

test('_destroyPort() does not crash when there is no port to destroy [BUGFIX]', async t => {
	// Just destroy the port multiple times and ava will check for exceptions
	await t.context.serial._destroyPort()
	await t.context.serial._destroyPort()
	await t.context.serial._destroyPort()
	await t.context.serial._destroyPort()
})

test('_createPort() creates a port if it does not exist', async t => {
	// Save the current port
	const oldPort = t.context.serial._port

	// Run _createPort(), see if it changed
	await t.context.serial._createPort()
	t.is(t.context.serial._port, oldPort)

	// Now see if it creates a port with the old one destroyed
	await t.context.serial._destroyPort()
	await t.context.serial._createPort()
	t.truthy(t.context.serial._port)
	t.not(t.context.serial._port, oldPort)
})

test('_updateState() updates state and emits stateChange', t => {
	t.plan(2)

	// Listen for stateChange
	t.context.serial.on('stateChange', newState => t.is(newState, 'the new state'))

	// Call _updateState and check serial._state
	t.context.serial._updateState('the new state')
	t.is(t.context.serial._state, 'the new state')
})

/* eslint-disable ava/test-ended */
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
/* eslint-enable */

test.serial('lists available ports', async t => {
	const samplePorts = [
		{
			comName: '/dev/tty.usbX',
			vendorId: '0x1234',
			productId: '0x5678'
		},
		{
			comName: '/dev/ttyUSBX',
			vendorId: '0x03eb',
			productId: '0x2404'
		},
		{
			comName: 'COM42',
			pnpId: 'USB\\VID_ABCD&PID_EF90&ImWindowsAndIApparentlyCantGiveProperInformation'
		}
	]
	__Rewire__('SerialPort', {
		list: cb => cb(null, samplePorts)
	})

	const ports = await listPorts()
	// Make sure it passes through the port list
	t.is(ports[0], samplePorts[0])
	t.is(ports[1], samplePorts[1])
	t.is(ports[2].comName, samplePorts[2].comName)
	t.is(ports[2].pnpId, samplePorts[2].pnpId)
	// And make sure we autodetect productId and vendorId from Windows
	t.is(ports[2].vendorId, '0xabcd')
	t.is(ports[2].productId, '0xef90')

	__ResetDependency__('SerialPort')
})
