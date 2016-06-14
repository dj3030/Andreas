#Homey 433 mhz app generator
This module generates driver files for Homey using a custom config file. The goal of this module is to implement generic 433 features and generate Homey drivers using minimal device specific code.

####**Notice**
This generator generates files in the `/drivers`, `/drivers/lib` and `/assets/433_generator` folder. All previous files in these folders will be overwritten. Also, this generator overwrites `drivers` and `flows` in the `app.json` config. These actions cannot be undone. Use with caution!

####usage
To use this tool you need to run
`homey433 generate [configDir] [projectDir]`

The configDir is relative to the projectDir and is `433_generator` by default. The projectDir is defaulted to the current directory in the command line. To generate and run the project in one command you can call the following command.
`homey433 generate && athom project --run`

###The config file
The config file consists of 3 main options. Views, Deviceclasses and devices. These options inherit the defaultConfig settings (included in `/lib/defaultConfig.js`). A sample configuration is given below.

```javascript
module.exports = {
	views: {
		start: {
			template: './pair/start.html', // Template file location
			options: {
				title: {
					required: true, // Asserts that the option is set
				},
				body: {
					default: 'pair.info.body', // Default value if not set by child
				},
				next: true, // If the next button should be visible in pair wizard
				previous: false, // if previous button should be visible
			},
		},
	},
	deviceClasses: {
		eurodomest: {
			signal: { // The signal definition of the device
				sof: [], // Start of frame
				eof: [295], // End of frame
				words: [
					[295, 885],	// 0
					[885, 295],	// 1
				],
				interval: 9565, // Time between repititions
				repetitions: 20,
				sensitivity: 0.7,
				minimalLength: 24,
				maximalLength: 24,
			},
		},
		myRemote: {
			extends: 'remote', // Extends the remote deviceclass from defaultConfig
			driver: './drivers/remote.js', // Path to the driver file to use
			class: 'other', // The class of the device
			capabilities: [], // The capabilities of the device
			pair: {
				viewOrder: ['start', 'imitate', 'test_remote', 'done'],
				viewOptions: {
					start: {
						title: 'pair.start',
						next: 'imitate', // If nessecary a specific view can be given
					}
				}
			}
		},
	},
	devices: {
		remote_1: { // A device for which a driver will be generated
			extends: ['myRemote', 'eurodomest'], // Extends multiple deviceclasses
			name: 'remote.1.name', // Name is localized using the locales/*lang_id*.json
			icon: './assets/remote1/remote.svg', // Location of the icon of this device
			pair: {
				viewOptions: {
					start: {
						body: 'Connect remote 1!',
					}
					imitate: {
						title: './assets/remote1/remote_pair.svg',
					},
					imitate: {
						svg: './assets/remote1/remote_pair.svg',
					},
					test_remote: {
						svg: './assets/remote1/remote.svg',
					},
				},
			},
		},
		remote_2: {
			extends: ['myRemote', 'eurodomest'],
			name: 'remote.2.name',
			icon: './assets/remote2/remote.svg',
			pair: {
				viewOptions: {
					start: {
						body: 'pair.start.remote1',
					}
					imitate: {
						svg: './assets/remote2/remote_pair.svg',
					},
					test_remote: {
						svg: './assets/remote2/remote.svg',
					},
				},
			},
		},
	},
};
```

The config file is structured as follows. Devices need configuration for `driver`, `signal`, `name`, `icon`, `images`, `pair`, `capabilities`, `triggers`, `conditions` and `actions`. The configuration of many devices overlaps a device can extend it's config from one or more `deviceClasses`. A deviceclass itself can also extend from other deviceclasses. Because many devices require the same views in the pair wizard `views` are, like deviceClasses, extendable building blocks. A view has a `template` and `viewOptions` configuration. In the `viewOptions` you can define which options the view needs from the device that is using this view or set a default value. The next and previous options are reserved to generate the `navigation` configuration in the resulting `app.json` which will add previous and next buttons in the pair wizard.


###Triggers, Conditions and Actions
It is also possible to automatically generate the `triggers`, `conditions` and `actions` in the app.json. If these are defined as device options the generator will automatically append the following argument.
```javascript
	{
	  "name": "device",
	  "type": "device",
	  "filter": "driver_id=${driver_id}"
	}
```
Notice that, because the generator overwrites the `flow` config in `app.json` it is not possible to include other custom flows. Therefore it is possible to define your `triggers`, `conditions` and `actions` in the root of the config file. The generator will append them to the generated `flow` config. The config options are the same as the normal flow configuration in `app.json` except that the localization object will be generated automatically by the generator. The default driver implements a `received` trigger and a `send` action by default. If a device has these configured the driver will try to genericly implement them. For instance, a device sends a signal containing the following data.
```javascript
{
	address:'0101110101',
	group: '0'
	unit: '110'
	state: '1'
}
```
You can configure the `recieved` trigger to check all the values when a signal is received by matching the name of the argument with its value to the value in the data object. If all conditions are met the trigger is fired. For the `send`, when triggered, the arguments will be merged with the default data packet (the first packet saved when pairing) and send by Homey. An example of such a config is given below.

