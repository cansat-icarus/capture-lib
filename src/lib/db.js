import path from 'path'
import url from 'url'
import PouchDB from 'pouchdb'

/**
 * A prefix for local databases.
 * Can be overriden via `global.dbNamePrefix`.
 * It is used to store the databases in a specific directory that
 * is not necessarily the current working directory
 * @type {String}
 */
const dbNamePrefix = global.dbNamePrefix || ''

/**
 * Gets a local database.
 * @param {String} name The database name.
 * @returns {PouchDB} PouchDB instance referring to the requested database.
 */
export default function getDB(name) {
	return new PouchDB(path.join(dbNamePrefix, name))
}

/**
 * Gets a remote database.
 * When provided a URL with no port, the default CouchDB ports for HTTP and HTTPS will be added automatically.
 * @param {String} name The database name or URL.
 * @param {String} username The database username.
 * @param {String} password The database password.
 * @returns {PouchDB} PouchDB instance referring to the requested database.
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
