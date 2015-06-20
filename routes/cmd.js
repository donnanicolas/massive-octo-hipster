
/*
 * Routes.
 */
var	exec	= require('child_process').exec;
var spawn	= require('child_process').spawn;
var async	= require('async');
var config	= require( __dirname + '/../config');
var util	= require( __dirname + '/../util');

/**
 * Return the result of ps parsed as json
 * @method GET
 * @route /list
 */
exports.list = function (req, res) {
	util.getProcesses( function (err, result) {
		if ( err ) {
			return res.json(500, { status: 500, err: err });
		}
		res.json(result);
	});
};


/**
 * Return the result of ps parsed as json
 * @method GET
 * @route /list
 */
exports.users = function (req, res) {
	util.getUsersRunning( function (err, result) {
		if ( err ) {
			return res.json(500, { status: 500, err: err });
		}
		res.json(result);
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
	if ( !pid ) {
		return res.json(400, { status: 400, err: 'No PID'});
	}

	if ( 0 === pid ) {
		return res.json(400, { status: 400, err: 'Bad PID'})
	}

	//If it's me or any parent, finish
	if ( pid === process.pid ) {
		return res.json(400, { status: 400, err:'Cannot kill self' });
	}

	async.series([
		function (done) {
			util.getProcesses(function (err, procs) {
				if ( err ) {
					return done(err);
				}

				for (var i = 0; i < procs.length; i++) {
					if ( procs[i].PID === pid ) {
						return done();
					}
				}

				done(null, 'No process with pid: ' + pid);
			});
		},
		function (done) {
			/**
			* We get the parents of the process. This way we avoid a lot of security issues.
			* The root is always parent, so we avoid killing the root
			* Also since servers rarely run the process directly, the parent should also be excluded
			*/
			util.getParentsPID( function (err, parents) {
				if ( err ) {
					return done(err);
				}

				if ( parents.indexOf(pid.toString()) > -1 ) {
					return done(null, 'Cannot kill parent');
				}
				done();
			})
		}
	], function (err, results) {
		if (err) {
			return res.json(500, { status: 500, err: err });
		}

		if ( results && 0 !== results.length ) {
			errors = [];
			for (var i = 0; i < results.length; i++) {
				if ( !results[i] ) {
					continue
				}
				errors.push(results[i]);
			}
			//We join by nothing since the errors are mutually exclusive
			return res.json(400, { status: 400, err: errors.join('') });
		}

		try {
			process.kill(pid);
			return res.json(200, {status: 200, ok: 1});
		} catch (e) {
			//The main error could be that the process could not be found.
			return res.json(500, {
				status: 500,
				err: e ? e.toString() : 'Could NOT kill process with pid: ' + pid
			});
		}
	});
};

/**
 * Runs renice on the pid. May need sudo powers
 * @method POST
 * @route /renice
 * @param {Integer} pid The pid of the process
 * @param {Integer|String} incremente The amount to pass to renice
 */
exports.renice = function (req, res) {
	var pid = req.body.pid,
		increment = req.body.increment;

	if  ( !pid || !increment ) {
		return res.json(400, { status: 400, err: 'No pid and/or increment'});
	}

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

	if ( !cmd ) {
		return res.json(400, { status: 400, err: 'No command'});
	}

	var ignore = config.run.ignore;
	var run = true;

	//Some safety
	ignore.forEach( function (i) {
		var r = new RegExp(i, 'i');

		if ( r.test(cmd) ) {
			run = false;
		}
	});

	if ( !run ) {
		return res.json(400, { status: 400, err: 'Command ignored'});
	}

	var child = spawn(cmd);
	res.json(200, { status: 200, ok: 1, pid: child.pid });
};
