var socket = io();

$(function() {
	var gameDelay = 100;
	var columns = 50;
	var rows = 50;
	var gameOver = false;
	
 	$("#startGamePop").show();
	
	for (var r = 0; r < rows; r++) {
		
		var thisRow = $("<DIV />").addClass("row");
		
		thisRow.appendTo("#board");
		
		for (var c = 0; c < columns; c++) {
			
			$("<DIV />").addClass("cell").appendTo(thisRow);
			
		}
		
	}

	var foodOnBoard = [];
	var initSnakeLength = 3;
	var snake = [];
	var direction = newRandomNumber(0, 3);
	var nextDirection = direction;
	var score = 0;
	var myInfo = {
		id: 1,
		playerName: 'Mike'
	};

	var gameLogic = function() {
		
		var addTail = function(lastSegment) {
			var newSegmentX = lastSegment.x;
			var newSegmentY = lastSegment.y;
			var newSegment = { x: newSegmentX, y: newSegmentY };

			switch(direction) {
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
			
			return newSegment;
		};
		
		var spawnFood = function(numOfPieces) {

			var newFood = function() {
				
				var food = { x: newRandomNumber(0, columns - 1), y: newRandomNumber(0, rows - 1) };
				
				var badPlace = checkCollison(food, snake) && checkCollison(food, foodOnBoard);
				
				if (!badPlace) {
					colorCell(food.x, food.y, "food");
					foodOnBoard.push(food);
					
					// call socket "food added"
				} else {
					newFood();
				}
			};
			
			for (var i = 0; i < numOfPieces; i++) {
				newFood();
			}
		};
		
		var placeFood = function() {
			for (var i = 0; i < foodOnBoard.length; i++) {
				colorCell(foodOnBoard[i].x, foodOnBoard[i].y, "food");
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
			
			// call socket "food eaten"
		};
		
		var removeSnake = function(snakeID) {
			$(".cell.snake[data-snakeID=" + snakeID + "]").removeClass("snake otherSnake").attr("data-snakeID",null);
		};
		
		var updateScore = function() {
			$(".score").text(score);
		};
		
		var moveSnake = function() {
			if (direction !== nextDirection) {
				direction = nextDirection;
			}
			
			var headOfSnake = snake[0];
			var headOfSnakeX = headOfSnake.x;
			var headOfSnakeY = headOfSnake.y;
			
			var newHeadOfSnake = { x: headOfSnakeX, y: headOfSnakeY };
			
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
			
			var snakeNoHead = snake.slice(0);
			snakeNoHead.unshift(0); //force a copy instead of a reference 
			
			var ateMyself = checkCollison(newHeadOfSnake, snakeNoHead); //check if the snake hit itself
			
			if (ateMyself) {
				gameOver = true;
			}
			
			if (gameOver) {
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
				
				setTimeout(function() { removeSnake(myInfo.id); }, 500);
				
				$("#gameOverPop").show();

				return false; // end the game loop
			}
			
			colorCell(newHeadOfSnake.x, newHeadOfSnake.y, "snake"); // add the head to the DOM
			setSnakeID(newHeadOfSnake.x, newHeadOfSnake.y, myInfo.id);
		
			snake.unshift(newHeadOfSnake); // add the new head to the snake object
		
			var ateFood = checkCollison(newHeadOfSnake, foodOnBoard); // check if the snake hit food
			
			if (ateFood) {
				
				foodEaten(newHeadOfSnake);
				
				spawnFood(1); // add a new piece of food
				
				score++; // increment the score
				
				updateScore(); // update the DOM to reflect the new score
			} else {
				// if they didn't eat food remove the tail to keep the snake the same length. If they did eat food keep the tail so the snake grows by one segment
				
				unColorCell(snake[snake.length - 1].x, snake[snake.length - 1].y, "snake");
				setSnakeID(snake[snake.length - 1].x, snake[snake.length - 1].y, null);
				snake.pop(); 
			}				
		
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
			$(".cell").removeClass("snake");
			
			snake = [];

			gameOver = false;
			score = 0;
			
			updateScore();
			
			var snakeStartingPointX = newRandomNumber(10, columns-10);
			var snakeStartingPointY = newRandomNumber(10, rows-10);
			
			var lastSegment = {x: snakeStartingPointX, y: snakeStartingPointY};
			
			for (var s = 0; s < initSnakeLength; s++) {
				
				var newSegment = addTail(lastSegment);
				setSnakeID(newSegment.x, newSegment.y, myInfo.id);
				colorCell(newSegment.x, newSegment.y, "snake");
				
				newSegmentX = newSegment.x;
				newSegmentY = newSegment.y;
				lastSegment = { x: newSegmentX, y: newSegmentY };
			}
			
			moveSnake();
		}
				
		$(".startGameBtn").click(function() {
			var playerName = $(".playerName").val();
			
			if (playerName === '') {
				$(".playerName").addClass("error");
				return false;	
			} else {
				$(".playerName").removeClass("error");
			}
			
			myInfo.playerName = playerName;
			
			$("#startGamePop").hide();
			
			if (!foodOnBoard.length) {
				spawnFood(5);
			} else {
				placeFood();
			}
			
			startNewGame();
		});
		
		$(".newGameBtn").click(function() {
			$("#gameOverPop").hide();
			startNewGame();
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