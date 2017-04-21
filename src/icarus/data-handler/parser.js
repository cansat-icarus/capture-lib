import Parser from '../../parser'
import * as conv from './unit-conv'
import {messages, moduleNames} from './cansat-strings' // eslint-disable-line import/named

/**
 * The parser for Team Icarus' CanSat.
 */
export default class IcarusParser extends Parser {
	/**
	 * Implementation of {@link Parser#parse}.
	 * Automatically decodes the quasi-binary packet with {@link decode}.
	 * Supports telemetry, info and settings packets.
	 * Also converts sensor values to standard units and attaches text representations
	 * of module names and messages.
	 * @param {Buffer} rawPacket Packet to parse.
	 * @returns {Object} Parsed packet.
	 */
	parse(rawPacket) {
		// Decode packet
		try {
			/** @ignore */
			this._raw = Buffer.from(rawPacket.toString(), 'base64')

			// Parser needs to cleanup some things
			super.parse(this._raw)

			// Save receival time
			this.packet.receivedAt = Date.now()

			// Save raw packet (encoded version)
			this.packet.raw = rawPacket.toJSON().data

			// Handle badly encoded packets
			if (this.packet.error) {
				return this.packet
			}
			// Get packet type identifier
			this.readChar('type')

			// Only handle known packets
			if (this.packet.type === 't' || this.packet.type === 'i' || this.packet.type === 's') {
				// Now the packet counter, timestamps and alike
				this.readUInt('counter', 4)
				this.readUInt('sentAt.millis', 4)
				this.readUInt('sentAt.unix', 4) // Not yet as of now

				// Generate the packet ID
				this.packet._id = String(this.packet.counter)
			}

			switch (this.packet.type) {
				case 't':
					// Temperature
					this.readInt('temp.0', 2, conv.DS18B20)
					this.readInt('temp.1', 2, conv.DS18B20)

					// Pressure
					this.readInt('press.0', 2, conv.MPX4115A)
					this.readInt('press.1', 2, conv.MPX4115A)

					// GPS data
					this.readUInt('gps.flags', 1, conv.gpsFlags)

					// GPS Latitude
					this.readUInt('gps.lat.deg', 2)
					this.readUInt('gps.lat.billionths', 4)
					this.setValue('gps.lat', this.packet.gps.lat, conv.gpsCoordinate)
					if (this.packet.gps.flags.latSign) {
						// The sign bit is true = the value the negative
						this.packet.gps.lat *= -1
					}

					// GPS Longitude
					this.readUInt('gps.lng.deg', 2)
					this.readUInt('gps.lng.billionths', 4)
					this.setValue('gps.lng', this.packet.gps.lng, conv.gpsCoordinate)
					if (this.packet.gps.flags.lngSign) {
						// The sign bit is true = the value the negative
						this.packet.gps.lng *= -1
					}

					this.readInt('gps.speed', 4, conv.gpsSpeed)
					this.readInt('gps.course', 4, conv.gpsCourse)
					this.readInt('gps.altitude', 4, conv.gpsAltitude)

				// Acceleration
					this.readInt('accel.0.x', 2, conv.LIS331HH_24G)
					this.readInt('accel.0.y', 2, conv.LIS331HH_24G)
					this.readInt('accel.0.z', 2, conv.LIS331HH_24G)
					this.readInt('accel.1.x', 2, conv.LIS331HH_24G)
					this.readInt('accel.1.y', 2, conv.LIS331HH_24G)
					this.readInt('accel.1.z', 2, conv.LIS331HH_24G)
					break
				case 'i':
					// Message code and interpretation
					this.readUInt('message.id')
					this.setValue('message.text', messages[this.packet.message.id] || 'Unknown message')
					break
				case 's':
					// Module information
					this.readUInt('module.id')
					this.readBoolean('module.enable')
					this.readUInt('module.interval', 4)
					this.readUInt('module.lastRun', 4)

					// Get module name
					this.setValue('module.name', moduleNames[this.packet.module.id] || 'Unknown module')
					break
				default:
					this.packet.type = `?[0x${this.packet.type.charCodeAt(0).toString(16)}]`
					break
			}
		} catch (err) {
			// When we can't decode it, we can't continue
			this.packet.error = err.message

			this.packet.type = '?[error]'
		}

		return this.packet
	}
}
