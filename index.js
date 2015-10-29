var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/game'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/game/snake.html');
});

var columns = 50;
var rows = 50;	
var numOfFoodPieces = 8;
var players = {};
var foodOnBoard = [];

var spawnFood = function(numOfPieces) {

	var newFood = function() {
		
		var food = { x: newRandomNumber(0, columns - 1), y: newRandomNumber(0, rows - 1) };		
		foodOnBoard.push(food);
	};
	
	for (var i = 0; i < numOfPieces; i++) {
		newFood();
	}
}(numOfFoodPieces);

io.on('connection', function(socket) {
	
	if (exists(io.sockets.connected[socket.id])) {
		// send the food to the new player
		io.sockets.connected[socket.id].emit('food delivery', foodOnBoard);
		updateScore();
	}
	
  socket.on('disconnect', function() { 
	  if (exists(players[socket.id])) {
			sendMessage('<span class="playerName">' + players[socket.id].playerName + '</span> has left the game!');	
		}
		
    delete players[socket.id];
    
    updateScore();
  });
  
  socket.on('new player', function(playerName) { 
	  if (!exists(playerName)) {
	  	return false;
	  }
	  
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
	  if (!exists(food)) {
			return false;
		}
		
	  // add the new food
		foodOnBoard.push(food);
				
		socket.broadcast.emit('new food', food);
		
  });
  
  socket.on('new snake', function(snake) {
	  
	  if (!exists(snake)) {
			return false;
		}
	  var snakeInfo = {
		  snakeID: socket.id,
		  snake: snake
	  };
	  
	  var player = players[socket.id];
  
    if (!exists(player)) {
	    player = {
		    playerName: "Unknown Player",
		    score: 0
		  }
		  
			players[socket.id] = player;
	  }
  
		sendMessage('<span class="playerName">' + player.playerName + '</span> started a new game!');	

    socket.broadcast.emit('new snake', snakeInfo);
	  
  });
	
	socket.on('snake moved', function(snakeInfo) {
	  if (!exists(snakeInfo)) {
			return false;
		}
	
		snakeInfo.snakeID = socket.id;
		
		if (snakeInfo.ate) {
			var food = snakeInfo.newHead;
			
			socket.broadcast.emit('food eaten', food);
			
			for (var i = 0; i < foodOnBoard.length; i++) {
				if (foodOnBoard[i].x === food.x && foodOnBoard[i].y === food.y) {
					foodOnBoard.splice(i, 1)
					break;
				}
			}
			
			players[socket.id].score++;
			updateScore();
			
		}
				
    socket.broadcast.emit('snake moved', snakeInfo);
	});
	
	socket.on('snake died', function() {
    socket.broadcast.emit('snake died', socket.id);
    
    var player = players[socket.id];
       
    if (!exists(player)) {
	    player = {
		    playerName: "Unknown Player",
		    score: 0
		  }
		  
		  players[socket.id] = player;
	  }
  
    var oldScore = player.score;
    player.score = 0;
    
    if (oldScore > 0) {
			updateScore();
		}
		
		sendMessage('<span class="playerName">' + player.playerName + '</span> has died!');	
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

function newRandomNumber(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function exists(a) {
	return a && typeof a !== 'undefined';
}