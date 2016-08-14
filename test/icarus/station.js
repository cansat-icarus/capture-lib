import test from 'ava'
import Station from '../../src/icarus/station'
import PouchDB from 'pouchdb'
import memdown from 'memdown'
import Serial from '../../src/serial'
import Classifier from '../../src/icarus/classifier'

// Avoid polluting test with PouchDB things
class MemDB extends PouchDB {
  constructor (path, options = {}) {
    super(path, Object.assign(options, { db: memdown }))
  }
}
Station.__Rewire__('PouchDB', MemDB)

test('constructs', t => {
  // Watch parser usage
  const parser = function () {}
  Station.__Rewire__('parser', () => parser)

  const station = new Station()

  t.true(station.classifier instanceof Classifier)
  t.true(station.serial instanceof Serial)
  t.true(station.db instanceof PouchDB)
  t.is(station.serial._parser, parser)

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
