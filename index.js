var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/game'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/game/snake.html');
});

var players = {};
var foodOnBoard = [];

io.on('connection', function(socket) {
	
	if (io.sockets.connected[socket.id]) {
		// send the food to the new player
		io.sockets.connected[socket.id].emit('food delivery', foodOnBoard);
	}
	
  socket.on('disconnect', function() { 
	  if (typeof players[socket.id] !== 'undefined') {
			sendMessage('<span class="playerName">' + players[socket.id].playerName + '</span> has left the game!');	
		}
		
    delete players[socket.id];
    
    updateScore();
  });
  
  socket.on('new player', function(playerName) { 
	  var newPlayer = {
	  	score: 0,
	  	playerName: playerName
		};
		  	
		players[socket.id] = newPlayer;
		
		sendMessage('<span class="playerName">' + playerName + '</span> has joined the game!');	
		    
    if (io.sockets.connected[socket.id]) {
			// send the food to the new player
			io.sockets.connected[socket.id].emit('new snake ID', socket.id);
		}
		
		updateScore();
  });
  
  socket.on('food added', function(food) {
	  // add the new food
		foodOnBoard.push(food);
		
		socket.broadcast.emit('new food', food);
  });
  
  socket.on('new snake', function(snake) {
	  var snakeInfo = {
		  snakeID: socket.id,
		  snake: snake
	  };
	  
		sendMessage('<span class="playerName">' + players[socket.id].playerName + '</span> started a new game!');	

    socket.broadcast.emit('new snake', snakeInfo);
  });
	
	socket.on('snake moved', function(snakeInfo) {
		snakeInfo.snakeID = socket.id;
		
		if (snakeInfo.ate) {
			players[socket.id].score++;
			updateScore();
		}
				
    socket.broadcast.emit('snake moved', snakeInfo);
	});
	
	socket.on('snake died', function() {
    socket.broadcast.emit('snake died', socket.id);
    
    var oldScore = players[socket.id].score;
    players[socket.id].score = 0;
    
    if (oldScore > 0) {
			updateScore();
		}
		
		sendMessage('<span class="playerName">' + players[socket.id].playerName + '</span> has died!');	
  });
  
  function updateScore() {
	  var scores = [];
	  for (var property in players) {
	    if (players.hasOwnProperty(property)) {
	      scores.push(players[property]);
	    }
		}
	  io.sockets.emit('update scoreboard', scores);
  }
  
  function sendMessage(message) {
	  io.sockets.emit('new message', message);
  }
});

http.listen(app.get('port'), function() {
  console.log('listening on *:' + app.get('port'));
});