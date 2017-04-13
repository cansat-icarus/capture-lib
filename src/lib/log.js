import bunyan from 'bunyan'

/**
 * Creates a configured bunyan logger.
 *
 * Our log output configuration:
 * - Everything goes to stdout
 * - debug-level or more severe messages go to a rotating file
 * - info-level or more severe messages go to the database
 *
 * When error-level or more severe messages are logged to the database,
 * they include an extra "context" property with the last 30 log messages
 * (of all levels).
 * @param {String} name Logger name.
 * @param {PouchDB} db Database where logs will be stored.
 * @returns {Bunyan}
 */
export default function createLogger(name, db) {
	const bufferStream = new bunyan.RingBuffer({limit: 30})
	const dbStream = {
		write: obj => {
			// Error and fatal items include more information
			if (obj.level >= 40) {
				// Sometimes, the current object may already be in the bufferStream
				// To prevent a cyclic dependency, let's filter it out
				const context = bufferStream.records.filter(record => record !== obj)

				obj.context = context
			}

			// Save to db
			db.post(obj)
		}
	}

	return bunyan.createLogger({
		name: `CanSatGS-${name}`,
		streams: [
			{
				level: 'trace',
				stream: process.stdout
			},
			{
				level: 'debug',
				type: 'rotating-file',
				path: `CanSatGS-${name}.log`,
				period: '3h', // New log file at every 3h
				count: 40 // Keep 40 log files
			},
			{
				level: 'info',
				type: 'raw',
				stream: dbStream
			},
			{
				level: 'trace',
				type: 'raw',
				stream: bufferStream
			}
		]
	})
}
