'use strict';
/* eslint "max-len": 0 */

module.exports = {
	views: {
		generic_choice: {
			title: 'Kies een van de volgende opties',
			body: 'Klik op een van de opties om verder te gaan.',
			buttons: {
				copy: 'Kopieer afstandsbediening',
				generate: 'Genereer signaal',
			},
		},
		generic_imitate: {
			title: 'Kopieer het signaal van je afstandsbediening',
			body: 'Druk op de knop op je afstandsbediening waarop je apparaat geprogrammeerd is.',
		},
		generic_program: {
			title: 'Programmeer je apparaat met Homey',
			body: 'Zet je apparaat in programmeer modus en klik op volgende om je apparaat met Homey te verbinden.',
		},
		generic_codewheel: {
			title: 'Configureer de apparaatcode',
			body: 'Klik op de karakters op de bovenstaande lettercodeshijf of pas de lettercodeshijf op je apparaat aan zodat deze gelijk aan elkaar zijn, klik daarna op volgende.',
		},
		generic_dipswitch: {
			title: 'Stel de dipswitches van je apparaat in',
			body: 'Klik op de bovenstaande dipswitches om ze gelijk aan de dipswitches van je apparaat in te stellen, klik daarna op volgende.',
		},
		generic_test_button: {
			title: 'Test je apparaat',
			body: 'Gebruik de bovenstaande knop om je apparaat te testen. Klik op volgende om verder te gaan.',
		},
		generic_test_button_2: {
			body: 'Gebruik je afstandsbediening of te bovenstaande knop om je apparaat te testen. Klik op volgende om verder te gaan.',
		},
		generic_test_switch: {
			title: 'Test je apparaat',
			body: 'Gebruik te bovenstaande switch om je apparaat te testen. Klik op volgende om verder te gaan.',
		},
		generic_test_switch_2: {
			body: 'Gebruik je afstandsbediening of de bovenstaande switch om je apparaat te testen. Klik op volgende om verder te gaan.',
		},
		generic_test_remote: {
			title: 'Test je apparaat',
			body: 'Druk op een willekeurige knop op je afstandsbediening of op de knoppen in het bovenstaande plaatje om het signaal te testen. Klik op volgende om verder te gaan.',
		},
		generic_done: {
			title: 'Apparaat wordt toegevoegd!',
		},
	},
	deviceClasses: {
		generic_remote: {
			views: {
				generic_imitate: {
					title: 'Identificeer je afstandsbediening',
					body: 'Klik op een willekeurige knop op je afstandsbediening om hem te koppelen.',
				},
			},
		},
		generic_wall_switch: {
			views: {
				generic_imitate: {
					title: 'Identificeer je wandschakelaar',
					body: 'Klik op een willekeurige knop op je wandschakelaar om hem te koppelen.',
				},
				generic_test_remote: {
					title: 'Test je wandschakelaar',
					body: 'Druk op een willekeurige knop op je wandschakelaar of op de knoppen in het bovenstaande plaatje om het signaal te testen. Klik op volgende om verder te gaan',
				},
			},
		},
		generic_switch: {
			views: {
				generic_choice: {
					title: 'Kopieer je afstandsbediening of programmeer met Homey',
					body: 'Kies of je het signaal van een gekoppelde afstandsbediening wil kopiëren of dat je het apparaat wil programmeren met een nieuw signaal van Homey.',
					buttons: {
						generic_imitate: 'Kopieer je afstandsbediening',
						generic_program: 'Genereer een nieuw signaal',
					},
				},
			},
		},
		generic_codewheel_switch: {
			views: {
				generic_choice: {
					body: 'Kies of je het signaal van een gekoppelde afstandsbediening wil kopiëren of dat je handmatig de lettercodeshijf wil instellen.',
					buttons: {
						generic_codewheel: 'Handmatig lettercodeshijf instellen',
					},
				},
			},
		},
		generic_dipswitch_socket: {
			views: {
				generic_info: {
					title: 'Vind de dipswitches op je contactdoos',
					body: 'Vind de dipswitches op je contactdoos zoals hierboven aangegeven, klik daarna op volgende.',
				},
				generic_choice: {
					title: 'Kopieer je afstandsbediening of stel de dipswitches handmatig in',
					body: 'Kies of je het signaal van een gekoppelde afstandsbediening wil kopiëren of dat je de dipswitches handmatig wil instellen.',
					buttons: {
						generic_imitate: 'Kopieer je afstandsbediening',
						generic_dipswitch: 'Stel de dipswitches in',
					},
				},
			},
		},
		generic_socket: {
			views: {
				generic_program: {
					title: 'Zet de contactdoos in programmeer modus',
					body: 'Houd de programmeer knop van je contactdoos een paar seconden ingehouden om hem in programeer modus te zetten. Klik daarna op volgende.',
				},
				generic_imitate: {
					title: 'Kopieer het signaal van je afstandsbediening',
					body: 'Druk op de knop van de afstandsbediening waarmee het apparaat gekoppeld is.',
				},
				generic_test_switch: {
					title: 'Test je contactdoos',
					body: 'Gebruik de bovenstaande knop om je contactdoos te testen. Klik op volgende om verder te gaan.',
				},
				generic_test_switch_2: {
					body: 'Gebruik je afstandsbediening of de bovenstaande knop om je contactdoos te testen. Klik op volgende om verder te gaan.',
				},
			},
		},
	},
	'433_generator': {
		generic: {
			on: 'Aan',
			off: 'Uit',
			left: 'Links',
			middle: 'Midden',
			right: 'Rechts',
			up: 'Up',
			down: 'Down',
			button_pressed: 'Knop is ingedrukt',
			buttons: {
				1: 'Knop 1',
				2: 'Knop 2',
				3: 'Knop 3',
				4: 'Knop 4',
				5: 'Knop 5',
				6: 'Knop 6',
				7: 'Knop 7',
				8: 'Knop 8',
				9: 'Knop 9',
				10: 'Knop 10',
				11: 'Knop 11',
				12: 'Knop 12',
				13: 'Knop 13',
				14: 'Knop 14',
				15: 'Knop 15',
				16: 'Knop 16',
				A: 'Knop A',
				B: 'Knop B',
				C: 'Knop C',
				D: 'Knop D',
				E: 'Knop E',
				F: 'Knop F',
				G: 'Groep Knop',
				all: 'All Knop',
				bright: 'Fel Knop',
				dim: 'Gedimt Knop',
				left: 'Linker Knop',
				middle: 'Middelste Knop',
				right: 'Rechter Knop',
			},
			channels: {
				I: 'Kanaal I',
				II: 'Kanaal II',
				III: 'Kanaal III',
				IV: 'Kanaal IV',
				V: 'Kanaal V',
				1: 'Kanaal 1',
				2: 'Kanaal 2',
				3: 'Kanaal 3',
				4: 'Kanaal 4',
				5: 'Kanaal 5',
				A: 'Kanaal A',
				B: 'Kanaal B',
				C: 'Kanaal C',
				D: 'Kanaal D',
				E: 'Kanaal E',
				F: 'Kanaal F',
			},
			units: {
				1: 'Unit 1',
				2: 'Unit 2',
				3: 'Unit 3',
				4: 'Unit 4',
				5: 'Unit 5',
				6: 'Unit 6',
				7: 'Unit 7',
				8: 'Unit 8',
				9: 'Unit 9',
				10: 'Unit 10',
				11: 'Unit 11',
				12: 'Unit 12',
				13: 'Unit 13',
				14: 'Unit 14',
				15: 'Unit 15',
				16: 'Unit 16',
			},
		},
		error: {
			device_exists: 'Apparaat is al gekoppeld met Homey.',
			no_device: 'Er is geen apparaat ingesteld. Sluit de pairing wizard en probeer opnieuw.',
			no_settings: 'Geen instelling object. Probeer aub opnieuw.',
			invalid_device: 'Het apparaat dat is aangemaakt is incorrect. Verwijder dit apparaat en probeer opnieuw.',
			cannot_register_signal: 'Signaal kon niet geregistreerd worden. Reset Homey aub door de stroom voor 10 seconden te onderbreken en probeer vervolgens opnieuw.',
		},
	},
};
