import { v4 as uuid } from 'uuid'
import IcarusParser from './parser'

/**
 * 'Transceiver MODE' Buffer for future comparison.
 * Helps ignoring messages from transceiver.
 * @private
 * TODO: check with the CanSat on: is this what we receive?
 */
const tmBuffer = Buffer.from('Transceiver MODE')

/**
 * {@link IcarusParser} instance for parsing duties.
 * @private
 */
const packetParser = new IcarusParser()

/**
 * DISCLAIMER: It's a patched version of node-serialport's byteDelimiter parser.
 * You can find it's source here: https://github.com/EmergingTechnologyAdvisors/node-serialport/tree/master/lib/parsers.js
 * Changes from the original: trailing delimiters are removed, buffer passes through packetParser.parse before being emitted
 * and empty buffers and 'Transceiver MODE' messages are ignored.
 * Separates packets by a byte delimiter and passes them through {@link packetParser}
 */
export function parser () {
  const delimiter = [254, 255]
  let buf = []
  let nextDelimIndex = 0

  return (emitter, buffer) => {
    for (let i = 0; i < buffer.length; i++) {
      buf[buf.length] = buffer[i]

      if (buf[buf.length - 1] === delimiter[nextDelimIndex]) {
        nextDelimIndex++
      }

      if (nextDelimIndex === delimiter.length) {
        // Remove trailing 254, 255 and ignore empty packets/'Transceiver MODE'
        // Spare the parser the trouble, packets are always at least 6 bytes
        if (buf.length >= 8 && !Buffer.from(buf).equals(tmBuffer)) {
          emitter.emit('data', packetParser.parse(Buffer.from(buf.slice(0, buf.length - 2))))
        }
        buf = []
        nextDelimIndex = 0
      }
    }
  }
}

/**
 * A handler for incoming {@link Serial#data}.
 * Saves packets to the local database.
 * Should be called bound to a {@link Station}.
 * @return {Promise} Resolves when all is done.
 */
export function dataHandler (packet) {
  // Properly handle bad packets
  if (packet.type.length === 1 && packet.type !== '?') {
    // Assign packet score
    packet.score = this.classifier.classifyPacket(packet)
  } else {
    // Bad packets have score 0
    packet.score = 0
    this.classifier.classifyStationInc(0)

    // Generate a mostly random id
    packet._id = `?${packet.receivedAt}-${uuid()}`
  }

  // Alert UI through station
  this.emit('packet', packet)

  // Save to DB
  return this.db.put(packet)
    .then(() => console.log('Packet saved'))
    .catch(err => console.error(err))
}
