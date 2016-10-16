/**
 * Heuristic creation helper.
 * Fails when value leaves a certain interval: [min, max].
 * @param {Number} min Minimum value.
 * @param {Number} max Maximum value.
 * @returns {Function} The heuristic function.
 * @private
 */
function minmaxH(min, max) {
	return val => val >= min && val <= max
}

/**
 * Heuristic creation helper.
 * Fails when a value jumps up or down a number greater than [variation].
 * @param {Number} variation Maximum variation between packets to be expected.
 * @returns {Function} The heuristic function.
 * @private
 */
function variationH(variation) {
	return (val, lastVal) => Math.abs(val - lastVal) <= variation
}

/**
 * The heuristic algorithms to be used in each field.
 * Format: [ [...fields], [...heuristics] ].
 */
export default new Map([
	[['counter', 'sentAt.millis'], [variationH(1)]],
	[['temp.0', 'temp.1'], [minmaxH(10, 37), variationH(10)]],
	[['press.0', 'press.1'], [minmaxH(0, 2000), variationH(100)]]
])
