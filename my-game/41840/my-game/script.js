"use strict";

const today = new Date();
const dateElement = document.querySelector("#today-date");
const localDate = [
	today.getFullYear(),
	String(today.getMonth() + 1).padStart(2, "0"),
	String(today.getDate()).padStart(2, "0"),
].join("-");

dateElement.dateTime = localDate;
dateElement.textContent = new Intl.DateTimeFormat("ko-KR", {
	dateStyle: "long",
}).format(today);

const summaryElement = document.querySelector(".intro__summary");
const nameElement = document.querySelector("h1");
const originalSummary = "AI대해서 공부하고 배우는 사람";
const alternateSummary = "ai로 게임을 만드는 사람";
const originalName = nameElement.textContent;
const glitchCharacters = "アイウエオ#$%&01";
let glitchTimeout;
let nameGlitchTimeout;

function showAlternateSummary() {
	clearTimeout(glitchTimeout);
	summaryElement.classList.add("is-glitching");
	const endTime = Date.now() + 420;

	function updateGlitch() {
		const remainingTime = endTime - Date.now();

		if (remainingTime <= 0) {
			summaryElement.textContent = alternateSummary;
			summaryElement.classList.remove("is-glitching");
			return;
		}

		const progress = 1 - remainingTime / 420;
		summaryElement.textContent = [...alternateSummary]
			.map((character) => {
				if (Math.random() < progress) {
					return character;
				}

				return glitchCharacters[Math.floor(Math.random() * glitchCharacters.length)];
			})
			.join("");

		glitchTimeout = setTimeout(updateGlitch, 45);
	}

	updateGlitch();
}

function restoreOriginalSummary() {
	clearTimeout(glitchTimeout);
	summaryElement.classList.remove("is-glitching");
	summaryElement.textContent = originalSummary;
}

function showNameGlitch() {
	clearTimeout(nameGlitchTimeout);
	nameElement.classList.add("is-glitching");
	const endTime = Date.now() + 420;

	function updateNameGlitch() {
		const remainingTime = endTime - Date.now();

		if (remainingTime <= 0) {
			nameElement.textContent = originalName;
			return;
		}

		const progress = 1 - remainingTime / 420;
		nameElement.textContent = [...originalName]
			.map((character) => {
				if (Math.random() < progress) {
					return character;
				}

				return glitchCharacters[Math.floor(Math.random() * glitchCharacters.length)];
			})
			.join("");

		nameGlitchTimeout = setTimeout(updateNameGlitch, 45);
	}

	updateNameGlitch();
}

function restoreOriginalName() {
	clearTimeout(nameGlitchTimeout);
	nameElement.classList.remove("is-glitching");
	nameElement.textContent = originalName;
}

summaryElement.addEventListener("mouseenter", showAlternateSummary);
summaryElement.addEventListener("mouseleave", restoreOriginalSummary);
summaryElement.addEventListener("focus", showAlternateSummary);
summaryElement.addEventListener("blur", restoreOriginalSummary);
nameElement.addEventListener("mouseenter", showNameGlitch);
nameElement.addEventListener("mouseleave", restoreOriginalName);
nameElement.addEventListener("focus", showNameGlitch);
nameElement.addEventListener("blur", restoreOriginalName);

document.querySelectorAll(".game-idea").forEach((card) => {
	const steps = [...card.querySelectorAll(".game-idea__step")];
	let activeStep = 0;
	let cycleInterval;
	let revealTimeout;

	function showStep(stepIndex) {
		clearTimeout(revealTimeout);
		card.classList.add("is-active", "is-glitching");
		steps.forEach((step) => {
			step.hidden = true;
		});
		activeStep = stepIndex;
		revealTimeout = setTimeout(() => {
			steps[stepIndex].hidden = false;
			card.classList.remove("is-glitching");
		}, 220);
	}

	function startCycle() {
		if (cycleInterval) {
			return;
		}

		showStep(0);
		cycleInterval = setInterval(() => {
			showStep((activeStep + 1) % steps.length);
		}, 5000);
	}

	function stopCycle() {
		clearInterval(cycleInterval);
		clearTimeout(revealTimeout);
		cycleInterval = undefined;
		card.classList.remove("is-active", "is-glitching");
		steps.forEach((step) => {
			step.hidden = true;
		});
	}

	card.addEventListener("mouseenter", startCycle);
	card.addEventListener("mouseleave", stopCycle);
	card.addEventListener("focus", startCycle);
	card.addEventListener("blur", stopCycle);
});

