import {EventEmitter} from 'events'
import ExponentialBackoffStrategy from 'backoff/lib/strategy/exponential'

/*
This is heavily based on:
https://github.com/MathieuTurcotte/node-backoff/blob/master/lib/backoff.js

...which holds the following 2-line copyright notice:
Copyright (c) 2012 Mathieu Turcotte
Licensed under the MIT license.

This is a very bare-bones version of the file above
*/

/**
 * A wrapper over the ExponentialBackoffStrategy from the backoff module.
 */
export default class ExponentialBackoff extends EventEmitter {
	/**
	 * Constructor.
	 */
	constructor() {
		super()

		/**
		 * ExponentialBackoffStrategy instance.
		 * @type {ExponentialBackoffStrategy}
		 */
		this._strategy = new ExponentialBackoffStrategy({randomisationFactor: 0.3})

		/**
		 * Number of previous failed attempts.
		 * @type {Number}
		 */
		this._backoffNumber = 0

		/**
		 * Backoff timeout ID.
		 * @type {TimeoutID}
		 */
		this._timeoutID = undefined
	}

	/**
	 * Signals that we tried executing the protected routine and failed, or that we want to start the process.
	 * @emits backoff(_backoffNumber, delay) delay is how much time will pass before we try executing the routine.
	 */
	backoff() {
		// Backoff already in progress
		if (this._timeoutID) {
			return
		}

		const delay = this._strategy.next()
		this._timeoutID = setTimeout(() => {
			this._timeoutID = undefined
			this.emit('retry', this._backoffNumber)
			this._backoffNumber++
		}, delay)
		this.emit('backoff', this._backoffNumber, delay)
	}

	/**
	 * Resets failed attempt number and cancels a possible pending action (routine execution after backoff).
	 */
	reset() {
		// Reset number of backoffs
		this._backoffNumber = 0

		// Reset strategy
		this._strategy.reset()

		// Clear a possibly running timeout
		if (this._timeoutID !== undefined) {
			clearTimeout(this._timeoutID)
			this._timeoutID = undefined
		}
	}

	/**
	 * Used to signal the routine was successful.
	 * This resets the wrapper.
	 * @emits success
	 * @see {@link reset}
	 */
	success() {
		// Reset state
		this.reset()

		// Alert everyone we did it (for now at least)
		this.emit('success')
	}
}
