import { EventEmitter } from 'events'
import PouchDB from 'pouchdb'
import { default as Serial, listPorts } from '../serial'
import Classifier from './classifier'
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
  constructor (name) {
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
     * {@link Serial} instance with the {@link parser} attached
     */
    this.serial = new Serial(parser())

    /**
     * {@link Classifier} instance.
     */
    this.classifier = new Classifier()

    // Handle incoming packets
    this.serial.on('data', this::dataHandler)
  }

  /**
   * Returns a list of available serialports and tries to find which ones
   * are the T-Minus transceiver (sets [portInfo].recommend to true) and sorts
   * them with recommended ones first.
   * @return {Promise<Array>} List of serialports.
   */
  getAvailablePorts () {
    return listPorts()
      .then(list => {
        list = list.map(port => {
          if (port.vendorId === tMinusVid && port.productId === tMinusPid) port.recommend = true
          return port
        })

        list = list.sort((p1, p2) => {
          // Recommended come first
          if (p1.recommend && !p2.recommend) return -1
          if (p2.recommend && !p1.recommend) return 1

          // Otherwise, default to alphabetical sorting
          return p1.comName.localeCompare(p2.comName)
        })

        return list
      })
  }
}
