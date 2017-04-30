import {EventEmitter} from 'events'
import {stringify as qsStringify} from 'querystring'
import io from 'socket.io-client'
import {version} from '../../../package.json'
import passEvent from '../../lib/pass-event'
import Replicator from './replicator'

/**
 * Handles connection with the backend.
 *
 * Responsible for establishing a WebSocket (socket.io) connection with
 * the backend and handling its requests.
 *
 * It also instantiates {@link Replicator} instances for data and log
 * replication. The stateChange events from these are forwarded as:
 * "replicator:data:state" and "replicator:log:state".
 */
export default class Backend extends EventEmitter {
	/**
	 * Constructor.
	 * @param {String} name Station name.
	 * @param {Bunyan} logger Logger instance.
	 * @param {PouchDB} dataDB Packet database.
	 * @param {PouchDB} logDB Log entries database.
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
		 * @type {Bunyan}
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
	 * @emits state(socketState): socket connection/disconnection.
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
	 * The replicators will keep running until a new connection makes them
	 * connect to a different database.
	 * @emits state(socketState): socket connection/disconnection.
	 */
	disconnect() {
		this._log.info('backend.disconnect')

		// TODO: warn disconnection through socket (soft disconnection)

		// Disconnect socket to stop reconnection logic
		this._socket.disconnect()

		// Finally remove the socket reference here
		this._socket = null

		// Stop the replicators
		// The operator may be experiencing issues and prefer to keep them off
		this.dataReplicator.stop()
		this.logReplicator.stop()

		this._updateState('inactive')
	}

	/**
	 * Triggers {@link Replicator#cleanup} on the data and log replicators.
	 * @emits state('cleanup')
	 * @returns {Promise}
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
	 * @param {String} state New Backend state.
	 * @param {Object} [extraData] Extra data related to the new state (error, no. of connection attempts...) to be included in logs.
	 * @emits state(socketState): socket connection/disconnection.
	 */
	_updateState(state, extraData) {
		this._log.info('updateState', state, extraData)
		this._state = state
		this.emit('state', state)
	}
}
