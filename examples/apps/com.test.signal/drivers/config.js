'use strict';
/* eslint-disable */
module.exports = {
	devices: {
		test_device: {
			signal: '0a6a31f2d9f0bdee0ae814b12a399f83',
			images: {},
			pair: {
				viewOrder: ['test'],
				views: [{
					template: '../433_generator/views/test.html',
					options: {
						body: 'Click a button to display the signal data',
						next: false,
						previous: false,
						prepend: '',
						append: ''
					},
					prepend: [],
					append: [],
					id: 'test'
				}]
			},
			id: 'test_device',
			driver: '../433_generator/drivers/driver.js',
			class: 'other',
			capabilities: [],
			name: 'test'
		}
	}
};
