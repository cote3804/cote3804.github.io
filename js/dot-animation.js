class DotAnimation {
    constructor(columns = 20, rows = 15) {
        this.columns = columns;
        this.rows = rows;
        this.dots = [];
        this.isAnimating = true;
        this.animationSpeed = 50; // milliseconds
        this.time = 0;
        
        this.createGrid();
        this.startAnimation();
    }

    createGrid() {
        const grid = document.getElementById('pattern-grid');
        grid.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;
        
        // Clear existing dots
        grid.innerHTML = '';
        this.dots = [];

        // Create dots
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                const dot = document.createElement('div');
                dot.className = 'pattern-dot';
                dot.dataset.row = row;
                dot.dataset.col = col;
                grid.appendChild(dot);
                this.dots.push({
                    element: dot,
                    row: row,
                    col: col
                });
            }
        }
    }

    // This is the function you'll replace with your own logic
    calculateDotProperties(row, col, time) {
        // Example animation: wave pattern with color cycling
        const distance = Math.sqrt((row - this.rows/2)**2 + (col - this.columns/2)**2);
        const wave = Math.sin(distance * 0.3 - time * 0.05);
        
        // Calculate size (scale from 0.3 to 1.5)
        const size = 0.8 + wave * 0.4;
        
        // Calculate color (HSL with hue cycling)
        const hue = (time * 2 + distance * 10) % 360;
        const saturation = 70 + wave * 30;
        const lightness = 50 + wave * 20;
        
        return {
            size: size,
            color: `hsl(${hue}, ${saturation}%, ${lightness}%)`
        };
    }

    updateDots() {
        this.dots.forEach(dot => {
            const properties = this.calculateDotProperties(
                dot.row, 
                dot.col, 
                this.time
            );
            
            // Apply the calculated properties
            dot.element.style.transform = `scale(${properties.size})`;
            dot.element.style.backgroundColor = properties.color;
        });
        
        this.time++;
    }

    startAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }
        
        this.animationInterval = setInterval(() => {
            if (this.isAnimating) {
                this.updateDots();
            }
        }, this.animationSpeed);
    }

    toggleAnimation() {
        this.isAnimating = !this.isAnimating;
    }

    changeSpeed() {
        const speeds = [20, 50, 100, 200];
        const currentIndex = speeds.indexOf(this.animationSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;
        this.animationSpeed = speeds[nextIndex];
        this.startAnimation(); // Restart with new speed
    }

    destroy() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }
    }
}

