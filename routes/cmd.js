
/*
 * Routes.
 */
var	exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	config = require( __dirname + '/../config');

/**
 * Runs ps and runs the callback with the result already parsed
 * @param {Function} done The callback to run when done. The first arguments is an error or null, the second is the result
 */
var getProcess = function (done) {
	exec('ps -Ao "user pid ppid %cpu %mem vsz rss tty stat start time comm"', function (err, stdout, stderr) {
		if ( err || stderr ) { return done(err || stderr); }

		var s		= stdout.split('\n'),
			procs	= [];

		for (var i = 1; i < s.length; i++) {
			//For some reason it doen't use tab to separate (\t) it uses spaces, so we split by spaces
			var line = s[i].split(/[ ]+/);

			if ( !line[0] ) { continue; }

			procs.push({
				USER: line[0],
				PID: line[1],
				PPID: line[2],
				CPU: line[3],
				MEM: line[4],
				VSZ: line[5],
				RSS: line[6],
				TTY: line[7],
				STAT: line[8],
				START: line[9],
				TIME: line[10],
				COMMAND: line[11]
			});
		};

		done(null, procs);
	});
};

/**
 * Return the result of ps parsed as json
 * @method GET
 * @route /list
 */
exports.list = function (req, res) {
	getProcess( function (err, result) {
		if ( err ) { return res.json(500, { status: 500, err: err }); }
		res.json(result);
	});
};

getParents = function (done) {
	getProcess( function (err, results) {
		if ( err ) { done(err); }

		var pid = process.pid,
			parents = [],
			loop = true,
			me, last;

		//Reverse for optimization and splicing
		for ( var i=results.length - 1; i >= 0; i--) {
			if ( pid.toString() === results[i].PID.toString() ) {
				me = results.splice(i, 1);
				break;
			}
		}

		last = me[0];

		while (loop) {
			//A safer way would be to find out the root process and also check that
			if ( last.PID.toString() === "1" ) { loop = false; }

			//Reverse for optimization and splicing
			for ( var i=results.length - 1; i >= 0; i--) {
				if ( last.PPID.toString() === results[i].PID.toString() ) {
				 	last = results.splice(i, 1)[0];
					parents.push(last.PID.toString());
					break;
				}
			}
		}

		done(null, parents);
	});
};

/**
 * Kill the process with process id equal to pid
 * @method POST
 * @route /kill
 * @param {Integer} pid The pid of the process
 */
exports.kill = function (req, res) {
	var pid = req.body.pid;

	//If there is nos PID argument or is 0 we return this error
	if ( !pid ) { return res.json(400, { status: 400, err: 'No pid'}); }

	/**
	 * We get the parents of the process. This way we avoid a lot of security issues, since the root process is a parent.
	 * Also since servers rarely run the process directly, the parent should also be excluded
	*/
	getParents( function (err, parents) {
		if ( err ) { return res.json(500, { status: 500, err: err }); }

		console.log(parents);

		if ( pid === process.pid || parents.indexOf(pid.toString()) > -1 ) { return res.json(400, { status: 400, err:'Can\'t kill self nor parent' }); }

		try {
			process.kill(pid);
			return res.json(200, { status: 200, ok: 1});
		} catch (e) {
			return res.json(500, { status: 500, err: e ? e.toString() : 'Couldn\'t kill process with pid: ' + pid} );
		}
	});
};

/**
 * Runs renice on the pid
 * @method POST
 * @route /renice
 * @param {Integer} pid The pid of the process
 * @param {Integer|String} incremente The amount to pass to renice
 */
exports.renice = function (req, res) {
	var pid = req.body.pid,
		increment = req.body.increment;

	if  ( !pid || !increment ) { res.json(400, { status: 400, err: 'No pid and/or increment'}); }

	exec('renice ' + pid + ' ' + increment, function (err, stdout, stderr) {
		if ( err || stderr ) { return res.json(500, { status: 500, err: stderr || err }); }
		return res.json(200, { status: 200, ok: 1 });
	});
};

/**
 * Runs a command
 * @method POST
 * @route /run
 * @param {String} cmd The command to run
 */
exports.run = function (req, res) {
	var cmd = req.body.cmd;

	if ( !cmd ) { return res.json(400, { status: 400, err: 'No command'}); }

	var ignore = config.run.ignore,
		run = true;

	ignore.forEach( function (i) {
		var r = new RegExp(i, 'i');

		if ( r.test(cmd) ) {
			run = false;
		}
	});

	if ( !run ) { return res.json(400, { status: 400, err: 'Command ignored'}); }

	var child = spawn(cmd);

	res.json(200, { status: 200, ok: 1, pid: child.pid });
};
