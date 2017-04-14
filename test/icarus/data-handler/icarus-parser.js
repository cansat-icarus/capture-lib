import test from 'ava'
import * as conv from '../../../src/icarus/data-handler/unit-conv'
import * as strings from '../../../src/icarus/data-handler/cansat-strings'
import IcarusParser from '../../../src/icarus/data-handler/parser'

const badPacket1 = Buffer.from([0, 2, 253, 1, 253, 0, 0, 0, 0, 0])
const badPacket2 = Buffer.from([253, 4, 254, 0, 0])

// Sample telemetry packet
// TODO: use real packet from a real CanSat
// counter = 12
// sentAt.millis = 120
// temp.0 = 1
// temp.1 = 2
// press.0 = 3
// press.1 = 4
const telemetryPacket = Buffer.from([116, 12, 0, 0, 0, 120, 0, 0, 0, 1, 0, 2, 0, 3, 0, 4, 0, 188, 247, 140, 172])

// Sample information packet
// TODO: use real packet from a real CanSat
// counter = 12
// sentAt.millis = 120
// message.id = 1
const infoPacket = Buffer.from([105, 12, 0, 0, 0, 120, 0, 0, 0, 1, 64, 47, 233, 150])

// Sample settings packet
// TODO: use real packet from a real CanSat
// counter = 12
// sentAt.millis = 120
// module.id = 1
// module.enabled = true
// module.interval = 1000
// module.lastRun = 2000
const settingsPacket = Buffer.from([115, 12, 0, 0, 0, 120, 0, 0, 0, 1, 1, 232, 3, 0, 0, 208, 7, 0, 0, 161, 206, 32, 126])

test.beforeEach(t => {
	t.context.parser = new IcarusParser()
})

test('decodes packets with the quasi-binary decoder', t => {
	t.context.parser.parse(badPacket1)

	t.true(t.context.parser._raw.equals(Buffer.from([0, 2, 254, 253, 0, 0, 0, 0])))
})

test('gracefully handles decoder errors', t => {
	const packet = t.context.parser.parse(badPacket2)

	t.is(packet.type[0], '?')
	t.true(Array.isArray(packet.raw))
	t.is(typeof packet.receivedAt, 'number')
	t.truthy(packet.error)
})

test('handles unknown packet types', t => {
	const packet = t.context.parser.parse(badPacket1)

	t.is(packet.type[0], '?')
	t.true(Array.isArray(packet.raw))
	t.is(typeof packet.receivedAt, 'number')
	t.falsy(packet.error)
})

// TODO: update test code to handle the final packet format and re-enable test
// Don't worry, manual testing already validated this kind of packet is correctly parsed
test.failing('handles telemetry packets', t => {
	const packet = t.context.parser.parse(telemetryPacket)

	t.is(packet.type, 't')
	t.true(Array.isArray(packet.raw))
	t.is(typeof packet.receivedAt, 'number')
	t.falsy(packet.error)
	t.is(packet.counter, 12)
	t.is(packet.sentAt.millis, 120)
	t.is(packet.temp[0], conv.DS18B20(1))
	t.is(packet.temp[1], conv.DS18B20(2))
	t.is(packet.press[0], conv.MPX4115A(3))
	t.is(packet.press[1], conv.MPX4115A(4))
	t.is(packet.crc.local, packet.crc.sent)
})

// TODO: update test code to handle the final packet format and re-enable test
test.failing('handles information packets', t => {
	const packet = t.context.parser.parse(infoPacket)

	t.is(packet.type, 'i')
	t.true(Array.isArray(packet.raw))
	t.is(typeof packet.receivedAt, 'number')
	t.falsy(packet.error)
	t.is(packet.counter, 12)
	t.is(packet.sentAt.millis, 120)
	t.is(packet.message.id, 1)
	t.is(packet.message.text, strings.messages[packet.message.id])
	t.is(packet.crc.local, packet.crc.sent)
})

// TODO: update test code to handle the final packet format and re-enable test
test.failing('handles settings packets', t => {
	const packet = t.context.parser.parse(settingsPacket)

	t.is(packet.type, 's')
	t.true(Array.isArray(packet.raw))
	t.is(typeof packet.receivedAt, 'number')
	t.falsy(packet.error)
	t.is(packet.counter, 12)
	t.is(packet.sentAt.millis, 120)
	t.is(packet.module.id, 1)
	t.is(packet.module.enable, true)
	t.is(packet.module.interval, 1000)
	t.is(packet.module.lastRun, 2000)
	t.is(packet.module.name, strings.moduleNames[packet.module.id])
	t.is(packet.crc.local, packet.crc.sent)
})
