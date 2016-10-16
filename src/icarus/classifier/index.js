import {EventEmitter} from 'events'
import {get} from 'object-path'

import packetHeuristicsConfig from './packet-heuristics'

/**
 * Calculates packet and station scores.
 * Not an AI classifier.
 * Packet scores are calculated based on the CRC checksum(60%)
 * and simple heuristics(min/max value, variation between packets)(40%).
 * The heuristics used are configured in the packet-heuristics.js map.
 * Station scores are calculated based on the average packet score. The weight of
 * each packet score is determined by the racional function 1/2x where x is a
 * positive non-zero integer that represents how recent the packet is (1 being the
 * most recent packet).
 */
export default class Classifier extends EventEmitter {
	/**
	 * Constructor.
	 */
	constructor(logger) {
		super()

		/**
		 * The station score.
		 * @type {!Number}
		 */
		this.stationScore = undefined

		/**
		 * The last data received (all packets merge in here).
		 * Used for heuristic algorithms.
		 * @type {Object}
		 */
		this._lastData = Object.create(null)

		/**
		 * Logger instance.
		 * @type {Object}
		 */
		this._log = logger

		this._log.info('classifier.construct')
		this._log.debug('classifier config', {packetHeuristicsConfig})
	}

	/**
	 * Classifies one packet and updates the station score (unless told otherwise).
	 * Packet scores are calculated based on the CRC checksum(60%)
	 * and simple heuristics(min/max value, variation between packets)(40%).
	 * @param {Object} packet The packet to classify.
	 * @param {Boolean} [updateStationClassification=true] Whether to update the station score.
	 * @emits Classifier#stationScore(stationScore) When updateStationClassification is true, the station score is updated and the event is fired.
	 */
	classifyPacket(packet, updateStationClassification = true) {
		this._log.info('classifier.classifyPacket', {updateStationClassification})
		this._log.debug('classifier.classifyPacket', {packet})
		let score = 0

		// Iterate and run each heuristic
		let heuristicCount = 0
		for (const [fields, heuristics] of packetHeuristicsConfig) {
			for (const field of fields) {
				// Get field current value
				const val = get(packet, field)

				// When there is no value, the field does not exist => wrong kind of packet.
				if (val === undefined) {
					this._log.debug('no value, skipping heuristics for', field, {val})
					continue
				}

				// Get last values
				const lastVal = get(this._lastData, field, val)

				for (const heuristic of heuristics) {
					heuristicCount++
					this._log.trace('Running heuristic', heuristic.name)
					score += heuristic(val, lastVal)
				}
			}
		}

		// Bump score to a 0-40 range
		score *= 40 / heuristicCount

		// The CRC accounts for 60% of the score, unless there are no heuristics
		if (packet.crc.sent === packet.crc.local) {
			if (score === Infinity || score === -Infinity || isNaN(score)) {
				score = 100
			} else {
				score += 60
			}
		} else if (score === Infinity || score === -Infinity || isNaN(score)) {
			score = 0
		}

		// Update station classification
		if (updateStationClassification) {
			this.classifyStationInc(score)
		}

		// Update _lastData with the current packet fields
		Object.assign(this._lastData, packet)

		return score
	}

	/**
	 * Updates the station score(incrementally).
	 * Station scores are calculated based on the average packet score. The weight of
	 * each packet score is determined by the racional function 1/2x where x is a
	 * positive non-zero integer that represents how recent the packet is (1 being the
	 * most recent packet).
	 * @param {Number} packetScore The score of the previously unnacounted packet.
	 * @returns {Number} New station score.
	 * @emits Classifier#stationScore(stationScore) Because the station score was updated.
	 */
	classifyStationInc(packetScore) {
		if (this.stationScore === undefined) {
			this.stationScore = packetScore
		} else {
			this.stationScore += packetScore
			this.stationScore /= 2
		}

		// Warn about the change
		this.emit('stationScore', this.stationScore)

		return this.stationScore
	}
}
