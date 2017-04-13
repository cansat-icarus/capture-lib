import {crc32} from 'crc'
import {set as objPathSet} from 'object-path'

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
	constructor(endianess = 'LE') {
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
		 * Parsed output container.
		 * @type {Object}
		 * @property {String} crc.sent The CRC32 checkum sent along with the packet.
		 * @property {String} crc.local The CRC32 checksum calculated from the sent data.
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
	 * Parses a packet. Default implementation resets state and calculates and extracts the CRC32
	 * checksum before parsing the new packet.
	 * That's why, if you want any parsing at all to be performed, YOU MUST RE-IMPLEMENT THIS METHOD.
	 * Preferrably calling this implementation before any parsing(but after any decoding
	 * *wink* *wink* quasi-binary decoder).
	 * @param {Buffer} rawPacket The packet to be parsed.
	 * @return {Object} The parsed object.
	 */
	parse(rawPacket) {
		// Change the current packet
		this._raw = rawPacket

		// Reset state thingies
		this._i = 0
		this.packet = Object.create(null)

		// Calculate CRC
		this.setValue('crc.sent', rawPacket[`readUInt${this.endianess}`](rawPacket.length - 4, 4).toString(16))
		this.setValue('crc.local', crc32(rawPacket.slice(0, rawPacket.length - 4)).toString(16))

		// More parsing reserved to subclass
		return this.packet // Just to behave as the Docs say it will
	}

	/**
	 * The value setter called by read* helper functions.
	 * Uses object path dot notation in the key and can convert values in one line.
	 * @param {String} key The object path where the value will be inserted.
	 * @param {mixed} val Anything you want to put.
	 * @param {Function} [converter=identity] A function that converts the value.
	 * @return {mixed} The provided value (val).
	 */
	setValue(key, val, converter = v => v) {
		// Set the value in this.packet.[key]
		objPathSet(this.packet, key, converter(val))
		return val
	}

	/**
	 * Reads a signed integer of 1-6 bytes.
	 * @param {String} key The dot notation path where the int goes to.
	 * @param {Number} [size=1] The size in bytes of the integer (1 to 6 bytes only).
	 * @param {Function} [converter=identity] A function that converts the value.
	 * @return {Number} The read integer.
	 */
	readInt(key, size = 1, converter) {
		// Get the value and update the index
		const val = this._raw[`readInt${this.endianess}`](this._i, size)
		this._i += size

		return this.setValue(key, val, converter)
	}

	/**
	 * Reads an unsigned integer of 1-6 bytes.
	 * @param {String} key The dot notation path where the int goes to.
	 * @param {Number} [size=1] The size in bytes of the integer (1 to 6 bytes only).
	 * @param {Function} [converter=identity] A function that converts the value.
	 * @return {Number} The read integer.
	 */
	readUInt(key, size = 1, converter) {
		// Get the value and update the index
		const val = this._raw[`readUInt${this.endianess}`](this._i, size)
		this._i += size

		return this.setValue(key, val, converter)
	}

	/**
	 * Reads a 32-bit float.
	 * @param {String} key The dot notation path where the float goes to.
	 * @param {Function} [converter=identity] A function that converts the value.
	 * @return {Number} The read float.
	 */
	readFloat(key, converter) {
		// Get the value and update the index
		const val = this._raw[`readFloat${this.endianess}`](this._i)
		this._i += 4

		return this.setValue(key, val, converter)
	}

	/**
	 * Reads a char.
	 * @param {String} key The dot notation path where the char goes to.
	 * @param {Function} [converter=identity] A function that converts the value.
	 * @return {String} The read char.
	 */
	readChar(key, converter) {
		return this.setValue(key, String.fromCharCode(this._raw[this._i++]), converter)
	}

	/**
	 * Reads a boolean.
	 * @param {String} key The dot notation path where the boolean goes to.
	 * @param {Function} [converter=identity] A function that converts the value.
	 * @return {Boolean} The read boolean.
	 */
	readBoolean(key, converter) {
		return this.setValue(key, Boolean(this._raw[this._i++]), converter)
	}
}
