import test from 'ava'
import jsc from 'jsverify'

import {encode, decode} from '../src/quasi-binary'

// Returns an array: [min, min+1, ..., max]
function numberArray(min, max) {
	return [...Array(max + 1 - min).keys()].map(v => Number(v + min))
}

test('decodes one byte (below 253)', t => {
	// Every byte value below 253
	const values = numberArray(0, 252)
	for (const value of values) {
		t.true(value === decode([value])[0])
	}
})

test('decodes one byte (>= 253)', t => {
	// The special >= 253 cases
	t.is(decode([253, 0])[0], 253)
	t.is(decode([253, 1])[0], 254)
	t.is(decode([253, 2])[0], 255)
})

test('decodes multiple bytes', t => {
	// Just random things in a random order
	const decoded = Buffer.from([15, 0, 35, 255, 240, 254, 123, 9, 253, 0, 1])
	const encoded = [15, 0, 35, 253, 2, 240, 253, 1, 123, 9, 253, 0, 0, 1]

	t.true(decode(encoded).equals(decoded))

	// All values: 0..252, 253, 0, 253, 1, 253, 2 (encoded) or 0..255 (decoded)
	const decoded2 = Buffer.from(numberArray(0, 255))
	const encoded2 = numberArray(0, 258)
	encoded2[254] = 0
	encoded2[255] = 253
	encoded2[256] = 1
	encoded2[257] = 253
	encoded2[258] = 2

	t.true(decode(encoded2).equals(decoded2))
})

test('decoder detects input overflow', t => {
	// Test all overflowing values: 254, 255
	t.throws(() => decode([254]), 'inputOverflow')
	t.throws(() => decode([255]), 'inputOverflow')
})

test('decoder detects output overflow', t => {
	// Test all overflowing values: 3..255
	const overflowing = numberArray(3, 255)

	for (const val of overflowing) {
		t.throws(() => decode([253, val]), 'outputOverflow')
	}
})

test('algorithm validity (quick-check)', t => {
	const inputGen = jsc.array(jsc.integer(0, 255))
	const assertion = a => decode(encode(a)) !== a
	t.true(jsc.check(jsc.forall(inputGen, assertion), {
		tests: 1000,
		size: 100,
		quiet: true
	}))
})
