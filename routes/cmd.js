
/*
 * GET home page.
 */
var	exec = require('child_process').exec;

exports.list = function (req, res) {
	exec('ps faxu', function (err, stdout, stderr) {
		if ( err || stderr ) { return res.json(500, { status: 500, err: err || stderr }); }	

		var s		= stdout.split('\n'),
			result	= [];

		for (var i = 1; i < s.length; i++) {
			//For some reason it doen't use tab to separate (\t) it uses spaces, so we split by spaces
			var line = s[i].split(/[ ]+/);

			result.push({
				user: line[0],
				pid: line[1],
				CPU: line[2],
				MEM: line[3],
				COMMAND: line[10]
			});
		};

		res.json(result);
	});
};
