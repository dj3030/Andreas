'use strict';

const BaseDriver = require('../BaseDriver');
const Signal = require('./signal');

module.exports = class Driver extends BaseDriver {

	constructor(driverConfig) {
		super(Signal, driverConfig);
	}

	init(exports, connectedDevices, callback) {
		super.init(exports, connectedDevices, callback);
		if (this.config.actions) {
			if (this.config.actions.find(actions => actions.id === `${this.config.id}:send_cmd_sequence`)) {
				Homey.manager('flow').on(`action.${this.config.id}:send_cmd_sequence`, (callback, args) => {
					this.logger.verbose(`Driver->action.${this.config.id}:send_cmd_sequence(callback, args)`, callback, args);
					this.onActionSendCmdSequence(callback, args);
				});
			}
			if (this.config.actions.find(actions => actions.id === `${this.config.id}:send_cmd_number`)) {
				Homey.manager('flow').on(`action.${this.config.id}:send_cmd_number`, (callback, args) => {
					this.logger.verbose(`Driver->action.${this.config.id}:send_cmd_number(callback, args)`, callback, args);
					this.onActionSendCmdNumber(callback, args);
				});
			}
		}
	}

	sendProgramSignal(device, callback) {
		this.logger.silly('Driver:sendProgramSignal(device, callback)', device, callback);
		const exports = this.getExports();
		if (exports.capabilities) {
			Object.keys(exports.capabilities).forEach(capability => {
				if (exports.capabilities[capability].get && exports.capabilities[capability].set) {
					exports.capabilities[capability].get(device, (err, result) => {
						if (typeof result === 'boolean') {
							this.logger.info(
								'sending program',
								`capabilities.${capability}.set(${JSON.stringify(device)}, true, ${callback})`
							);
							exports.capabilities[capability].set(device, true, callback);
						}
					});
				}
			});
		} else {
			this.logger.warn('Device does not have boolean capability');
			callback(new Error('Device does not have boolean capability'));
		}
		callback(null, true);
	}

	onActionSendCmdSequence(callback, args) {
		this.logger.silly('Driver:onActionSendCmdSequence(callback, args)', callback, args);
		const device = this.getDevice(args.device);
		if (device) {
			Promise.all(args.cmds.split(',').map((cmd) => this.sendCmd(device, cmd)))
				.then(() => callback(null, true))
				.catch(callback);
		} else {
			callback('Could not find device');
		}
	}

	onActionSendCmdNumber(callback, args) {
		this.logger.silly('Driver:onActionSendCmd(callback, args)', callback, args);
		const device = this.getDevice(args.device);
		if (device) {
			Promise.all(String(args.number).split('').map(number => this.sendCmd(device, `number_${number}`)))
				.then(() => callback(null, true))
				.catch(callback);
		} else {
			callback('Could not find device');
		}
	}

	pair(socket) { // Pair sequence
		this.logger.verbose('Driver:pair(socket)', socket);
		this.logger.info('opening pair wizard');
		this.isPairing = true;
		this.registerSignal();
		const payloadListener = (payload) => {
			this.logger.verbose('emitting payload to pairing wizard', payload);
			socket.emit('payload', payload);
		};
		this.on('payload', payloadListener);

		this.pairingDevice = this.generateDevice();

		const receivedListener = (frame) => {
			this.logger.verbose('emitting frame to pairing wizard', frame);
			socket.emit('frame', frame);
		};
		this.on('frame', receivedListener);

		socket.on('next', (data, callback) => {
			this.logger.verbose('Driver:pair->next(data, callback)', data, callback);
			socket.emit('nextView', this.config.pair.views.map(view => view.id));
			callback();
		});

		socket.on('previous', (data, callback) => {
			this.logger.verbose('Driver:pair->previous(data, callback)', data, callback);
			socket.emit('previousView', this.config.pair.views.map(view => view.id));
			callback();
		});

		socket.on('get_device', (data, callback) => {
			this.logger.verbose(
				'Driver:pair->get_device(data, callback)+this.pairingDevice', data, callback, this.pairingDevice
			);
			callback(null, this.pairingDevice);
		});

		socket.on('program_send', (data, callback) => {
			this.logger.verbose(
				'Driver:pair->program_send(data, callback)+this.pairingDevice', data, callback, this.pairingDevice
			);
			if (this.pairingDevice && this.pairingDevice.data) {
				return this.sendProgramSignal(this.pairingDevice.data, callback);
			}
			return callback(new Error('433_generator.error.no_device'));
		});

		socket.on('test', (data, callback) => {
			this.logger.verbose('Driver:pair->test(data, callback)+this.pairingDevice', data, callback, this.pairingDevice);
			callback(
				!this.pairingDevice,
				this.pairingDevice ?
					Object.assign(
						{},
						this.pairingDevice,
						{ data: Object.assign({}, this.pairingDevice.data, this.getLastFrame(this.pairingDevice)) || {} }
					) :
					null
			);
		});

		socket.on('override_device', (data, callback) => {
			if (!this.pairingDevice) {
				return callback(new Error('433_generator.error.no_device'));
			}
			if (!(data && data.constructor === Object)) {
				return callback(new Error('Data must be an object!'), this.pairingDevice.data);
			}
			const newPairingDeviceData = Object.assign({}, this.pairingDevice.data, data, { overridden: true });
			const payload = this.dataToPayload(newPairingDeviceData);
			if (!payload) {
				return callback(
					new Error('New pairing device data is invalid, changes are reverted.'),
					this.pairingDevice.data
				);
			}
			const frame = payload.map(Number);
			const dataCheck = this.payloadToData(frame);
			if (
				frame.find(isNaN) || !dataCheck ||
				dataCheck.constructor !== Object || !dataCheck.id ||
				dataCheck.id !== this.getDeviceId(newPairingDeviceData)
			) {
				return callback(
					new Error('New pairing device data is invalid, changes are reverted.'),
					this.pairingDevice.data
				);
			}
			this.pairingDevice.data = newPairingDeviceData;
			callback(null, this.pairingDevice.data);
		});

		socket.on('append_device_metadata', (data, callback) => {
			if (!this.pairingDevice) {
				return callback(new Error('433_generator.error.no_device'));
			}
			if (!(data && data.constructor === Object)) {
				return callback(new Error('Data must be an object!'), this.pairingDevice.data);
			}
			this.pairingDevice.data = this.pairingDevice.data || {};
			this.pairingDevice.data.metadata = Object.assign({}, this.pairingDevice.data.metadata, data);
			callback(null, this.pairingDevice);
		});

		socket.on('reset_device_metadata', (data, callback) => {
			if (!this.pairingDevice) {
				return callback(new Error('433_generator.error.no_device'));
			}
			if (!(data && data.constructor === Object)) {
				return callback(new Error('Data must be an object!'), this.pairingDevice.data);
			}
			this.pairingDevice.data = this.pairingDevice.data || {};
			this.pairingDevice.data.metadata = data;
			callback(null, this.pairingDevice);
		});

		socket.on('reset_device_metadata', (data, callback) => {
			if (!this.pairingDevice) {
				return callback(new Error('433_generator.error.no_device'));
			}
			this.pairingDevice.data = this.pairingDevice.data || {};
			delete this.pairingDevice.data.metadata;
			callback(null, this.pairingDevice);
		});

		socket.on('done', (data, callback) => {
			this.logger.verbose('Driver:pair->done(data, callback)+this.pairingDevice', data, callback, this.pairingDevice);
			if (!this.pairingDevice) {
				return callback(new Error('433_generator.error.no_device'));
			}
			return callback(null, this.pairingDevice);
		});

		socket.on('send', (data, callback) => {
			this.logger.verbose('Driver:pair->send(data, callback)+this.pairingDevice', data, callback, this.pairingDevice);
			if (this.pairingDevice && this.pairingDevice.data) {
				this.send(this.pairingDevice.data, data).then(callback.bind(false)).catch(callback);
			}
			return callback(new Error('433_generator.error.no_device'));
		});

		socket.on('set_settings', (data, callback) => {
			this.logger.verbose(
				'Driver:pair->set_settings(data, callback)+this.pairingDevice', data, callback, this.pairingDevice
			);
			if (this.pairingDevice && this.pairingDevice.data) {
				this.setSettings(this.pairingDevice.data.id, data, callback);
			} else {
				callback(new Error('433_generator.error.no_device'));
			}
		});

		socket.on('get_settings', (data, callback) => {
			this.logger.verbose(
				'Driver:pair->get_settings(data, callback)+this.pairingDevice', data, callback, this.pairingDevice
			);
			if (!this.pairingDevice) {
				return callback(new Error('433_generator.error.no_device'));
			}
			return callback(null, this.getSettings(this.pairingDevice));
		});

		socket.on('get_setting', (data, callback) => {
			this.logger.verbose(
				'Driver:pair->get_setting(data, callback)+this.pairingDevice', data, callback, this.pairingDevice
			);
			if (!this.pairingDevice) {
				return callback(new Error('433_generator.error.no_device'));
			}
			return callback(null, this.getSettings(this.pairingDevice)[data]);
		});

		socket.on('emulate_frame', (data, callback) => {
			this.logger.verbose(
				'Driver:pair->emulate_frame(data, callback)+this.pairingDevice', data, callback, this.pairingDevice
			);
			if (!this.pairingDevice) {
				return callback(new Error('433_generator.error.no_device'));
			}
			return callback(
				null,
				this.emit(
					'frame',
					Object.assign({}, this.pairingDevice, this.getLastFrame(this.pairingDevice) || {}, data || {})
				)
			);
		});

		socket.on('assert_device', (data, callback) => {
			this.logger.verbose(
				'Driver:pair->assert_device(data, callback)+this.pairingDevice', data, callback, this.pairingDevice
			);
			this.assertDevice(this.pairingDevice, callback);
		});

		const exports = this.getExports() || {};
		socket.on('toggle', (data, callback) => {
			this.logger.verbose(
				'Driver:pair->toggle(data, callback)+this.pairingDevice', data, callback, this.pairingDevice
			);
			if (!this.pairingDevice) {
				return callback(new Error('433_generator.error.no_device'));
			}
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

		Object.keys(exports.capabilities || {}).forEach(capability => {
			socket.on(capability, (data, callback) => {
				exports.capabilities[capability].set(this.pairingDevice.data, data, callback);
			});
		});

		const highlightListener = data => {
			this.logger.verbose('emitting highlight to pairing wizard', data);
			socket.emit('highlight', data);
		};
		this.on('highlight', highlightListener);

		socket.on('disconnect', (data, callback) => {
			this.logger.verbose('Driver:pair->toggle(data, callback)+this.pairingDevice', data, callback, this.pairingDevice);
			this.isPairing = false;
			this.removeListener('payload', payloadListener);
			this.removeListener('frame', receivedListener);
			this.removeListener('highlight', highlightListener);
			this.pairingDevice = null;
			this.state.delete('_pairingDevice');
			this.lastFrame.delete('_pairingDevice');
			this.unregisterSignal();
			this.logger.info('pair wizard closed');
			callback();
		});
	}

	getExports() {
		const exports = super.getExports();
		exports.capabilities = exports.capabilities || {};
		if (this.config.capabilityToCommandMap) {
			for (const capability in this.config.capabilityToCommandMap) {
				const commands = [].concat(this.config.capabilityToCommandMap[capability]);
				exports.capabilities[capability] = {
					set: (device, state, callback) => this.sendCmd(device, commands[(state ? 0 : 1) % commands.length], callback),
					get: (device, callback) => Boolean(this.getState(device)[capability]),
				};
			}
		}
		return exports;
	}
};
