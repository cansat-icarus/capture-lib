import bunyan from 'bunyan'

export default function createLogger(name, db) {
	const bufferStream = new bunyan.RingBuffer({limit: 30})
	const dbStream = {
		write: obj => {
			// error and fatal items include more information
			if (obj.level > 45) {
				obj.context = bufferStream.records
			}

			// save to db
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
				count: 10 // Keep 10 log files
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
