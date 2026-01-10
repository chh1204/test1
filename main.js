      document.addEventListener('DOMContentLoaded', () => {
          const lottoBoard = document.getElementById('lotto-board');
          const generateBtn = document.getElementById('generate-btn');
          const numberOfRows = 10;

          // Initialize the board with empty rows
          for (let i = 0; i < numberOfRows; i++) {
              const row = document.createElement('div');
              row.classList.add('lotto-row');
              lottoBoard.appendChild(row);
          }

          generateBtn.addEventListener('click', () => {
              if (generateBtn.textContent === '다시 뽑기') {
                  resetBoard();
              } else {
                  startGeneration();
              }
          });

          function startGeneration() {
              generateBtn.disabled = true;
              generateBtn.textContent = '생성 중...';
              resetBoard(false); // Clear board without resetting button

              let currentRow = 0;
              const interval = setInterval(() => {
                  if (currentRow < numberOfRows) {
                      generateLottoNumbers(currentRow);
                      currentRow++;
                  } else {
                      clearInterval(interval);
                      generateBtn.disabled = false;
                      generateBtn.textContent = '다시 뽑기';
                  }
              }, 200); // 200ms interval for each row to appear
          }

          function generateLottoNumbers(rowIndex) {
              const numbers = new Set();
              while (numbers.size < 6) {
                  numbers.add(Math.floor(Math.random() * 45) + 1);
              }

              const sortedNumbers = Array.from(numbers).sort((a, b) => a - b);
              displayNumbers(rowIndex, sortedNumbers);
          }

          function displayNumbers(rowIndex, numbers) {
              const row = lottoBoard.children[rowIndex];
              row.innerHTML = ''; // Clear previous content
              row.classList.add('filled');

              numbers.forEach(number => {
                  const circle = document.createElement('div');
                  circle.classList.add('number-circle');
                  circle.textContent = number;
                  circle.style.backgroundColor = getNumberColor(number);
                  row.appendChild(circle);
              });
          }

          function getNumberColor(number) {
              if (number <= 10) return '#fbc400'; // Yellow
              if (number <= 20) return '#69c8f2'; // Blue
              if (number <= 30) return '#ff7272'; // Red
              if (number <= 40) return '#aaaaaa'; // Gray
              return '#b0d840'; // Green
          }

          function resetBoard(resetButton = true) {
              Array.from(lottoBoard.children).forEach(row => {
                  row.innerHTML = '';
                  row.classList.remove('filled');
              });

              if (resetButton) {
                generateBtn.disabled = false;
                generateBtn.textContent = '행운의 번호 생성';
              }
          }
      });