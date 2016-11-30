'use strict';
/* eslint "max-len": 0 */

module.exports = {
	views: {
		generic_choice: {
			title: 'Choose one of the following options',
			body: 'Click one of the buttons above to proceed.',
			buttons: {
				copy: 'Copy a remote',
				generate: 'Generate signal',
			},
		},
		generic_imitate: {
			title: 'Copy your remote signal',
			body: 'Click the button on your remote that is paired to your device.',
		},
		generic_program: {
			title: 'Pair your device with Homey',
			body: 'Put your device in pairing mode, then click next to pair your device with Homey.',
		},
		generic_codewheel: {
			title: 'Configure your device code',
			body: 'Click the characters on the code wheel above or configure the wheels on the device so they match, then click next.',
		},
		generic_dipswitch: {
			title: 'Set dipswitches of device',
			body: 'Click on the dipswitches above to put them in the same arrangement as those of your device, then click next.',
		},
		generic_test_button: {
			title: 'Test your device',
			body: 'Use the button above to test your device. Press next to continue.',
		},
		generic_test_button_2: {
			body: 'Use your remote or the button above to test your device. Press next to continue.',
		},
		generic_test_switch: {
			title: 'Test your device',
			body: 'Use the switch above to test your device. Press next to continue.',
		},
		generic_test_switch_2: {
			body: 'Use your remote or the switch above to test your device. Press next to continue.',
		},
		generic_test_remote: {
			title: 'Test your remote',
			body: 'Press a random button on your remote or click the button in the image above to test the signal. Press next to continue.',
		},
		generic_done: {
			title: 'Adding device!',
		},
	},
	deviceClasses: {
		generic_remote: {
			views: {
				generic_imitate: {
					title: 'Identify your remote',
					body: 'Click a button on your remote to pair it.',
				},
			},
		},
		generic_wall_switch: {
			views: {
				generic_imitate: {
					title: 'Identify your wall switch',
					body: 'Press a random button on your wall switch to pair it.',
				},
				generic_test_remote: {
					title: 'Test your wall switch',
					body: 'Press a random button on your wall switch or click the buttons in the image above to test the signal. Press next to continue.',
				},
			},
		},
		generic_switch: {
			views: {
				generic_choice: {
					title: 'Copy signal from remote or pair device with Homey',
					body: 'Choose if you want to copy an existing signal from a paired remote or if you want to generate a new signal to pair this device.',
					buttons: {
						generic_imitate: 'Copy a paired remote',
						generic_program: 'Generate a new signal',
					},
				},
			},
		},
		generic_codewheel_switch: {
			views: {
				generic_choice: {
					body: 'Choose if you want to copy an existing signal from a paired remote or if you want manually set the codewheels to pair this device.',
					buttons: {
						generic_codewheel: 'Manually set codewheels',
					},
				},
			},
		},
		generic_dipswitch_socket: {
			views: {
				generic_info: {
					title: 'Locate the dipswitches on your socket',
					body: 'Locate the dipswitches on your socket like displayed above, then click next.',
				},
				generic_choice: {
					title: 'Copy signal from remote or set the dipswitches manually',
					body: 'Choose if you want to copy an existing signal from a paired remote or if you want to set the dipswitches of the socket manually.',
					buttons: {
						generic_imitate: 'Copy a paired remote',
						generic_dipswitch: 'Set the dipswitches',
					},
				},
			},
		},
		generic_socket: {
			views: {
				generic_program: {
					title: 'Put the socket in pairing mode',
					body: 'Press the program button on your socket to put it in pairing mode, then click next.',
				},
				generic_imitate: {
					title: 'Copy your remote signal',
					body: 'Press the button that is paired to your socket.',
				},
				generic_test_switch: {
					title: 'Test your socket',
					body: 'Use the switch above to test your socket. Press next to continue.',
				},
				generic_test_switch_2: {
					body: 'Use your remote or the switch above to test your socket. Press next to continue.',
				},
			},
		},
	},
	'433_generator': {
		generic: {
			on: 'On',
			off: 'Off',
			left: 'Left',
			middle: 'Middle',
			right: 'Right',
			up: 'Up',
			down: 'Down',
			button_pressed: 'Button is pressed',
			buttons: {
				1: 'Button 1',
				2: 'Button 2',
				3: 'Button 3',
				4: 'Button 4',
				5: 'Button 5',
				A: 'Button A',
				B: 'Button B',
				C: 'Button C',
				D: 'Button D',
				E: 'Button E',
				G: 'Group Button',
				all: 'All Button',
				bright: 'Bright Button',
				dim: 'Dim Button',
				left: 'Left Button',
				middle: 'Middle Button',
				right: 'Right Button',
			},
			channels: {
				I: 'Channel I',
				II: 'Channel II',
				III: 'Channel III',
				IV: 'Channel IV',
				V: 'Channel V',
				1: 'Channel 1',
				2: 'Channel 2',
				3: 'Channel 3',
				4: 'Channel 4',
				5: 'Channel 5',
				A: 'Channel A',
				B: 'Channel B',
				C: 'Channel C',
				D: 'Channel D',
				E: 'Channel E',
			},
		},
		error: {
			device_exists: 'This device is already paired with Homey.',
			no_device: 'No device set to pair. Please close the pairing wizard and try again.',
			no_settings: 'No settings object. Please try again.',
			invalid_device: 'The device that was created is invalid. Please try again.',
		},
	},
};
