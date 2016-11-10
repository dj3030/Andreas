'use strict';
/* eslint global-require: 0 */

const util = require('util');
const path = require('path');
const fse = require('fs-extra');
const traverse = require('traverse');
const isValidPath = require('is-valid-path');
const ConfigParser = require('./configParser');
const beautify = require('js-beautify').js_beautify;

const CONFIG_FILE = 'config.js';
const DRIVER_DIR = 'drivers';
const BEAUTIFY_OPTS = { indent_size: 1, indent_with_tabs: true };
const PATH_SEP_REG = new RegExp(path.sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

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

		this.readConfig(path.join(this.moduleDir, 'lib/defaultConfig'), './lib', path.join(this.moduleDir, 'lib'));
	}

	generate() {
		this.copyAssets();
		this.readConfig(path.join(this.configDir, CONFIG_FILE));
		this.writeConfig(path.join(this.driverDir, 'config.js'));
		this.generateFiles();
	}

	copyAssets() {
		const libPath = path.join(this.driverDir, 'lib');
		const assetsPath = path.join(this.root, 'assets/433_generator');
		fse.ensureDirSync(this.driverDir);
		fse.emptyDirSync(libPath);
		fse.emptyDirSync(assetsPath);
		fse.copySync(path.join(this.moduleDir, 'lib'), libPath);
		fse.copySync(path.join(this.moduleDir, 'assets'), assetsPath);
	}

	readConfig(configPath, relativePath) {
		const config = require(configPath);
		relativePath = relativePath || path.relative(path.join(this.root, DRIVER_DIR), path.dirname(configPath));

		this.configParser.addConfig(config, relativePath, path.dirname(configPath));
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

		this.configParser.setLocales();
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
			fse.emptyDirSync(assetsPath);
			fse.emptyDirSync(pairPath);

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
					view.append = (view.append || []).concat(view.options.append || []);
					view.prepend = (view.prepend || []).concat(view.options.prepend || []);
					traverse(view.options).forEach(function nextItem(item) {
						if (
							typeof item === 'string' &&	(item.indexOf('./') === 0 || item.indexOf('../') === 0) && isValidPath(item)
						) {
							const extname = path.extname(item);
							if (extname === '.js' || extname === '.json' || extname === '') {
								this.update(require(path.join(driverPath, item)));
							} else {
								this.update(String(fse.readFileSync(path.join(driverPath, item))));
							}
						}
					});
					const viewOptions = Object.assign({}, view, view.options);
					delete viewOptions.options;
					delete viewOptions.append;
					delete viewOptions.prepend;
					const viewTypeReg = /html|css|js$/;
					const template = ['prepend', 'template', 'append'].reduce(
						(prev, templateType) => {
							if (!view[templateType]) {
								return prev;
							} else if (!Array.isArray(view[templateType])) {
								view[templateType] = [view[templateType]];
							}
							view[templateType].forEach(currView => {
								if (typeof currView === 'string') {
									const type = viewTypeReg.exec(currView);
									if (type && type[0] === 'css') {
										currView = { styles: [currView] };
									} else if (type && type[0] === 'js') {
										currView = { scripts: [currView] };
									} else {
										currView = { html: [currView] };
									}
								}
								if (currView.html) {
									currView.html = Array.isArray(currView.html) ? currView.html : [currView.html];
									currView.html.forEach(html => {
										if ((html.indexOf('./') === 0 || html.indexOf('../') === 0) && isValidPath(html)) {
											prev += `\n\n${fse.readFileSync(path.join(driverPath, html))}`;
										} else {
											prev += `\n\n${html}`;
										}
									});
								}
								if (currView.styles) {
									currView.styles = Array.isArray(currView.styles) ? currView.styles : [currView.styles];
									currView.styles.forEach(style => {
										if (isValidPath(style)) {
											prev += `\n\n<link href="${
												path.join('../', style).replace(PATH_SEP_REG, '/')
												}" rel="stylesheet" type="text/css"/>`;
										} else {
											prev += `\n\n<style>\n${style}\n</style>`;
										}
									});
								}
								if (currView.scripts) {
									currView.scripts = Array.isArray(currView.scripts) ? currView.scripts : [currView.scripts];
									currView.scripts.forEach(script => {
										if (isValidPath(script)) {
											prev += `\n\n<script src="${
												path.join('../', script).replace(PATH_SEP_REG, '/')
												}" type="text/javascript"></script>`;
										} else {
											prev += `\n\n<script>\n${script}\n</script>`;
										}
									});
								}
							});
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
