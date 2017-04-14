import bunyan from 'bunyan'

export default function createFakeLogger() {
	return bunyan.createLogger({
		name: 'fake',
		streams: []
	})
}
