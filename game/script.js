'use strict'
var socket = io();

$(function() {
	var gameDelay = 100;
	var columns = 50;
	var rows = 50;
	var foodOnBoard = [];
	var initSnakeLength = 3;
	var foodPieces = 8;
	var snake = [];
	var direction = null;
	var nextDirection = null;
	var score = 0;
	var myInfo = {};
	var gameOver = false;

	//init the board
 	$("#startGamePop").show();
	
	for (var r = 0; r < rows; r++) {
		
		var thisRow = $("<DIV />").addClass("row").attr("row",r);
		
		thisRow.appendTo("#board");
		
		for (var c = 0; c < columns; c++) {
			$("<DIV />").addClass("cell").appendTo(thisRow).attr("row",c);
		}
		
	}
	
	var gameLogic = function() {
		
		var spawnFood = function(numOfPieces) {
			var newFood = function() {
				
				var food = { x: newRandomNumber(0, columns - 1), y: newRandomNumber(0, rows - 1) };
				
				var badPlace = checkCollison(food, foodOnBoard) && !$(".row").eq(food.y).find(".cell").eq(food.x).hasClass("snake");
				
				if (!badPlace) {
					colorCell(food.x, food.y, "food");
					foodOnBoard.push(food);
					
					socket.emit('food added', food);
				} else {
					newFood();
				}
			};
			
			for (var i = 0; i < numOfPieces; i++) {
				newFood();
			}
		};
		
		var foodEaten = function(food) {
			unColorCell(food.x, food.y, "food"); //remove the food

			// remove food from food object
			for (var i = 0; i < foodOnBoard.length; i++) {
				if (foodOnBoard[i].x === food.x && foodOnBoard[i].y === food.y) {
					foodOnBoard.splice(i, 1)
					break;
				}
			}
			
		};
		
		socket.on('food delivery', function(food) {
			foodOnBoard = food;

			if (foodOnBoard.length) {
				for (var i = 0; i < foodOnBoard.length; i++) {
					colorCell(foodOnBoard[i].x, foodOnBoard[i].y, "food");
				}
			} else {
				spawnFood(foodPieces);
			}
		});
		
		socket.on('new food', function(food) {
			colorCell(food.x, food.y, "food");
			foodOnBoard.push(food);
		});
		
		var removeSnake = function(snakeID) {
			$(".cell.snake[data-snakeID=" + snakeID + "]").removeClass("snake otherSnake deadSnake").attr("data-snakeID",null);
		};
		
		var updateScore = function() {
			$(".score").text(score);
		};
		
		var moveSnake = function() { //snake animation loop
			if (direction !== nextDirection) { // look for a change in direction and apply it if necessary
				direction = nextDirection;
			}
			
			// copy the head of the snake
			var headOfSnake = snake[0];
			var headOfSnakeX = headOfSnake.x;
			var headOfSnakeY = headOfSnake.y;
			var newHeadOfSnake = { x: headOfSnakeX, y: headOfSnakeY };
			
			var oldTailOfSnake = snake[snake.length - 1];
			
			switch(direction) {
				case 0:
					//up
					newHeadOfSnake.y -= 1;
					break;
				case 1:
					//right
					newHeadOfSnake.x += 1;
					break;
				case 2:
					//down
					newHeadOfSnake.y += 1;
					break;
				case 3:
					//left
					newHeadOfSnake.x -= 1;
					break;
			}
			
			// check if out of bounds		
			if (newHeadOfSnake.x === -1) {
				gameOver = true;
			} else {
				if (newHeadOfSnake.x === columns) {
					gameOver = true;
				}
			}
			
			if (newHeadOfSnake.y === -1) {
				gameOver = true;
			} else {
				if (newHeadOfSnake.y === rows) {
					gameOver = true;
				}
			}
			
			// check if my snake hit another snake or itself
			var cannibal = $(".row").eq(newHeadOfSnake.y).find(".cell").eq(newHeadOfSnake.x).hasClass("snake");
			
			if (cannibal) {
				gameOver = true;
			}
			
			if (gameOver) {
				socket.emit('snake died');

				var highScore = getCookie("highScore");

				if (!highScore) {
					highScore = 0;
				}
				
				if (score > highScore) {
					$("#gameOverPop .highScore").show();
					setCookie("highScore", score, 50);
				} else {
					$("#gameOverPop .highScore").hide();
				}
				
				$(".cell.snake[data-snakeID=" + myInfo.id + "]").removeClass("snake otherSnake").addClass("deadSnake");
				
				$("#gameOverPop").show();

				return false; // end the game loop
			}
			
			colorCell(newHeadOfSnake.x, newHeadOfSnake.y, "snake"); // add the head to the DOM
			setSnakeID(newHeadOfSnake.x, newHeadOfSnake.y, myInfo.id);
		
			snake.unshift(newHeadOfSnake); // add the new head to the front of the snake array
		
			var ateFood = checkCollison(newHeadOfSnake, foodOnBoard); // check if the snake hit food
			
			if (ateFood) {
				foodEaten(newHeadOfSnake); // remove the food and emit to socket
				
				spawnFood(1); // add a new piece of food and emit to socket
				
				score++; // increment the score
				
				updateScore(); // update the DOM to reflect the new score
			} else {
				// if they didn't eat food remove the tail to keep the snake the same length. If they did eat food keep the tail so the snake grows by one segment
				
				unColorCell(oldTailOfSnake.x, oldTailOfSnake.y, "snake"); // remove the old snake tail from the dom
				setSnakeID(oldTailOfSnake.x, oldTailOfSnake.y, null);
				snake.pop(); 
			}		
			
			var snakeInfo = {
				newHead: newHeadOfSnake,
				oldTail: oldTailOfSnake,
				ate: ateFood
			};
			
			socket.emit('snake moved', snakeInfo);
			
			setTimeout(function() { moveSnake(); }, gameDelay);
		};
		
		// key press listener
		$(document).keyup(function(e) { 
			switch(e.keyCode) {
				case 38:
					// up
					if (direction !== 2) { // don't allow a 180 degree turn
						nextDirection = 0;
					}
					break;
				case 39:
					// right
					if (direction !== 3) { // don't allow a 180 degree turn
						nextDirection = 1;
					}
					break;
				case 40:
					// down
					if (direction !== 0) { // don't allow a 180 degree turn
						nextDirection = 2;
					}
					break;
				case 37:
					// left
					if (direction !== 1) { // don't allow a 180 degree turn
						nextDirection = 3;
					}
					break;
				default:
					break;
			}
			
		});
		
		var startNewGame = function() {
			// remove the old snake if necessary
			removeSnake(myInfo.id);
			$(".cell").removeClass("deadSnake");
			snake = [];

			// reset gameover and score
			gameOver = false;
			score = 0;
			updateScore();
			
			// pick a random direction
			nextDirection = newRandomNumber(0, 3);
			
			// pick a random coordinate to start from
			var snakeStartingPointX = newRandomNumber(10, columns-10);
			var snakeStartingPointY = newRandomNumber(10, rows-10);
			
			var lastSegment = {x: snakeStartingPointX, y: snakeStartingPointY};
						
			for (var s = 0; s < initSnakeLength; s++) {
				
				var newSegmentX = lastSegment.x;
				var newSegmentY = lastSegment.y;
				var newSegment = { x: newSegmentX, y: newSegmentY };
	
				switch(nextDirection) {
					case 0:
						//up
						newSegment.y += 1;
						break;
					case 1:
						//right
						newSegment.x -= 1;
						break;
					case 2:
						//down
						newSegment.y -= 1;
						break;
					case 3:
						//left
						newSegment.x += 1;
						break;
				}
				
				snake.push(newSegment);
				
				setSnakeID(newSegment.x, newSegment.y, myInfo.id);
				colorCell(newSegment.x, newSegment.y, "snake");

				newSegmentX = newSegment.x;
				newSegmentY = newSegment.y;
				lastSegment = { x: newSegmentX, y: newSegmentY };
			}
			
			socket.emit('new snake', snake); // tell everyone else about my new snake
			
			moveSnake(); // start the animation loop
		}
				
		$("#joinGameForm").submit(function() {
			var playerName = $(".playerName").val();
			
			if (playerName === '') {
				$(".playerName").addClass("error");
				return false;	
			} else {
				$(".playerName").removeClass("error");
			}
			
	    socket.emit('new player', playerName);

			myInfo.playerName = playerName;
			
			$("#startGamePop").hide();
			
			startNewGame();
			
			return false;
		});
		
		$(".newGameBtn").click(function() {
			$("#gameOverPop").hide();
			startNewGame();
		});

		// other snake socket listeners
		socket.on('new snake ID', function(snakeID) {
	    myInfo.id = snakeID;
	  });
	  
	  socket.on('new snake', function(snakeInfo) {
	    var snakeID = snakeInfo.snakeID;
	    var snake = snakeInfo.snake;
	
	    for (var i=0; i<snake.length; i++) {
				$(".row").eq(snake[i].y).find(".cell").eq(snake[i].x).attr("data-snakeID",snakeID).addClass('snake otherSnake');
		  }
	  });
	  
	  socket.on('snake moved', function(snakeInfo) {
		  var newHead = snakeInfo.newHead;
		  var oldTail = snakeInfo.oldTail;
		  
			$(".row").eq(newHead.y).find(".cell").eq(newHead.x).attr("data-snakeID",snakeInfo.snakeID).addClass('snake otherSnake');
			
			if (snakeInfo.ate) {
				unColorCell(newHead.x, newHead.y, "food"); //remove the food
														
				// remove food from food object
				for (var i = 0; i < foodOnBoard.length; i++) {
					if (foodOnBoard[i].x === newHead.x && foodOnBoard[i].y === newHead.y) {
						foodOnBoard.splice(i, 1)
						break;
					}
				}
			} else {
				$(".row").eq(oldTail.y).find(".cell").eq(oldTail.x).attr("data-snakeID",null).removeClass('snake otherSnake');
			}
	    
	  });
	  
	  socket.on('snake died', function(snakeID) {
		  removeSnake(snakeID);
		});
	
		socket.on('update scoreboard', function(scores) {
			scores.sort(function(a, b){
			   return b.score - a.score;
			});
			
			if (scores.length) {
				$(".noPlayers").hide();
			} else {
				$(".noPlayers").show();
			}
			
			$("#scoreBoard .sbScore").remove();
			for (var i = 0; i < scores.length; i++) {
				$("<li />").text(scores[i].playerName + " - " + scores[i].score).addClass("sbScore").appendTo("#scoreBoard #Scorers");
			}
		});
		
		socket.on('new message', function(message) {
			var newMessage = $("<DIV />").html(message).addClass("message").prependTo("#Messages").hide().fadeIn('slow');
			
			setTimeout(function() {
				newMessage.fadeOut('slow', function() { $(this).remove(); });
			},3000);
		});
		
	}();
	
	
	// utility functions
	function newRandomNumber(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	function colorCell(x, y, theClass) {
		$(".row").eq(y).find(".cell").eq(x).addClass(theClass);
	}
	function unColorCell(x, y, theClass) {
		$(".row").eq(y).find(".cell").eq(x).removeClass(theClass);
	}
	function setSnakeID(x, y, snakeID) {
		$(".row").eq(y).find(".cell").eq(x).attr("data-snakeID",snakeID);
	}
	function checkCollison(needle, haystack) {
		for (var i = 0; i < haystack.length; i++) {
			if (needle.x === haystack[i].x && needle.y === haystack[i].y) {
				return true;
			}
		}
		
		return false;
	}
	function setCookie(cookieName, cookieValue, expDays) {
    var d = new Date();
    d.setTime(d.getTime() + (expDays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cookieName + "=" + cookieValue + "; " + expires;
	}
	function getCookie(cookieName) {
    var name = cookieName + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return null;
	}
});