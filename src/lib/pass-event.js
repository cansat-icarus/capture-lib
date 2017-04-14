/**
 * Forwards an event from one EventEmitter to another.
 * @param {EventEmitter} sourceEmitter EventEmitter to be listened.
 * @param {EventEmitter} destEmitter EventEmitter to where the event will be forwarded.
 * @param {String} sourceEvent Event name to be listened to.
 * @param {String} [destEvent=sourceEvent] Event name in the source
 */
export default function passEvent(sourceEmitter, destEmitter, sourceEvent, destEvent = sourceEvent) {
	sourceEmitter.on(sourceEvent, (...args) => destEmitter.emit(destEvent, ...args))
}
