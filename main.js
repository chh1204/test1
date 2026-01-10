document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const lottoNumbersDiv = document.getElementById('lotto-numbers');
    const copyFeedback = document.getElementById('copy-feedback');
    let generatedNumbers = [];

    const colorPalettes = [
        ['#ff9a9e', '#fad0c4'], // 0-10
        ['#a1c4fd', '#c2e9fb'], // 11-20
        ['#d4fc79', '#96e6a1'], // 21-30
        ['#f6d365', '#fda085'], // 31-40
        ['#f093fb', '#f5576c']  // 41-45
    ];

    generateBtn.addEventListener('click', () => {
        lottoNumbersDiv.innerHTML = '';
        copyFeedback.style.opacity = 0;
        generatedNumbers = [];

        const numbers = new Set();
        while (numbers.size < 6) {
            numbers.add(Math.floor(Math.random() * 45) + 1);
        }

        generatedNumbers = Array.from(numbers).sort((a, b) => a - b);

        generatedNumbers.forEach((number, index) => {
            const numberSpan = document.createElement('span');
            numberSpan.className = 'number';
            numberSpan.textContent = number;

            const paletteIndex = Math.floor((number - 1) / 10);
            const colors = colorPalettes[paletteIndex];
            numberSpan.style.background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
            
            lottoNumbersDiv.appendChild(numberSpan);

            setTimeout(() => {
                numberSpan.classList.add('visible');
            }, index * 150);
        });
    });

    lottoNumbersDiv.addEventListener('click', () => {
        if (generatedNumbers.length === 0) return;

        const numbersString = generatedNumbers.join(', ');
        navigator.clipboard.writeText(numbersString).then(() => {
            copyFeedback.textContent = '✅ 번호가 복사되었습니다!';
            copyFeedback.style.opacity = 1;
            setTimeout(() => {
                copyFeedback.style.opacity = 0;
            }, 2000);
        }).catch(err => {
            console.error('복사 실패:', err);
            copyFeedback.textContent = '복사에 실패했습니다.';
            copyFeedback.style.opacity = 1;
        });
    });
});
