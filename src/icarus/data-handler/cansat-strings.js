/**
 * Map of CanSat strings.
 * The CanSat does not store nor send strings. It just works
 * with small integers (uint8_t) and sends them in place.
 * In the ground station, these identifiers are used to retrieve the correct
 * string representation.
 * @property {Array} messages Array of informational messages (PACKET_INFO).
 * @property {Array} moduleNames Array of names of each CanSat Module (as in module class instance, registered in the Scheduler).
 */
export default {
  messages: [
    'Unknown message/error.',
    'No DS18B20 sensors found. [temperature]',
    'Only one DS18B20 sensor found. [temperature]'
  ],
  moduleNames: [
    'Status LED',
    'Telemetry packet routine',
    'Temperature update',
    'Pressure update'
  ]
}
