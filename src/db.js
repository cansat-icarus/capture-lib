import path from 'path'
import url from 'url'
import PouchDB from 'pouchdb'

const dbNamePrefix = global.dbNamePrefix || ''

export default function getDB(name) {
	return new PouchDB(path.join(dbNamePrefix, name))
}

export function getRemoteDb(ioUrlStr, name, username, password) {
	const ioUrl = url.parse(ioUrlStr)
	const port = ioUrl.protocol === 'https' ? 6984 : 5984
	return new PouchDB(`${ioUrl.protocol}//${ioUrl.hostname}:${port}/${name}`, {
		auth: {
			username,
			password
		}
	})
}