const board = document.querySelector("#tower-board");
const boardContext = board.getContext("2d");
const gameStatus = document.querySelector("#game-status");
const stageValue = document.querySelector("#stage-value");
const goldValue = document.querySelector("#gold-value");
const healthValue = document.querySelector("#health-value");
const enemyValue = document.querySelector("#enemy-value");
const startButton = document.querySelector("#game-start");
const restartButton = document.querySelector("#game-restart");
const gameOverlay = document.querySelector("#game-overlay");
const overlayMessage = document.querySelector("#overlay-message");
const towerButtons = [...document.querySelectorAll("[data-tower]")];

const boardWidth = board.width;
const boardHeight = board.height;
const cellSize = 60;
const route = [
	{ x: 0, y: 90 },
	{ x: 600, y: 90 },
	{ x: 600, y: 210 },
	{ x: 120, y: 210 },
	{ x: 120, y: 330 },
	{ x: 720, y: 330 },
];
const towerTypes = {
	crossbow: { name: "석궁 타워", cost: 50, damage: 5, cooldown: 1, range: 165, color: "#f1c76b" },
	ice: { name: "아이스 타워", cost: 60, damage: 1, cooldown: 3, range: 135, splash: 58, slow: 2, color: "#78d5e8" },
};

let gameState = "ready";
let stage = 1;
let gold = 300;
let gateHealth = 12;
let enemiesToSpawn = 0;
let spawnTimer = 0;
let enemies = [];
let towers = [];
let shots = [];
let selectedTower = null;
let previousFrame = 0;

function updateGameLabels() {
	stageValue.textContent = `${stage} / 5`;
	goldValue.textContent = gold;
	healthValue.textContent = gateHealth;
	enemyValue.textContent = enemies.length + enemiesToSpawn;
	startButton.disabled = gameState === "playing" || gameState === "won" || gameState === "lost";
	startButton.textContent = gameState === "between" ? `스테이지 ${stage + 1} 시작` : "게임 시작";
	startButton.hidden = gameState === "won" || gameState === "lost";
	restartButton.hidden = gameState !== "won" && gameState !== "lost";
	towerButtons.forEach((button) => {
		button.setAttribute("aria-pressed", String(button.dataset.tower === selectedTower));
		button.disabled = gameState === "won" || gameState === "lost";
	});
}

function setGameMessage(message) {
	gameStatus.textContent = message;
}

function beginStage() {
	if (gameState === "between") {
		stage += 1;
	}

	gameState = "playing";
	enemiesToSpawn = 6 + stage * 2;
	spawnTimer = 0;
	gameOverlay.hidden = true;
	setGameMessage(`스테이지 ${stage}: 적 ${enemiesToSpawn}마리가 다가옵니다.`);
	updateGameLabels();
	previousFrame = 0;
	requestAnimationFrame(gameLoop);
}

function restartGame() {
	gameState = "ready";
	stage = 1;
	gold = 300;
	gateHealth = 12;
	enemiesToSpawn = 0;
	spawnTimer = 0;
	enemies = [];
	towers = [];
	shots = [];
	selectedTower = null;
	gameOverlay.hidden = true;
	setGameMessage("타워를 선택하고 보드의 빈 칸을 눌러 설치하세요.");
	updateGameLabels();
	drawBoard();
}

function finishStage() {
	if (stage === 5) {
		gameState = "won";
		gameOverlay.hidden = false;
		overlayMessage.textContent = "축하합니다! 5개 스테이지를 모두 지켰습니다.";
		setGameMessage("게임 클리어!");
	} else {
		gameState = "between";
		setGameMessage(`스테이지 ${stage} 클리어! 타워를 정비한 뒤 다음 스테이지를 시작하세요.`);
	}
	updateGameLabels();
}

function loseGame() {
	gameState = "lost";
	gameOverlay.hidden = false;
	overlayMessage.textContent = "성문이 무너졌습니다. 타워를 다시 배치해 도전해 보세요.";
	setGameMessage("게임 오버");
	updateGameLabels();
}

function distanceToSegment(point, start, end) {
	const deltaX = end.x - start.x;
	const deltaY = end.y - start.y;
	const lengthSquared = deltaX * deltaX + deltaY * deltaY;
	const projection = Math.max(0, Math.min(1, ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared));
	const nearestX = start.x + projection * deltaX;
	const nearestY = start.y + projection * deltaY;
	return Math.hypot(point.x - nearestX, point.y - nearestY);
}

function isRoad(point) {
	return route.slice(1).some((end, index) => distanceToSegment(point, route[index], end) < 37);
}

