/**
 * Converts raw DS18B20 temperatures to ºC.
 * @param {Number} raw Raw DS18B20 temperature.
 * @return {Number} ºC temperature.
 */
export function DS18B20(raw) {
  return raw / 128 // TODO: confirm value
}

/**
 * Converts raw MPX4115A temperatures to hPa.
 * @param {Number} raw Raw MPX4115A pressure.
 * @return {Number} hPa pressure.
 */
export function MPX4115A(raw) {
  return ((raw / 1024.0) + 0.095) / 0.0009 // TODO: confirm value
}
