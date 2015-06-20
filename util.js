var	exec	= require('child_process').exec;
var grep	= require('grep1');
var async	= require('async');

/**
 * The callback for getProcesses
 * @callback getProcessesCallback
 * @param {?(Error)} err - The error, if any
 * @param {Array.<Object>} procs - An array of the processes running in the machine
 */

/**
 * Runs ps and runs the callback with the result already parsed
 * @param {getProcessesCallback} done The callback to run when done. The first arguments is an error or null, the second is the result
 */
var getProcesses = function (done) {
	exec('ps -Ao "user pid ppid %cpu %mem vsz rss tty stat start time comm"', function (err, stdout, stderr) {
		if ( err) {
			err.msg = stderr;
			return done(err);
		}

		var s		= stdout.split('\n');
		var procs	= [];

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
 * The callback for getParentsPID
 * @callback getParentsPIDCallback
 * @param {?(Error)} err - The error, if any
 * @param {Array.<string>} parents - The parents PID as a string
 */

/**
 * Returns the parents of the current process
 * @param {getParentsPIDCallback} done The callback
 */
getParentsPID = function (done) {
	getProcesses( function (err, results) {
		if ( err ) {
			return done(err);
		}

		var pid = process.pid;
		var parents = [];
		var loop = true;
		var me, last, i;

		//Find us
		//Reverse for optimization and splicing
		for ( i = results.length - 1; i >= 0; i--) {
			if ( pid.toString() === results[i].PID.toString() ) {
				me = results.splice(i, 1);
				break;
			}
		}

		last = me[0];

		//Find all parent, till the root
		while (loop) {

			//A safer way would be to find out the root process and also check that
			if ( "1" === last.PID.toString() ) {
				loop = false;
			}

			//Reverse for optimization and splicing
			for ( i = results.length - 1; i >= 0; i--) {
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
 * The callback for getUsersRunning
 * @callback getUsersRunningCallback
 * @param {?(Error)} err - The error, if any
 * @param {Array.<Object>} users - The users running processes and their info
 */

/**
 * Returns all the users running processes and their info
 * @param {getUsersRunningCallback}
 */
getUsersRunning = function (done) {
	getProcesses( function (err, procs) {
		if ( err ) {
			return done(err);
		}

		/**
		 * @type {object.<string, object>}
		 * An object with uid as keys and an object as value.
		 */
		var usersXprocess = {};

		/**
		 * @type {array.<object>}
		 * Array of the user info as object
		 */
		var users = [];

		procs.forEach(function (p) {
			var user = p.USER;

			if ( !usersXprocess[user] ) {
				usersXprocess[user] = {
					NAME: user,
					RUNNING: 0
				};
			}

			usersXprocess[user].RUNNING++;
		});


		//For some reason using grep with exec generates and error everytime no matter what
		//So we check no only for error, but for stderr to check if there is actually a problem
		async.each(Object.keys(usersXprocess), function (user, done) {
			async.series([
				function (done) {
					exec("egrep ^" + user + ": /etc/passwd", function (err, passwd, stderr) {
						if ( err && stderr) {
							err.msg = stderr;
							return done(err);
						}

						passwd = passwd.split(':');

						usersXprocess[user].UID		=  passwd[2];
						usersXprocess[user].GID		=  passwd[3];
						usersXprocess[user].HOME	=  passwd[5];
						usersXprocess[user].SHELL	=  passwd[6];
						done();
					});
				},
				function (done) {
					exec("egrep " + user + " /etc/group", function (err, groups, stderr) {
						if ( err && stderr ) {
							err.msg = stderr;
							return done(err);
						}

						var userGroups = [];
						groups.split('\n').forEach(function (group) {

							group = group.split(':');
							//Stop if no group line
							if ( 1 === group.length ) {
								return;
							}

							userGroups.push({
								NAME: group[0],
								GID: group[2]
							})
						});

						usersXprocess[user].GROUP = userGroups;

						done();
					});
				}
			], done);
		}, function (err) {
			if ( err ) {
				return done(err);
			}

			Object.keys(usersXprocess).forEach(function (key) {
				users.push(usersXprocess[key]);
			});

			done(null, users);
		});
	});
};


exports.getProcesses = getProcesses;
exports.getParentsPID = getParentsPID;
exports.getUsersRunning = getUsersRunning;
