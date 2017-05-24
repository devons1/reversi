/* functions for general use */

/* this function returns the value associated with 'whichParam on the URL */ 

function getURLParameters(whichParam)
{
	var pageURL = window.location.search.substring(1);
	var pageURLVariables = pageURL.split('&');
	for(var i = 0; i < pageURLVariables.length; i++)
		{
		var parameterName = pageURLVariables[i].split('=');
		if(parameterName[0] == whichParam){
			return parameterName[1];
		}
	}
}

var username = getURLParameters('username');
if('undefined' == typeof username || !username){
	username = 'Anonymous_'+Math.floor(Math.random()*100);
}

/* A - 10:28 */
var chat_room = getURLParameters('game_id');
if('undefined' == typeof chat_room || !chat_room){
	chat_room = 'lobby';
}

/* Connect to the socket server */
var socket = io.connect();

/* B - What to do when server sends me a long message */
socket.on('log',function(array){
	console.log.apply(console,array);
});


/***********/

/* C - What to do when server responds when someone joined a room */
socket.on('join_room_response',function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}

	/* D - If we are being notified that we joined the room, then ignore it */
	if(payload.socket_id == socket.id);{
			return;
	}


	/* F - If someone joined, then add new row to the lobby table */
	var dom_elements = $('.socket_' + payload.socket_id);

		/* G - If we don't already have an entry for this person */
		if (dom_elements.length == 0) {
			var nodeA = $('<div></div>');
			nodeA.addClass('socket_' + payload.socket_id);
			
			var nodeB = $('<div></div>');
			nodeB.addClass('socket_' + payload.socket_id);
			
			var nodeC = $('<div></div>');
			nodeC.addClass('socket_' + payload.socket_id);
			
			nodeA.addClass('w-100');
			nodeB.addClass('col-9 text-right');
			nodeB.append('<h4>' + payload.username + '</h4>');

			nodeC.addClass('col-3 text-left');
			var buttonC = makeInviteButton();
			nodeC.append(buttonC);

			nodeA.hide();
			nodeB.hide();
			nodeC.hide();
			$('#players').append(nodeA,nodeB,nodeC);
			nodeA.slideDown(1000);
			nodeB.slideDown(1000);
			nodeC.slideDown(1000);

		}

		else{
			var buttonC = makeInviteButton();
			$('.socket_' + payload.socket_id + ' button').replaceWith(buttonC);
			dom_elements.slideDown(1000);
		}

	/* E - Manage the message that a new player has joined */
	var newHTML = '<p>' + payload.username + ' joined!</p>';
	var newNode = $(newHTML);
	newNode.hide();
	$('#messages').append(newNode);
	newNode.slideDown(1000);

});


/***********/

/* I - What to do when server says that someone has left the room */
socket.on('player_disconnected',function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}

	/* J - If we are being notified that we left the room, then ignore it */
	if(payload.socket_id == socket.id);{
			return;
	}


	/* K - If someone left the room, animate out their content */
	var dom_elements = $('.socket_' + payload.socket_id);

		/* If something exist */
		if (dom_elements.length != 0) {
			dom_elements.slideUp(1000);
		}

	/* L - Manage the message that a new player has left the room */
	var newHTML = '<p>' + payload.username + ' has left!</p>';
	var newNode = $(newHTML);
	newNode.hide();
	$('#messages').append(newNode);
	newNode.slideDown(1000);

});


/***********/



socket.on('send_message_response',function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}
	$('#messages').append('<p><b>'+payload.username+' says:</b> '+payload.message+'</p>');
});



function send_message(){
	var payload = {};
	payload.room = chat_room;
	payload.username = username;
	payload.message = $('#send_message_holder').val();
		console.log('*** Client Log Message: \'send_message\' payload: '+JSON.stringify(payload));
	socket.emit('send_message',payload);
}	


/* H - 23:52 */
function makeInviteButton(){
	var newHTML = '<button type = \'button\' class=\'btn btn-outline-primary\'>Invite </button>';
	var newNode = $(newHTML);
	return(newNode);
}
	

$(function(){
	var payload = {};
	payload.room = chat_room;
	payload.username = username;
	
	console.log('*** Client Log Message: \'join_room\' payload: '+JSON.stringify(payload));
	socket.emit('join_room',payload);
});