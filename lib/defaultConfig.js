'use strict';

module.exports = {
	driver: './driver',
	views: {
		generic_info: {
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
				svgWidth: {
					default: '80vw',
				},
				svgHeight: {
					default: '70vh',
				},
				next: true,
				previous: true,
			},
		},
		generic_imitate: {
			extends: 'generic_test_remote',
			template: './pair/imitate.html',
			options: {
				body: {
					default: 'pair.imitate.body',
				},
				next: false,
			},
		},
		generic_dipswitch: {
			template: './pair/dipswitch.html',
			options: {
				title: {
					required: true,
				},
				body: {
					default: 'pair.dipswitch.body',
				},
				dipswitchList: {
					default: ['1', '2', '3', '4', '5', ['A', 'B', 'C', 'D', 'E']],
				},
				svgWidth: {
					default: '80vw',
				},
				svgHeight: {
					default: '70vh',
				},
				previous: true,
				next: true,
			},
		},
		generic_test_remote: {
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
				svgWidth: {
					default: '80vw',
				},
				svgHeight: {
					default: '70vh',
				},
				initWithDeviceData: {
					default: false,
				},
				previous: true,
				next: true,
			},
		},
		generic_program: {
			extends: 'generic_test_remote',
			template: './pair/program.html',
			options: {
				body: {
					default: 'pair.program.body',
				},
			},
		},
		generic_test_switch: {
			extends: 'generic_test_remote',
			template: './pair/test_switch.html',
			options: {
				svg: {
					default: '../../assets/433_generator/images/light.svg',
				},
				body: {
					default: 'pair.test_switch.body',
				},
				sendToggleOnInit: {
					default: true,
				},
			},
		},
		generic_test_button: {
			extends: 'generic_test_switch',
			template: './pair/test_button.html',
			options: {
				title: {
					default: 'test_button',
				},
				body: {
					default: 'pair.test_button.body',
				},
				buttonLabel: {
					default: 'test',
				},
			},
		},
		generic_test_button_2: {
			extends: 'generic_test_button',
		},
		generic_test_switch_2: {
			extends: 'generic_test_switch',
		},
		generic_done: {
			template: './pair/done.html',
			options: {
				title: {
					required: true,
				},
			},
		},
		generic_choice: {
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
				svgWidth: {
					default: '80vw',
				},
				svgHeight: {
					default: '65vh',
				},
			},
		},
		generic_choose_slave: {
			template: 'choose_slave',
			options: {
				previous: true,
				next: true,
			},
		},
		generic_choose_slave_2: {
			extends: 'generic_choose_slave',
		},
	},
	deviceClasses: {
		generic_remote: {
			class: 'other',
			pair: {
				viewOrder: [
					'generic_imitate',
					'generic_test_remote',
					'generic_done',
				],
				viewOptions: {
					generic_imitate: {
						title: 'pair.begin',
					},
					generic_test_remote: {
						title: 'pair.test_remote',
					},
					generic_done: {
						title: 'done!',
					},
				},
			},
		},
		generic_switch: {
			capabilities: ['onoff'],
			pair: {
				viewOrder: [
					'generic_choice',
					'generic_imitate',
					'generic_test_switch_2',
					'generic_program',
					'generic_test_switch',
					'generic_done',
				],
				viewOptions: {
					generic_choice: {
						title: 'pair.begin',
						buttons: [
							{ name: 'pair.copy_remote', view: 'generic_imitate' },
							{ name: 'pair.create_signal', view: 'generic_program' },
						],
					},
					generic_imitate: {
						title: 'pair.begin',
					},
					generic_test_switch_2: {
						title: 'pair.test_remote',
						next: 'generic_done',
						initWithDeviceData: true,
						sendToggleOnInit: false,
					},
					generic_program: {
						title: 'pair.begin',
						previous: 'generic_choice',
					},
					generic_test_switch: {
						title: 'pair.test_remote',
					},
					generic_done: {
						title: 'done!',
					},
				},
			},
		},
		generic_toggle: {
			extends: 'generic_switch',
			capabilities: [],
			pair: {
				viewOrder: [
					'generic_choice',
					'generic_imitate',
					'generic_test_button_2',
					'generic_program',
					'generic_test_button',
					'generic_done',
				],
				viewOptions: {
					generic_program: {
						title: 'pair.begin',
						previous: 'generic_choice',
					},
					generic_test_button_2: {
						next: 'generic_done',
						initWithDeviceData: true,
						sendToggleOnInit: false,
					},
				},
			},
		},
		generic_socket: {
			extends: 'generic_switch',
			class: 'socket',
			pair: {
				viewOrder: [
					'generic_choice',
					'generic_imitate',
					'generic_test_switch_2',
					'generic_choose_slave_2',
					'generic_program',
					'generic_test_switch',
					'generic_choose_slave',
					'generic_done',
				],
				viewOptions: {
					generic_test_switch_2: {
						next: true,
					},
					generic_choose_slave_2: {
						next: 'generic_done',
					},
				},
			},
		},
		generic_dipswitch_socket: {
			extends: 'generic_switch',
			class: 'socket',
			pair: {
				viewOrder: [
					'generic_choice',
					'generic_imitate',
					'generic_test_switch_2',
					'generic_choose_slave_2',
					'generic_dipswitch',
					'generic_test_switch',
					'generic_choose_slave',
					'generic_done',
				],
				viewOptions: {
					generic_choice: {
						title: 'pair.begin',
						buttons: [
							{ name: 'pair.copy_remote', view: 'generic_imitate' },
							{ name: 'pair.set_dipswitch', view: 'generic_dipswitch' },
						],
					},
					generic_dipswitch: {
						title: 'pair.dipswitch',
					},
				},
			},
		},
		generic_sensor: {
			class: 'sensor',
			pair: {
				viewOrder: [
					'generic_imitate',
					'generic_test_remote',
					'generic_done',
				],
				viewOptions: {
					generic_imitate: {
						title: 'pair.begin',
					},
					generic_test_remote: {
						title: 'pair.test_remote',
					},
					generic_done: {
						title: 'done!',
					},
				},
			},
		},
	},
};
