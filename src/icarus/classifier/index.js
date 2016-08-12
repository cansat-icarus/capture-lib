import { EventEmitter } from 'events'
import { get } from 'object-path'
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
  /** @ignore */
  constructor () {
    super()

    /**
     * The station score.
     * @type {Number}
     */
    this.stationScore = undefined

    /**
     * The last data received (all packets merge in here).
     * Used for heuristic algorithms.
     * @type {Object}
     */
    this._lastPacket = Object.create(null)
  }

  /**
   * Classifies one packet and updates the station score (unless told otherwise).
   * Packet scores are calculated based on the CRC checksum(60%)
   * and simple heuristics(min/max value, variation between packets)(40%).
   * @param {Object} packet The packet to classify.
   * @param {Boolean} [updateStationClassification=true] Whether to update the station score.
   * @emits Classifier#stationScore(stationScore) When updateStationClassification is true, the station score is updated and the event is fired.
   */
  classifyPacket (packet, updateStationClassification = true) {
    let score = 0

    // Iterate and run each heuristic
    let heuristicCount = 0
    for (const [fields, heuristics] of packetHeuristicsConfig) {
      for (const field of fields) {
        // Get field current value
        const val = get(packet, field)

        // When there is no value, the field does not exist => wrong kind of packet.
        if (!val) continue

        // Get last values
        const lastVal = get(this._lastValues, field, val)

        for (const heuristic of heuristics) {
          heuristicCount++
          score += heuristic(val, lastVal)
        }
      }
    }

    // Bump score to a 0-40 range
    score *= 40 / heuristicCount

    // The CRC accounts for 60% of the score
    if (packet.crc.sent === packet.crc.calculated) score += 60

    // Update station classification
    if (updateStationClassification) this.classifyStationInc(score)

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
  classifyStationInc (packetScore) {
    if (!this.stationScore) {
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
