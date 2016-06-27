'use strict';

const EventEmitter = require('events').EventEmitter;
const Signal = require('./signal');

module.exports = class Driver extends EventEmitter {
	constructor(driverConfig) {
		super();
		if (!driverConfig) {
			throw new Error('No deviceconfig found in constructor. Make sure you pass config to super call!');
		}
		this.config = driverConfig;
		this.devices = new Map();
		this.state = new Map();
		this.lastFrame = new Map();
	}

	init(exports, connectedDevices, callback) {
		Homey.log('Initializing driver for', this.config.id);
		this.realtime = exports.realtime;
		this.setAvailable = exports.setAvailable;
		this.setUnavailable = exports.setUnavailable;
		this.getSettings = exports.getSettings;
		this.setSettings = exports.setSettings;

		this.signal = new Signal(this.config.signal, this.payloadToData.bind(this), this.config.debounceTimeout);

		connectedDevices.forEach(this.add.bind(this));

		this.signal.on('error', this.emit.bind(this, 'signal_error'));
		this.signal.on('data', (frame) => {
			this.emit('frame', frame);
			this.received(frame);
		});
		this.signal.on('payload_send', payload => {
			const frame = this.payloadToData(payload);
			if (frame) {
				this.emit('frame', frame);
				this.emit('frame_send', frame);
			}
		});
		this.on('frame', (frame) => {
			this.setLastFrame(frame.id, frame);
		});

		if (this.config.triggers && this.config.triggers.find(trigger => trigger.id === `${this.config.id}:received`)) {
			this.on('device_frame_received', this.handleReceivedTrigger.bind(this));
			Homey.manager('flow').on(`trigger.${this.config.id}:received`, this.onTriggerReceived.bind(this));
		}
		if (this.config.actions && this.config.actions.find(actions => actions.id === `${this.config.id}:send`)) {
			Homey.manager('flow').on(`action.${this.config.id}:send`, this.onActionSend.bind(this));
		}

		if (callback) {
			callback();
		}
	}

	add(device) {
		const id = this.getDeviceId(device);
		const lastFrame = this.getLastFrame(device);
		const state = this.getState(device);
		this.devices.set(id, device.data || device);
		this.setState(id, state || {});
		this.setLastFrame(
			id,
			lastFrame || Object.assign({}, device.data)
		);
		this.emit('added', Object.assign({ id }, this.getDevice(id)));
	}

	get(device) {
		const id = this.getDeviceId(device);
		if (this.devices.has(id)) {
			return Object.assign({}, this.getDevice(id), { state: this.getState(id), lastFrame: this.getLastFrame(id) });
		}
		return null;
	}

	getDevice(device, includePairing) {
		const id = this.getDeviceId(device);
		if (this.devices.has(id)) {
			return this.devices.get(id);
		} else if (includePairing && this.pairingDevice && this.pairingDevice.data && this.pairingDevice.data.id === id) {
			return this.pairingDevice.data;
		}
		return null;
	}

	getDeviceId(device) {
		if (device && device.constructor) {
			if (device.constructor.name === 'Object') {
				if (device.id) {
					return device.id;
				} else if (device.data && device.data.id) {
					return device.data.id;
				}
			} else if (device.constructor.name === 'String') {
				return device;
			}
		}
		return null;
	}

	getState(device) {
		const id = this.getDeviceId(device);
		device = this.getDevice(id);
		if (device && this.state.has(id)) {
			return this.state.get(id) || {};
		} else if (this.pairingDevice && this.pairingDevice.data.id === id) {
			return this.state.get('_pairingDevice') || {};
		}
		return Homey.manager('settings').get(`${this.config.name}:${id}:state`) || {};
	}

	setState(device, state) {
		const id = this.getDeviceId(device);
		device = this.getDevice(id);
		if (device) {
			if (this.state.has(id)) {
				this.emit('new_state', device, state, this.state.get(id));
			}
			this.state.set(id, state);
			Homey.manager('settings').set(`${this.config.name}:${id}:state`, state);
		}
		if (this.pairingDevice && this.pairingDevice.data.id === id) {
			if (this.state.has('_pairingDevice')) {
				this.emit('new_state', this.pairingDevice.data, state, this.state.get('_pairingDevice'));
			}
			this.state.set('_pairingDevice', state);
		}
	}

	getLastFrame(device) {
		const id = this.getDeviceId(device);
		device = this.getDevice(id);
		if (device && this.lastFrame.has(id)) {
			return this.lastFrame.get(id);
		} else if (this.pairingDevice && this.pairingDevice.data.id === id) {
			return this.lastFrame.get('_pairingDevice');
		}
		return Homey.manager('settings').get(`${this.config.name}:${id}:lastFrame`) || {};
	}

	setLastFrame(device, frame) {
		// console.log('setLastFrame', this.devices, device, frame);
		const id = this.getDeviceId(device);
		device = this.getDevice(id);
		if (device) {
			if (this.lastFrame.has(id)) {
				this.emit('new_frame', device, frame, this.lastFrame.get(id));
			}
			this.lastFrame.set(id, frame);
			Homey.manager('settings').set(`${this.config.name}:${id}:lastFrame`, frame);
		}
		if (this.pairingDevice && this.pairingDevice.data.id === id) {
			if (this.lastFrame.has('_pairingDevice')) {
				this.emit('new_frame', this.pairingDevice.data, frame, this.lastFrame.get('_pairingDevice'));
			}
			this.lastFrame.set('_pairingDevice', frame);
		}
	}

	deleted(device) {
		const id = this.getDeviceId(device);
		const target = Object.assign({ id }, this.getDevice(id));
		this.devices.delete(id);
		this.emit('deleted', target);
	}

	received(data) {
		this.emit('frame_received', data);
		const device = this.getDevice(data.id);
		if (device) {
			this.emit('device_frame_received', device, data);
		}
	}

	send(device, data, callback) {
		data = Object.assign({}, this.getDevice(device, true) || device.data || device, data);
		this.emit('send', data);
		const frame = this.dataToPayload(data).map(Number);
		if (!frame) return callback(true);
		const dataCheck = this.payloadToData(frame);
		if (
			frame.find(isNaN) || !dataCheck ||
			dataCheck.constructor !== Object || !dataCheck.id ||
			dataCheck.id !== this.getDeviceId(device)
		) {
			this.emit('error', `Incorrect frame from dataToPayload(${data}) => ${frame}`);
		}
		return this.signal.send(frame).then(result => {
			if (callback) callback(null, result);
		}).catch(err => {
			if (callback) callback(err);
			this.emit('error', err);
			throw err;
		});
	}

	generateDevice(data) {
		return {
			name: __(this.config.name),
			data: data,
		};
	}

	assertDevice(device, callback) {
		if (!device || !this.getDeviceId(device)) {
			callback(new Error('433_generator.error.no_device'));
		} else if (this.getDevice(device)) {
			callback(new Error('433_generator.error.device_exists'));
		} else if (!this.dataToPayload(device.data || device)) {
			callback(new Error('433_generator.error.invalid_data'));
		} else {
			callback(null, device);
		}
	}

	// TODO document that this function should be overwritten
	dipswitchesToData(dipswitches) { // Convert user set bitswitches to usable data object
		throw new Error(`dipswitchToData(dipswitches) should be overwritten by own driver for device ${this.config.id}`);
	}

	// TODO document that this function should be overwritten
	payloadToData(payload) { // Convert received data to usable variables
		throw new Error(`payloadToData(payload) should be overwritten by own driver for device ${this.config.id}`);
	}

	// TODO document that this function should be overwritten
	dataToPayload(data) { // Convert received data to usable variables
		throw new Error(`dataToPayload(data) should be overwritten by own driver for device ${this.config.id}`);
	}

	// TODO document that this function should be overwritten
	generateData() {
		throw new Error(`generateData() should be overwritten by own driver for device ${this.config.id}`);
	}

	pair(socket) { // Pair sequence
		let receivedListener;

		this.on('frame', receivedListener = socket.emit.bind(this, 'frame'));

		socket.on('next', (data, callback) => {
			socket.emit('nextView', this.config.pair.views.map(view => view.id));
			callback();
		});

		socket.on('previous', (data, callback) => {
			socket.emit('previousView', this.config.pair.views.map(view => view.id));
			callback();
		});

		socket.on('set_device', (data, callback) => {
			if (this.get(data)) {
				return callback(new Error('433_generator.error.device_exists'));
			}
			this.pairingDevice = this.generateDevice(data);
			return callback(null, this.pairingDevice);
		});

		socket.on('set_device_dipswitches', (dipswitches, callback) => {
			const data = this.dipswitchesToData(dipswitches.slice(0));
			if (!data) return callback(new Error('433_generator.error.invalid_dipswitch'));

			this.pairingDevice = this.generateDevice(Object.assign({ dipswitches: dipswitches }, data));
			return callback(null, this.pairingDevice);
		});

		socket.on('get_device', (data, callback) => callback(null, this.pairingDevice));

		socket.on('program', (data, callback) => {
			do {
				this.pairingDevice = this.generateDevice(this.generateData());
			} while (this.get(this.pairingDevice));
			callback(null, this.pairingDevice);
		});

		socket.on('test', (data, callback) => {
			callback(!this.pairingDevice, this.pairingDevice);
		});

		socket.on('done', (data, callback) => {
			if (!this.pairingDevice) {
				return callback(new Error('433_generator.error.no_device'));
			}
			return callback(null, this.pairingDevice);
		});

		socket.on('send', (data, callback) => {
			this.send(this.pairingDevice.data, data).then(callback.bind(false)).catch(callback);
		});

		socket.on('assert_device', (data, callback) => this.assertDevice(this.pairingDevice, callback));

		socket.on('toggle', (data, callback) => {
			const exports = this.getExports();
			if (exports.capabilities) {
				Object.keys(exports.capabilities).forEach(capability => {
					if (exports.capabilities[capability].get && exports.capabilities[capability].set) {
						exports.capabilities[capability].get(this.pairingDevice.data, (err, result) => {
							if (typeof result === 'boolean') {
								exports.capabilities[capability].set(this.pairingDevice.data, !result, callback);
							}
						});
					}
				});
			} else {
				callback(new Error('Device does not have boolean capability'));
			}
			callback(null, true);
		});

		socket.on('disconnect', (data, callback) => {
			this.removeListener('frame', receivedListener);
			this.pairingDevice = null;
			this.state.delete('_pairingDevice');
			this.lastFrame.delete('_pairingDevice');
			callback();
		});
	}

	handleReceivedTrigger(device, data) {
		Homey.manager('flow').triggerDevice(`${this.config.id}:received`, null, data, this.getDevice(device), err => {
			if (err) Homey.error('Trigger error', err);
		});
	}

	onTriggerReceived(callback, args, state) {
		if (args.device) {
			args.id = args.device.id;
			delete args.device;
		}
		callback(null, Object.keys(args).reduce(
			(result, curr) => result && String(args[curr]) === String(state[curr]),
			true
		));
	}

	onActionSend(callback, args) {
		const device = this.getDevice(args.device);
		if (device) {
			this.send(device, args).then(() => callback(null, true)).catch(callback);
		} else {
			callback('Could not find device');
		}
	}

	getExports() {
		return {
			init: this.init.bind(this),
			pair: this.pair.bind(this),
			deleted: this.deleted.bind(this),
			added: this.add.bind(this),
			driver: this,
		};
	}
};
