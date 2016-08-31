import * as conv from './unit-conv'

import Parser from '../../parser'
import { decode } from '../../quasi-binary'
import { messages, moduleNames } from './cansat-strings'

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
      this._raw = decode(rawPacket)

      // Parser needs to cleanup some things
      super.parse(this._raw)
    } catch(err) {
      // When we can't decode it, we can't continue
      this.packet.error = err.message

      this.packet.type = '?[decode error]'
    }

    // Save receival time
    this.packet.receivedAt = Date.now()

    // Save raw packet (encoded version)
    this.packet.raw = rawPacket.toJSON().data

    // Handle badly encoded packets
    if(this.packet.error) return this.packet

    // Get packet type identifier
    this.readChar('type')

    // Only handle known packets
    if(this.packet.type === 't' || this.packet.type === 'i' || this.packet.type === 's') {
      // Now the packet counter, timestamps and alike
      this.readUInt('counter', 4)
      this.readUInt('sentAt.millis', 4)
      // this.readUInt('sentAt.unix', 4) // Not yet as of now

      // Generate the packet ID
      this.packet._id = this.packet.counter
    }

    switch(this.packet.type) {
      case 't':
        // 2x DS18B20 temperature sensors
        this.readInt('temp.0', 2, conv.DS18B20)
        this.readInt('temp.1', 2, conv.DS18B20)

        // 2x MPX4115A temperature sensors
        this.readInt('press.0', 2, conv.MPX4115A)
        this.readInt('press.1', 2, conv.MPX4115A)
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

    return this.packet
  }
}
