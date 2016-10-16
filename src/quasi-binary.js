/**
 * Quasi-binary encoding format utilities.
 */

/**
 * Decodes a buffer in the quasi-binary format.
 * @param {Buffer} input Enconded buffer.
 * @return {Buffer} Decoded buffer.
 * @throws {Error(inputOverflow)} Throwed when an input byte exceeds the value 253.
 * @throws {Error(outputOverflow)} Throwed when an input byte with value 253 is followed by another one exceeding 2.
 */
export function decode(input) {
	// Holds the decoded data
	const output = Buffer.alloc(input.length)

	// Decoder loop
	let iOut = 0
	for (let iIn = 0; iIn < input.length; iIn++) {
		// Error checks
		if (input[iIn] > 253) {
			throw new Error('inputOverflow')
		}

		if (input[iIn] === 253 && input[iIn] + input[iIn + 1] > 255) {
			throw new Error('outputOverflow')
		}

		output[iOut++] = input[iIn] < 253 ? input[iIn] : input[iIn] + input[++iIn]
	}

	// Return output (sliced to actual size)
	return output.slice(0, iOut)
}

/**
 * Encodes a buffer in the quasi-binary format.
 * @experimental NOT IMPLEMENTED! DO NOT USE!
 * @param {Buffer} input Buffer to encode.
 * @return {Buffer} Encoded buffer.
 */
export function encode(input) {
	// TODO: implement
	// VERY LOW PRIORITY, SHOULDN'T BE NECESSARY
	return input
}
