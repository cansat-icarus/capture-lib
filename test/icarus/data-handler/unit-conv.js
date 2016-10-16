import test from 'ava'
import * as conv from '../../../src/icarus/data-handler/unit-conv'

// These tests basically make you double check formula changes... better than nothing
// TODO: Maybe get some fixed values from the datasheet?

test('convert DS18B20 temperature', t => {
	const raw = [2560, 3200, 3840]
	const expected = raw.map(v => v / 128)
	const calculated = raw.map(conv.DS18B20)

	for (let i = 0; i < expected.length; i++) {
		t.is(calculated[i], expected[i])
	}
})

test('convert MPX4115A pressure', t => {
	const raw = [60, 200, 123]
	const expected = raw.map(v => ((v / 1024.0) + 0.095) / 0.0009)
	const calculated = raw.map(conv.MPX4115A)

	for (let i = 0; i < expected.length; i++) {
		t.is(calculated[i], expected[i])
	}
})
