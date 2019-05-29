/* functions for general use */

/*This function returns the value associated with 'whichParam' on the URL */
function getURLParameters(whichParam)
{
	var pageURL = window.location.search.substring(1);
	var pageURLVariables = pageURL.split('&');
	for(var i = 0; i < pageURLVariables.length; i++){
		var parameterName = pageURLVariables[i].split('=');
		if(parameterName[0] == whichParam){
			return parameterName[1];
		}
	}
}


var username = getURLParameters('username');
if('undefined' == typeof username || !username){
	username = 'Anonymous_'+Math.random();
}

var chat_room = getURLParameters('game_id');
if('undefined' == typeof chat_room || !chat_room){
	chat_room = 'lobby';
}

/* Connect to the socket server */

var socket = io.connect();

/* What to do when server sends a log message */
socket.on('log',function(array){
	console.log.apply(console,array);
});

/* What to do when server responds that someone joined the room*/
socket.on('join_room_response',function(payload){
	if(payload.result == 'fail')
	{
		alert(payload.message);
		return;
	}

	/* If we are notified we join the room then ignore message */
	if(payload.socket_id == socket.id)
	{
		return;
	}

	/* If someone joined, add new row to lobby table */
	var dom_elements = $('.socket_'+payload.socket_id);
	/* If we don't already have an entry for this person*/
	if(dom_elements.length == 0)
	{
		var nodeA = $('<div></div>');
		nodeA.addClass('socket_'+payload.socket_id);
		var nodeB = $('<div></div>');
		nodeB.addClass('socket_'+payload.socket_id);
		var nodeC = $('<div></div>');
		nodeC.addClass('socket_'+payload.socket_id);

		nodeA.addClass('w-100');
		
		nodeB.addClass('col-9 text-right');
		nodeB.append('<h4>' +payload.username+'</h4>'); 
		
		nodeC.addClass('col-3 text-left');
		var buttonC = makeInviteButton(payload.socket_id);
		nodeC.append(buttonC);

		nodeA.hide();
		nodeB.hide();
		nodeC.hide();
		$('#players').append(nodeA,nodeB,nodeC);
		nodeA.slideDown(1000);
		nodeB.slideDown(1000);
		nodeC.slideDown(1000);
	}
	/* else if we're already seeing the person who just joined (something weird happened) */
	else
	{
		uninvite(payload.socket_id);
		var buttonC = makeInviteButton(payload.socket_id);
		$('.socket_'+payload.socket_id+' button').replaceWith(buttonC);
		dom_elements.slideDown(1000);
	} 

	/* Manage the messages that a new player has joined */
	var newHTML = '<p>' +payload.username+ ' just joined the lobby</p>';
	var newNode = $(newHTML);
	newNode.hide();
	$('#messages').append(newNode);
	newNode.slideDown(1000);
});

/* ************************************************************* */
/* What to do when server says that someone has left a room */
socket.on('player_disconnected',function(payload){
	if(payload.result == 'fail')
	{
		alert(payload.message);
		return;
	}

	/* If we are notified we left the room then ignore message */
	if(payload.socket_id == socket.id)
	{
		return;
	}

	/* If someone left the room, then animate out their content */
	var dom_elements = $('.socket_'+payload.socket_id);
	/* If something exists make it disappear */
	if(dom_elements.length != 0)
	{
		dom_elements.slideUp(1000);
	}

	/* Manage the messages that a new player has left */
	var newHTML = '<p>' +payload.username+ ' has left the lobby</p>';
	var newNode = $(newHTML);
	newNode.hide();
	$('#messages').append(newNode);
	newNode.slideDown(1000);
});
/* ************************************************************* */

/* ability to send an invite */
function invite(who)
{
	var payload = {};
	payload.requested_user = who;

	console.log('*** Client Log Message: \'invite\' payload: '+JSON.stringify(payload));
	socket.emit('invite',payload);
}

