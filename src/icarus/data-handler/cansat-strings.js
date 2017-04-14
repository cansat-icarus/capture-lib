/**
 * Array of CanSat strings: informational messages.
 * The CanSat does not store nor send strings. It just works
 * with small integers (uint8_t) and sends them in place.
 * In the ground station, these identifiers are used to retrieve the correct
 * string representation.
 *
 * These correspond to informational messages, sent in PACKET_INFO packets
 */
export const messages = [
	'Unknown message/error.',
	'No DS18B20 sensors found. [temperature]',
	'Only one DS18B20 sensor found. [temperature]'
]

/**
 * Array of CanSat strings: module names.
 * The CanSat does not store nor send strings. It just works
 * with small integers (uint8_t) and sends them in place.
 * In the ground station, these identifiers are used to retrieve the correct
 * string representation.
 *
 * These correspond to module names (as in ModuleRegistry modules), sent in PACKET_SETTINGS packets.
 */
export const moduleNames = [
	'Status LED',
	'Telemetry packet routine',
	'Temperature update',
	'Pressure update'
	// TODO: update
]
