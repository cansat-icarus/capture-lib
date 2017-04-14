import {parse as qsParse} from 'querystring'
import test from 'ava'
import sinon from 'sinon'
import {version} from '../../../package.json'
import Backend from '../../../src/icarus/backend'
import Replicator from '../../../src/icarus/backend/replicator'
import getFakeDB from '../../helpers/fakedb'
import createFakeLogger from '../../helpers/fakelog'
import createFakeSocket from '../../helpers/fakesocket'

const backendDefaultArgs = {
	name: 'the name',
	logger: createFakeLogger(),
	dataDB: getFakeDB('data'),
	logDB: getFakeDB('log')
}

/**
 * @param {Object} options
 * @returns {Backend}
 */
function createBackend(options = {}) {
	const {name, logger, dataDB, logDB} = options

	return new Backend(
		name || backendDefaultArgs.name,
		logger || backendDefaultArgs.logger,
		dataDB || backendDefaultArgs.dataDB,
		logDB || backendDefaultArgs.logDB
	)
}

/**
 * @param {Object} backendOptions
 * @returns {Backend}
 */
function createBackendWithFakeSocket(backendOptions) {
	const backend = createBackend(backendOptions)

	Backend.__Rewire__('io', () => {
		const socket = createFakeSocket()
		socket.disconnect = () => null
		return socket
	})
	backend.connect('testurl')
	Backend.__ResetDependency__('io')

	return backend
}

test('constructs', t => {
	const backend = createBackend()

	// Constructor arguments
	t.is(backend.name, backendDefaultArgs.name)
	t.is(backend._log, backendDefaultArgs.logger)

	// Initial property values
	t.is(backend._state, 'inactive')
	t.is(backend._socket, undefined)

	// Replicator creation
	t.true(backend.dataReplicator instanceof Replicator)
	t.true(backend.logReplicator instanceof Replicator)
	t.is(backend.dataReplicator._sourceDB, backendDefaultArgs.dataDB)
	t.is(backend.logReplicator._sourceDB, backendDefaultArgs.logDB)
})

test('connects to backend (WebSocket)', t => {
	const backend = createBackend()
	const fakeSocket = createFakeSocket()

	// Setup socket.io mock
	Backend.__Rewire__('io', (url, {query}) => {
		const queryObj = qsParse(query)

		t.is(url, 'testurl')
		t.is(queryObj.name, backend.name)
		return fakeSocket
	})

	t.plan(3)
	backend.connect('testurl')
	t.is(backend._socket, fakeSocket)

	Backend.__ResetDependency__('io')
})

function testSocketEventHandler(t, triggerEvent, expectedState, previousState = 'connect') {
	const backend = createBackendWithFakeSocket()

	backend._state = previousState
	backend._socket.emit(triggerEvent)

	t.is(backend._state, expectedState)
}

test('handles socket event: connection', testSocketEventHandler, 'connect', 'connect')

test('handles socket event: disconnection', testSocketEventHandler, 'disconnected', 'disconnect')

test('handles socket event: connecting', testSocketEventHandler, 'reconnecting', 'connecting', 'inactive')

test('handles socket event: reconnecting', testSocketEventHandler, 'reconnecting', 'reconnecting', 'notinactive')

test('handles socket event: connection error', testSocketEventHandler, 'reconnect_error', 'connect_error', 'connecting')

test('handles socket event: reconnection error', testSocketEventHandler, 'reconnect_error', 'reconnect_error', 'reconnecting')

test('notifies state changes', t => {
	let stateAfterUpdate

	const backend = createBackend()

	t.plan(2)
	backend.on('state', state => t.is(state, stateAfterUpdate))

	stateAfterUpdate = 'abc'
	backend._updateState(stateAfterUpdate)

	stateAfterUpdate = 'xyz'
	backend._updateState(stateAfterUpdate)
})

test('handles backend request: info', t => {
	const backend = createBackendWithFakeSocket()

	backend._socket.emit('info', info => {
		t.is(info.version, version)
		t.is(info.name, backend.name)
	})
})

test('handles backend request: replicate', t => {
	const backend = createBackendWithFakeSocket()

	const user = 'fakeuser'
	const pass = 'fakepass'
	const dbData = 'fakedb1000'
	const dbLog = 'fakedb1000-2'

	const spyDataReplicator = sinon.stub(backend.dataReplicator, 'replicate').returns(Promise.resolve())
	const spyLogReplicator = sinon.stub(backend.logReplicator, 'replicate').returns(Promise.resolve())

	// Simulate a replication request from the backend
	backend._socket.emit('replicate', dbData, dbLog, user, pass)

	// Now see if the right calls were made
	t.true(spyDataReplicator.called)
	t.true(spyLogReplicator.called)
	t.is(spyDataReplicator.getCall(0).args[0], dbData)
	t.is(spyDataReplicator.getCall(0).args[1], user)
	t.is(spyDataReplicator.getCall(0).args[2], pass)
	t.is(spyLogReplicator.getCall(0).args[0], dbLog)
	t.is(spyLogReplicator.getCall(0).args[1], user)
	t.is(spyLogReplicator.getCall(0).args[2], pass)
})

test('disconnects from backend', t => {
	Backend.__Rewire__('io', () => {
		const socket = createFakeSocket()

		// Disconnect function
		// Simply does a passing assertion to make sure we try closing the socket
		socket.disconnect = () => t.pass()

		return socket
	})

	const backend = createBackend()
	backend.connect('fakeurl')

	// 1 (assertions) checking initial state, 2 checking post-disconnection state
	// 1 of the last 2 hidden inside fakeIO()
	t.plan(3)

	// Check for sane state while connected (unit testing mocks basically)
	t.truthy(backend._socket)

	backend.disconnect()

	// Socket should be "erased" from the backend instance
	t.is(backend._socket, null)

	Backend.__ResetDependency__('io')
})

test('resets state on backend disconnection', t => {
	const backend = createBackendWithFakeSocket()
	backend.disconnect()
	t.is(backend._state, 'inactive')
})

test('cleans itself up', t => {
	// RESERVED for when (if) the soft-disconnection is implemented
	// Right now this serves no purpose...
	t.pass()
})

test('cleans up the replicator instances (during cleanup)', async t => {
	const backend = createBackendWithFakeSocket()

	// Spy the replicators' cleanup method
	const spyDataReplicatorStop = sinon.stub(backend.dataReplicator, 'cleanup').returns(Promise.resolve())
	const spyLogReplicatorStop = sinon.stub(backend.logReplicator, 'cleanup').returns(Promise.resolve())

	// Trigger backend cleanup
	await backend.cleanup()

	// Check if replicator cleanup was tried
	t.true(spyDataReplicatorStop.called)
	t.true(spyLogReplicatorStop.called)

	// Cleanup spies
	spyDataReplicatorStop.restore()
	spyLogReplicatorStop.restore()
})

test.cb('forwards data replicator state changes', t => {
	const backend = createBackendWithFakeSocket()

	backend.once('replicator:data:state', state => {
		t.is(state, 'the new state')
		t.end()
	})

	backend.dataReplicator.emit('state', 'the new state')
})

test.cb('forwards log replicator state changes', t => {
	const backend = createBackendWithFakeSocket()

	backend.once('replicator:log:state', state => {
		t.is(state, 'the new state')
		t.end()
	})

	backend.logReplicator.emit('state', 'the new state')
})
