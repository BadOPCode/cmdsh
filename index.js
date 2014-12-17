#!/usr/bin/env node
'use strict';

var	main_prompt = require("prompt")
,	argv = require('minimist')(process.argv.slice(2))
,	shell = require('shelljs')
,	shell_location = require('path').dirname(process.argv[1]);

var current_version = '1.1.0';

//GLOBAL rewrites

// add remove function to array
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
}

// add find function to array
Array.prototype.find = function(search_string) {
	var  i = this.length;
	while (i--) {

		if (typeof(this[i]) != Object && search_string === this[i]) {
			//found return index position
			return i;
		}
	}
	// not found
	return -1;
}

var home = process.env[(process.platform == 'win32') ? "USERPROFILE" : "HOME"];
var cmd = '';
var cmd_modules = [];

var mod_context = '/';
var current_module = {};
var cmd_history = [];

//prompt initializer
main_prompt.start();
main_prompt.override = argv;
main_prompt.message = "CH Command Shell";


process.stdin.on('keypress', function (ch, key) {
	//character let prompt take it
	if (typeof(key) == 'undefined') return; 

	//console.log('got "keypress"', key);
  	switch(key.name) {
  		case 'up':
//			console.log('up');
  			break;
  		case 'down':
//			console.log('down');
  			break;
  	}
});

cmd_modules.findFileByName = function(search_string) {
	var  i = this.length;
	while (i--) {
		if (search_string === this[i].name) {
			//found return index position
			return this[i].file;
		}
	}
	// not found
	return null;
}


cmd_modules.loadModuleList = function() {
	cmd_modules.length = 0;
//	console.log(shell_location);
	shell.ls(shell_location+'/cmdsh-modules/*.js').forEach(function(file) {
		var mod = require(file);
		cmd_modules.push({"name":mod.name, "file":file});
	});
	shell.ls(home+'/cmdsh-modules/*.js').forEach(function(file){
		var mod = require(file);
		cmd_modules.push({"name":mod.name, "file":file});
	});
}

cmd_modules.getNames = function() {
	var retArr = [];
	var i = this.length;
	while (i--) {
		retArr.push(this[i].name);
	}

	return retArr;
}

cmd_modules.getHelp = function(module_name) {
	var fname = cmd_modules.findFileByName(module_name);
	var tmp_mod = require(fname);
	return tmp_mod.help;
}

var setCurrentModule = function(module_name) {
	mod_context = module_name;
	current_module = require(cmd_modules.findFileByName(module_name));
}

var displayHelp = function() {
	shell.echo("\n----------------------------------------");
	shell.echo("Current Module: "+current_module.name);
	shell.echo(current_module.help);
	shell.echo("----------------------------------------");
	if (mod_context == '/') {
		cmd_modules.getNames().forEach(function(mod_name){
			shell.echo(mod_name.blue + " - " + cmd_modules.getHelp(mod_name));
		});

		return;
	}

	for (var obj in current_module) {
		if (typeof(current_module[obj]) == "object") {
			if (hasOwnProperty.call(current_module[obj], "shell_name")) {
				shell.echo(current_module[obj].shell_name.blue + " - " + current_module[obj].help);
			}
		}
	}
}

var setCurrentToRoot = function() {
	mod_context = '/';
	current_module = {};
	current_module.name = "Root";
	current_module.help = "There is no module currently selected";
}

/**
 * Searches to see if the first line is a module.
 */
var matchModules = function() {
	var mod_pos = cmd_modules.getNames().find(cmd[0]);
	if (mod_pos > -1){
		setCurrentModule(cmd[0]);
		return true;
	}

	return false;
}

/**
 * Searches for a module function specified by user and executes it.
 */
var matchFunctions = function(cmd_seq) {
	if (current_module.name == "Root") return false;  //root has no functions

	for (var obj_name in current_module) {
		var shell_func = current_module[obj_name];
		if (shell_func.shell_name == cmd[cmd_seq]) {
			if (hasOwnProperty.call(shell_func, "runScript")) { //this function is a module function
				var params = cmd.slice(cmd_seq+1);
				shell_func.runScript(params);
				return true;
			}
		}
	}

	return false;
}

var processCommand = function(input) {
//	main_prompt.pause();
	cmd_history.push(input);
	cmd = input.split(' ');
	cmd_modules.loadModuleList();

	switch(cmd[0]) { //internal shell functions
		case 'quit':
		case 'exit':
			return;
			break;
		case 'help':
		case '?':
			displayHelp();
			shell.echo();
			break;
		case '/':
			setCurrentToRoot();
			break;
		case 'version':
			shell.echo("Choice Hotel Command Shell")
			shell.echo('Version: '+current_version);
			break;
		default:
			if (matchFunctions(0) == false) { // check function in current module
				if (matchModules()) {  // match a module
					if (cmd.length > 1 && matchFunctions(1) == false){
						shell.echo("Command not found.");
					}
				} else {
					shell.echo("Command not found.");
				}
			}
			break;
	}

	if (Object.keys(argv).length == 1) {
		cmdPrompt();
	}
}

var cmdPrompt = function() {
//	main_prompt.resume();
	main_prompt.get({
		properties: {
			cmd: {
				description: mod_context.cyan
			}
		}
	}, function(err, result) {
		processCommand(result.cmd);
	});
}

setCurrentToRoot();
cmdPrompt();