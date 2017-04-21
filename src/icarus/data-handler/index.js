import {v4 as uuid} from 'uuid'

import IcarusParser from './parser'

/**
 * 'Transceiver MODE' Buffer for future comparison.
 * Helps ignoring messages from transceiver.
 * @private
 * @type {Buffer}
 */
// TODO: check with the CanSat on: is this what we receive?
const tmBuffer = Buffer.from('Transceiver MODE')

/**
 * Creates and returns a "byteDelimiter" parser.
 * DISCLAIMER: It's a patched version of node-serialport's byteDelimiter parser.
 * You can find it's source here: https://github.com/EmergingTechnologyAdvisors/node-serialport/tree/master/lib/parsers.js
 * Changes from the original: trailing delimiters are removed, buffer passes through packetParser.parse before being emitted
 * and empty buffers and 'Transceiver MODE' messages are ignored.
 * Separates packets by a byte delimiter and passes them through {@link packetParser}
 * @returns {Function} The parser itself
 */
/*
LICENSE OF THE ORIGINAL "byteDelimiter" parser:

Copyright 2010, 2011, 2012 Christopher Williams. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
*/
export function parser() {
	const delimiter = [13, 10] // \r\n
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
					// Create one packetParser object per packet
					// If this one crashes, the others have a chance.
					// It shouldn't throw any exception, but sometimes weird things happen.
					// Let us not forget Murphy's Law.
					const packetParser = new IcarusParser()

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
 * @param {Object} packet Packet to be parsed and saved.
 * @return {Promise} Resolves when all is done.
 */
export function dataHandler(packet) {
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
		.then(() => this._log.trace('packet saved', {packet}))
		.catch(err => this._log.error(err))
}
