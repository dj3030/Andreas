'use strict';

module.exports = {
	views: {
		test: {
			template: './views/test.html',
			options: {
				body: {
					default: 'Click a button to display the signal data',
					required: false,
				},
				next: false,
				previous: false,
			},
		},
	},
	deviceClasses: {
		test_signal: {
			signal: {
				sof: [275, 2640], // Start of frame
				eof: [275], // End of frame
				words: [
					[250, 275, 250, 1250], // 0
					[250, 1250, 250, 275], // 1
				],
				interval: 10000, // Time between two subsequent signals
				sensitivity: 0.9, // between 0.0 and 2.0
				repetitions: 20,
				minimalLength: 32,
				maximalLength: 36,
			},
		},
		empty_device: {
			driver: './drivers/driver.js',
			class: 'other',
			capabilities: [],
			pair: {
				viewOrder: ['test'],
			},
		},
	},
	devices: {
		test_device: {
			name: 'test',
			extends: ['test_signal', 'empty_device'],
		},
	},
};