function placeTower(event) {
	if (!selectedTower || gameState === "won" || gameState === "lost") {
		return;
	}

	const bounds = board.getBoundingClientRect();
	const point = {
		x: ((event.clientX - bounds.left) / bounds.width) * boardWidth,
		y: ((event.clientY - bounds.top) / bounds.height) * boardHeight,
	};
	const towerPosition = {
		x: Math.floor(point.x / cellSize) * cellSize + cellSize / 2,
		y: Math.floor(point.y / cellSize) * cellSize + cellSize / 2,
	};

	if (towerPosition.x >= boardWidth || towerPosition.y >= boardHeight || isRoad(towerPosition)) {
		setGameMessage("길 위에는 타워를 설치할 수 없습니다. 빈 땅을 선택하세요.");
		return;
	}

	if (towers.some((tower) => Math.hypot(tower.x - towerPosition.x, tower.y - towerPosition.y) < 1)) {
		setGameMessage("이미 타워가 있는 자리입니다. 다른 칸을 선택하세요.");
		return;
	}

	const type = towerTypes[selectedTower];
	if (gold < type.cost) {
		setGameMessage(`${type.name} 설치에는 ${type.cost}원이 필요합니다.`);
		return;
	}

	gold -= type.cost;
	towers.push({ ...type, type: selectedTower, x: towerPosition.x, y: towerPosition.y, cooldownLeft: 0 });
	setGameMessage(`${type.name} 설치 완료! 남은 골드 ${gold}원.`);
	updateGameLabels();
	drawBoard();
}

function spawnEnemy() {
	const maxHealth = 10 + stage * 4;
	enemies.push({
		x: route[0].x,
		y: route[0].y,
		segment: 0,
		progress: 0,
		health: maxHealth,
		maxHealth,
		speed: 54 + stage * 4,
		slowLeft: 0,
		dead: false,
	});
	enemiesToSpawn -= 1;
	updateGameLabels();
}

function damageEnemy(enemy, damage) {
	enemy.health -= damage;
	if (enemy.health <= 0 && !enemy.dead) {
		enemy.dead = true;
		gold += 9 + stage;
		updateGameLabels();
	}
}

function updateEnemies(deltaTime) {
	enemies.forEach((enemy) => {
		if (enemy.dead || gameState !== "playing") {
			return;
		}

		if (enemy.slowLeft > 0) {
			enemy.slowLeft = Math.max(0, enemy.slowLeft - deltaTime);
		}
		let distanceLeft = enemy.speed * (enemy.slowLeft > 0 ? 0.6 : 1) * deltaTime;

		while (distanceLeft > 0 && enemy.segment < route.length - 1) {
			const start = route[enemy.segment];
			const end = route[enemy.segment + 1];
			const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
			const remaining = segmentLength * (1 - enemy.progress);
			if (distanceLeft < remaining) {
				enemy.progress += distanceLeft / segmentLength;
				distanceLeft = 0;
			} else {
				distanceLeft -= remaining;
				enemy.segment += 1;
				enemy.progress = 0;
			}
		}

		if (enemy.segment >= route.length - 1) {
			enemy.dead = true;
			gateHealth -= 1;
			updateGameLabels();
			if (gateHealth <= 0) {
				loseGame();
			}
			return;
		}

		const start = route[enemy.segment];
		const end = route[enemy.segment + 1];
		enemy.x = start.x + (end.x - start.x) * enemy.progress;
		enemy.y = start.y + (end.y - start.y) * enemy.progress;
	});
}

function updateTowers(deltaTime) {
	towers.forEach((tower) => {
		tower.cooldownLeft -= deltaTime;
		if (tower.cooldownLeft > 0) {
			return;
		}

		const targets = enemies
			.filter((enemy) => !enemy.dead && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= tower.range)
			.sort((first, second) => second.segment + second.progress - (first.segment + first.progress));
		const target = targets[0];
		if (!target) {
			return;
		}

		tower.cooldownLeft = tower.cooldown;
		if (tower.type === "ice") {
			targets
				.filter((enemy) => Math.hypot(enemy.x - target.x, enemy.y - target.y) <= tower.splash)
				.forEach((enemy) => {
					enemy.slowLeft = Math.max(enemy.slowLeft, tower.slow);
					damageEnemy(enemy, tower.damage);
				});
			shots.push({ x1: tower.x, y1: tower.y, x2: target.x, y2: target.y, color: tower.color, life: 0.2 });
		} else {
			damageEnemy(target, tower.damage);
			shots.push({ x1: tower.x, y1: tower.y, x2: target.x, y2: target.y, color: tower.color, life: 0.12 });
		}
	});
}

