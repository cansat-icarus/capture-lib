import memdown from 'memdown'
import PouchDB from 'pouchdb'

export class FakeDB extends PouchDB {
	constructor(path, options = {}) {
		super(path, Object.assign(options, {db: memdown}))
	}
}

export default function getFakeDB(name) {
	return new FakeDB(name)
}
