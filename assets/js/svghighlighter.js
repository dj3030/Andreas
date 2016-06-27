/* eslint-disable */
jQuery(function ($) {
	if ($.fn.highlight) return;

	$.expr[':'].hasAttr = $.expr.createPseudo(function (regex) {
		var re = new RegExp(regex);
		return function (obj) {
			var attrs = obj.attributes;
			for (var i = 0; i < attrs.length; i++) {
				if (re.test(attrs[i].nodeName)) return true;
			}
			return false;
		};
	});

	$.fn.highlight = function (device, frame) {
		var svg = this;
		if (!svg.is('svg')) {
			svg = this.find('svg').first();
		}
		if (!svg) {
			throw new Error('Could not find svg in given selector');
		}
		if(svg.data('highlight-inited')){
			console.log('already inited');
			return;
		}
		svg.data('highlight-inited', true);
		console.log(svg, svg.data('highlight-inited'));

		Homey.on('frame', function (data) {
			console.log('GOT FRAME', data, device);
			if (device && device.data && device.data.id && device.data.id !== data.id) {
				return;
			}
			setState(svg, data);
		});

		if (frame) {
			setState(svg, frame);
		} else {
			setState(svg, { initial: 'true' });
		}

		console.log('SET CLICK HANDLERS');
		setClickHandlers(svg);
	};

	var onClickRegex = new RegExp('^onclick:(.*)$');
	function setClickHandlers(svg) {
		svg.find('*').add(svg).each(function () {
			var elem = $(this);
			var attrs = getAttributes(this);
			attrs.forEach(function (attribute) {
				var onClickEvent = onClickRegex.exec(attribute.nodeName);
				if (onClickEvent) {
					var data = elem.attr(onClickEvent[0]);
					console.log('DATA', data);
					data = data ? JSON.parse(data) : {};
					console.log('registering', onClickEvent, data, elem);
					elem.on('click', function () {
						console.log('firing', onClickEvent, data);
						Homey.emit(onClickEvent[1], data);
					});
				}
			});
		});
	}

	var animationRegex = new RegExp('^animation:(.*)$');

	function setState(svg, state) {
		console.log('STATE', state);
		setAttributeForState(svg, state, 'show', 'class', 'show', 'hide');
		setAttributeForState(svg, state, 'hide', 'class', 'hide', 'show');
		setAttributeForState(svg, state, 'pulse', 'class', 'pulse', 'stop-animation');
		svg.find('*').add(svg).each(function () {
			var rootElem = $(this);
			var attrs = getAttributes(this);
			attrs.forEach(function (attribute) {
				var animationClass = animationRegex.exec(attribute.nodeName);
				if (animationClass) {
					setAttributeForState(
						rootElem,
						state,
						animationClass[1],
						'class',
						animationClass[1],
						rootElem.attr(animationClass[0])
					);
				}
			});
		});
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

	function getAttributes(element) {
		var attributes = element.attributes;
		var result = [];
		// iterate backwards ensuring that length is an UInt32
		for (var i = attributes.length >>> 0; i--;) {
			result[i] = attributes[i];
		}
		return result;
	}
});