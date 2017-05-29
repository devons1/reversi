/*******************************************/
/* Set up static file server */
/* Include the static file webserverlibrary*/
var static = require('node-static');

/* Include the http server library */
var http = require('http');

/* Assume we are runing on Heroku */
var port = process.env.PORT;
var directory = __dirname + '/public';

/* If we aren't on heroku, then we need to readjust the port ad directory
 * infromation and we know that because port won't be set */
if(typeof port == 'undefined' || !port){
	directory = './public';
	port = 8080;
}

/* set up a static web-server that will deliver files from the filesystem */
var file = new static.Server(directory);

/* construct an http server that gots the files from the file server */
var app = http.createServer(
	function(request,response){
		request.addListener('end',
			function(){
				file.serve(request,response);
				}	
			).resume();
		}
    ).listen(port);

console.log('The server is running'); 

/******************************************/
/*         Set up the web socket          */

/* this is going to be a registry of socket_ids and player information */
var players = [];

var io = require('socket.io').listen(app);

io.sockets.on('connection', function (socket) {

	log('Client connection by '+socket.id);

	function log(){
		var array = ['*** Sever log Message: '];
		for(var i = 0; i < arguments.length; i++){
			array.push(arguments[i]);
			console.log(arguments[i]);
		}
		socket.emit('log',array);
		socket.broadcast.emit('log',array);
	}
	
	
	
	
	

	/* join_room command */
	/* payload:
	   {
	 		'room': room to join,
	  		'username': username of person joining 
	 	}
	 	join room_room_response:
	 	{ 
	 		'result: 'success',
	 		'room': room joined,
	 		'username: username that joined,
	 		"socket_id': the socket id of the person that joined,
	 		'membership': nuber of people in the room including the new one
	 		}
	 		or 
	 		{ 
	 		'result: 'fail',
	 		'message': failure message
	 		}
	 */
	 
	 
	socket.on('join_room',function(payload){
		log('\'join_room\' command'+JSON.stringify(payload));
		
		/* check that the client sent a payload */
		if(('undefined'=== typeof payload) || !payload){
			var error_message = 'join_room had no payload, command aborted';
			log(erroe_message);
			socket.emit('join_room_response',   { 
													result: 'fail',
													message: eror_message
													});
			return;
		}
		
		/* Check that the payload has a room to join */
		var room = payload.room;
		if(('undefined'=== typeof room) || !room){
			var error_message = 'join_room didn\'t specify a room, command aborted';
			log(erroe_message);
			socket.emit('join_room_response',   { 
													result: 'fail',
													message: eror_message
													});
			return;
		}
		
		/* Check that a user name has been provided */
		var username = payload.username;
		if(('undefined'=== typeof username) || !username){
			var error_message = 'join_room didn\'t specify a username, command aborted';
			log(erroe_message);
			socket.emit('join_room_response',   { 
													result: 'fail',
													message: eror_message
													});
			return;
		}
				
				
		/* Store information about this new player */
		players[socket.id] = {};
		players[socket.id].username = username;
		players[socket.id].room = room;
				
		/* Actually have the user join the room */		
		socket.join(room);
		
		
		/* Get the room object */
		var roomObject = io.sockets.adapter.rooms[room];
		
		/* Tell everyone that is already in the room that someone just joined */
		var numClients = roomObject.length;
		var success_data = {
									result: 'success',
									room: room,
									username: username,
									socket_id: socket.id,
									membership: numClients
							};
		io.in(room).emit('join_room_response',success_data);
		
		
		for(var socket_in_room in roomObject.sockets){
			var success_data = {
									result: 'success',
									room: room,
									username: players[socket_in_room].username ,
									socket_id: socket_in_room,
									membership: numClients
								};
			socket.emit('join_room_response',success_data);
		}
		
		log('join_room success');							
	});

	socket.on('disconnect',function(){
		log('Client disconnected '+JSON.stringify(players[socket.id]));
		
		if('undefined' !== typeof players[socket.id] && players[socket.id]){
		var username = players[socket.id].username;
		var room = players[socket.id].room;
		var payload = {
						username: username,
						socket_id: socket.id 
						};
		delete players[socket.id];
		io.in(room).emit('player_disconnected',payload);
		}
	});
	

	/* invite command */
	/* payload:
	   {
	 		'requested_user': the socket id of the person to be invited
	 	}
	 	
	 	invite_response:
	 	{ 
	 		'result: 'success',
	 		'socket_id': the socket id of the person being invited
	 	}
	 		or 
	 	{ 
	 		'result: 'fail',
	 		'message': failure message
	 	}

		invited:
	 	{ 
	 		'result: 'success',
	 		'socket_id': the socket id of the person being invited
	 	}
	 		or 
	 	{ 
	 		'result: 'fail',
	 		'message': failure message
	 	}
	 */

	socket.on('invite',function(payload) {
		log('invite with ' + JSON.stringify(payload));

		/* Check to make sure that a payload was sent */
		if(('undefined' === typeof payload) || !payload) {
			var error_message = 'invite had no payload, command aborted';
			log(error_message);
			socket.emit('invite_response',  { 
													result: 'fail',
													message: error_message
												   });
			return;
		}
		
		
		/* Check that the message can be traced to a username */
		var username = players[socket.id].username;
		if(('undefined' === typeof username) || !username) {
			var error_message = 'invite can\' identify who sent the message';
			log(error_message);
			socket.emit('invite_response',   { 
													result: 'fail',
													message: error_message
													});
			return;
		}
		
		
		var requested_user = payload.requested_user;
		if(('undefined' === typeof requested_user) || !requested_user) {
			var error_message = 'invite did not specify a requested_user, command aborted';
			log(error_message);
			socket.emit('invite_response',   { 
													result: 'fail',
													message: error_message
													});	
			return;
		}
		
		var room = players[socket.id].room;
		var roomObject = io.sockets.adapter.rooms[room];

		/* Make sure the user being invited is in the room */
		if (!roomObject.sockets.hasOwnProperty(requested_user)) {
			var error_message = 'invite requested a user that wasn\'t in the room, command aborted';
			log(error_message);
			socket.emit('invite_response',   { 
													result: 'fail',
													message: error_message
													});	
			return;

		}

		/* If everything is okay, respond to the inviter that it was successful */
		var success_data = {
									result: 'success',
									socket_id: requested_user
							};
		
		socket.emit('invite_response', success_data);

		/* Tell invitee that they have been invited */
		var success_data = {
									result: 'success',
									socket_id: requested_user
							};
		
		socket.to(requested_user).emit('invited', success_data);

		log('invite successful');
	});



	
});


