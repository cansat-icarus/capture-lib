import PouchDB from 'pouchdb'
import { EventEmitter } from 'events'

import createLogger from './log'
import Classifier from './classifier'
import { default as Serial, listPorts } from '../serial'
import { parser, dataHandler } from './data-handler'

// T-Minus Transceiver information
/** T-Minus Transceiver Vendor ID */
const tMinusVid = '0x03eb'
/** T-Minus Transceiver Product ID */
const tMinusPid = '0x2404'

/**
 * Handles everything a Station should.
 * Brings Serial, data parsing and database saving together.
 */
export default class Station extends EventEmitter {
  /**
   * Sets up all relevant class instances (Serial, parsers...) and events listeners.
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
     */
    this.db = new PouchDB('db-' + name)

    /**
     * Log database instance, internal to the station.
     */
    this.logDb = new PouchDB('db-log-' + name)

    /**
     * Logger instance.
     */
    this._log = createLogger(name, this.logDb)

    /**
     * {@link Serial} instance with the {@link parser} attached
     */
    this.serial = new Serial(this._log.child({ childId: 'station.serial' }), parser())

    /**
     * {@link Classifier} instance.
     */
    this.classifier = new Classifier(this._log.child({ childId: 'station.classifier' }))

    /**
     */
    this.backend = new Backend(this._log.child({ childId: 'station.backend' }), this)

    // Handle incoming packets
    this.serial.on('data', this::dataHandler)

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
          if(port.vendorId === tMinusVid && port.productId === tMinusPid) port.recommend = true
          return port
        })

        list = list.sort((p1, p2) => {
          // Recommended come first
          if(p1.recommend && !p2.recommend) return -1
          if(p2.recommend && !p1.recommend) return 1

          // Otherwise, default to alphabetical sorting
          return p1.comName.localeCompare(p2.comName)
        })

        this._log.debug('Available ports', { ports: list })
        return list
      })
  }

  /**
   * Cleanup function to be run before exiting.
   * @return {Promise} Promise that completes when all is clean.
   */
  cleanup() {
    this._log.info('station.cleanup')
    return this.serial.close()
  }
}
