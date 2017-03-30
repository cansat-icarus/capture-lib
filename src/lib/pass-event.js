/**
 * @param {EventEmitter} sourceEmitter
 * @param {EventEmitter} destEmitter
 * @param {String} sourceEvent
 * @param {String} destEvent
 */
export default function passEvent(sourceEmitter, destEmitter, sourceEvent, destEvent = sourceEvent) {
	sourceEmitter.on(sourceEvent, (...args) => destEmitter.emit(destEvent, ...args))
}
