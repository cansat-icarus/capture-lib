import {EventEmitter} from 'events'
import test from 'ava'
import sinon from 'sinon'
import createFakeLogger from '../../helpers/fakelog'
import getFakeDB from '../../helpers/fakedb'
import Replicator from '../../../src/icarus/backend/replicator'

const replicatorDefaultArgs = {
	logger: createFakeLogger(),
	sourceDB: getFakeDB('testDB')
}

function createReplicator(options = {}) {
	const {logger, sourceDB} = options
	return new Replicator(
		logger || replicatorDefaultArgs.logger,
		sourceDB || replicatorDefaultArgs.sourceDB
	)
}

async function createActiveReplicator(options) {
	const replicator = createReplicator(options)
	await replicator.replicate('testDB2')

	return replicator
}

// Inject the DB mock for all tests, keep the filesystem clean
const spyGetFakeDB = sinon.spy(getFakeDB)
test.before(() => Replicator.__Rewire__('getRemoteDB', spyGetFakeDB))

// And remove it when we're done
test.after.always(() => {
	// For some reason `spyGetFakeDB.restore()` does not exist? (while other sinon methods like reset do)
	Replicator.__ResetDependency__('getRemoteDB')
})

test('constructs', t => {
	const replicator = createReplicator()

	t.is(replicator._state, 'inactive')
	t.is(replicator._sourceDB, replicatorDefaultArgs.sourceDB)
	t.is(replicator._log, replicatorDefaultArgs.logger)
})

test.serial('replicates', async t => {
	const replicator = createReplicator()

	// Start spying what remote DB we access
	const spyUpdateState = sinon.spy(replicator, '_updateState')
	spyGetFakeDB.reset()

	await replicator.replicate('t_replicates', 'testuser', 'testpass')

	// State was connecting
	t.true(spyUpdateState.calledWith('connecting'))

	// State is active or pause
	t.true(replicator._state === 'active' || replicator._state === 'pause')

	// The correct database was accessed with the correct url/user/password
	t.true(spyGetFakeDB.calledOnce)
	t.is(spyGetFakeDB.args[0][0], 't_replicates')
	t.is(spyGetFakeDB.args[0][1], 'testuser')
	t.is(spyGetFakeDB.args[0][2], 'testpass')

	// The replication id (that's how they call it internally in PouchDB) exists
	t.truthy(replicator._replication)

	// Cleanup spies
	// `spyGetFakeDB` is cleaned up in test.after.always()
	spyUpdateState.restore()
})

test.serial('does not replicate during cleanup', async t => {
	const replicator = createReplicator()

	// Spy what DBs we try to load
	spyGetFakeDB.reset() // Make sure we're not getting bad data

	// Set the replicator's state to cleanup
	replicator._state = 'cleanup'

	await replicator.replicate('db', 'user', 'pass')

	t.false(spyGetFakeDB.called)
})

test('stops replication before re-starting it', async t => {
	// A replicator running with target db: testDB2
	const replicator = await createActiveReplicator()

	const spyStop = sinon.spy(replicator, 'stop')
	const spyUpdateState = sinon.spy(replicator, '_updateState')
	await replicator.replicate('yetanothertestdb')

	// Make sure replicator.stop was called when the target DB was still the first one
	t.true(spyStop.called)
	t.true(spyStop.calledBefore(spyUpdateState))

	// Cleanup spies
	spyStop.restore()
	spyUpdateState.restore()
})

test('stops replication before cleanup', async t => {
	const replicator = await createActiveReplicator()

	// Spy replicator.stop
	const spyStop = sinon.spy(replicator, 'stop')

	// Call cleanup
	await replicator.cleanup()

	// Replicator.stop should have been called
	t.true(spyStop.called)
})

