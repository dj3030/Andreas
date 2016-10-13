'use strict';

const DefaultDriver = require('../../drivers/lib/driver.js');

module.exports = class Doorbell extends DefaultDriver {

	init() {
		super.init.apply(this, arguments);

		this.registerSignal();
	}

	payloadToData(payload) { // Convert received data to usable variables
		const data = {
			address: this.bitArrayToString(payload),
		};
		data.id = data.address;
		return data;
	}

	dataToPayload(data) { // Convert a data object to a bit array to be send
		if (
			data &&
			data.address
		) {
			const address = this.bitStringToBitArray(data.address);
			return address;
		}
		return null;
	}
};
