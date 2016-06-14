/* eslint-disable */
jQuery(function ($) {
	if ($.fn.highlight) return;

	$.fn.highlight = function (device) {
		var svg = this;
		if (!svg.is('svg')) {
			svg = this.find('svg').first();
		}
		if (!svg) {
			throw new Error('Could not find svg in given selector');
		}

		Homey.on('frame', function(data){
			if(device && device.data && device.data.id && device.data.id !== data.id){
				return;
			}
			setState(svg, data);
		});

		setState(svg, { initial: 'true' });
	};

	function setState(svg, state) {
		setAttributeForState(svg, state, 'show', 'class', 'show', 'hide');
		setAttributeForState(svg, state, 'hide', 'class', 'hide', 'show');
		setAttributeForState(svg, state, 'pulse', 'class', 'pulse', 'stop-animation');
	}

	function setAttributeForState(svg, state, prefix, attr, value, notValue) {
		var elems = Object.keys(state).reduce(function (elements, curr) {
			if (elements) {
				return elements.add(svg.find('[' + prefix + '\\:' + curr + ']'));
			}
			return svg.find('[' + prefix + '\\:' + curr + ']');
		}, undefined);
		elems.each(function () {
			var $elem = $(this);
			var attrValue = ($elem.attr(attr) || '').replace(value, '').replace(notValue, '').trim();
			if (
				Object.keys(state).reduce(function (prevResult, curr) {
					return prevResult &&
						(
							!$elem.is('[' + prefix + '\\:' + curr + ']') ||
							new RegExp('^' + $elem.attr(prefix + ':' + curr) + '$').test(String(state[curr]))
						);
				}, true)
			) {
				$elem.attr(attr, attrValue + ' ' + value);
			} else if (notValue !== '') {
				$elem.attr(attr, attrValue + ' ' + notValue);
			}
		});
	}
});