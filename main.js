document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const startBtn = document.getElementById('start-btn');
    const timerDisplay = document.getElementById('timer');
    const bestTimeDisplay = document.getElementById('best-time');
    const resultDisplay = document.getElementById('result-display');

    let timer;
    let time = 0;
    let currentNumber = 1;
    let bestTime = localStorage.getItem('bestTime') || '--';
    bestTimeDisplay.textContent = bestTime;

    startBtn.addEventListener('click', startGame);

    function startGame() {
        resetGame();
        startBtn.style.display = 'none';
        spawnCircles();
        startTimer();
    }

    function resetGame() {
        time = 0;
        currentNumber = 1;
        timerDisplay.textContent = '0.00';
        resultDisplay.textContent = '';
        gameBoard.innerHTML = '';
        clearInterval(timer);
    }

    function startTimer() {
        const startTime = Date.now();
        timer = setInterval(() => {
            time = ((Date.now() - startTime) / 1000).toFixed(2);
            timerDisplay.textContent = time;
        }, 10);
    }

    let circlePositions = [];

    function spawnCircles() {
        circlePositions = [];
        for (let i = 1; i <= 10; i++) {
            const circle = document.createElement('div');
            circle.classList.add('circle');
            circle.textContent = i;
            circle.dataset.number = i;

            const { x, y } = getNonOverlappingRandomPosition();
            circlePositions.push({ x, y });
            
            circle.style.left = `${x}px`;
            circle.style.top = `${y}px`;

            circle.addEventListener('click', handleCircleClick);
            gameBoard.appendChild(circle);
        }
    }

    function getNonOverlappingRandomPosition() {
        let position;
        let overlaps;
        const circleSize = 50;
        const maxAttempts = 100;
        let attempts = 0;

        do {
            position = getRandomPosition();
            overlaps = circlePositions.some(existingPosition => {
                const distance = Math.sqrt(
                    Math.pow(position.x - existingPosition.x, 2) +
                    Math.pow(position.y - existingPosition.y, 2)
                );
                return distance < circleSize; // diameter
            });
            attempts++;
        } while (overlaps && attempts < maxAttempts);

        if (overlaps) {
            // Fallback if we can't find a non-overlapping position
            console.warn("Could not find a non-overlapping position. The circle may overlap.");
        }

        return position;
    }

    function getRandomPosition() {
        const boardWidth = gameBoard.clientWidth;
        const boardHeight = gameBoard.clientHeight;
        const circleSize = 50;

        const x = Math.random() * (boardWidth - circleSize);
        const y = Math.random() * (boardHeight - circleSize);

        return { x, y };
    }

    function handleCircleClick(e) {
        const clickedNumber = parseInt(e.target.dataset.number);

        if (clickedNumber === currentNumber) {
            e.target.remove();
            currentNumber++;

            if (currentNumber > 10) {
                endGame();
            }
        }
    }

    function endGame() {
        clearInterval(timer);
        resultDisplay.textContent = `Your time: ${time} seconds!`;

        if (bestTime === '--' || time < parseFloat(bestTime)) {
            bestTime = time;
            localStorage.setItem('bestTime', bestTime);
            bestTimeDisplay.textContent = bestTime;
            resultDisplay.textContent += ' New best time!';
        }

        gameBoard.innerHTML = '';
        startBtn.textContent = 'Play Again';
        startBtn.style.display = 'block';
    }
});