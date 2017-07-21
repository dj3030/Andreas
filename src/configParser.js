'use strict';
/* eslint global-require: 0 */

const fs = require('fs');
const path = require('path');
const upath = require('upath');
const crypto = require('crypto');
const traverse = require('traverse');
const deepExtend = require('deep-extend');
const isValidPath = require('is-valid-path');

const generatorLocales = {};
const localesFolder = fs.readdirSync(path.join(__dirname, '../locales'));
localesFolder.forEach(fileName => {
	if (path.extname(fileName) === '.js') {
		generatorLocales[path.basename(fileName, '.js')] = require(path.join(__dirname, '../locales', fileName));
	}
});

module.exports = class configParser {

	constructor(configType, projectPath) {
		this.configType = configType;
		this.views = {};
		this.devices = {};
		this.deviceOrder = [];
		this.drivers = [];
		this.defaultSignals = { 433: {}, 868: {}, ir: {} };
		this.deviceClasses = {};
		this.signals = new Map();
		this.cmdMap = new Map();
		this.projectRoot = projectPath;
		this.extendGeneratorLocales();
		this.getLocales();
	}

	extendGeneratorLocales() {
		if (localesFolder.indexOf(this.configType)) {
			const folderPath = path.join(__dirname, '../locales', this.configType);
			fs.readdirSync(path.join(folderPath)).forEach(fileName => {
				if (path.extname(fileName) === '.js') {
					const baseName = path.basename(fileName, '.js');
					generatorLocales[baseName] = deepExtend(
						generatorLocales[baseName],
						{ [`${this.configType}_generator`]: require(path.join(folderPath, fileName)) }
					);
				}
			});
		}
	}

	getLocales() {
		if (!this.locales) {
			this.locales = { en: {} };
			const localesPath = path.join(this.projectRoot, 'locales');
			const localesFiles = fs.readdirSync(localesPath);
			localesFiles.forEach(fileName => {
				if (path.extname(fileName) === '.json') {
					this.locales[path.basename(fileName, '.json')] = require(path.join(localesPath, fileName));
				}
			});
		}
		return this.locales;
	}

	setLocales(cmdWhitelist) {
		const locales = this.getLocales();

		const setLocalePath = (pathArray, localeId) => {
			const pathString = pathArray.join('.');
			if (pathString === '') return;

			pathArray.reduce((prev, curr, index, target) => {
				this.assert(
					prev && prev.constructor.name !== 'String',
					`Translation key '${prev}' collides with key '${pathString}'. '${prev}' cannot be a String and an Object at \
the same time. Please remove one of both from your config.`,
					'error'
				);

				if (target.length === index + 1) {
					let result = this.getLocale(pathString, locales[localeId]);
					if (!result || result.slice(-1) === '\u0000') {
						if (cmdWhitelist && pathArray[pathArray.length - 2] === 'button_labels' &&
							cmdWhitelist.indexOf(pathArray[pathArray.length - 1]) === -1) return delete prev[curr];
						result = this.getLocale(pathString, generatorLocales[localeId]);
						if (result) {
							result = `${result}\u0000`;
						} else if (localeId === 'en') {
							result = pathString;
						} else {
							result = null;
						}
					}
					return prev[curr] = result;
				} else if (prev && prev.hasOwnProperty && prev.hasOwnProperty(curr)) {
					return prev[curr];
				}
				return prev[curr] = {};
			}, locales[localeId] || {});
		};

		traverse(this.devices).forEach(function nextItem(val) {
			if (typeof val === 'string' && val.indexOf(' ') === -1 && (
					this.key === 'label' ||
					this.key === 'title' ||
					this.key === 'placeholder' ||
					(this.key === 'name' && this.path.indexOf('args') === -1) ||
					(
						(val.indexOf('deviceClasses.') !== -1 || val.indexOf('views.') !== -1) &&
						(this.path.indexOf('options') !== -1 || this.path.indexOf('viewOptions') !== -1)
					)
				)
			) {
				Object.keys(locales).forEach(localeId => setLocalePath(val.split('.'), localeId));
			}
		});

		const configPrefix = `${this.configType}_generator`;
		traverse(generatorLocales.en[configPrefix])
			.reduce(function nextItem(pathList) {
				if (this.isLeaf) {
					const leafPath = this.path;
					leafPath.unshift(configPrefix);
					pathList.push(leafPath);
				}
				return pathList;
			}, [])
			.forEach(localePath => {
				Object.keys(locales).forEach(localeId => {
					setLocalePath(localePath, localeId);
				});
			});

		const localesPath = path.join(this.projectRoot, 'locales');
		Object.keys(locales).forEach(localeId => {
			try {
				fs.writeFileSync(
					path.join(localesPath, `${localeId}.json`),
					`${JSON.stringify(locales[localeId], null, '\t')}\n`
				);
			} catch (ignore) { return ignore; }
		});
	}

	getConfig() {
		return {
			views: this.views,
			deviceClasses: this.deviceClasses,
			devices: this.devices,
		};
	}

	getDeviceConfig() {
		return { devices: this.devices };
	}

	getAppJsonConfig() {
		const self = this;
		const devices = this.prefixPath(this.devices, './drivers');
		const drivers = Array.isArray(this.drivers) ? this.drivers.map(driver => this.prefixPath(driver, './drivers')) : [];
		const result = {};

		result.signals = this.defaultSignals;
		this.signals.forEach((id, signalString) => {
			const signal = JSON.parse(signalString);
			if (this.cmdMap.has(id)) {
				signal.cmds = this.cmdMap.get(id);
			}
			result.signals[this.configType][id] = signal;
			delete result.signals[this.configType][id].id;
		});

		result.drivers = Object.keys(devices).map(deviceId => {
			const device = devices[deviceId];

			this.assert(device.name, `No name set for ${deviceId}!`);
			this.assert(device.class, `No device class set for ${deviceId}!`);
			this.assert(device.images && device.images.small, `No small image set for ${deviceId}!`);
			this.assert(device.images && device.images.large, `No large image set for ${deviceId}!`);

			const localizedSettings = traverse(device.settings).forEach(function nextItem(val) {
				if (typeof val === 'string' && (this.key === 'label' || this.key === 'title' || this.key === 'placeholder')) {
					this.update(self.getLocaleObject(val));
				}
			});

			return Object.assign(
				{
					id: deviceId,
					name: this.getLocaleObject(device.name),
					class: device.class,
					capabilities: device.capabilities || [],
					images: device.images,
					settings: localizedSettings,
				},
				device.pair && device.pair.views && device.pair.views.length ?
					({
						pair: device.pair.views.map((view, index, views) => {
							const pairViewConfig = {
								id: view.id,
								navigation: {},
							};
							if (view.template.indexOf('./') !== 0 && view.template.indexOf('../') !== 0) {
								pairViewConfig.template = view.template;
							}
							if (view.options.previous) {
								if (typeof view.options.previous === 'string') {
									pairViewConfig.navigation.prev = view.options.previous;
								} else if (index > 0) {
									pairViewConfig.navigation.prev = views[index - 1].id;
								}
							}
							if (view.options.next) {
								if (typeof view.options.next === 'string') {
									pairViewConfig.navigation.next = view.options.next;
								} else if (index + 1 < views.length) {
									pairViewConfig.navigation.next = views[index + 1].id;
								}
							}
							return pairViewConfig;
						}),
					}) :
					({})
			);
		}).sort((a, b) => this.deviceOrder.indexOf(a.id) - this.deviceOrder.indexOf(b.id))
			.concat(drivers);

		result.flow = {};

		const localizedGlobals = traverse(this.globals).forEach(function nextItem(val) {
			if (typeof val === 'string' && (this.key === 'label' || this.key === 'title' || this.key === 'placeholder')) {
				this.update(self.getLocaleObject(val));
			}
		});

		['triggers', 'conditions', 'actions'].forEach(key => {
			result.flow[key] = Object.keys(devices).reduce((flowItems, deviceId) => {
				if (!devices[deviceId][key]) return flowItems;

				return flowItems.concat(
					devices[deviceId][key].map(flowItem => {
						traverse(flowItem).forEach(function nextItem(val) {
							if (
								typeof val === 'string' &&
								(this.key === 'label' || this.key === 'title' || this.key === 'placeholder')
							) {
								this.update(self.getLocaleObject(val));
							}
						});
						return flowItem;
					})
				);
			}, []).concat((localizedGlobals.flow || {})[key] || []);
		});

		return result;
	}

	addConfig(config, pathPrefix, configPath) {
		// config = this.generateSubmoduleConfig(config.submodules, configPath);
		if (pathPrefix) {
			config = this.prefixPath(config, pathPrefix);
		}

		if (config.locales) {
			this.appendLocales(config.locales);
		}

		this.deviceOrder = this.deviceOrder.concat(Object.keys(config.devices || {}));
		this.drivers = this.drivers.concat(config.drivers || []);
		Object.keys(config.signals || {})
			.map(type =>
				Object.keys(config.signals[type])
					.map(id => this.defaultSignals[type][id] = config.signals[type][id])
			);

		this.globals = Object.assign(this.globals || {}, config, { views: null, deviceClasses: null, devices: null });

		this.views = this.parseViews(Object.assign({}, this.views, config.views));
		this.deviceClasses = this.parseDeviceClasses(
			Object.assign({}, this.deviceClasses, config.deviceClasses),
			{ globalSignal: this.globals.signal, globalDriver: this.globals.driver }
		);
		this.devices = this.parseDevices(
			Object.assign({}, this.devices, config.devices),
			{ globalSignal: this.globals.signal, globalDriver: this.globals.driver }
		);
	}

	// generateSubmoduleConfig(submodules, configPath) {
	// 	if (submodules) {
	// 		if (!Array.isArray(submodules)) {
	// 			submodules = [submodules];
	// 		}
	// 		submodules.append({
	// 			_root: true,
	// 			configDir:
	// 		});
	// 		submodules.forEach(module => {
	// 			if (typeof module === 'string') {
	// 				module = {
	// 					configDir: module,
	// 					localesPath: path.join(module, '../locales'),
	// 					prefix: '',
	// 				};
	// 			}
	// 			const submoduleConfig = require(path.join(configPath, path.join(module.configDir, '.submoduleConfig.js')));
	// 			const moduleConfig = require(path.join(configPath, path.join(module.configDir, 'config.js')));
	//
	// 			traverse(submoduleConfig.deviceClasses).forEach(function nextItem(val) {
	// 				if (this.level === 1) {
	// 					const deviceClassKey = (module.prefix || '') + this.key;
	// 					this.assert(
	// 						!config.deviceClasses.hasOwnProperty(deviceClassKey),
	// 						`DeviceClass conflict for ${deviceClassKey
	// 							}, deviceClass overwritten with lowest level entry. Please use the prefix option to prevent this!`
	// 					);
	// 					config.deviceClasses[deviceClassKey] = this.node;
	// 				} else if (this.isLeaf) {
	// 					if ((this.parent.key === 'extends' || this.parent.parent.key === 'extends')) {
	// 						const extendsClassKey = (module.prefix || '') + val;
	// 						if (config.deviceClasses.hasOwnProperty(extendsClassKey)) {
	// 							this.update(extendsClassKey);
	// 						}
	// 					} else if (this.parent.parent.key === 'viewOrder') {
	// 						if(this.)
	// 					} else if (typeof val === 'string' && val.indexOf('./') === 0) {
	// 						this.update(upath.joinSafe(module.configPath, val));
	// 					}
	// 				}
	// 			});
	// 		});
	// 	} else {
	// 		return config;
	// 	}
	// 	const kakuConfig = require('./modules/klikaanklikuit/433_generator/config.js');
	// 	const deviceClasses = Object.assign(kakuConfig.deviceClasses || {}, kakuConfig.devices || {});
	// 	Object.keys(deviceClasses).forEach(key => {
	// 		if (deviceClasses[key].driver) {
	// 			deviceClasses[key].driver = deviceClasses[key].driver.replace('./', './modules/klikaanklikuit/433_generator/');
	// 		}
	// 	});
	// 	Object.assign(config.views || {}, kakuConfig.views || {});
	// 	Object.assign(config.deviceClasses || {}, deviceClasses || {});
	// 	const en = require('./modules/klikaanklikuit/locales/en.json');
	// 	const nl = require('./modules/klikaanklikuit/locales/nl.json');
	// 	config.locales = { en, nl };
	// }

	appendLocales(newLocales) {
		const locales = traverse(generatorLocales);

		traverse(newLocales).forEach(function nextItem(str) {
			if (this.isLeaf && str && str.slice(-1) !== '\u0000') {
				locales.set(this.path, str);
			}
		});
	}


	prefixPath(config, pathPrefix) {
		return traverse(deepExtend({}, config)).forEach(function nextItem(val) {
			if (this.circular) {
				throw new Error('Circular references are not supported!');
			} else if (this.isLeaf && typeof val === 'string' && (val.indexOf('./') === 0 || val.indexOf('../') === 0)) {
				if (!isValidPath(val)) {
					throw new Error(`Path ${val} is not valid`);
				}
				this.update(upath.joinSafe(pathPrefix, val));
			}
		});
	}

	parseViews(views) {
		const result = {};

		if (!views) return result;

		function loadViewObject(viewName) {
			if (result[viewName]) {
				return deepExtend({}, result[viewName]);
			} else if (views[viewName]) {
				const view = deepExtend({}, views[viewName]);
				let viewOptions = [];
				if (view.extends) {
					if (typeof view.extends === 'string') {
						view.extends = [view.extends];
					}
					const self = this || [];
					view.extends.forEach(extendName => {
						if (self.indexOf(extendName) !== -1) {
							throw new Error(`Circular extends in view [${String(self)},${extendName}]`);
						}
					});
					viewOptions = view.extends.map(extendName => {
						const extSelf = [extendName].concat(self);
						return loadViewObject.call(extSelf, extendName);
					});
				}
				Object.keys(view.options || {}).forEach(option => {
					if (view.options[option].constructor !== Object) {
						view.options[option] = { default: view.options[option] };
					}
				});
				viewOptions = viewOptions.concat(view);

				const options = Object.assign.apply(
					{},
					viewOptions.map(viewOption => viewOption.options)
				);
				const prepend = viewOptions.reduce((prev, curr) => prev.concat(curr.prepend || []), []);
				const append = viewOptions.reduce((prev, curr) => prev.concat(curr.append || []), []);

				viewOptions = viewOptions.concat({ options: options, prepend, append });
				const ret = Object.assign.apply({}, viewOptions);
				delete ret.extends;
				return ret;
			}
			throw new Error(`View ${viewName} cannot be found`);
		}

		Object.keys(views).forEach(viewName => {
			result[viewName] = loadViewObject(viewName);
		});

		return result;
	}

	parseDeviceClasses(deviceClasses, globals) {
		const result = {};

		if (!deviceClasses) return result;

		function loadDeviceClass(className) {
			if (result[className]) {
				return deepExtend({}, result[className]);
			} else if (deviceClasses[className]) {
				const deviceClass = deepExtend({}, deviceClasses[className]);
				let deviceClassOptions = [];
				if (deviceClass.extends) {
					if (typeof deviceClass.extends === 'string') {
						deviceClass.extends = [deviceClass.extends];
					}
					const self = this || [];
					deviceClass.extends.forEach(extendName => {
						if (self.indexOf(extendName) !== -1) {
							throw new Error(`Circular extends in view [${String(self)},${extendName}]`);
						}
					});
					deviceClassOptions = deviceClass.extends.map(extendName => {
						const extSelf = [extendName].concat(self);
						return loadDeviceClass.call(extSelf, extendName);
					});
				}
				const imageOptions = deviceClassOptions
					.map(options => options.images)
					.concat([{}, deviceClass.images])
					.filter(Boolean);
				const images = imageOptions.length < 2 ? {} : Object.assign.apply(
					{},
					imageOptions
				);
				const pairOptions = deviceClassOptions.map(options => options.pair).concat(deviceClass.pair).filter(Boolean);
				let pair = {};
				if (pairOptions.length !== 0) {
					// TODO does not work...
					deviceClass.pair = deviceClass.pair || {};
					deviceClass.pair.viewOptions = deviceClass.pair.viewOptions || {};
					const pairViewOptions = [{}]
						.concat(deviceClassOptions.map(options => (options.pair ? options.pair.viewOptions : null)))
						.concat(deviceClass.pair ? deviceClass.pair.viewOptions || {} : {}).filter(Boolean);

					(new Set([].concat.apply([], Object.keys(pairViewOptions).map(dc => Object.keys(pairViewOptions[dc])))))
						.forEach(viewName => {
							deviceClass.pair.viewOptions[viewName] = deviceClass.pair.viewOptions[viewName] || {};
							const deviceViewOptions = deviceClass.pair.viewOptions[viewName];

							['prepend', 'append'].forEach(contentLocation => {
								if (
									deviceViewOptions[contentLocation] && !Array.isArray(deviceViewOptions[contentLocation])
								) {
									deviceViewOptions[contentLocation] = [deviceViewOptions[contentLocation]];
								} else {
									deviceViewOptions[contentLocation] = deviceViewOptions[contentLocation] || [];
								}
								deviceViewOptions[contentLocation] = Object.keys(deviceClassOptions)
									.reduce((optionList, curr) => {
										curr = deviceClassOptions[curr].pair;
										if (curr && curr.viewOptions && curr.viewOptions[viewName] &&
											curr.viewOptions[viewName][contentLocation]
										) {
											return optionList.concat(curr.viewOptions[viewName][contentLocation]);
										}
										return optionList;
									}, deviceViewOptions[contentLocation]);
							});
						});
					pair = Object.assign.apply(
						{},
						pairOptions.concat(
							{
								viewOptions: deepExtend.apply(
									deepExtend,
									[{}].concat(deviceClassOptions.map(options => (options.pair ? options.pair.viewOptions || {} : {})))
										.concat(deviceClass.pair.viewOptions).filter(Boolean)
								),
							}
						)
					);
				}
				deviceClassOptions = deviceClassOptions.concat([
					globals,
					deviceClass,
					{
						images: images,
						pair: pair,
						id: className,
					},
				]);

				const ret = Object.assign.apply({}, [{}].concat(deviceClassOptions));
				delete ret.extends;
				return ret;
			}
			throw new Error(`Device class ${className} cannot be found`);
		}

		Object.keys(deviceClasses).forEach(className => {
			result[className] = loadDeviceClass(className);
		});

		return result;
	}

	parseDevices(devices, globals) {
		const result = {};

		if (!devices) return result;

		const extendedDevices = this.parseDeviceClasses(Object.assign({}, this.deviceClasses, devices), globals);
		Object.keys(devices).forEach(deviceId => {
			// this.assert()
			result[deviceId] = deepExtend({}, extendedDevices[deviceId]);
			result[deviceId].driver = result[deviceId].driver || result[deviceId].globalDriver;
			const signal = result[deviceId].signal || result[deviceId].globalSignal;
			// Since 1.3.0 signal sensitivity must be <= 0.5 so we quick fix this here if it is higher
			if (signal.sensitivity && signal.sensitivity > 0.5) {
				signal.sensitivity = 0.5;
			}
			const signalKey = JSON.stringify(signal);
			const signalId = this.signals.has(signalKey) ? this.signals.get(signalKey) : this.signals.set(
				signalKey,
				signal.id || crypto.createHash('md5').update(signalKey).digest('hex')
			).get(signalKey);

			result[deviceId].signalDefinition = Object.assign({}, signal);

			if (result[deviceId].signal.cmds) {
				if (!this.cmdMap.has(signalId)) {
					const cmds = result[deviceId].signal.cmds;
					const hasTypes = Object.keys(cmds).reduce(
						(res, cmd) => res && cmds[cmd] && cmds[cmd].constructor && cmds[cmd].constructor.name === 'Object',
						true
					);
					const parseCmd = typeof result[deviceId].signal.parseCmd === 'function' ?
						result[deviceId].signal.parseCmd :
						cmd => cmd;
					const parseSubtypes = cmdList => {
						return Object.keys(cmdList).reduce(
							(list, cmd) => {
								if (cmdList[cmd]) {
									if (cmdList[cmd].constructor && cmdList[cmd].constructor.name === 'Object') {
										Object.keys(cmdList[cmd]).forEach((subType) => {
											if (subType === 'default') {
												list[cmd] = parseCmd(cmdList[cmd][subType]);
											} else {
												list[`${cmd}~$${subType}`] = parseCmd(cmdList[cmd][subType]);
											}
										});
									} else {
										list[cmd] = parseCmd(cmdList[cmd]);
									}
								}
								return list;
							},
							{}
						);
					};
					if (hasTypes) {
						this.cmdMap.set(
							signalId,
							Object.keys(cmds).reduce(
								(list, type) => {
									const cmdList = parseSubtypes(cmds[type]);
									Object.keys(cmdList).forEach((cmd) => {
										if (type === 'default') {
											list[cmd] = cmdList[cmd];
										} else {
											list[`${type}$~${cmd}`] = cmdList[cmd];
										}
									});
									return list;
								},
								{}
							)
						);
					} else {
						this.cmdMap.set(signalId, parseSubtypes(cmds));
					}
					// const firstCmd = result[deviceId].signal.cmds[Object.keys(signal.cmds)[0]];
					// if (firstCmd && firstCmd.constructor && firstCmd.constructor.name === 'Object') {
					// 	if (!this.cmdMap.has(signalId)) {
					// 		const types = Object.keys(result[deviceId].signal.cmds);
					// 		const intersection = types
					// 			.reduce((list, type) => list.concat(Object.keys(result[deviceId].signal.cmds[type])), [])
					// 			.sort()
					// 			.reduce((res, cmd, i, list) => {
					// 				if (i && list[i - 1] === cmd && res[res.length - 1] !== cmd) {
					// 					res.push(cmd);
					// 				}
					// 				return res;
					// 			}, []);
					// 		console.log('intersection', intersection);
					// 		const cmdList = types.reduce((list, type) => Object.assign(list, result[deviceId].signal.cmds[type]), {});
					// 		intersection.forEach(cmd => {
					// 			delete cmdList[cmd];
					// 			types.forEach(type => {
					// 				if (result[deviceId].signal.cmds[type][cmd]) {
					// 					cmdList[`${cmd}$~${type}`] = result[deviceId].signal.cmds[type][cmd];
					// 				}
					// 			});
					// 		});
					// 		this.cmdMap.set(signalId, cmdList);
					// 	}
					// 	result[deviceId].cmds = Object.keys(this.cmdMap.get(signalId));
					// } else {
					// 	result[deviceId].cmds = Object.keys(result[deviceId].signal.cmds);
					// }
				}
				result[deviceId].signalDefinition.cmds = Object.keys(this.cmdMap.get(signalId));
			}
			result[deviceId].signal = signalId;

			delete result[deviceId].signal.parseCmd;
			delete result[deviceId].globalDriver;
			delete result[deviceId].globalSignal;

			if (result[deviceId].pair && result[deviceId].pair.viewOrder) {
				result[deviceId].pair = {
					viewOrder: result[deviceId].pair.viewOrder,
					views: result[deviceId].pair.viewOrder.map(viewName => {
						if (!this.views[viewName]) {
							throw new Error(`Could not find view ${viewName} for ${deviceId}`);
						}
						const view = Object.assign({}, this.views[viewName]);
						const viewOptions =
							result[deviceId].pair.viewOptions ?
								result[deviceId].pair.viewOptions[viewName] || {} :
								{};
						const optionTypes = view.options || {};
						Object.assign(optionTypes, { prepend: {}, append: {} });

						Object.keys(optionTypes).forEach(option => {
							if (optionTypes[option].required && !viewOptions.hasOwnProperty(option)) {
								throw new Error(`View option ${option} is required for view ${viewName} in device ${deviceId}`);
							} else {
								if (!viewOptions.hasOwnProperty(option)) {
									if (optionTypes[option].hasOwnProperty('default')) {
										viewOptions[option] = optionTypes[option].default;
									} else {
										viewOptions[option] = '';
									}
								}
							}
						});
						return Object.assign(view, { options: viewOptions }, { id: viewName });
					}),
				};
			}

			['triggers', 'conditions', 'actions'].forEach(key => {
				if (result[deviceId][key]) {
					result[deviceId][key] = result[deviceId][key].map(flowItem => {
						flowItem.id = `${deviceId}:${flowItem.id}`;

						flowItem.args = flowItem.args || [];
						flowItem.args.push({
							name: 'device',
							type: 'device',
							filter: `driver_id=${deviceId}`,
						});
						return flowItem;
					});
				}
			});
		});

		return result;
	}

	getLocale(localePath, locale) {
		const result = localePath.split('.').reduce((prev, curr) => {
			if (prev && prev.hasOwnProperty && prev.hasOwnProperty(curr)) {
				return prev[curr];
			}
			return { _notFound: true };
		}, locale);

		if (typeof result === 'string' && result !== localePath) {
			return result;
		}
		return false;
	}

	getLocaleObject(localePath) {
		const locale = {};
		localePath = localePath || '';
		Object.keys(this.locales).forEach(localeId => {
			const translation = localePath.split('.').reduce(
				(prev, curr) => (prev.hasOwnProperty && prev.hasOwnProperty(curr) ? prev[curr] : { _notFound: true }),
				this.locales[localeId]
			);
			if (typeof translation === 'string') {
				locale[localeId] = translation.replace('&#8203', '');
			} else if (localeId === 'en') {
				locale[localeId] = localePath;
			}
		});
		return locale;
	}

	assert(condition, message, type) {
		if (!condition) {
			switch (type) {
				case 'error':
					console.error('[ERROR]', message);
					process.exit();
					break;
				default:
					console.warn('[WARNING]', message);
			}
		}
		return Boolean(condition);
	}
};
