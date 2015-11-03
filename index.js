'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/game'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/game/snake.html');
});
   
// connect to the Mongo Database via Monk for storing the leaderboard

var monk = require('monk');
var db = monk('mongodb://snake:snakesnakesnake@apollo.modulusmongo.net:27017/anyN8edo');
var leaderboardCollection = db.get('leaderboard');

var columns = 50;
var rows = 50;	
var numOfFoodPieces = 8;
var players = {};
var foodOnBoard = [];
var portalOnBoard = [];
var usedColors = [];
var numOfColors = 15;
var leaderboard = [];
var leaderboardMaxLen = 10;

// spawn 8 food pieces when the server starts
var initFood = function(numOfPieces) {
	if (!exists(numOfPieces)) {
		return false;
	}
	
	var newFood = function() {
		var food = { x: newRandomNumber(0, columns - 1), y: newRandomNumber(0, rows - 1) };		
		var badPlace = checkCollison(food, foodOnBoard) || checkCollison(food, portalOnBoard);

		if (!badPlace) {
			foodOnBoard.push(food);
		} else {
			newFood();
		}
	};
	
	for (var i = 0; i < numOfPieces; i++) {
		newFood();
	}
}(numOfFoodPieces);

var initPortals = function(numOfPieces) {
	portalOnBoard = [];
	
	var newPortal = function() {
		var portal = { x: newRandomNumber(0, columns - 1), y: newRandomNumber(0, rows - 1) };		
		var badPlace = checkCollison(portal, foodOnBoard) || checkCollison(portal, portalOnBoard);

		if (!badPlace) {
			portalOnBoard.push(portal);
		} else {
			newPortal();
		}
	};
	
	for (var i = 0; i < numOfPieces; i++) {
		newPortal();
	}
};

initPortals(2);

// load the leadboard when the server starts and store it in the "leaderboard" array
var loadLeaderBoard = function() {
	leaderboardCollection.find({ $query: {}, $orderby: { score : -1 } }, function(error, response) {
		if (error) {
			console.log('Error loading leaderboard');
		} else {
			leaderboard = response;
		}
	});
}();

io.on('connection', function(socket) {
	if (exists(io.sockets.connected[socket.id])) {
		// send the food, leaderboard, and scoreboard to the new player
		io.sockets.connected[socket.id].emit('food delivery', foodOnBoard);
		io.sockets.connected[socket.id].emit('portal delivery', portalOnBoard);
		io.sockets.connected[socket.id].emit('update leaderboard', leaderboard);
		io.sockets.connected[socket.id].emit('update scoreboard', players);
	}
	
  socket.on('disconnect', function() {
		if (exists(players[socket.id])) {
			sendMessage('<span class="playerName color' + players[socket.id].color + '">' + players[socket.id].playerName + '</span> has left the game!');
			
			delete usedColors[players[socket.id].color];
			
			// remove the player from the scoreboard
			io.sockets.emit('remove player', players[socket.id]);
	    
	    delete players[socket.id];
		}
		  
    socket.broadcast.emit('snake died', socket.id);
  });
  
  var newSnakeColor = function(snakeID) {	
		// choose a new snake color that isn't already being used
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
			// all colors are used, start recycling them
			usedColors = [];
		}
		
		var foundColor = false;
		var color = 0;
		
		while(!foundColor) {
			color = newRandomNumber(0, numOfColors - 1);
			
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
		
		// add the new player to the scoreboard
		io.sockets.emit('new player', newPlayer);
  });
  
  socket.on('create portals', function() {
	  initPortals(2);
	  
	  io.sockets.emit('portal delivery', portalOnBoard);
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
			};

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
					foodOnBoard.splice(i, 1);
					break;
				}
			}
			
			players[socket.id].score++;
			
			io.sockets.emit('update player score', players[socket.id]);
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
			};

			players[socket.id] = player;
		}
  
    var newScore = player.score;
    player.score = 0;
    
    if (newScore > 0) {			
			if (leaderboard.length < leaderboardMaxLen || leaderboard[leaderboard.length - 1].score < newScore) {
				addToLeaderBoard({ 'name': player.playerName, 'score': newScore });
			}
		}
		
		io.sockets.emit('update player score', players[socket.id]);
		sendMessage('<span class="playerName color' + player.color + '">' + player.playerName + '</span> has died!');	
  });
  
  function sendMessage(message) {
		io.sockets.emit('new message', message);
  }
  
  function addToLeaderBoard(scoreInfo) {
		leaderboardCollection.insert(scoreInfo, function(error, response) {
			if (error) {
				console.log("There was a problem adding the information to the database.");
				return false;
			} else {
				leaderboard.push(scoreInfo);

				leaderboard.sort(function(a, b){
					return b.score - a.score;
				});
						
				if (leaderboard.length > leaderboardMaxLen) {
					// remove lowest score	
					leaderboardCollection.remove(leaderboard[leaderboard.length - 1]);
					leaderboard.pop();
				}

				io.sockets.emit('update leaderboard', leaderboard);
			}
		});
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

function checkCollison(needle, haystack) {
	for (var i = 0; i < haystack.length; i++) {
		if (needle.x === haystack[i].x && needle.y === haystack[i].y) {
			return true;
		}
	}
	
	return false;
}