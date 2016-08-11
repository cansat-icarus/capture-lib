import { crc32 } from 'crc'
import { set as objPathSet } from 'object-path'

/**
 * Parser creation helper class. Any subclasses should reimplement the parse method,
 * calling super.parse in the beginning. You have useful methods for reading regular C
 * datatypes from the buffer: readInt, readFloat, readChar... To use it in node-serialport
 * or the serial wrapper just pass in ::Parser.parse
 * Keep in mind not initialize this class as is. RE-IMPLEMENT Parser.parse!
 */
export default class Parser {
  /**
   * @param {String} [endianess='LE'] Set byte-order to big endian (BE) or little endian (LE).
   */
  constructor (endianess = 'LE') {
    /**
     * Current packet being parsed.
     * @type {!Object}
     * @protected
     */
    this._raw = undefined

    /**
     * Current position in the packet being parsed.
     * @type {Number}
     * @protected
     */
    this._i = 0

    /**
     * CRC32 checksum for the current packet. (incremental calculation).
     * @type {!Number}
     */
    this.crc = undefined

    /**
     * Parsed output container.
     * @type {Object}
     */
    this.packet = Object.create(null)

    /**
     * Raw packet byte endianess (Little Endian (LE) for the Arduino).
     * Acceptable values: LE, BE.
     * @type {String}
     */
    this.endianess = endianess
  }

  /**
   * Parses a packet. Default implementation simply resets state before parsing the new packet.
   * That's why, if you want any parsing at all to be performed, YOU MUST RE-IMPLEMENT THIS METHOD.
   * Preferrably calling this implementation before any parsing.
   * @param {Buffer} rawPacket The packet to be parsed.
   * @return {Object} The parsed object (always empty in the this (base Parser class) implementation).
   */
  parse (rawPacket) {
    // Change the current packet
    this._raw = rawPacket

    // Reset state thingies
    this._i = 0
    this.crc = undefined
    this.packet = Object.create(null)

    // More parsing reserved to subclass
    return this.packet // Just to behave as the Docs say it will
  }

  /**
   * The value setter called by read* helper functions.
   * Uses object path dot notation in the key and incrementally calculates CRC32
   * checksums by default.
   * @param {String} key The object path where the value will be inserted.
   * @param {mixed} val Anything you want to put.
   * @param {Function} [converter=identity] A function that converts the value.
   * @param {Boolean} [crc=true] Whether to include this value in the CRC checksum.
   * @return {mixed} The provided value (val).
   */
  setValue (key, val, converter = val => val, crc = true) {
    // Incrementally generate crc when needed
    if (crc) this.crc = crc32(val, this.crc)

    // Set the value in this.packet.[key]
    objPathSet(this.packet, key, val)
    return val
  }

  /**
   * Reads a signed integer of 1-6 bytes.
   * @param {String} key The dot notation path where the int goes to.
   * @param {Number} [size=1] The size in bytes of the integer (1 to 6 bytes only).
   * @param {Function} [converter=identity] A function that converts the value.
   * @param {Boolean} [crc=true] Whether to include this value in the CRC cheksum.
   * @return {Number} The read integer.
   */
  readInt (key, size = 1, converter, crc) {
    // Get the value and update the index
    let val = this._raw[`readInt${this.endianess}`](this._i, size)
    this._i += size

    return this.setValue(key, val, converter, crc)
  }

  /**
   * Reads an unsigned integer of 1-6 bytes.
   * @param {String} key The dot notation path where the int goes to.
   * @param {Number} [size=1] The size in bytes of the integer (1 to 6 bytes only).
   * @param {Function} [converter=identity] A function that converts the value.
   * @param {Boolean} [crc=true] Whether to include this value in the CRC cheksum.
   * @return {Number} The read integer.
   */
  readUInt (key, size = 1, converter, crc) {
    // Get the value and update the index
    let val = this._raw[`readUInt${this.endianess}`](this._i, size)
    this._i += size

    return this.setValue(key, val, converter, crc)
  }

  /**
   * Reads a 32-bit float.
   * @param {String} key The dot notation path where the float goes to.
   * @param {Function} [converter=identity] A function that converts the value.
   * @param {Boolean} [crc=true] Whether to include this value in the CRC cheksum.
   * @return {Number} The read float.
   */
  readFloat (key, converter, crc) {
    // Get the value and update the index
    let val = this._raw[`readFloat${this.endianess}`](this._i)
    this._i += 4

    return this.setValue(key, val, converter, crc)
  }

  /**
   * Reads a char.
   * @param {String} key The dot notation path where the char goes to.
   * @param {Function} [converter=String.fromCharCode] A function that converts the value.
   * @param {Boolean} [crc=true] Whether to include this value in the CRC cheksum.
   * @return {String} The read char.
   */
  readChar (key, converter = String.fromCharCode, crc) {
    return this.setValue(key, this._raw[this._i++], converter, crc)
  }
}
