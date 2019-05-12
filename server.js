/* Include the required static file webserver library */
var static = require('node-static');

/* Include the required http web serer library e.g. receives request from internet */
var http = require ('http');

/* Assume that we are arunning on Heroku b/c need logic stating whether we are running this from local or from server */
var port = process.env.PORT;
var directory = __dirname + '/public';

/* If we're not on Heroku then adjust port and directory info b/c we're local */
if(typeof port == 'underfined' || !port) { 
	directory = './public';
	port = 8080;
}

/* Set up a static web-server that will deliver files from the filesystem */
var file = new static.Server(directory);

/* Construct an http server that gets files from the file server */
var app = http.createServer (
	function(request,response){
		request.addListener('end',
			function(){
				file.serve(request,response);
			}
		).resume();
	}
	).listen(port);

console.log('The server is running');