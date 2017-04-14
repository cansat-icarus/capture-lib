import {EventEmitter} from 'events'

export default function createFakeSocket(on, once) {
	const fakeSocket = new EventEmitter()

	fakeSocket.on = on || fakeSocket.on
	fakeSocket.once = once || fakeSocket.once

	return fakeSocket
}
