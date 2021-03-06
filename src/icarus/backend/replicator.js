import {EventEmitter} from 'events'
import ExponentialBackoff from '../../lib/backoff-wrapper'
import {getRemoteDB} from '../../lib/db'

/**
 * Handles replication between a local and remote PouchDB database.
 * Keeps track of state, uses an {@link ExponentialBackoff} to prevent
 * connection saturation, serving as a wrapper over PouchDB replication.
 *
 * The source database is set once in the constructor and remains unchanged
 * and unchangeable during operation.
 */
export default class Replicator extends EventEmitter {

	/**
	 * @param {Logger} logger Bunyan logger instance.
	 * @param {PouchDB} sourceDB Database to be replicated.
	 */
	constructor(logger, sourceDB) {
		super()

		/**
		 * Logger instance.
		 * @type {Bunyan}
		 */
		this._log = logger

		/**
		 * Replicator status.
		 * @type {String}
		 */
		this._state = 'inactive'

		/**
		 * Source database.
		 * @type {PouchDB}
		 */
		this._sourceDB = sourceDB

		/**
		 * Target database.
		 * @type {!PouchDB}
		 */
		this._targetDB = undefined

		/**
		 * ExponentialBackoff instance.
		 * Keeps track of the replication backoff.
		 * @type {ExponentialBackoff}
		 */
		this._backoff = new ExponentialBackoff()

		/**
		 * PouchDB replication instance/ID.
		 * @type {!PouchDBReplicationID}
		 */
		this._replication = undefined

		this._backoff.on('retry', retry => setImmediate(() => this._ensureReplication(retry)))
		this._backoff.on('backoff', (retry, delay) => {
			// Cancels current replicator if there is one (no need in keeping an errored replicator)
			this._cancelCurrentReplicator()

			// Don't signal we're connecting if we're inactive
			if (this._state === 'inactive' || this._state === 'cleanup') {
				return
			}

			this._log.debug('Backing off from replication', {retry, delay})
			this._updateState('idle')
		})
	}

	/**
	 * Stops the replication process.
	 * @emits state('inactive')
	 */
	stop() {
		this._log.info('Stopping replication')
		this._updateState('inactive')

		this._cancelCurrentReplicator()
		this._backoff.reset()
	}

	_cancelCurrentReplicator() {
		if (this._replication) {
			// Prevent the replicator from triggering the backoff
			this._replication.removeAllListeners()

			// Get rid of it
			this._replication.cancel()
			this._replication = undefined
		}
	}

	/**
	 * Stops current replication and attempts last-minute replication.
	 * Last-minute replication is done in "one-shot" mode: replicates whatever data it has
	 * and immediately stops without listening for changes in the local database.
	 * @emits state('cleanup')
	 * @returns {Promise}
	 */
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

	/**
	 * Starts replication to a remote database.
	 * @param {String} dbName Name/URL of the remote database.
	 * @param {String} [username] Database username, if applicable.
	 * @param {String} [password] Database password, if applicable.
	 * @emits state(state): the state of the replicator.
	 * @returns {Promise} resolved when the replication connection succeeds for the first time.
	 */
	replicate(dbUrl, username, password) {
		// Don't try replicating when we're going away
		if (this._state === 'cleanup') {
			return Promise.resolve()
		}

		// Stop any already running replication
		this.stop()

		this._log.info('Live replication triggered', {dbUrl, username})
		this._updateState('idle')

		// Create the DB object here to avoid memory leaks
		this._targetDB = getRemoteDB(dbUrl, username, password)

		// Kick the process into action
		return new Promise(resolve => {
			this._backoff.once('success', resolve)
			this._backoff.backoff()
		})
	}

	/**
	 * Restarts the replication process when unintentionally stopped.
	 * @param {Number} retry Retry counter
	 */
	_ensureReplication(retry) {
		// Don't re-create a replicator that is not meant to be
		if (this._state === 'inactive' || this._state === 'cleanup' || !this._targetDB) {
			return
		}

		// Cancel current replicator if there is one
		this._cancelCurrentReplicator()

		this._log.info('Attempting replication', {retry})

		// (re)create replicator and listen to events for state magic
		this._updateState('connecting')
		this._replication = this._createReplicator()
			.on('paused', err => {
				if (!err) {
					this._backoff.success()
				}
				this._updateState('pause', err)
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

	/**
	 * Creates a new PouchDB replicator.
	 * Remember that this class is simply a wrapper.
	 * @param {Object} [opts] PouchDB replication options.
	 * @param {Boolean} [opts.live=true] Keep the replication running, pushing changes as they happen.
	 * @param {Boolean} [opts.retry=false] Enable PouchDB's built-in backoff algorithm.
	 * @returns {PouchDBReplicationID}
	 */
	_createReplicator(opts = {live: true, retry: false, batch_size: 20, batch_limit: 5}) { // eslint-disable-line camelcase
		return this._sourceDB.replicate.to(
			this._targetDB,
			opts
		)
	}

	/**
	 * Updates the Replicator's {@link Replicator#_state}.
	 * @param {String} state New state.
	 * @param {Object} [moreLogData] Extra data to be included in the log.
	 * @emits state(state)
	 */
	_updateState(state, moreLogData) {
		// Prevent infinite loops of the log replicator flipping between active and inactive
		// Just log active/paused states when you're not switching between them or when errors occur
		if ((state !== 'active' && state !== 'pause') || (this._state !== 'active' && this._state !== 'pause') || moreLogData) {
			this._log.info('updateState', moreLogData, {state})
		}
		this._state = state
		this.emit('state', state)
	}
}
