/**
 * Gets one bit out of a byte/bytes.
 * @param b {Number} The byte or bytes (up to one 32bit unsigned integer).
 * @param i {Number} The bit index.
 * @return {Boolean} Bit value.
 */
const getBit = (b, i) => Boolean((b >> i) & 1)

/**
 * Converts raw DS18B20 temperatures to ºC.
 * @param {Number} raw Raw DS18B20 temperature.
 * @return {Number} ºC temperature.
 */
export function DS18B20(raw) {
	return raw / 128 // TODO: confirm value, that's what's done in the Arduino Library
}

/**
 * Converts raw MPX4115A temperatures to hPa.
 * @param {Number} raw Raw MPX4115A pressure.
 * @return {Number} hPa pressure.
 */
export function MPX4115A(raw) {
	return ((raw / 1024.0) + 0.095) / 0.0009 // TODO: confirm value, worked last year
}


export function LIS331HH_24G(raw) {
	// 12 mG/digit according to datasheet
	// 1G = 9.80665 m/s^2 according to the International Service of Weights and Measures (2006 ISBN: 92-822-2213-6)

	return (raw * 12 / 1000) * 9.80665
}

/**
 * Processes the GPS boolean flags that are crammed in one byte.
 * In this order we have: latitude sign, longitude sign, location validity,
 * speed validity, course validity and altitude validity.
 * @param {Number} raw The number (0-255) containing the flags.
 * @return {Object} Flags as an object.
 */
export function gpsFlags(raw) {
	return {
		latSign: getBit(raw, 0),
		lngSign: getBit(raw, 1),
		locationValid: getBit(raw, 2),
		speedValid: getBit(raw, 3),
		courseValid: getBit(raw, 4),
		altitudeValid: getBit(raw, 5)
	}
}

/**
 * Convert raw coordinate object ({deg, billionths}) into an actual latitude
 * or longitude coordinate.
 * This does not check any sign/cardinal orientation. The coordinate is always
 * positive.
 * @param {Object} raw Raw coordinate as {deg, billionths}.
 * @return {Number} The GPS coordinate.
 */
export function gpsCoordinate(raw) {
	// As it's done in TinyGPS++
	return raw.deg + (raw.billionths / 1000000000.0)
}

export function gpsSpeed(raw) {
	// As it's done in TinyGPS++
	return (raw * 0.51444444) / 100.0
}

export function gpsCourse(raw) {
	// As it's done in TinyGPS++
	return raw / 100.0
}

export function gpsAltitude(raw) {
	// As it's done in TinyGPS++
	return raw / 100.0
}
