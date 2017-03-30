import {EventEmitter} from 'events'
import {stringify as qsStringify} from 'querystring'
import io from 'socket.io-client'
import {version} from '../../../package.json'
import passEvent from '../../lib/pass-event'
import Replicator from './replicator'

/**
 * Handles connection with the backend.
 */
export default class Backend extends EventEmitter {
	/**
	 * Constructor.
	 */
	constructor(name, logger, dataDB, logDB) {
		super()

		/**
		 * Station name.
		 * @type {String}
		 */
		this.name = name

		/**
		 * Current socket connection with the backend.
		 * @type {!IO}
		 */
		this._socket = undefined

		/**
		 * Current socket state.
		 * @type {String}
		 */
		this._state = 'inactive'

		/**
		 * Logger instance.
		 * @type {Object}
		 */
		this._log = logger

		/**
		 * {@link Replicator} instance for dataDB.
		 * @type {Replicator}
		 */
		this.dataReplicator = new Replicator(
			this._log.child({childId: 'station.backend.replicator:data'}),
			dataDB
		)

		passEvent(this.dataReplicator, this, 'state', 'replicator:data:state')

		/**
		 * {@link Replicator} instance for logDB.
		 * @type {Replicator}
		 */
		this.logReplicator = new Replicator(
			this._log.child({childId: 'station.backend.replicator:data'}),
			logDB
		)

		passEvent(this.logReplicator, this, 'state', 'replicator:log:state')

		this._log.info('backend.construct')
	}

	/**
	 * Connects to backend at [url].
	 * @param {String} url Backend URL.
	 * @emits Station#backend:state(socketState) When socket connects/disconnects.
	 */
	connect(url) {
		this._log.info('connect to', url)

		this._socket = io(url, {
			query: qsStringify({
				name: this.name
				// TODO: include auth info
			})
		})

		// Return env information
		this._socket.on('info', cb => cb({version, name: this.name}))

		// Keep track of state
		this._socket.on('reconnecting', attempt => this._updateState((this._state === 'inactive' ? 'connecting' : 'reconnecting'), {attempt}))
		this._socket.on('reconnect_error', () => this._updateState(this._state === 'connecting' ? 'connect_error' : 'reconnect_error'))
		this._socket.on('connect', () => this._updateState('connect'))
		this._socket.on('disconnected', () => this._updateState('disconnect'))

		// TODO: Respond to replication request
		this._socket.on('replicate', (dataDbName, logDbName, user, pass) => {
			this.dataReplicator.replicate(dataDbName, user, pass)
			this.logReplicator.replicate(logDbName, user, pass)
		})
	}

	/**
	 * Disconnects from the backend. Stops the socket.
	 * @emits Station#backend:state(socketState) When socket connects/disconnects.
	 */
	disconnect() {
		this._log.info('backend.disconnect')

		// Disconnect socket to stop reconnection logic
		this._socket.disconnect()

		// Finally remove the socket reference here
		this._socket = null

		// TODO: stop replicators
		// TODO: warn disconnection through socket

		this._updateState('inactive')
	}

	/**
	 * Closes any connections made to get ready for exit.
	 * Correctly signals shutdown to the backend.
	 */
	async cleanup() {
		this._log.info('backend.cleanup')
		this._updateState('cleanup')

		// Cleanup replicators
		await Promise.all([
			this.dataReplicator.cleanup(),
			this.logReplicator.cleanup()
		])

		// TODO: soft-disconnect (maybe?)
	}

	/**
	 * Updates the socket state.
	 * @protected
	 * @param {String} state The new Backend state.
	 * @param {Object} extraData Extra data related to the new state (error, no. of connection attempts...) to be included in logs.
	 * @emits Station#backend:state(socketState) When socket connects/disconnects.
	 */
	_updateState(state, extraData) {
		this._log.info('updateState', state, extraData)
		this._state = state
		this.emit('state', state)
	}
}
