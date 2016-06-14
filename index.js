'use strict';

const path = require('path');
const commander = require('commander');
const Generator = require('./src/generator');

const pjson = require(path.join(__dirname, 'package.json'));

commander
	.version(pjson.version);

commander
	.command('generate [configPath] [projectPath]')
	.description('generates the config.js file from projectPath/configPath and generates driver files in projectPath')
	.action((configPath, projectPath) => new Generator(projectPath, configPath).generate());

commander.parse(process.argv);
