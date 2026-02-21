class Game2048 {
    constructor() {
        this.grid = Array(16).fill(0);
        this.score = 0;
        this.bestScore = 0;
        this.history = [];
        this.boardElement = document.getElementById('tile-container');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('best-score');
        this.gameOverOverlay = document.getElementById('game-over');
        
        this.loadBestScore();
        this.init();
    }

    init() {
        this.grid = Array(16).fill(0);
        this.score = 0;
        this.history = [];
        this.updateScore(0);
        this.gameOverOverlay.classList.add('hidden');
        this.boardElement.innerHTML = '';
        this.addRandomTile();
        this.addRandomTile();
        this.render();
    }

    loadBestScore() {
        chrome.storage.local.get(['bestScore'], (result) => {
            if (result.bestScore) {
                this.bestScore = result.bestScore;
                this.bestScoreElement.textContent = this.bestScore;
            }
        });
    }

    saveBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreElement.textContent = this.bestScore;
            chrome.storage.local.set({ bestScore: this.bestScore });
        }
    }

    addRandomTile() {
        const emptyCells = this.grid
            .map((val, idx) => (val === 0 ? idx : null))
            .filter((val) => val !== null);
        
        if (emptyCells.length > 0) {
            const randomIdx = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[randomIdx] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    render() {
        this.boardElement.innerHTML = '';
        this.grid.forEach((value, idx) => {
            if (value !== 0) {
                const tile = document.createElement('div');
                tile.className = `tile tile-${value}`;
                tile.textContent = value;
                
                const row = Math.floor(idx / 4);
                const col = idx % 4;
                
                // 10px gap, 67.5px tile size, 10px padding
                tile.style.top = `${row * 77.5 + 10}px`;
                tile.style.left = `${col * 77.5 + 10}px`;
                
                this.boardElement.appendChild(tile);
            }
        });
    }

    updateScore(points) {
        this.score += points;
        this.scoreElement.textContent = this.score;
        this.saveBestScore();
    }

    saveHistory() {
        this.history.push({
            grid: [...this.grid],
            score: this.score
        });
        if (this.history.length > 10) this.history.shift(); // Keep last 10 moves
    }

    undo() {
        if (this.history.length > 0) {
            const prevState = this.history.pop();
            this.grid = prevState.grid;
            this.score = prevState.score;
            this.scoreElement.textContent = this.score;
            this.render();
            this.gameOverOverlay.classList.add('hidden');
        }
    }

    move(direction) {
        const prevGrid = [...this.grid];
        let moved = false;
        let pointsEarned = 0;

        this.saveHistory();

        if (direction === 'left' || direction === 'right') {
            for (let r = 0; r < 4; r++) {
                const row = this.grid.slice(r * 4, r * 4 + 4);
                const { newRow, score } = this.processLine(row, direction === 'right');
                for (let c = 0; c < 4; c++) {
                    this.grid[r * 4 + c] = newRow[c];
                }
                pointsEarned += score;
            }
        } else {
            for (let c = 0; c < 4; c++) {
                const col = [this.grid[c], this.grid[c + 4], this.grid[c + 8], this.grid[c + 12]];
                const { newRow: newCol, score } = this.processLine(col, direction === 'down');
                for (let r = 0; r < 4; r++) {
                    this.grid[r * 4 + c] = newCol[r];
                }
                pointsEarned += score;
            }
        }

        moved = this.grid.some((val, i) => val !== prevGrid[i]);

        if (moved) {
            this.addRandomTile();
            this.updateScore(pointsEarned);
            this.render();
            if (this.isGameOver()) {
                this.gameOverOverlay.classList.remove('hidden');
            }
        } else {
            this.history.pop(); // Remove the saved state if no move occurred
        }
    }

    processLine(line, reverse) {
        if (reverse) line.reverse();
        
        // Filter out zeros
        let filtered = line.filter(x => x !== 0);
        let score = 0;
        
        // Merge
        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i + 1]) {
                filtered[i] *= 2;
                score += filtered[i];
                filtered.splice(i + 1, 1);
            }
        }
        
        // Pad with zeros
        while (filtered.length < 4) {
            filtered.push(0);
        }
        
        if (reverse) filtered.reverse();
        return { newRow: filtered, score };
    }

    isGameOver() {
        if (this.grid.includes(0)) return false;
        
        for (let i = 0; i < 16; i++) {
            const row = Math.floor(i / 4);
            const col = i % 4;
            
            // Check right
            if (col < 3 && this.grid[i] === this.grid[i + 1]) return false;
            // Check down
            if (row < 3 && this.grid[i] === this.grid[i + 4]) return false;
        }
        
        return true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game2048();

    window.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp': case 'w': game.move('up'); break;
            case 'ArrowDown': case 's': game.move('down'); break;
            case 'ArrowLeft': case 'a': game.move('left'); break;
            case 'ArrowRight': case 'd': game.move('right'); break;
        }
    });

    document.getElementById('restart-btn').addEventListener('click', () => game.init());
    document.getElementById('try-again-btn').addEventListener('click', () => game.init());
    document.getElementById('undo-btn').addEventListener('click', () => game.undo());
    document.getElementById('overlay-undo-btn').addEventListener('click', () => game.undo());
});
