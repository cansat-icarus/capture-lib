import test from 'ava'

import createFakeLogger from '../helpers/fakelog'
import Classifier from '../../src/icarus/classifier'
import Serial from '../../src/serial'
import Station from '../../src/icarus/station'
import {default as getFakeDB, FakeDB} from '../helpers/fakedb'

function _createStation() {
	// Avoid fs and console pollution
	Station.__Rewire__('getDB', getFakeDB)
	Station.__Rewire__('createLogger', createFakeLogger)

	const station = new Station('the name')

	// Just undo the mocking
	Station.__ResetDependency__('getDB')
	Station.__ResetDependency__('createLogger')

	return station
}

test('constructs', t => {
	// Watch parser usage
	const parser = function () {}
	Station.__Rewire__('parser', () => parser)

	const station = _createStation()

	t.true(station.classifier instanceof Classifier)
	t.true(station.serial instanceof Serial)
	t.true(station.logDB instanceof FakeDB)
	t.true(station.db instanceof FakeDB)
	t.is(station.serial._parser, parser)
	t.is(station.name, 'the name')

	Station.__ResetDependency__('parser')
})

test.cb('handles serial data with data-handler', t => {
	// Watch dataHandler usage
	const dataHandler = function () {
		t.pass()
		t.end()
	}
	Station.__Rewire__('dataHandler', dataHandler)

	// Create station and trigger data event in station.serial
	const station = _createStation()
	station.serial.emit('data')
})

test('cleans up the mess when requested', async t => {
	const station = _createStation()

	// Inject station.serial.close and station.backend.cleanup spies
	station.serial.close = () => {
		t.pass()
		return Promise.resolve()
	}

	t.plan(1)
	await station.cleanup()
})

test('lists available ports flagging the T-Minus transceiver', async t => {
	const station = _createStation()
	const samplePorts = [
		{
			comName: '/dev/tty.usbX',
			vendorId: '0x1234',
			productId: '0x5678'
		},
		{
			comName: '/dev/ttyUSBX',
			vendorId: '0x03eb',
			productId: '0x2404'
		},
		{
			comName: 'COM42',
			pnpId: 'USB\\VID_ABCD&PID_EF90&ImWindowsAndIApparentlyCantGiveProperInformation'
		}
	]

	// Inject listPorts mock
	Station.__Rewire__('listPorts', () => Promise.resolve(samplePorts))

	// Check port order and recommendation
	const ports = await station.getAvailablePorts()
	t.is(ports[0].comName, samplePorts[1].comName)
	t.is(ports[0].recommend, true)
	t.is(ports[1], samplePorts[0])
	t.falsy(ports[1].recommend)
	t.is(ports[2].comName, samplePorts[2].comName)
	t.falsy(ports[2].recommend)
})
