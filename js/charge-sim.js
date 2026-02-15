// charge-sim.js
// Port of scripts/charge_sim.py (simplified & adapted for browser realtime)

class Grid {
    constructor(shape) {
        this.rows = shape[0];
        this.cols = shape[1];
        this.grid = new Float32Array(this.rows * this.cols).fill(0);
        this._iterator = null;
    }

    index(i, j) { return i * this.cols + j; }

    get(i, j) { return this.grid[this.index(i, j)]; }
    set(i, j, v) { this.grid[this.index(i, j)] = v; }

    placeCharge() {
        const x = Math.floor(Math.random() * this.rows);
        const y = Math.floor(Math.random() * this.cols);
        const idx = this.index(x, y);
        this.grid[idx] += 1.0;
    }

    iterator() {
        if (this._iterator) return this._iterator;
        const it = [];
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const neighbors = [
                    [i+1,j],[i-1,j],[i,j+1],[i,j-1],
                    [i+1,j+1],[i-1,j-1],[i+1,j-1],[i-1,j+1]
                ];
                for (const [k,l] of neighbors) {
                    if (k < 0 || k >= this.rows || l < 0 || l >= this.cols) continue;
                    it.push([i,j,k,l]);
                }
            }
        }
        this._iterator = it;
        return it;
    }

    copy() {
        const g = new Grid([this.rows, this.cols]);
        g.grid.set(this.grid);
        g._iterator = this._iterator;
        return g;
    }
}

class Poisson {
    constructor(grid, E=null) {
        this.q = grid;
        this.E = E || new Float32Array(grid.rows * grid.cols).fill(0);
        this.epsilon = 2.0;
    }

    static fromChargeGrid(grid) {
        const e = new Float32Array(grid.rows * grid.cols).fill(0);
        const obj = new Poisson(grid, e);
        obj.calculateE();
        return obj;
    }

    idx(i,j) { return i * this.q.cols + j; }

    calculateE() {
        // reset field before accumulation to avoid unbounded growth
        this.E.fill(0);
        const it = this.q.iterator();
        for (const [i,j,k,l] of it) {
            const sumKL = k + l;
            const sumIJ = i + j;
            const d = (sumKL < sumIJ - 1 || sumKL > sumIJ + 1) ? Math.SQRT2 : 1;
            const idx_ij = this.idx(i,j);
            const idx_kl = this.idx(k,l);
            const qkl = this.q.grid[idx_kl];
            const qij = this.q.grid[idx_ij];
            const diff = (Number.isFinite(qkl) ? qkl : 0) - (Number.isFinite(qij) ? qij : 0);
            this.E[idx_ij] += (diff / (d * this.epsilon)) / 8;
        }
    }
}

class Transport {
    constructor(grid, E, mu=0.5, friction=0.01) {
        this.q = grid;
        this.E = E; // Float32Array
        this.mu = mu;
        this.friction = friction;
    }

    idx(i,j) { return i * this.q.cols + j; }

    calculateCharge() {
        const _q = this.q.copy();
        const it = this.q.iterator();
        for (const [i,j,k,l] of it) {
            const sumKL = k + l;
            const sumIJ = i + j;
            const d = (sumKL < sumIJ - 1 || sumKL > sumIJ + 1) ? Math.SQRT2 : 1;
            const idx_ij = this.idx(i,j);
            const idx_kl = this.idx(k,l);

            let qij = this.q.grid[idx_ij];
            if (!Number.isFinite(qij)) qij = 0;

            let Ei = this.E[idx_ij];
            if (!Number.isFinite(Ei)) Ei = 0;

            const Q = Math.min(((Ei * this.mu * qij) / 8), qij / 8);
            const loss = (d * this.friction * qij);

            if (!Number.isFinite(Q) || !Number.isFinite(loss)) continue;

            _q.grid[idx_kl] += (Q - loss);
            _q.grid[idx_ij] -= Q;
        }

        // Boundaries drain
        for (let i = 0; i < this.q.rows; i++) {
            for (let j = 0; j < this.q.cols; j++) {
                const idx = this.idx(i,j);
                let qij = this.q.grid[idx];
                if (!Number.isFinite(qij)) qij = 0;
                let Ei = this.E[idx];
                if (!Number.isFinite(Ei)) Ei = 0;
                const Q = ((Ei * this.mu * qij) / 8);
                if (!Number.isFinite(Q)) continue;
                if ((i === 0 || i === this.q.rows - 1) && (j === 0 || j === this.q.cols - 1)) {
                    _q.grid[idx] -= 1 * Q;
                } else if (i === 0 || i === this.q.rows - 1 || j === 0 || j === this.q.cols - 1) {
                    _q.grid[idx] -= 1 * Q;
                }
            }
        }

        // sanitize values and copy back
        for (let n = 0; n < _q.grid.length; n++) {
            let v = _q.grid[n];
            if (!Number.isFinite(v)) v = 0;
            _q.grid[n] = v;
        }

        this.q.grid.set(_q.grid);
    }
}

