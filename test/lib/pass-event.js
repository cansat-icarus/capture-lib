import {EventEmitter} from 'events'
import test from 'ava'
import passEvent from '../../src/lib/pass-event'

test.cb('passes events', t => {
	const source = new EventEmitter()
	const dest = new EventEmitter()

	const argsTemplate = [1, 2, 'a', {b: true}, 0.12, 0, false]

	passEvent(source, dest, 'sourceEvent', 'destEvent')

	dest.once('destEvent', (...args) => {
		t.deepEqual(args, argsTemplate)
		t.end()
	})

	source.emit('sourceEvent', ...argsTemplate)
})
