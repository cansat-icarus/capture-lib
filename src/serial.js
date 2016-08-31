import SerialPort from 'serialport'
import { EventEmitter } from 'events'

/**
 * A node-serialport wrapper that keeps track of port state and allows from on-the-fly
 * port path/name changes (automatically attaches/detaches event listeners and keeps config).
 */
export default class Serial extends EventEmitter {
  /**
   * Constructor: the place for setting the baud rate and parser.
   * @param {Function} [parser=raw] A node-serialport parser.
   * @param {Number} [baud=19200] Desired baud rate.
   */
  constructor (logger, parser, baud = 19200) {
    super()

    /**
     * Holds the current node-serialport instance.
     * @type {!SerialPort}
     */
    this._port = undefined

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
    this._path = undefined

    /**
     * Holds current state. Possible values: disconnect, open, close, disconnect_force.
     * @type {String}
     */
    this._state = 'close'

    /**
     * Logger instance. (Bunyan API).
     * @type Object
     */
    this._log = logger
  }

  /**
   * Sets a new path to all future serialport instances. If a port is already open,
   * it is automatically closed and a new one is opened with the new path (keeps event listeners).
   * @emits Serial#data(packet) New data arrived (after being parsed by {@link Serial#_parser}).
   * @emits Serial#stateChange(state) {@link Serial#_state} has changed.
   * @emits Serial#error(error) An error ocurred in node-serialport.
   * @return {Promise} When path is changed and the port recreated/reopened.
   */
  setPath (path) {
    this._log.debug('serial.setPath')
    // Guard for already changed port...
    if (path === this._path) {
      this._log.trace('serial._path needs no change', path)
      return Promise.resolve()
    }

    return new Promise(resolve => {
      // Any _port recreation will open this new path
      this._log.trace('serial._path changed to', path)
      this._path = path

      // Destroy and recreate _port when necessary
      if (this._port) {
        this._log.trace('serial._path changed: recreating existing port')
        let open = this._port.isOpen()
        this._destroyPort()
          .then(() => open ? this.open() : this._createPort())
          .then(resolve)
      } else {
        resolve()
      }
    })
  }

  /**
   * Opens the serialport, creating it if needed.
   * @emits Serial#data(packet) New data arrived (after being parsed by {@link Serial#_parser}).
   * @emits Serial#stateChange(state) {@link Serial#_state} has changed.
   * @emits Serial#error(error) An error ocurred in node-serialport.
   * @return {Promise} Resolved when the serial port is open.
   */
  open () {
    this._log.debug('serial.open')
    return new Promise(resolve => {
     // No port? Create it!
      if (!this._port) {
        this._log.trace('port does not exist')
        return this._createPort()
          .then(() => this.open())
          .then(resolve)
      }

      // Already open = nothing to do
      if (this._port.isOpen()) {
        this._log.trace('port already open')
        return resolve()
      }

      // Open the port
      this._log.trace('calling serial._port.open')
      this._port.open(resolve)
    })
  }

  /**
   * Closes the serialport.
   * @emits Serial#stateChange(state) {@link Serial#_state} has changed.
   * @emits Serial#error(error) An error ocurred in node-serialport.
   * @return {Promise<!Error>} Resolved when the serialport is closed.
   */
  close () {
    this._log.debug('serial.close')
    // Already closed/no port = nothing to do
    if (!this._port || !this._port.isOpen()) {
      this._log.trace('port already closed/does not exist')
      return Promise.resolve()
    }

    this._log.trace('calling serial._port.close')
    return new Promise(resolve => this._port.close(resolve))
  }

  /**
   * Destroys the current serialport instance. Removing all listeners and closing it beforehand.
   * @protected
   * @emits Serial#stateChange(state) {@link Serial#_state} has changed.
   * @emits Serial#error(error) An error ocurred in node-serialport.
   * @returns {Promise<!Error>} Resolves when all is done.
   */
  _destroyPort () {
    this._log.debug('serial._destroyPort')
    return new Promise(resolve => {
      this._port.removeAllListeners()

      // Only close if necessary
      if (!this._port.isOpen()) {
        this._log.trace('port not open, removing it')
        this._port = undefined
        return resolve()
      }

      this._log.trace('port open, closing')
      this._port.close(error => {
        if (error) {
          this._log.error('Error closing port!', error)
        }

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
   * @emits Serial#data(packet) New data arrived (after being parsed by {@link Serial#_parser}).
   * @emits Serial#stateChange(state) {@link Serial#_state} has changed.
   * @emits Serial#error(error) An error ocurred in node-serialport.
   * @return {Promise} A resolved Promise for easy chaining in {@link Serial#setPath}.
   */
  _createPort () {
    // Only create if it does not exist
    if (this._port) return Promise.resolve()

    // Create serialport instance
    this._port = new SerialPort(this._path, {
      baudRate: this._baud,
      parser: this._parser,
      autoOpen: false
    })

    // Register event listeners
    this._port.on('data', data => this.emit('data', data))
    this._port.on('error', error => {
      this._log.fatal(error)
      this.emit('error', error)
    })

    // State tracking
    this._port.on('open', () => this._updateState('open'))
    this._port.on('disconnect', () => this._updateState('disconnect_force'))
    this._port.on('close', () => {
      // Detect safe disconnections
      if (this._state === 'disconnect_force') return this._updateState('disconnect')
      this._updateState('close')
    })

    return Promise.resolve()
  }

  /**
   * Shortcut for updating state that changes this._state and emits
   * a stateChange event with one call.
   * @protected
   * @param {String} state New state.
   * @emits Serial#stateChange(state) {@link Serial#_state} has changed.
   */
  _updateState (state) {
    this._state = state
    this.emit('stateChange', state)
  }
}

/**
 * Lists available ports in the system with SerialPort.list.
 * Tries to fill out vendorId and productId fields in Windows from pnpId.
 * @return {Promise<Array>} Array of port information objects.
 */
export function listPorts () {
  return new Promise((resolve, reject) => {
    SerialPort.list((err, ports) => {
      if (err) {
        this._log.fatal(err, { ports })
        return resolve([])
      }

      // Fill out some missing fields if possible
      ports = ports.map(port => {
        if ((!port.vendorId || !port.productId) && port.pnpId) {
          port.vendorId = '0x' + /VID_([0-9,A-Z]*)&/.exec(port.pnpId)[1].toLowerCase()
          port.productId = '0x' + /PID_([0-9,A-Z]*)&/.exec(port.pnpId)[1].toLowerCase()
        }

        return port
      })

      resolve(ports)
    })
  })
}
