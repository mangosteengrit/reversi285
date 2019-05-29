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
		var numClients = roomObject.length;
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

			if(room !== 'lobby')
			{
				send_game_update(socket,room,'initial update');
			}
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


	/* send_message command: we expect payload of a room to join, the message itself. 
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

			var username = players[socket.id].username;
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
		
		io.in(room).emit('send_message_response',success_data);
		/* added everything after the +username on line below on May 29 */
		log('Message sent to room ' +room+ 'by ' +username + 'success_data:'+JSON.stringify(success_data));
	});

	/* invite command -> when server receives an invite command, it'll expect payload of 
	requested user = socket_id of person to be invited, 
	Server's invite_response will be result e.g. 'success', socket_id of the person being invited.
	Invited response means server expects to receive socket_id of person to be invited.
	Otherwise fail we'll send back failure message */
		socket.on('invite',function(payload)
	{
		log('invite with '+JSON.stringify(payload));

		/* check to make sure that a payload was sent */
		if(('undefined' === typeof payload) || !payload)
		{
			var error_message = 'invite had no payload, command aborted';
			log(error_message);
			socket.emit('invite_response',
			{
				result: 'fail',
				message: error_message
			});
			return;
		}

			/* Checking that message can be traced to a username */
			var username = players[socket.id].username;
			if(('undefined' === typeof username) || !username)
			{
			var error_message = 'invite can\'t identify who sent the message';
			log(error_message);
			socket.emit('invite_response',
			{
				result: 'fail',
				message: error_message
			});
			return;
			}

			var requested_user = payload.requested_user;
			if(('undefined' === typeof requested_user) || !requested_user)
			{
			var error_message = 'invite didn\'t specify a message, command aborted';
			log(error_message);
			socket.emit('invite_response',
			{
				result: 'fail',
				message: error_message
			});
			return;
			}
		
			var room = players[socket.id].room;
			var roomObject = io.sockets.adapter.rooms[room];
			/* Make sure user being invited is in the room */
			if(!roomObject.sockets.hasOwnProperty(requested_user))
			{
			var error_message = 'invite requested a user that wasn\'t in the room, command aborted';
			log(error_message);
			socket.emit('invite_response',
			{
				result: 'fail',
				message: error_message
			});	
			return;
			}

		/* if everything is ok then respond to the inviter that it was successful */
		var success_data = 
		{
			result: 'success',
			socket_id: requested_user
		};

		socket.emit('invite_response', success_data);

		/* Tell invitee they have been invited */
		var success_data = 
		{
			result: 'success',
			socket_id: socket.id
		};

		socket.to(requested_user).emit('invited', success_data);

		log('invite successful');

	});

	/* unnvite command -> when server receives an uninvite command, it'll expect payload of 
	requested user = socket_id of person to be uninvited, 
	Server's uninvite_response will be result e.g. 'success', socket_id of the person being uninvited.
	Uninvited response means server expects to receive socket_id of person doing the uninviting.
	Otherwise fail we'll send back failure message */
		socket.on('uninvite',function(payload)
	{
		log('uninvite with '+JSON.stringify(payload));

		/* check to make sure that a payload was sent */
		if(('undefined' === typeof payload) || !payload)
		{
			var error_message = 'uninvite had no payload, command aborted';
			log(error_message);
			socket.emit('uninvite_response',
			{
				result: 'fail',
				message: error_message
			});
			return;
		}

			/* Checking that message can be traced to a username */
			var username = players[socket.id].username;
			if(('undefined' === typeof username) || !username)
			{
			var error_message = 'uninvite can\'t identify who sent the message';
			log(error_message);
			socket.emit('uninvite_response',
			{
				result: 'fail',
				message: error_message
			});
			return;
			}

			var requested_user = payload.requested_user;
			if(('undefined' === typeof requested_user) || !requested_user)
			{
			var error_message = 'uninvite didn\'t specify a message, command aborted';
			log(error_message);
			socket.emit('uninvite_response',
			{
				result: 'fail',
				message: error_message
			});
			return;
			}
		
			var room = players[socket.id].room;
			var roomObject = io.sockets.adapter.rooms[room];
			/* Make sure user being invited is in the room */
			if(!roomObject.sockets.hasOwnProperty(requested_user))
			{
			var error_message = 'uninvite requested a user that wasn\'t in the room, command aborted';
			log(error_message);
			socket.emit('invite_response',
			{
				result: 'fail',
				message: error_message
			});	
			return;
			}

		/* if everything is ok then respond to the uninviter that it was successful */
		var success_data = 
		{
			result: 'success',
			socket_id: requested_user
		};

		socket.emit('uninvite_response', success_data);

		/* Tell uninvitee they have been uninvited */
		var success_data = 
		{
			result: 'success',
			socket_id: socket.id
		};

		socket.to(requested_user).emit('uninvited', success_data);

		log('uninvite successful');

	});

	/* game_start command 
	payload: requested user = socket_id of person to play with
	game_start_response result will be success, socket_id is socket id of person you're playing iwth,
	and is id of the game session
	Otherwise fail we'll send back failure message */
		socket.on('game_start',function(payload)
	{
		log('game_start with '+JSON.stringify(payload));

		/* check to make sure that a payload was sent */
		if(('undefined' === typeof payload) || !payload)
		{
			var error_message = 'game_start had no payload, command aborted';
			log(error_message);
			socket.emit('game_start_response',
			{
				result: 'fail',
				message: error_message
			});
			return;
		}

			/* Checking that message can be traced to a username */
			var username = players[socket.id].username;
			if(('undefined' === typeof username) || !username)
			{
			var error_message = 'game_start can\'t identify who sent the message';
			log(error_message);
			socket.emit('game_start_response',
			{
				result: 'fail',
				message: error_message
			});
			return;
			}

			var requested_user = payload.requested_user;
			if(('undefined' === typeof requested_user) || !requested_user)
			{
			var error_message = 'uninvite didn\'t specify a message, command aborted';
			log(error_message);
			socket.emit('uninvite_response',
			{
				result: 'fail',
				message: error_message
			});
			return;
			}
		
			var room = players[socket.id].room;
			var roomObject = io.sockets.adapter.rooms[room];
			/* Make sure user being invited is in the room */
			if(!roomObject.sockets.hasOwnProperty(requested_user))
			{
			var error_message = 'game_start requested a user that wasn\'t in the room, command aborted';
			log(error_message);
			socket.emit('game_start_response',
			{
				result: 'fail',
				message: error_message
			});	
			return;
			}

		/* if everything is ok then respond to the game requester that it was successful */
		var game_id = Math.floor((1+Math.random()) *0x10000).toString(16).substring(1);
		var success_data = 
		{
			result: 'success',
			socket_id: requested_user,
			game_id: game_id
		};

		socket.emit('game_start_response', success_data);

		/* Tell the other player to play */
		var success_data = 
		{
			result: 'success',
			socket_id: socket.id,
			game_id: game_id
		};

		socket.to(requested_user).emit('game_start_response', success_data);

		log('game_start successful');

	});

});

