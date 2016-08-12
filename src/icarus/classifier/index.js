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
 * @emits {stationScore} A new station score was calculated.
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
    this.classifyStationInc(score)

    // Update _lastData with the current packet fields
    Object.assign(this._lastData, packet)

    return score
  }

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
