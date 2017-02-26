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

export default class ExponentialBackoff extends EventEmitter {
	constructor() {
		super()

		this._strategy = new ExponentialBackoffStrategy({randomisationFactor: 0.3})
		this._backoffNumber = 0
		this._timeoutID = -1
	}

	backoff() {
		// Backoff already in progress
		if (this._timeoutID !== -1) {
			return
		}
		const delay = this._strategy.next()
		this._timeoutID = setTimeout(this._handleBackoff.bind(this), delay)
		this.emit('backoff', this._backoffNumber, delay)
	}

	_handleBackoff() {
		this._timeoutID = -1
		this.emit('retry', this._backoffNumber)
		this._backoffNumber++
	}

	reset() {
		// Reset number of backoffs
		this._backoffNumber = 0

		// Reset strategy
		this._strategy.reset()

		// Clear a possibly running timeout
		if (this._timeoutID !== -1) {
			clearTimeout(this._timeoutID)
			this._timeoutID = -1
		}
	}

	success() {
		// Reset state
		this.reset()

		// Alert everyone we did it (for now at least)
		this.emit('success')
	}
}
