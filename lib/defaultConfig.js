'use strict';

module.exports = {
	driver: './driver1',
	views: {
		info: {
			template: './pair/info.html',
			options: {
				title: {
					required: true,
				},
				svg: {
					required: false,
				},
				body: {
					default: 'pair.info.body',
				},
				next: true,
				previous: true,
			},
		},
		imitate: {
			extends: 'test_remote',
			template: './pair/imitate.html',
			options: {
				body: {
					default: 'pair.imitate.body',
				},
				next: false,
			},
		},
		test_remote: {
			template: './pair/test_remote.html',
			options: {
				title: {
					required: true,
				},
				svg: {
					required: true,
				},
				body: {
					default: 'pair.test.body',
				},
				previous: true,
				next: true,
			},
		},
		program: {
			extends: 'test_remote',
			template: './pair/program.html',
			options: {
				body: {
					default: 'pair.program.body',
				},
			},
		},
		test_switch: {
			template: './pair/test_switch.html',
			options: {
				title: {
					required: true,
				},
				svg: {
					default: '../../assets/433_driver/images/light.svg',
				},
				body: {
					default: 'pair.test_switch.body',
				},
				previous: true,
				next: true,
			},
		},
		test_button: {
			extends: 'test_switch',
			template: './pair/test_button.html',
			options: {
				title: {
					default: 'test_button',
				},
				body: {
					default: 'pair.test_button.body',
				},
			},
		},
		test_button_2: {
			extends: 'test_button',
		},
		test_switch_2: {
			extends: 'test_switch',
		},
		done: {
			template: './pair/done.html',
			options: {
				title: {
					required: true,
				},
			},
		},
		choice: {
			template: './pair/choice.html',
			options: {
				title: {
					required: true,
				},
				buttons: {
					default: [{ name: 'my.localized.name', view: 'otherView' }],
				},
				svg: {
					default: '<svg></svg>',
				},
				body: {
					default: 'pair.choice.body',
				},
			},
		},
		choose_slave: {
			template: 'choose_slave',
			options: {
				previous: true,
				next: true,
			},
		},
		choose_slave_2: {
			extends: 'choose_slave',
		},
	},
	deviceClasses: {
		remote: {
			class: 'other',
			pair: {
				viewOrder: ['imitate', 'test_remote', 'done'],
				viewOptions: {
					imitate: {
						title: 'pair.begin',
					},
					test_remote: {
						title: 'pair.test_remote',
					},
					done: {
						title: 'done!',
					},
				},
			},
		},
		switch: {
			capabilities: ['onoff'],
			pair: {
				viewOrder: [
					'choice',
					'program',
					'imitate',
					'test_switch_2',
					'test_switch',
					'done',
				],
				viewOptions: {
					choice: {
						title: 'pair.begin',
						buttons: [
							{ name: 'pair.copy_remote', action: 'imitate' },
							{ name: 'pair.create_signal', action: 'program' },
						],
					},
					imitate: {
						title: 'pair.begin',
						previous: 'choice',
					},
					program: {
						title: 'pair.begin',
						next: 'test_switch',
					},
					test_switch: {
						title: 'pair.test_remote',
						previous: 'program',
					},
					test_switch_2: {
						title: 'pair.test_remote',
						next: 'done',
					},
					done: {
						title: 'done!',
					},
				},
			},
		},
		toggle: {
			extends: 'switch',
			capabilities: [],
			pair: {
				viewOrder: [
					'choice',
					'program',
					'imitate',
					'test_button_2',
					'test_button',
					'done',
				],
				viewOptions: {
					program: {
						title: 'pair.begin',
						next: 'test_button',
					},
					test_button: {
						previous: 'program',
					},
					test_button_2: {
						next: 'done',
					},
				},
			},
		},
		socket: {
			extends: 'switch',
			class: 'socket',
			pair: {
				viewOrder: [
					'choice',
					'program',
					'imitate',
					'test_switch_2',
					'choose_slave_2',
					'test_switch',
					'choose_slave',
					'done',
				],
				viewOptions: {
					test_switch_2: {
						next: true,
					},
					choose_slave_2: {
						next: 'done',
					},
				},
			},
		},
	},
};
