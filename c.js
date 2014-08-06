var	exec = require('child_process').exec;

exec('ps -Ao "user pid ppid %cpu %mem vsz rss tty stat start time comm"', function (err, stdout, stderr) {
	var s		= stdout.split('\n'),
		result	= [];

	var line = s[1].split(/[ ]+/);
	console.log(line);

/*
	for (var i = s.length - 2; i >= 0; i--) {

	};
	*/
});
