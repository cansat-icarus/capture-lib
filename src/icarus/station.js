import PouchDB from 'pouchdb'
import Serial from '../serial'
import Classifier from '../classifier'
import { parser, dataHandler } from './data-handler'

/**
 * Handles everything a Station should.
 * Brings Serial, data parsing and database saving together.
 */
export default class Station {
  /**
   * Sets up all relevant class instances (Serial, parsers...) and events listeners.
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

    /**
     * {@link Classifier} instance, that holds a reference back to us.
     */
    this.classifier = new Classifier()

    // Handle incoming packets
    this.serial.on('data', this::dataHandler)
  }
}
