var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/game'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/game/snake.html');
});

var redis = require('redis');
var redisClient = redis.createClient(); //creates a new client

redisClient.on('connect', function() {
    console.log('connected');
});

var columns = 50;
var rows = 50;	
var numOfFoodPieces = 8;
var players = {};
var foodOnBoard = [];
var usedColors = [];
var numOfColors = 15;

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
			sendMessage('<span class="playerName color' + players[socket.id].color + '">' + players[socket.id].playerName + '</span> has left the game!');
			
			delete usedColors[players[socket.id].color];
		}
		
    delete players[socket.id];
    
    updateScore();
  });
  
  var newSnakeColor = function(snakeID) {	
	  	
		var outOfColors = true;
		
		if (usedColors.length < numOfColors) {
			outOfColors = false;
		} else {
			for (var i = 0; i < usedColors.length; i++) {
				if (typeof usedColors[i] === 'undefined') {
					outOfColors = false;
					break;
				}
			}
		}
		
		if (outOfColors) {
			// all colors used, start recycling them
			usedColors = [];
		}
		
		var foundColor = false;

		while(!foundColor) {
			var color = newRandomNumber(0, numOfColors - 1);
			
			if (typeof usedColors[color] === 'undefined') {
				usedColors[color] = snakeID;
				foundColor = true;
			}
		}
				
		return color;
		
  };
  
  socket.on('new player', function(playerName) { 
	  if (!exists(playerName)) {
	  	return false;
	  }
	  
	  var snakeColor = newSnakeColor(socket.id);

	  var newPlayer = {
		  id: socket.id,
	  	score: 0,
	  	playerName: playerName,
	  	color: snakeColor
		};
		  	
		players[socket.id] = newPlayer;
		
		sendMessage('<span class="playerName color' + snakeColor + '">' + playerName + '</span> has joined the game!');	
		    
    if (io.sockets.connected[socket.id]) {
			// send the player info to the new player
			
			io.sockets.connected[socket.id].emit('new player info', newPlayer);
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
		
		var player = players[socket.id];
  
    if (!exists(player)) {
	    player = {
		    playerName: 'Unknown Player',
		    score: 0,
		    color: 0
		  }
		  
			players[socket.id] = player;
	  }
	  
	  var snakeInfo = {
		  snakeID: socket.id,
		  snake: snake,
		  color: player.color
	  };
  
		sendMessage('<span class="playerName color' + player.color + '">' + player.playerName + '</span> started a new game!');	

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
		    playerName: 'Unknown Player',
		    score: 0
		  }
		  
		  players[socket.id] = player;
	  }
  
    var oldScore = player.score;
    player.score = 0;
    
    if (oldScore > 0) {
			updateScore();
		}
		
		sendMessage('<span class="playerName color' + player.color + '">' + player.playerName + '</span> has died!');	
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
	if (typeof a === 'boolean') { // if boolean return true to avoid false negatives
		return true;
	} else {
		return a && typeof a !== 'undefined';
	}
}