/* if server sends back that it received invite request */
socket.on('invite_response',function(payload)
{
	if(payload.result == 'fail')
	{
		alert(payload.message);
		return;
	}
	var newNode = makeInvitedButton(payload.socket_id);
	$('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

/* handle a notification that we have been invited */
socket.on('invited',function(payload)
{
	if(payload.result == 'fail')
	{
		alert(payload.message);
		return;
	}
	var newNode = makePlayButton(payload.socket_id);
	$('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});


/* ************************************************************* */
/* send an un-invite message to server  */
function uninvite(who)
{
	var payload = {};
	payload.requested_user = who;

	console.log('*** Client Log Message: \'uninvite\' payload: '+JSON.stringify(payload));
	socket.emit('uninvite',payload);
}

/* Handle a response after sending an un-invite message to server */
socket.on('uninvite_response',function(payload)
{
	if(payload.result == 'fail')
	{
		alert(payload.message);
		return;
	}
	var newNode = makeInviteButton(payload.socket_id);
	$('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

/* handle a notification from server that we have been uninvited */
socket.on('uninvited',function(payload)
{
	if(payload.result == 'fail')
	{
		alert(payload.message);
		return;
	}
	var newNode = makeInviteButton(payload.socket_id);
	$('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

/* ************************************************************* */
/* send an game start message to server  */
function game_start(who)
{
	var payload = {};
	payload.requested_user = who;

	console.log('*** Client Log Message: \'game_start\' payload: '+JSON.stringify(payload));
	socket.emit('game_start',payload);
}

/* handle a notification from server that we have been engaged to play */
socket.on('game_start_response',function(payload)
{
	if(payload.result == 'fail')
	{
		alert(payload.message);
		return;
	}
	var newNode = makeEngagedButton(payload.socket_id);
	$('.socket_'+payload.socket_id+' button').replaceWith(newNode);

	/* If success jump to a new page */
	window.location.href = 'game.html?username='+username+'&game_id='+payload.game_id;
});


/* ************************************************************* */
/* send message function on client side */
function send_message(){
	var payload = {};
	payload.room = chat_room;
	payload.message = $('#send_message_holder').val();

	console.log('*** Client Log Message: \'send_message\' payload: '+JSON.stringify(payload));
	socket.emit('send_message',payload);
}

/* if joined chat room and got a response */
socket.on('send_message_response',function(payload)
{
	if(payload.result == 'fail')
	{
		alert(payload.message);
		return;
	}
	var newHTML = '<p><b>'+payload.username+' says:</b> '+payload.message+'</p>';
	var newNode = $(newHTML)
	newNode.hide();
	$('#messages').append(newNode);
	newNode.slideDown(1000);
});

/* ***************BUTTONS********************************************** */
function makeInviteButton(socket_id)
{
	var newHTML = '<button type=\'button\' class=\'btn btn-outline-primary\'>Invite</button>'; 
	var newNode = $(newHTML);
	newNode.click(function()
	{
		invite(socket_id);
	});
	return(newNode);
}

function makeInvitedButton(socket_id)
{
	var newHTML = '<button type=\'button\' class=\'btn btn-primary\'>Invited</button>'; 
	var newNode = $(newHTML);
	newNode.click(function()
	{
		uninvite(socket_id);
	});
	return(newNode);
}

function makePlayButton(socket_id)
{
	var newHTML = '<button type=\'button\' class=\'btn btn-success\'>Play</button>'; 
	var newNode = $(newHTML);
	newNode.click(function()
	{
		game_start(socket_id);
	});
	return(newNode);
}

function makeEngagedButton()
{
	var newHTML = '<button type=\'button\' class=\'btn btn-danger\'>Engaged</button>'; 
	var newNode = $(newHTML);
	return(newNode);
}

/* in jquery to run a command only once webpage has completely loaded is $(function () {}*/
$(function(){
	var payload = {};
	payload.room = chat_room;
	payload.username = username;

	console.log('*** Client Log Message: \'join_room\' payload: '+JSON.stringify(payload));
	socket.emit('join_room',payload);
});

var old_board = 
[
	['?','?','?','?','?','?','?','?',],
	['?','?','?','?','?','?','?','?',],
	['?','?','?','?','?','?','?','?',],
	['?','?','?','?','?','?','?','?',],
	['?','?','?','?','?','?','?','?',],
	['?','?','?','?','?','?','?','?',],
	['?','?','?','?','?','?','?','?',],
	['?','?','?','?','?','?','?','?',]
];

socket.on('game_update',function(payload)
{
	console.log('*** Client Log Message: \'game_update\'\n\tpayload: '+JSON.stringify(payload));
	/* Handle if there is no board payload -> send user back to lobby */
	if(payload.result == 'fail')
	{
		console.log(payload.message);
		window.location.href = 'lobby.html?username='+username;
		return;
	}

	/* There is a payload (above). Now check payload/board is valid */
	var board = payload.game.board;
	if('undefined' == typeof board || !board)
	{
		console.log('Internal error: received a malformed board update from the server');
		return;
	}

	/* Update my color */

	/* Animate changes to the board */
	var row,column;
	for(row = 0; row < 8; row++)
	{
		for(column = 0; column < 8; column++)
		{
			/* If the board and pieces on it received from server has changed compared to 
			current version, then we know something has chnaged*/ 
			if(old_board[row][column] != board [row][column])
			{
				/* space goes from question mark aka unknown to empty space */
				if(old_board[row][column] == '?' && board[row][column] == ' ') 
				{
					$('#'+row+'_'+column).html('<img src="assets/images/empty.gif" alt="empty square"/>');
				}
				/* space goes from question mark to white space */
				else if(old_board[row][column] == '?' && board[row][column] == 'w') 
				{
					$('#'+row+'_'+column).html('<img src="assets/images/empty_to_white.gif" alt="white square"/>');
				}
				/* space goes from question mark to black space */
				else if(old_board[row][column] == '?' && board[row][column] == 'b') 
				{
					$('#'+row+'_'+column).html('<img src="assets/images/empty_to_black.gif" alt="black square"/>');
				}

				/* space goes from empty to white space */
				else if(old_board[row][column] == ' ' && board[row][column] == 'w') 
				{
					$('#'+row+'_'+column).html('<img src="assets/images/empty_to_white.gif" alt="white square"/>');
				}
				/* space goes from empty mark to black space */
				else if(old_board[row][column] == ' ' && board[row][column] == 'b') 
				{
					$('#'+row+'_'+column).html('<img src="assets/images/empty_to_black.gif" alt="black square"/>');
				}

				/* space goes from white to empty space */
				else if(old_board[row][column] == 'w' && board[row][column] == ' ') 
				{
					$('#'+row+'_'+column).html('<img src="assets/images/white_to_empty.gif" alt="empty square"/>');
				}
				/* space goes from black to empty space */
				else if(old_board[row][column] == 'b' && board[row][column] == ' ') 
				{
					$('#'+row+'_'+column).html('<img src="assets/images/black_to_empty.gif" alt="empty square"/>');
				}

				/* space goes from white to black space */
				else if(old_board[row][column] == 'w' && board[row][column] == 'b') 
				{
					$('#'+row+'_'+column).html('<img src="assets/images/white_to_black.gif" alt="black square"/>');
				}
				/* space goes from black to white space */
				else if(old_board[row][column] == 'b' && board[row][column] == 'w') 
				{
					$('#'+row+'_'+column).html('<img src="assets/images/black_to_white.gif" alt="white square"/>');
				}
				/* else error */
				else 
				{
					$('#'+row+'_'+column).html('<img src="assets/images/error.gif" alt="error"/>');
				}

			}
		}
	}
	old_board = board;
});