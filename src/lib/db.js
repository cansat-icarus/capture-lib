import path from 'path'
import url from 'url'
import PouchDB from 'pouchdb'

const dbNamePrefix = global.dbNamePrefix || ''

export default function getDB(name) {
	return new PouchDB(path.join(dbNamePrefix, name))
}

/**
 * @param {String} name
 * @param {String} username
 * @param {String} password
 */
export function getRemoteDB(name, username, password) {
	let dburl = name

	if (name.includes('//')) {
		const urlObj = url.parse(name)
		const port = urlObj.port || (urlObj.protocol === 'https:' ? 6984 : 5984)
		dburl = `${urlObj.protocol}//${urlObj.hostname}:${port}${urlObj.path}`
	}

	return new PouchDB(dburl, {
		auth: {
			username,
			password
		}
	})
}
