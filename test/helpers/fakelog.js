import bunyan from 'bunyan'

export default bunyan.createLogger({
	name: 'fake',
	streams: []
})
