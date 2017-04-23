/**
 * Gets one bit out of a byte/bytes.
 * @param b {Number} The byte or bytes (up to one 32bit unsigned integer).
 * @param i {Number} The bit index.
 * @return {Boolean} Bit value.
 */
const getBit = (b, i) => Boolean((b >> i) & 1)

export function gToMs2(gValue) {
	// 1G = 9.80665 m/s^2 (International Service of Weights and Measures (2006) (ISBN: 92-822-2213-6))
	return gValue * 9.80665
}

export function analogToMV(analogReadResult) {
	// Raw values range from 0 to 1023, where 0 -> 0V and 1024 -> 5V (or 5000mV) (Arduino analogRead reference)
	return (analogReadResult * 5000) / 1023
}

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
	let vOut = analogToMV((5000 * raw) / 1023)

	// 204mV -> offset for minimum rated pressure (Datasheet)
	vOut -= 204

	// 45.9 mV/kPa (Datasheet)
	// 15 kPa -> minimum rated pressure (Datasheet)
	// last multiplication by 10: conversion from kPa to hPa (1kPa = 10hPa)
	return ((vOut / 45.9) + 15) * 10
}

export function LIS331HH_24G(raw) {
	// 12 mG/digit (Datasheet)
	// mGs, not Gs, so we need to divide by 1000
	return gToMs2((raw * 12) / 1000)
}

export function MMA7361_6G(raw) {
	// 206 mV/G (Datasheet)
	// 0G ≈ 1.65V or 1650mV (Datasheet)
	return gToMs2((analogToMV(raw) - 1650) / 206)
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