function updateGame(deltaTime) {
	spawnTimer += deltaTime;
	if (enemiesToSpawn > 0 && spawnTimer >= 0.9) {
		spawnTimer -= 0.9;
		spawnEnemy();
	}

	updateEnemies(deltaTime);
	if (gameState !== "playing") {
		return;
	}
	updateTowers(deltaTime);
	enemies = enemies.filter((enemy) => !enemy.dead);
	shots = shots.filter((shot) => {
		shot.life -= deltaTime;
		return shot.life > 0;
	});
	updateGameLabels();

	if (enemiesToSpawn === 0 && enemies.length === 0) {
		finishStage();
	}
}

function drawBoard() {
	boardContext.clearRect(0, 0, boardWidth, boardHeight);
	boardContext.fillStyle = "#14231c";
	boardContext.fillRect(0, 0, boardWidth, boardHeight);
	boardContext.strokeStyle = "rgba(177, 207, 183, 0.09)";
	boardContext.lineWidth = 1;
	for (let x = cellSize; x < boardWidth; x += cellSize) {
		boardContext.beginPath();
		boardContext.moveTo(x, 0);
		boardContext.lineTo(x, boardHeight);
		boardContext.stroke();
	}
	for (let y = cellSize; y < boardHeight; y += cellSize) {
		boardContext.beginPath();
		boardContext.moveTo(0, y);
		boardContext.lineTo(boardWidth, y);
		boardContext.stroke();
	}

	boardContext.beginPath();
	boardContext.moveTo(route[0].x, route[0].y);
	route.slice(1).forEach((point) => boardContext.lineTo(point.x, point.y));
	boardContext.lineCap = "round";
	boardContext.lineJoin = "round";
	boardContext.strokeStyle = "#42533f";
	boardContext.lineWidth = 50;
	boardContext.stroke();
	boardContext.strokeStyle = "#75694f";
	boardContext.lineWidth = 40;
	boardContext.stroke();
	boardContext.fillStyle = "#d2dfcf";
	boardContext.font = "bold 13px sans-serif";
	boardContext.fillText("입구", 12, 65);
	boardContext.fillText("성문", 674, 306);

	towers.forEach((tower) => {
		boardContext.beginPath();
		boardContext.arc(tower.x, tower.y, 19, 0, Math.PI * 2);
		boardContext.fillStyle = "#1b2822";
		boardContext.fill();
		boardContext.lineWidth = 4;
		boardContext.strokeStyle = tower.color;
		boardContext.stroke();
		boardContext.beginPath();
		boardContext.arc(tower.x, tower.y, 6, 0, Math.PI * 2);
		boardContext.fillStyle = tower.color;
		boardContext.fill();
	});

	enemies.forEach((enemy) => {
		boardContext.beginPath();
		boardContext.arc(enemy.x, enemy.y, 11, 0, Math.PI * 2);
		boardContext.fillStyle = enemy.slowLeft > 0 ? "#72d8e8" : "#e97762";
		boardContext.fill();
		boardContext.fillStyle = "#18201c";
		boardContext.fillRect(enemy.x - 12, enemy.y - 19, 24, 4);
		boardContext.fillStyle = "#a8d783";
		boardContext.fillRect(enemy.x - 12, enemy.y - 19, 24 * Math.max(0, enemy.health / enemy.maxHealth), 4);
	});

	shots.forEach((shot) => {
		boardContext.beginPath();
		boardContext.moveTo(shot.x1, shot.y1);
		boardContext.lineTo(shot.x2, shot.y2);
		boardContext.strokeStyle = shot.color;
		boardContext.globalAlpha = Math.min(1, shot.life * 7);
		boardContext.lineWidth = 3;
		boardContext.stroke();
		boardContext.globalAlpha = 1;
	});
}

function gameLoop(timestamp) {
	const deltaTime = previousFrame === 0 ? 0 : Math.min((timestamp - previousFrame) / 1000, 0.05);
	previousFrame = timestamp;
	if (gameState === "playing") {
		updateGame(deltaTime);
	}
	drawBoard();
	if (gameState === "playing") {
		requestAnimationFrame(gameLoop);
	}
}

towerButtons.forEach((button) => {
	button.addEventListener("click", () => {
		if (gameState === "won" || gameState === "lost") {
			return;
		}
		selectedTower = selectedTower === button.dataset.tower ? null : button.dataset.tower;
		towerButtons.forEach((towerButton) => {
			towerButton.setAttribute("aria-pressed", String(towerButton.dataset.tower === selectedTower));
		});
		setGameMessage(selectedTower ? `${towerTypes[selectedTower].name}을(를) 선택했습니다. 보드의 빈 칸을 누르세요.` : "타워 선택을 취소했습니다.");
	});
});

board.addEventListener("click", placeTower);
startButton.addEventListener("click", beginStage);
restartButton.addEventListener("click", restartGame);
updateGameLabels();
drawBoard();