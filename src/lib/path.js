import {join} from 'path'

/**
 * A prefix for capture-lib files (DBs, logs).
 * Can be overriden via `global.pathPrefix` or `global.dbNamePrefix` (Deprecated).
 * It is used to store capture-lib files (like databases and logs)
 * in a specific directory that is not necessarily the current working directory.
 * @type {String}
 */
const pathPrefix = global.pathPrefix || global.dbNamePrefix || ''

export default function normalizePath(...path) {
	return join(pathPrefix, ...path)
}
