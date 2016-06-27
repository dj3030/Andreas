'use strict';

const EventEmitter = require('events').EventEmitter;
const SignalManager = Homey.wireless('433').Signal;

const signals = new Map();

module.exports = class Signal extends EventEmitter {
	constructor(signalDefinition, parser, debounceTime) {
		super();
		this.payloadParser = parser || (payload => ({ payload: SignalManager.bitArrayToString(payload) }));
		this.debounceBuffer = new Map();
		this.debounceTimeout = debounceTime !== undefined && debounceTime !== null ? debounceTime : 1000;

		const signalString = JSON.stringify(signalDefinition);
		if (!signals.has(signalString)) {
			const signal = new SignalManager(signalDefinition);
			const signalId = signals.size + 1;
			Homey.log(`[Signal ${signalId}] registered signal:`, signalDefinition);

			signal.register(err => { // Register signal
				if (err) this.emit('error', err);
			});

			signal.setMaxListeners(100);

			signal.on('payload', payload => Homey.log(`[Signal ${signalId}] payload:`, payload.join('')));

			signals.set(signalString, signal);
		}
		this.signal = signals.get(signalString);

		this.signal.on('payload', payloadData => { // Start listening to payload event
			const payload = payloadData.slice(0); // Copy array to prevent mutability issues with multiple drivers
			this.emit('payload', payload);
			// Only continue if the received data is valid
			if (!this.debounceTimeout > 0 || this.debounce(payload)) {
				const data = this.payloadParser(payload);
				if (!data || data.constructor !== Object || !data.id) return;
				this.emit('data', data);
			}
		});
		this.signal.on('payload_send', this.emit.bind(this, 'payload_send'));
	}

	send(payload) {
		return new Promise((resolve, reject) => {
			const frameBuffer = new Buffer(payload);
			this.signal.tx(frameBuffer, (err, result) => { // Send the buffer to device
				if (err) { // Print error if there is one
					reject(err);
				} else {
					// FIXME TODO send payload in wallswitch test
					Homey.log('[Signal] send payload: ', payload.join(''));
					this.signal.emit('payload_send', payload);
					resolve(result);
				}
			});
		}).catch(err => {
			Homey.error('[Signal] tx error:', err);
			this.emit('error', err);
			throw err;
		});
	}

	debounce(payload) {
		const payloadString = payload.join('');
		if (!this.debounceBuffer.has(payloadString)) {
			this.debounceBuffer.set(
				payloadString,
				setTimeout(() => this.debounceBuffer.delete(payloadString), this.debounceTimeout)
			);
			return payload;
		}
		return null;
	}
};
