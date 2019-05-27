/****************************************/
/* Setup the static file server */
/* Include the required static file webserver library */
var static = require('node-static');

/* Include the required http web serer library e.g. receives request from internet */
var http = require ('http');

/* Assume that we are arunning on Heroku b/c need logic stating whether we are running this from local or from server */
var port = process.env.PORT;
var directory = __dirname + '/public';

/* If we're not on Heroku then adjust port and directory info b/c we're local */
if(typeof port == 'underfined' || !port) 
{ 
	directory = './public';
	port = 8080;
}

/* Set up a static web-server that will deliver files from the filesystem */
var file = new static.Server(directory);

/* Construct an http server that gets files from the file server */
var app = http.createServer (
	function(request,response)
	{
		request.addListener('end',
			function(){
				file.serve(request,response);
			}
		).resume();
	}
	).listen(port);

console.log('The server is running');
/****************************************/

/* Create a registry (or think of them as varabiles to store info) of socket_ids and player info. */
var players = [];


/* Setup the web socket server */

var io = require('socket.io').listen(app);

io.sockets.on('connection',function (socket) 
{
	log('Client connection by '+socket.id);

	function log()
	{
		var array =['*** Server Log Message: '];
		for(var i=0; i<arguments.length; i++)
		{
			array.push(arguments[i]);
			console.log(arguments[i]);
		}
		socket.emit('log',array);
		socket.broadcast.emit('log',array);
	}

		/* join_room command -> we expect payload of a room to join, username. 
		Our response will be the result, whether it was a success, username that joined, 
		room joined, socket_id of person that joined, number of people in room including 
		new user. If fail we'll send back failure message */
		socket.on('join_room',function(payload)
	{
		log('\'join_room\' command'+JSON.stringify(payload));
		/* check that the client sent a payload */
		if(('undefined' === typeof payload) || !payload)
		{
			var error_message = 'join_room had no payload, command aborted';
			log(error_message);
			socket.emit('join_room_response',
			{
				result: 'fail',
				message: error_message
			});
			return;
		}
		/* check that payload has a room to join */
			var room = payload.room;
			if(('undefined' === typeof room) || !room)
			{
				var error_message = 'join_room didn\'t specify a room, command aborted';
				log(error_message);
				socket.emit('join_room_response',
				{
					result: 'fail',
					message: error_message
				});
				return;
			}
		/* check that a username has been provided */ 
			var username = payload.username;
			if(('undefined' === typeof username) || !username)
			{
				var error_message = 'join_room didn\'t specify a username, command aborted';
				log(error_message);
				socket.emit('join_room_response',{
					result: 'fail',
					message: error_message
			});
			return;
		}
		/* Store information about this new player */
		players[socket.id] = {};
		players[socket.id].username = username;
		players[socket.id].room = room;

		/* actually have user join the room */
		socket.join(room); 
		/* get the room object */
		var roomObject = io.sockets.adapter.rooms[room];
		/* tell everyone in the room someone just joined */
		var numClients = roomObject.lenght;
		var success_data = 
		{
			result: 'success',
			room: room,
			username: username,
			socket_id: socket.id,
			membership: numClients
		};

		io.in(room).emit('join_room_response',success_data);

		for(var socket_in_room in roomObject.sockets)
		{ 
			var success_data = 
			{
				result: 'success',
				room: room,
				username: players[socket_in_room].username,
				socket_id: socket_in_room,
				membership: numClients	
			};
			socket.emit('join_room_response',success_data);
		}
			log('join_room success');
	});

		socket.on('disconnect',function()
		{
			log('Client disconnected '+JSON.stringify(players[socket.id]));

			if('undefined' !== typeof players[socket.id] && players[socket.id])
			{
				var username = players[socket.id].username;
				var room = players[socket.id].room;
				var payload = 
				{
					username: username,
					socket_id: socket.id,
				};
				delete players[socket.id];
				io.in(room).emit('player_disconnected',payload);
			}
		});


	/* send_message command -> we expect payload of a room to join, username of person sending message,
	the message itself. 
	Our response will be send_message_response. It'll contain the result, username of person that spoke,
	and the message. 
	If fail we'll send back failure message */
		socket.on('send_message',function(payload)
	{
		log('server received a command','send_message',payload);
		if(('undefined' === typeof payload) || !payload){
			var error_message = 'send_message had no payload, command aborted';
			log(error_message);
			socket.emit('send_message_response',{
				result: 'fail',
				message: error_message
			});
			return;
		}

			var room = payload.room;
			if(('undefined' === typeof room) || !room){
			var error_message = 'send_message didn\'t specify a room, command aborted';
			log(error_message);
			socket.emit('send_message_response',{
				result: 'fail',
				message: error_message
			});
			return;
		}

			var username = payload.username;
			if(('undefined' === typeof username) || !username){
			var error_message = 'send_message didn\'t specify a username, command aborted';
			log(error_message);
			socket.emit('send_message_response',{
				result: 'fail',
				message: error_message
			});
			return;
		}

			var message = payload.message;
			if(('undefined' === typeof message) || !message){
			var error_message = 'send_message didn\'t specify a message, command aborted';
			log(error_message);
			socket.emit('send_message_response',{
				result: 'fail',
				message: error_message
			});
			return;
		}
		
		var success_data = {
			result: 'success',
			room: room,
			username: username,
			message: message 
		};
		
		io.sockets.in(room).emit('send_message_response',success_data);
		log('Message sent to room ' +room+ 'by ' +username);
	});
});