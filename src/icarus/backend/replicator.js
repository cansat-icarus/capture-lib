import {EventEmitter} from 'events'
import ExponentialBackoff from '../../lib/backoff-wrapper'
import {getRemoteDB} from '../../lib/db'

export default class Replicator extends EventEmitter {

	/**
	 * @param {Logger} logger Bunyan logger instance.
	 * @param {Function} emitter Callback used to handle replicator events.
	 * @param {PouchDB} sourceDB The database to be replicated.
	 */
	constructor(logger, sourceDB) {
		super()
		this._log = logger
		this._state = 'inactive'
		this._sourceDB = sourceDB

		this._backoff = new ExponentialBackoff()

		this._backoff.on('retry', retry => setImmediate(() => this._ensureReplication(retry)))
		this._backoff.on('backoff', (retry, delay) => {
			this._log.debug('Backing off from replication', {retry, delay})
			this._updateState('connecting')
		})
	}

	stop() {
		this._log.info('Stopping replication')
		this._updateState('inactive')
		if (this._replication) {
			this._replication.cancel()
		}
		this._backoff.reset()
	}

	async cleanup() {
		// Before doing anything, stop!
		this.stop()

		this._log.info('cleanup')
		this._updateState('cleanup')

		let ok = false
		try {
			// Before going away attempt one last replication to get the remaining data out
			ok = (await this._createReplicator({live: false, retry: true})).ok
		} catch (err) {
			this._log.warn('Error in last-minute replication', {err})
		}

		if (ok) {
			this._log.info('Last minute replication successful')
		} else {
			this._log.warn('Last minute replication failed')
		}
	}

	replicate(dbName, username, password) {
		// Don't try replicating when we're going away
		if (this._state === 'cleanup') {
			return Promise.resolve()
		}

		this._log.info('Live replication triggered', {dbName, username})
		if (this._replication) {
			// Stop any already running replication
			this.stop()
		}

		this._updateState('connecting')

		// Create the DB object here to avoid memory leaks
		this._targetDB = getRemoteDB(dbName, username, password)

		// Kick the process into action
		return new Promise(resolve => {
			this._backoff.once('success', resolve)
			this._backoff.backoff()
		})
	}

	_ensureReplication(retry) {
		// Don't re-create a replicator that is not meant to be
		if (this._state === 'inactive' || this._state === 'cleanup' || !this._targetDB) {
			return
		}

		// Cancel current replicator if there is one
		if (this._replication) {
			this._replication.cancel()
		}

		this._log.info('Attempting replication', {retry})

		// (re)create replicator and listen to events for state magic
		this._updateState('connecting')
		this._replication = this._createReplicator()
			.on('paused', err => {
				if (!err) {
					this._backoff.success()
				}
				this._updateState('pause', {err})
			})
			.on('active', () => {
				this._backoff.success()
				this._updateState('active')
			})
			.on('denied', err => {
				// This is not fatal for the replicator but is a pretty bad sign
				this._log.error('Replication denied', err)
			})
			.once('error', err => {
				// This instance is bad, discard and recreate it with exponential backoff
				this._log.warn('Replication error', err)
				this._backoff.backoff()
			})
			.once('complete', () => {
				// This instance is bad, discard and recreate it with exponential backoff
				this._log.warn('Replication canceled/completed')
				this._backoff.backoff()
			})
	}

	_createReplicator(opts = {live: true, retry: false}) {
		return this._sourceDB.replicate.to(
			this._targetDB,
			opts
		)
	}

	_updateState(state, moreLogData) {
		this._log.info('updateState', moreLogData, {state})
		this._state = state
		this.emit('state', state)
	}
}