class Simulator {
    constructor(grid, mu=0.5, friction=0.01) {
        this.grid = grid;
        this.pois = Poisson.fromChargeGrid(grid);
        this.trans = new Transport(grid, this.pois.E, mu, friction);
        this._step_hooks = [];
    }

    attachStepHook(hook, target="charge") {
        this._step_hooks.push([hook, target]);
    }

    _step(stepIndex) {
        this.pois.calculateE();
        this.trans.calculateCharge();
    }

    runStep(stepIndex, charge_threshold=0.1) {
        this._step(stepIndex);
        const p_charge = Math.random();
        if (p_charge < charge_threshold) this.grid.placeCharge();
        for (const [hook, target] of this._step_hooks) {
            if (target === 'field') hook(this.pois.E, stepIndex);
            else hook(this.grid, stepIndex);
        }
    }
}

// Rendering & UI glue
function createColorMap(value, vmin=-0.5, vmax=0.5) {
    // map value to hue (240=blue to 0=red)
    const t = Math.max(-1, Math.min(1, (value - (vmin+vmax)/2) / ((vmax - vmin)/2)));
    const hue = 240 * (1 - (t + 1) / 2); // 240 (blue) to 0 (red)
    return `hsl(${hue}, 100%, 50%)`;
}

export function setupChargeSim(opts={}) {
    const rows = opts.rows || 10;
    const cols = opts.cols || 10;
    const canvas = document.getElementById(opts.canvasId || 'charge-canvas');
    const container = document.getElementById(opts.containerId || 'charge-grid');
    const startBtn = document.getElementById(opts.startId || 'sim-start');
    const stopBtn = document.getElementById(opts.stopId || 'sim-stop');
    const speedEl = document.getElementById(opts.speedId || 'sim-speed');
    const placeBtn = document.getElementById(opts.placeId || 'sim-place');
    const chargeThresholdEl = document.getElementById(opts.chargeThresholdId || 'sim-charge-threshold');

    let ctx = null;
    if (canvas) {
        canvas.width = opts.pixelSize * cols || 20 * cols;
        canvas.height = opts.pixelSize * rows || 20 * rows;
        ctx = canvas.getContext('2d');
    }

    const grid = new Grid([rows, cols]);
    grid.placeCharge();
    const sim = new Simulator(grid, opts.mu || 0.001, opts.friction || 100);

    // DOM rendering setup (pattern-dot style)
    let dotElements = null;
    if (container) {
        // create grid of dots
        container.style.gridTemplateColumns = `repeat(${cols+1}, 1fr)`;
        container.style.gridTemplateRows = `repeat(${rows+1}, 1fr)`;
        container.innerHTML = '';
        dotElements = [];
        for (let i = 0; i <= rows; i++) {
            for (let j = 0; j <= cols; j++) {
                const d = document.createElement('div');
                d.className = 'pattern-dot';
                d.dataset.vi = i;
                d.dataset.vj = j;
                // ensure transform origin center for scale
                d.style.transformOrigin = 'center';
                container.appendChild(d);
                dotElements.push(d);
            }
        }
    }

    let running = false;
    let interval = null;

    function drawGrid() {
        if (container && dotElements) {
            // DOM-based rendering: update each dot's color and scale
            // compute vmin/vmax
            let vmin = Infinity, vmax = -Infinity;
            for (let n = 0; n < grid.grid.length; n++) {
                const v = grid.grid[n];
                if (v < vmin) vmin = v;
                if (v > vmax) vmax = v;
            }
            const vabsMax = Math.max(Math.abs(vmin), Math.abs(vmax), 1e-6);

            for (const d of dotElements) {
                const vi = Number(d.dataset.vi);
                const vj = Number(d.dataset.vj);
                let sum = 0, count = 0;
                for (let di = -1; di <= 0; di++) {
                    for (let dj = -1; dj <= 0; dj++) {
                        const ci = vi + di;
                        const cj = vj + dj;
                        if (ci >= 0 && ci < rows && cj >= 0 && cj < cols) {
                            sum += grid.get(ci, cj);
                            count++;
                        }
                    }
                }
                const val = count > 0 ? sum / count : 0;
                const color = createColorMap(val, -vabsMax, vabsMax);
                const mag = Math.min(1, Math.abs(val) / vabsMax);
                const scale = 0.6 + mag * 1.4; // scale for CSS transform
                d.style.backgroundColor = color;
                d.style.transform = `scale(${scale})`;
            }
            return;
        }

        // fallback canvas rendering if no container
        if (!ctx) return;
        // draw circles at grid vertices; vertex value = average of adjacent cell values
        const cellW = canvas.width / cols;
        const cellH = canvas.height / rows;

        // compute magnitude scale from grid values
        let vmin = Infinity, vmax = -Infinity;
        for (let n = 0; n < grid.grid.length; n++) {
            const v = grid.grid[n];
            if (v < vmin) vmin = v;
            if (v > vmax) vmax = v;
        }
        const vabsMax = Math.max(Math.abs(vmin), Math.abs(vmax), 1e-6);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // optional faint grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= rows; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * cellH);
            ctx.lineTo(canvas.width, i * cellH);
            ctx.stroke();
        }
        for (let j = 0; j <= cols; j++) {
            ctx.beginPath();
            ctx.moveTo(j * cellW, 0);
            ctx.lineTo(j * cellW, canvas.height);
            ctx.stroke();
        }

        // vertex layout: (rows+1) x (cols+1)
        const baseR = Math.min(cellW, cellH) * 0.08;
        const maxR = Math.min(cellW, cellH) * 0.45;
        for (let vi = 0; vi <= rows; vi++) {
            for (let vj = 0; vj <= cols; vj++) {
                // average adjacent cells: offsets (-1,-1), (-1,0), (0,-1), (0,0)
                let sum = 0, count = 0;
                for (let di = -1; di <= 0; di++) {
                    for (let dj = -1; dj <= 0; dj++) {
                        const ci = vi + di;
                        const cj = vj + dj;
                        if (ci >= 0 && ci < rows && cj >= 0 && cj < cols) {
                            sum += grid.get(ci, cj);
                            count++;
                        }
                    }
                }
                const val = count > 0 ? sum / count : 0;

                // color and radius
                const color = createColorMap(val, -vabsMax, vabsMax);
                const mag = Math.min(1, Math.abs(val) / vabsMax);
                const r = baseR + mag * (maxR - baseR);

                const cx = vj * cellW;
                const cy = vi * cellH;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.stroke();
            }
        }
    }

    function onStep(i) {
        drawGrid();
    }

    sim.attachStepHook(onStep, 'charge');

    function start() {
        if (running) return;
        running = true;
        const speed = Number(speedEl ? speedEl.value : 50);
        const intervalMs = Math.max(10, 200 - speed); // convert slider to ms
        interval = setInterval(() => {
            const threshold = chargeThresholdEl ? Number(chargeThresholdEl.value) : 0.1;
            sim.runStep(0, threshold);
        }, intervalMs);
    }

    function stop() {
        running = false;
        if (interval) clearInterval(interval);
        interval = null;
    }

    startBtn && startBtn.addEventListener('click', start);
    stopBtn && stopBtn.addEventListener('click', stop);
    placeBtn && placeBtn.addEventListener('click', () => { grid.placeCharge(); drawGrid(); });

    // initial draw
    drawGrid();

    return { grid, sim, start, stop, drawGrid };
}
