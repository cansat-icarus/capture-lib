import test from 'ava'
import {crc32} from 'crc'

import Parser from '../src/parser'

test.beforeEach(t => {
	t.context.parser = new Parser()
	t.context.buf = Buffer.alloc(20)
})

test('parse() resets state', t => {
	// Screw up state of the parser, simulate previous parsing action
	t.context.parser._i = 200
	t.context.parser._raw = Buffer.alloc(1)
	t.context.parser.packet = {bogus: true, lorem: true, ipsum: 'also true'}

	t.context.parser.parse(t.context.buf)
	t.is(t.context.parser._i, 0)
	t.true(t.context.parser._raw.equals(t.context.buf.slice(0, 16)))
	t.deepEqual(t.context.parser.packet, {crc: {sent: '0', local: crc32(Buffer.alloc(16)).toString(16)}})
})

test('parse() calculates crc', t => {
	t.context.buf = Buffer.alloc(12)
	t.context.buf.writeIntLE(123456, 0, 4)
	t.context.buf.writeIntLE(654321, 4, 4)
	t.context.buf.writeUIntLE(crc32(t.context.buf.slice(0, 8)), 8, 4)

	// The CRC should match!
	t.context.parser.parse(t.context.buf)
	t.is(t.context.parser.packet.crc.sent, t.context.parser.packet.crc.local)
})

test('parse() returns packet', t => {
	t.is(t.context.parser.parse(t.context.buf), t.context.parser.packet)
})

test('setValue() sets the value', t => {
	t.context.parser.setValue('a.key', 'a value')
	t.is(t.context.parser.packet.a.key, 'a value')
})

test('setValue() converts the value', t => {
	t.context.parser.setValue('key', 1, val => val + 1)
	t.is(t.context.parser.packet.key, 2)
})

test('readInt()', t => {
	t.context.buf.writeIntLE(-60, 0, 1)
	t.context.buf.writeIntLE(-100000, 1, 4)
	t.context.parser.parse(t.context.buf)
	t.context.parser.readInt('small')
	t.context.parser.readInt('big', 4)

	t.is(t.context.parser.packet.small, -60)
	t.is(t.context.parser.packet.big, -100000)
})

test('readUInt()', t => {
	t.context.buf.writeUIntLE(60, 0, 1)
	t.context.buf.writeUIntLE(100000, 1, 4)
	t.context.parser.parse(t.context.buf)
	t.context.parser.readUInt('small')
	t.context.parser.readUInt('big', 4)

	t.is(t.context.parser.packet.small, 60)
	t.is(t.context.parser.packet.big, 100000)
})

test('readFloat()', t => {
	t.context.buf.writeFloatLE(-60.12)
	t.context.parser.parse(t.context.buf)
	t.context.parser.readFloat('float')

	// Floats float
	t.true((t.context.parser.packet.float - -60.12) < 0.001)
})

test('readChar()', t => {
	t.context.buf[0] = 'a'.charCodeAt(0)
	t.context.parser.parse(t.context.buf)

	t.context.parser.readChar('char')
	t.is(t.context.parser.packet.char, 'a')
})

test('readBoolean()', t => {
	t.context.buf[0] = 1
	t.context.parser.parse(t.context.buf)

	t.context.parser.readBoolean('boolean')
	t.is(t.context.parser.packet.boolean, true)
})

test('reads multiple things without getting confused about places', t => {
	t.context.buf.writeIntLE(-100000, 0, 4)
	t.context.buf.writeUIntLE(60, 4, 1)
	t.context.buf.writeFloatLE(12.1, 5)
	t.context.buf[9] = 'a'.charCodeAt(0)
	t.context.buf[10] = 1
	t.context.parser.parse(t.context.buf)

	// Now everything should be read out ok
	t.context.parser.readInt('int', 4)
	t.context.parser.readUInt('uint')
	t.context.parser.readFloat('float')
	t.context.parser.readChar('char')
	t.context.parser.readBoolean('bool')

	t.is(t.context.parser.packet.int, -100000)
	t.is(t.context.parser.packet.uint, 60)
	t.true(t.context.parser.packet.float - 12.1 < 0.001) // Floats float
	t.is(t.context.parser.packet.char, 'a')
	t.is(t.context.parser.packet.bool, true)

	// _i should be in position 7
	t.is(t.context.parser._i, 11)
})
