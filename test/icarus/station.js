import test from 'ava'
import Station from '../../src/icarus/station'
import PouchDB from 'pouchdb'
import memdown from 'memdown'
import Serial from '../../src/serial'
import Classifier from '../../src/icarus/classifier'
import fakeLogger from '../helpers/fakelog'

// Avoid polluting test with PouchDB things
class MemDB extends PouchDB {
  constructor (path, options = {}) {
    super(path, Object.assign(options, { db: memdown }))
  }
}
Station.__Rewire__('PouchDB', MemDB)

// Avoid polluting filesystem and console with logs
Station.__Rewire__('createLogger', () => fakeLogger)

test('constructs', t => {
  // Watch parser usage
  const parser = function () {}
  Station.__Rewire__('parser', () => parser)

  const station = new Station('the name')

  t.true(station.classifier instanceof Classifier)
  t.true(station.serial instanceof Serial)
  t.true(station.db instanceof PouchDB)
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
  const station = new Station()
  station.serial.emit('data')
})

test('cleans up the mess when requested', t => {
  const station = new Station()

  // Inject station.serial.close and station.backend.cleanup spies
  station.serial.close = station.backend.cleanup = () => {
    t.pass()
    return Promise.resolve()
  }

  t.plan(3)
  return station.cleanup()
    .then(() => t.pass())
})

test('lists available ports flagging the T-Minus transceiver', t => {
  const station = new Station()
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

  return station.getAvailablePorts()
    .then(ports => {
      t.is(ports[0].comName, samplePorts[1].comName)
      t.is(ports[0].recommend, true)
      t.is(ports[1], samplePorts[0])
      t.is(ports[2].comName, samplePorts[2].comName)
    })
})
