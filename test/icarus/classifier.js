import test from 'ava'

import createFakeLogger from '../helpers/fakelog'
import Classifier from '../../src/icarus/classifier'

test.beforeEach(t => {
	t.context.classifier = new Classifier(createFakeLogger())
})

test('constructs', t => {
	t.is(t.context.classifier.stationScore, undefined)
	t.is(Object.keys(t.context.classifier._lastData).length, 0)
})

test('classifyPacket() CRC is 60% of the total score, unless there are no heuristcs', t => {
	const classifier = t.context.classifier
	const samplePacket1 = {crc: {local: 'a', sent: 'a'}}
	const samplePacket2 = {crc: {local: 'a', sent: 'b'}}

	t.true(classifier.classifyPacket(samplePacket1) >= 60)
	t.true(classifier.classifyPacket(samplePacket2) <= 60)

	// Get rid of heuristics
	Classifier.__Rewire__('packetHeuristicsConfig', new Map())

	// Now classifying the packets should yield 100 with good CRC, 0 without
	t.is(classifier.classifyPacket(samplePacket1), 100)
	t.is(classifier.classifyPacket(samplePacket2), 0)

	// Reset packetHeuristicsConfig
	Classifier.__ResetDependency__('packetHeuristicsConfig')
})

test('classifyPacket() heuristics are 40% of the total score', t => {
	// Inject mock heuristics
	Classifier.__Rewire__('packetHeuristicsConfig', new Map([
		[['field', 'otherField'], [val => val]]
	]))

	// Sample packet
	const samplePacket = {
		crc: {local: 'a', sent: 'a'},
		field: true,
		otherField: true
	}

	// The score should be the expected 100
	t.is(t.context.classifier.classifyPacket(samplePacket), 100)

	// Make heuristics fail, should drop to 60
	samplePacket.field = false
	samplePacket.otherField = false
	t.is(t.context.classifier.classifyPacket(samplePacket), 60)

	// Make half the heuristics fail, half succeed, score should be 80
	samplePacket.field = true
	t.is(t.context.classifier.classifyPacket(samplePacket), 80)

	// Remove mock heuristics
	Classifier.__ResetDependency__('packetHeuristicsConfig')
})

test('classifyPacket() calls heuristics with (val, lastVal = val)', t => {
	const samplePacket1 = {
		crc: {local: 'a', sent: 'a'},
		test: {field: [12, 12]}
	}

	const samplePacket2 = {
		crc: {local: 'a', sent: 'a'},
		test: {field: [13, 13]}
	}

	t.plan(8)

	// Fake, spying heuristics
	Classifier.__Rewire__('packetHeuristicsConfig', new Map([
		[['test.field.0', 'test.field.1'], [(val, lastVal) => {
			t.is(val, 12)
			t.is(lastVal, 12)
		}]]
	]))

	t.context.classifier.classifyPacket(samplePacket1)

	// Fake, spying heuristics v2
	Classifier.__Rewire__('packetHeuristicsConfig', new Map([
		[['test.field.0', 'test.field.1'], [(val, lastVal) => {
			t.is(val, 13)
			t.is(lastVal, 12)
		}]]
	]))

	t.context.classifier.classifyPacket(samplePacket2)

	Classifier.__ResetDependency__('packetHeuristicsConfig')
})

test('classifyPacket() updates station classification when it should', t => {
	const samplePacket1 = {crc: {local: 'a', sent: 'b'}}
	const samplePacket2 = {crc: {local: 'b', sent: 'b'}}

	t.context.classifier.classifyPacket(samplePacket1)
	t.context.classifier.classifyPacket(samplePacket2)
	t.is(t.context.classifier.stationScore, 50)

	// Now ask the classifier not to update the station score
	t.context.classifier.classifyPacket(samplePacket1, false)
	t.is(t.context.classifier.stationScore, 50) // Should remain 50
})

test('classifyPacket() incrementally stores packet data in classifier._lastData', t => {
	const samplePacket1 = {a: true, crc: {local: 'a', sent: 'b'}}
	const samplePacket2 = {b: 12, crc: {local: 'a', sent: 'b'}}

	t.context.classifier.classifyPacket(samplePacket1)
	t.context.classifier.classifyPacket(samplePacket2)

	// Should contain both a and b
	t.is(t.context.classifier._lastData.a, true)
	t.is(t.context.classifier._lastData.b, 12)
})

test('classifyStationInc() returns and emits the new station score', t => {
	t.plan(2)
	t.context.classifier.once('stationScore', score => t.is(score, 10))
	t.is(t.context.classifier.classifyStationInc(10), 10)
})

test('classifyStationInc() works with no previous station score', t => {
	t.context.classifier.classifyStationInc(100)
	t.is(t.context.classifier.stationScore, 100)
})

test('classifyStationInc() incrementally builds the station score', t => {
	t.context.classifier.classifyStationInc(0)
	t.is(t.context.classifier.stationScore, 0)
	t.context.classifier.classifyStationInc(100)
	t.is(t.context.classifier.stationScore, 50)
	t.context.classifier.classifyStationInc(100)
	t.is(t.context.classifier.stationScore, 75)
	t.context.classifier.classifyStationInc(100)
	t.is(t.context.classifier.stationScore, 87.5)
	t.context.classifier.classifyStationInc(0)
	t.is(t.context.classifier.stationScore, 43.75)
})
