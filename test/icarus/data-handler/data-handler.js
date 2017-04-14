import test from 'ava'

import createFakeLogger from '../../helpers/fakelog'
import {parser, dataHandler, __Rewire__, __ResetDependency__} from '../../../src/icarus/data-handler'

// This test needs to be waited for...
// The IcarusParser mock breaks other tests
test.serial('splits packets on [254, 255]', t => {
	// Mock IcarusParser inside the handler
	__Rewire__('packetParser', {
		parse: buf => buf
	})

	const packets = [
		[23, 14, 125, 203, 45, 253, 123, 123],
		[253, 253, 123, 134, 39, 0, 132, 123],
		[143, 23, 44, 0, 0, 240, 123, 123]
	]

	const parse = parser()
	const mockEmitter = i => {
		return {
			emit: (ev, buf) => {
				if (ev !== 'data') {
					return t.fail('unexpected parser event ' + ev)
				}
				if (i < 0) {
					return t.fail('No data available yet')
				}

				t.deepEqual(buf.toJSON().data, packets[i])

				// Reset packetParser to normal in the end
				if (i === 2) {
					__ResetDependency__('packetParser')
				}
			}
		}
	}

	// Just send them in pieces and expect things to happen
	t.plan(3)
	parse(mockEmitter(-1), Buffer.from([254, 255]))
	parse(mockEmitter(-1), Buffer.from(packets[0].slice(0, packets[0].length - 1)))
	parse(mockEmitter(0), Buffer.from([packets[0][packets[0].length - 1], 254, 255, packets[1][0]])) // Should emit packet #0
	parse(mockEmitter(-1), Buffer.from(packets[1].slice(1, packets[1].length - 1)))
	parse(mockEmitter(1), Buffer.from([packets[1][packets[1].length - 1], 254, 255])) // Should emit packet #1
	parse(mockEmitter(2), Buffer.from([...packets[2], 254, 255])) // Should emit packet #2
})

test.serial.cb('passes packets through IcarusParser', t => {
	// Define what packets we're going to test
	const input = [
		Buffer.from([0, 23, 234, 123, 42, 250, 254, 255]),
		Buffer.from([0, 212, 94, 12, 45, 234, 254, 255]),
		Buffer.from([0, 134, 250, 203, 1, 54, 7, 234, 254, 255])
	]

	const expected = [
		Buffer.from([0, 23, 234, 123, 42, 250]),
		Buffer.from([0, 212, 94, 12, 45, 234]),
		Buffer.from([0, 134, 250, 203, 1, 54, 7, 234])
	]

	const fakeEmitter = {emit: () => undefined}

	// This test needs to be waited for...
	// The IcarusParser mock breaks other tests
	let icarusParserCalls = 0
	__Rewire__('packetParser', {
		parse(packet) {
			t.true(packet.equals(expected[icarusParserCalls++]))

			// This means end of test
			if (icarusParserCalls === 3) {
				__ResetDependency__('packetParser')
				return t.end()
			}

			return {}
		}
	})

	// Now try parsing things
	const parse = parser()
	for (const buf of input) {
		parse(fakeEmitter, buf)
	}
})

const genDataHandlerContext = overrides => Object.assign(Object.assign({}, {
	classifier: {
		classifyPacket: () => 0,
		classifyStationInc: () => undefined
	},
	db: {put: () => Promise.resolve()},
	emit: () => undefined,
	_log: createFakeLogger()
}), overrides)

test('saves new packets to the database', t => {
	const samplePacket = {type: 'sample', sample: true}

	const ctx = genDataHandlerContext({
		db: {
			put: async packet => {
				t.is(samplePacket, packet)
			}
		}
	})

	t.plan(1)
	return ctx::dataHandler(samplePacket)
})

test('emits packets', t => {
	const samplePacket = {type: 'sample', sample: true}
	const ctx = genDataHandlerContext({
		emit: (ev, packet) => {
			if (ev !== 'packet') {
				return
			}
			t.is(packet, samplePacket)
		}
	})

	// Pass the sample packet through the data handler and wait for 1 assertion to happen
	t.plan(1)
	return ctx::dataHandler(samplePacket)
})

test('handles packets of unknown type', t => {
	__Rewire__('uuid', () => 'uuid')

	const samplePacket = {
		type: '?',
		receivedAt: 123
	}

	const ctx = genDataHandlerContext({
		classifier: {
			classifyStationInc: score => {
				t.is(score, 0)
			}
		},
		db: {
			put: async packet => {
				t.is(packet.score, 0)
				t.is(packet._id, '?123-uuid')
				t.is(samplePacket, packet)

				// Reset uuid
				__ResetDependency__('uuid')
			}
		}
	})

	// Do things
	t.plan(4) // We need 4 assertions
	return ctx::dataHandler(samplePacket)
})

test('handles packets of known types', t => {
	const samplePacket = {
		type: 's',
		receivedAt: 123
	}

	const ctx = genDataHandlerContext({
		classifier: {
			classifyPacket: () => 30
		},
		db: {
			put: async packet => {
				t.is(packet.score, 30)
				t.is(samplePacket, packet)
			}
		}
	})

	// Do things
	t.plan(2) // We need 2 assertions
	return ctx::dataHandler(samplePacket)
})
