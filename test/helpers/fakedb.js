import memdown from 'memdown'
import PouchDB from 'pouchdb'

export default class FakeDB extends PouchDB {
  constructor(path, options = {}) {
    super(path, Object.assign(options, { db: memdown }))
  }
}

export const logDb = new FakeDB('log')
export const dataDb = new FakeDB('data')
