import Serial from '../serial'
import { parser, dataHandler } from './data-handler'
import PouchDB from 'pouchdb'

/**
 * Handles everything a Station should.
 * Brings Serial, data parsing and database saving together.
 */
export default class Station {
  /**
   * Sets up all relevant class instances (Serial, parsers...).
   */
  constructor () {
    /**
     * Database instance, internal to the station.
     */
    this.db = new PouchDB('station-db')

    /**
     * {@link Serial} instance with the {@link parser} attached
     */
    this.serial = new Serial(parser())

    // Handle incoming packets
    this.serial.on('data', this::dataHandler)
  }
}
