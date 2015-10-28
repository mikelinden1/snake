var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/game'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/game/snake.html');
});

var players = [];
var numPlayers = 0;

var foodOnBoard = [];

io.on('connection', function(socket) {
  
  var newPlayer = {
  	currentScore: 0
	};
	  	
	players[socket.id] = newPlayer;
	
	console.log("new player", socket.id);
  	
  socket.on('disconnect', function() {    
    delete players[socket.id];
		console.log("lost player", socket.id);
		numPlayers--;
  });
  
  socket.on('new player', function(playerName) {
  	console.log('New Player: ' + playerName);
  	numPlayers++;
  	  	
		players[socket.id].playerName = playerName;
		    
    socket.emit('new snake ID', socket.id);
  });
  
  
  // food events
  socket.on('ask for food', function() {
	  // return the food stored on the server
    socket.emit('food delivery', foodOnBoard);
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
	  
    socket.broadcast.emit('new snake', snakeInfo);
  });
	
	socket.on('snake moved', function(snakeInfo) {
		snakeInfo.snakeID = socket.id;
		
		if (snakeInfo.ate) {
			players[socket.id].score++;
		}
				
    socket.broadcast.emit('snake moved', snakeInfo);
	});
	
	socket.on('snake died', function() {
    socket.broadcast.emit('snake died', socket.id);
  });
  
});

http.listen(3000, function() {
  console.log('listening on *:3000');
});