/******************************************/
/* Code related to the game state */

var games = [];

function create_new_game()
{
	var new_game = {};
	new_game.player_white = {};
	new_game.player_black = {};
	new_game.player_white.socket = '';
	new_game.player_white.username = '';
	new_game.player_black.socket = '';
	new_game.player_black.username = '';

	var d = new Date();
	new_game.last_move_time = d.getTime();

	new_game.whose_turn = 'white';

	new_game.board = 
	[
		[' ',' ',' ',' ',' ',' ',' ',' ',],
		[' ',' ',' ',' ',' ',' ',' ',' ',],
		[' ',' ',' ',' ',' ',' ',' ',' ',],
		[' ',' ',' ','w','b',' ',' ',' ',],
		[' ',' ',' ','b','w',' ',' ',' ',],
		[' ',' ',' ',' ',' ',' ',' ',' ',],
		[' ',' ',' ',' ',' ',' ',' ',' ',],
		[' ',' ',' ',' ',' ',' ',' ',' ',]
	];

	return new_game;
}

function send_game_update(socket, game_id, message)
{
	/* Check to see if game with game_id already exists */
	if(('undefined' === typeof games[game_id]) || !games[game_id])
	{
		/* No game exists so make one */
		console.log('No game exists. Creating '+game_id+' for '+socket.id);
		games[game_id] = create_new_game();
	}

	/* Make sure only 2 people max are in the game room */

	/* Assign this socket a color */

	/* Send game updates */
	var success_data = 
	{
		result: 'success',
		game: games[game_id],
		message: message,
		game_id: game_id
	};
	io.in(game_id).emit('game_update',success_data);

	/* Check to see if game is over */

}