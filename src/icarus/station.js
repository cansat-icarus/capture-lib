import {EventEmitter} from 'events'

import Serial, {listPorts} from '../serial'
import getDB from '../lib/db'
import createLogger from '../lib/log'
import Backend from './backend'
import Classifier from './classifier'
import {parser, dataHandler} from './data-handler'

// T-Minus Transceiver information
/**
 * T-Minus Transceiver Vendor ID
 * @const
 */
const tMinusVid = '0x03eb'

/**
 * T-Minus Transceiver Product ID
 * @const
 */
const tMinusPid = '0x2404'

/**
 * Handles everything a Station should.
 * Brings Serial, data parsing, database saving and the backend connection together.
 */
export default class Station extends EventEmitter {
	/**
	 * Sets up all relevant class instances (Serial, parsers...) and events listeners.
	 * @param {String} name Station name.
	 */
	constructor(name) {
		super()

		/**
		 * Name/ID of the station
		 * @type {String}
		 */
		this.name = name

		/**
		 * Database instance, internal to the station.
		 * @type {PouchDB}
		 */
		this.db = getDB(`data-${name}`)

		/**
		 * Log database instance, internal to the station.
		 * @type {PouchDB}
		 */
		this.logDB = getDB(`log-${name}`)

		/**
		 * Logger instance.
		 * @type {Bunyan}
		 */
		this._log = createLogger(this.name, this.logDB)

		/**
		 * {@link Serial} instance with the {@link parser} attached.
		 * @type {Serial}
		 */
		this.serial = new Serial(this._log.child({childId: 'serial'}), parser())

		/**
		 * {@link Classifier} instance.
		 * @type {Classifier}
		 */
		this.classifier = new Classifier(this._log.child({childId: 'classifier'}))

		/**
		 * {@link Backend} connector instance.
		 * @type {Backend}
		 */
		this.backend = new Backend(
			this.name,
			this._log.child({childId: 'backendLink'}),
			this.db,
			this.logDB
		)

		// Handle incoming packets
		this.serial.on('data', this::dataHandler)

		// The transceiver needs a bit of a kick sometimes
		this.serial.on('stateChange', state => {
			if (state === 'open') {
				// Send something!
				this.serial._port.write('hi there')
			}
		})

		this._log.info('station.construct end')
	}

	/**
	 * Returns a list of available serialports and tries to find which ones
	 * are the T-Minus transceiver (sets [portInfo].recommend to true) and sorts
	 * them with recommended ones first.
	 * @return {Promise<Array>} List of serialports.
	 */
	getAvailablePorts() {
		this._log.info('station.getAvailablePorts')
		return listPorts()
			.then(list => {
				list = list.map(port => {
					if (port.vendorId === tMinusVid && port.productId === tMinusPid) {
						port.recommend = true
					}
					return port
				})

				list = list.sort((p1, p2) => {
					// Recommended come first
					if (p1.recommend && !p2.recommend) {
						return -1
					}
					if (p2.recommend && !p1.recommend) {
						return 1
					}

					// Otherwise, default to alphabetical sorting
					return p1.comName.localeCompare(p2.comName)
				})

				this._log.debug('Available ports', {ports: list})
				return list
			})
	}

	/**
	 * Cleanup function to be run before exiting.
	 * Closes the serialport and runs {@link Backend#cleanup}.
	 * @return {Promise} Promise that completes when all is clean.
	 */
	cleanup() {
		this._log.info('station.cleanup')
		return this.serial.close()
			.then(this.backend.cleanup())
	}
}