test('stops replication when asked', async t => {
	const replicator = await createActiveReplicator()

	// Sanity check mock
	t.true(replicator._state === 'active' || replicator._state === 'pause')

	// Inject replicator spies
	const spyReplicationCancel = sinon.spy(replicator._replication, 'cancel')
	const spyBackoffReset = sinon.spy(replicator._backoff, 'reset')

	replicator.stop()

	t.true(spyReplicationCancel.called)
	t.true(spyBackoffReset.called)
	t.is(replicator._state, 'inactive')
})

async function testRestartAfterEvent(t, triggerEvent) {
	const replicator = await createActiveReplicator()

	// Spy on things
	const spyEnsureReplication = sinon.spy(replicator, '_ensureReplication')
	const spyCreateReplicator = sinon.spy(replicator, '_createReplicator')

	// The checking isn't pretty but it should work
	return new Promise(resolve => {
		// Listen to the time when the backoff triggers _ensureReplication
		replicator._backoff.once('retry', () => {
			// Let just a little bit of time pass before anything else
			setImmediate(() => {
				// See if things moved
				t.true(spyEnsureReplication.called)
				t.true(spyCreateReplicator.called)

				// Cleanup spies
				spyEnsureReplication.restore()
				spyCreateReplicator.restore()

				resolve()
			})
		})

		// Trigger error
		replicator._replication.emit(triggerEvent)
	})
}

test('restarts replication after error', testRestartAfterEvent, 'error')

test('restarts replication after complete', testRestartAfterEvent, 'complete')

test('does not restart replication when inactive', t => {
	const replicator = createReplicator()

	// Make sure there's even a target db!
	replicator._targetDB = getFakeDB('notusedhopefully')

	replicator._ensureReplication()

	t.is(replicator._state, 'inactive')
	t.falsy(replicator._replication)
})

test('does not restart replication when cleaning up', async t => {
	const replicator = createReplicator()
	await replicator.cleanup()

	replicator._ensureReplication()

	t.is(replicator._state, 'cleanup')
	t.falsy(replicator._replication)
})

test('does not restart replication when there\'s no target db', t => {
	const replicator = createReplicator()

	// Make sure we end up in some odd state
	replicator._updateState('connecting')

	replicator._ensureReplication()

	t.falsy(replicator._replication)
})

test('attempts last-minute one-shot replication during cleanup', async t => {
	// Create a replicator (with a well defined target db) and make sure it's inactive
	const replicator = await createActiveReplicator()
	replicator.stop()

	// Spy on the replicator creation process
	const spyReplication = sinon.spy(replicator, '_createReplicator')

	// Trigger the cleanup
	await replicator.cleanup()

	// _createReplicator should be called with { live:false, retry:true }
	t.is(spyReplication.callCount, 1)
	t.is(spyReplication.getCall(0).args[0].live, false)
	t.is(spyReplication.getCall(0).args[0].retry, true)

	// Cleanup spies
	spyReplication.restore()
})

async function testEventPropagation(t, event, pouchEvent = event) {
	// Create a replicator
	const replicator = createReplicator()

	// Mock _createReplicator to return a simple EventEmitter
	const fakeReplication = new EventEmitter()
	replicator._createReplicator = function () {
		// Aritificially signal success
		setImmediate(() => this._backoff.success())

		return fakeReplication
	}

	// Start a fake replication
	await replicator.replicate('haha fake')

	// Setup state event listener
	replicator.on('state', state => t.is(state, event))

	// Emit the trigger event from the replicator
	fakeReplication.emit(pouchEvent)
}

test('propagates replication event: active', testEventPropagation, 'active')

test('propagates replication event: pause', testEventPropagation, 'pause', 'paused')

test('notifies state changes', t => {
	let stateAfterUpdate

	const replicator = createReplicator()

	t.plan(2)
	replicator.on('state', state => t.is(state, stateAfterUpdate))

	stateAfterUpdate = 'abc'
	replicator._updateState(stateAfterUpdate)

	stateAfterUpdate = 'xyz'
	replicator._updateState(stateAfterUpdate)
})