```javascript
triggers: [
	{
		id: 'received',
		title: 'trigger.received.title.remote',
		args: [
			{
				name: 'unit',
				type: 'dropdown',
				values: [
					{ id: '111', label: 'remote.button_1' },
					{ id: '110', label: 'remote.button_2' },
				],
			},
			{
				name: 'state',
				type: 'dropdown',
				values: [
					{ id: '1', label: 'remote.on' },
					{ id: '0', label: 'remote.off' },
				],
			},
		],
	},
],
actions: [
	{
		id: 'send',
		title: 'action.send.title.remote',
		args: [
			{
				name: 'unit',
				type: 'dropdown',
				values: [
					{ id: '111', label: 'remote.button_1' },
					{ id: '110', label: 'remote.button_2' },
				],
			},
			{
				name: 'state',
				type: 'dropdown',
				values: [
					{ id: '1', label: 'remote.on' },
					{ id: '0', label: 'remote.off' },
				],
			},
		],
	},
],
```

###Drivers

A driver should rely on the default driver and only implement the features that are custom to a device. To use a driver you will have to implement 3 functions, `generateData`, `payloadToData` and `dataToPayload`. `payloadToData` is called when a payload is received. This function should convert the payload array to a usable javascript object witch at least should contain a id. The id is the unique identifier for the device. For example you can only add 1 remote per address so this will be it's id. But a doorbell is defined by its address, group, channel and unit (or whatever you separate the payload in). `payloadToData` does the opposite. This function should convert the given data object to an bit array that will be send by Homey. `generateData` is used to connect devices without having a transmitter. This function returns a random data object which can be used to control a device. An example of a driver is given below.
```javascript
 'use strict';

const DefaultDriver = require('../../../drivers/lib/driver');
const SignalManager = Homey.wireless('433').Signal;

module.exports = class MyDriver extends DefaultDriver {
	generateData() {
		const data = {
			address: Math.random().toString(2).substr(2, 26),
			group: 0,
			channel: Math.random().toString(2).substr(2, 2),
			unit: Math.random().toString(2).substr(2, 2),
			state: 1,
		};
		data.id = `${data.address}:${data.group}:${data.channel}:${data.unit}`;
		return data;
	}

	payloadToData(payload) { // Convert received data to usable variables
		if (payload.length === 32) {
			const data = {
				address: SignalManager.bitArrayToString(payload.slice(0, 26)),
				group: payload.slice(26, 27)[0],
				channel: SignalManager.bitArrayToString(payload.slice(28, 30)),
				unit: SignalManager.bitArrayToString(payload.slice(30, 32)),
				state: payload.slice(27, 28)[0],
			};
			data.id = `${data.address}:${data.group}:${data.channel}:${data.unit}`;
			return data;
		}
		return null; // returning null will discard the signal
	}

	dataToPayload(data) {
		const address = SignalManager.bitStringToBitArray(data.address);
		const channel = SignalManager.bitStringToBitArray(data.channel);
		const unit = SignalManager.bitStringToBitArray(data.unit);
		return address.concat(data.group, data.state, channel, unit);
	}
};
```

If a device needs to override more functionality of the default driver it can do so. It is encouraged to make use of the events that are emitted in the DefaultDriver. You can for example listen to state changes with `this.on('newState')` or incoming frames with `this.on('received')`. To change the exports object of the driver you can override the `getExports` function. It is good practice to, if not explicitly done, call the function on the super class if you override it. An example of a Socket driver which implements the `onoff` capability is given below.
```
'use strict';

const Promax = require('./promax');

module.exports = class Socket extends Promax {
	constructor(config) {
		super(config); // Important: when using the constructor pass config to super
		this.on('newFrame', this.updateState.bind(this));
		this.on('newState', this.updateRealtime.bind(this));
	}

	updateState(device, frame) {
		this.setState(device, Object.assign({}, this.getState(device), frame));
	}

	updateRealtime(device, state, oldState) {
		if (String(state.state) !== String(oldState.state)) {
			this.realtime(device, 'onoff', String(state.state) === '1');
		}
	}

	getExports() {
		const exports = super.getExports();
		exports.capabilities = exports.capabilities || {};
		exports.capabilities.onoff = {
			get: (device, callback) => callback(null, Boolean(this.getState(device).state)),
			set: (device, state, callback) => this.send(device, { state: String(state) === '1' ? 1 : 0 }, callback),
		};
		return exports;
	}
};
```

###Debugging
If you are not sure that the configuration you made is parsed correctly it is possible to look at the resulting configuration in the following files: `/drivers/config.js`, `/drivers/my_driver/driver.js` and `/drivers/my_driver/pair/view.html`. Notice that changes you make in this file will be overwritten when it is generated again.