import SerialPort from 'serialport'
import { EventEmitter } from 'events'

/**
 * A node-serialport wrapper that keeps track of port state and allows from on-the-fly
 * port path/name changes (automatically attaches/detaches event listeners and keeps config).
 * @emits {data} New data arrived (after being parsed by {@link Serial#_parser}).
 * @emits {error} An error ocurred in node-serialport.
 * @emits {stateChanged} {@link Serial#_state} has changed.
 */
export class Serial extends EventEmitter {
  /**
   * Constructor: the place for setting the baud rate and parser.
   * @param {Function} [parser=raw] A node-serialport parser.
   * @param {Number} [baud=19200] Desired baud rate.
   */
  constructor (parser, baud = 19200) {
    super()

    /**
     * Holds the current node-serialport instance.
     * @type {!SerialPort}
     */
    this._port = null

    /**
     * Holds the desired serial baud rate.
     * @type {Number}
     */
    this._baud = baud

    /**
     * Holds the parsing function.
     * @type {!Function}
     */
    this._parser = parser

    /**
     * Holds the current port path.
     * @type {!String}
     */
    this._path = null

    /**
     * Holds current state. Possible values: disconnected, open, closed, disconnected_forced.
     * @type {String}
     */
    this._state = 'disconnected'
  }

  /**
   * Sets a new path to all future serialport instances. If a port is already open,
   * it is automatically closed and a new one is opened with the new path (keeps event listeners).
   */
  setPath (path) {
    // Any _port recreation will open this new path
    this._path = path

    // Destroy and recreate _port
    this._destroyPort()
      .then(() => this.open())
  }

  /**
   * Opens the serialport, creating it if needed.
   * @return {Promise} Resolved when the serial port is open.
   */
  open () {
    // No port? Create it!
    if (!this._port) this._createPort()

    // Already open = nothing to do
    if (this._port.isOpen()) return

    // Open the port
    return new Promise(resolve => this._port.open(resolve))
  }

  /**
   * Closes the serialport.
   * @return {Promise<!Error>} Resolved when the serialport is closed.
   */
  close () {
    // Already closed/no port = nothing to do
    if (!this._port || !this._port.isOpen()) return Promise.resolve()

    return new Promise(resolve => this._port.close(resolve))
  }

  /**
   * Destroys the current serialport instance. Removing all listeners and closing it beforehand.
   * @protected
   * @returns {Promise<!Error>} Resolves when all is done.
   */
  _destroyPort () {
    return new Promise(resolve => {
      this._port.removeAllListeners()
      this._port.close(error => {
        if (error) this.emit('error', error)

        // Must keep going
        this._port = undefined
        resolve()
      })
    })
  }

  /**
   * Creates the serialport instance and attaches all relevant event listeners
   * that forward data and errors and keep track of state.
   * @protected
   */
  _createPort () {
    // Create serialport instance
    this._port = new SerialPort(this._path, {
      baudRate: this._baud,
      parser: this._parser,
      autoOpen: false
    })

    // Register event listeners
    this._port.on('data', data => this.emit('data', data))
    this._port.on('error', error => this.emit('error', error))

    // State tracking
    this._port.on('open', () => this._updateState('open'))
    this._port.on('disconnect', () => this._updateState('disconnected_forced'))
    this._port.on('close', () => {
      // Detect safe disconnections
      if (this._state === 'disconnected_forced') return this._updateState('disconnected')
      this._updateState('closed')
    })
  }

  /**
   * Shortcut for updating state that changes this._state and emits
   * a stateChange event with one call.
   * @protected
   * @param {String} state New state.
   */
  _updateState (state) {
    this._state = state
    this.emit('stateChange', state)
  }
}
