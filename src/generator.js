'use strict';
/* eslint global-require: 0 */

const util = require('util');
const path = require('path');
const fse = require('fs-extra');
const beautify = require('js-beautify').js_beautify;
const isValidPath = require('is-valid-path');
const ConfigParser = require('./configParser');

const CONFIG_FILE = 'config.js';
const DRIVER_DIR = 'drivers';
const BEAUTIFY_OPTS = { indent_size: 1, indent_with_tabs: true };

module.exports = class Generator {

	constructor(rootPath, configPath) {
		rootPath = typeof rootPath === 'string' ? rootPath : process.cwd();
		configPath = path.join(rootPath, typeof configPath === 'string' ? configPath : '433_generator');

		if (!fse.existsSync(rootPath)) throw new Error(`${rootPath} does not exist`);
		if (!fse.lstatSync(rootPath).isDirectory()) throw new Error(`${rootPath} is not a directory`);
		if (!fse.existsSync(configPath)) throw new Error(`${configPath} does not exist`);
		if (!fse.lstatSync(configPath).isDirectory()) throw new Error(`${configPath} is not a directory`);

		this.root = rootPath;
		this.moduleDir = path.join(__dirname, '..');
		this.configDir = configPath;
		this.driverDir = path.join(rootPath, DRIVER_DIR);
		this.configParser = new ConfigParser(rootPath);

		this.readConfig(path.join(this.moduleDir, 'lib/defaultConfig'), './lib');
	}

	generate() {
		this.copyAssets();
		this.readConfig(path.join(this.configDir, CONFIG_FILE));
		this.writeConfig(path.join(this.driverDir, 'config.js'));
		this.generateFiles();
	}

	copyAssets() {
		fse.ensureDirSync(this.driverDir);
		fse.copySync(path.join(this.moduleDir, 'lib'), path.join(this.driverDir, 'lib'));
		fse.copySync(path.join(this.moduleDir, 'assets'), path.join(this.root, 'assets/433_generator'));
	}

	readConfig(configPath, relativePath) {
		const config = require(configPath);
		relativePath = relativePath || path.relative(path.join(this.root, DRIVER_DIR), path.dirname(configPath));

		this.configParser.addConfig(config, relativePath);
	}

	writeConfig(configPath) {
		fse.ensureFileSync(configPath);
		fse.outputFileSync(
			configPath,
			`'use strict';
/* eslint-disable */
module.exports = ${beautify(util.inspect(this.configParser.getDeviceConfig(), { depth: 10 }), BEAUTIFY_OPTS)};
`
		);

		const appConfigPath = path.join(this.root, 'app.json');
		const appConfig = fse.readJsonSync(appConfigPath);
		Object.assign(appConfig, this.configParser.getAppJsonConfig());
		appConfig.permissions = Array.from(new Set(appConfig.permissions || []).add('homey:wireless:433'));
		fse.writeJsonSync(appConfigPath, appConfig);
	}

	generateFiles() {
		const config = this.configParser.getDeviceConfig().devices;

		Object.keys(config).forEach(deviceId => {
			const driverPath = path.join(this.driverDir, deviceId);
			const assetsPath = path.join(driverPath, 'assets');
			const pairPath = path.join(driverPath, 'pair');
			fse.ensureDirSync(assetsPath);
			fse.ensureDirSync(pairPath);

			if (isValidPath(config[deviceId].icon)) {
				fse.copySync(path.join(this.driverDir, config[deviceId].icon), path.join(assetsPath, 'icon.svg'));
			} else {
				fse.outputFileSync(path.join(assetsPath, 'icon.svg'), config[deviceId].icon);
			}

			const driverConfig = this.configParser.prefixPath(config[deviceId], path.relative(driverPath, this.driverDir));
			fse.outputFileSync(
				path.join(driverPath, 'driver.js'),
				`'use strict';
/* eslint-disable */
const config = ${beautify(util.inspect(driverConfig, { depth: 10 }), BEAUTIFY_OPTS)};
const Driver = require(config.driver);
const driver = new Driver(config);
module.exports = Object.assign(
  {},
	driver.getExports(), 
	{ init: (devices, callback) => driver.init(module.exports, devices, callback) }
);
`
			);

			if (driverConfig.pair && driverConfig.pair.views) {
				driverConfig.pair.views.forEach(view => {
					if (!view.template) {
						throw new Error(`View ${view.id} does not have a template`);
					}
					if (view.template.indexOf('./') !== 0 && view.template.indexOf('../') !== 0) return; // default template
					view.options = view.options || {};
					view.append = view.options.append;
					view.prepend = view.options.prepend;
					Object.keys(view.options).forEach(optionName => {
						if (
							typeof view.options[optionName] === 'string' &&
							(view.options[optionName].indexOf('./') === 0 || view.options[optionName].indexOf('../') === 0) &&
							isValidPath(view.options[optionName])
						) {
							const extname = path.extname(view.options[optionName]);
							if (extname === '.js' || extname === '') {
								view.options[optionName] = require(path.join(driverPath, view.options[optionName]));
							} else {
								view.options[optionName] = String(fse.readFileSync(path.join(driverPath, view.options[optionName])));
							}
						}
					});
					const viewOptions = Object.assign({}, view, view.options);
					delete viewOptions.options;
					delete viewOptions.append;
					delete viewOptions.prepend;
					const template = ['prepend', 'template', 'append'].reduce(
						(prev, curr) => {
							if (view[curr]) {
								if ((view[curr].indexOf('./') === 0 || view[curr].indexOf('../') === 0) && isValidPath(view[curr])) {
									return `${prev ? `${prev}\n\n` : ''}${fse.readFileSync(path.join(driverPath, view[curr]))}`;
								}
								return `${prev ? `${prev}\n\n` : ''}${view[curr]}`;
							}
							return prev;
						},
						`<script>
var options = ${beautify(util.inspect(viewOptions, { depth: 10 }), BEAUTIFY_OPTS)};
Homey.setTitle(__(options.title || ''));
Homey.emit('init', options.id);
Homey.on('show_view', function(viewId){
	Homey.showView(viewId);
});
Homey.on('close', function(){
	Homey.close();
});
Homey.on('nextView', function(viewsIds){
	var viewIndex = viewsIds.indexOf(options.id) + 1;
	if(viewIndex > 0 && viewIndex < viewsIds.length){
		Homey.showView(viewsIds[viewIndex]);
	}
});
Homey.on('previousView', function(viewsIds){
	var viewIndex = viewsIds.indexOf(options.id) - 1;
	if(viewIndex >= 0){
		Homey.showView(viewsIds[viewIndex]);
	}
});
function nextView(){
	if(options.next){
		Homey.nextView();
	}else{
		Homey.emit('next');
	}
}
</script>`
					);

					fse.outputFileSync(path.join(pairPath, `${view.id}.html`), template);
				});
			}
		});
	}
};
