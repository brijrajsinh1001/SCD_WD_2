// CHRONO X PRO - Advanced Stopwatch App
// Modern ES6+ implementation with modules pattern

class ChronoXPro {
  constructor() {
    this.startTime = 0;
    this.elapsed = 0;
    this.lapStart = 0;
    this.laps = [];
    this.running = false;
    this.raf = null;
    this.theme = localStorage.getItem('theme') || 'light';
    
    this.elements = {
      display: document.getElementById('display'),
      displayMs: document.getElementById('display-ms'),
      ring: document.getElementById('ring'),
      btnStart: document.getElementById('btn-start'),
      btnLap: document.getElementById('btn-lap'),
      statusDot: document.getElementById('status-dot'),
      lapsPanel: document.getElementById('laps-panel'),
      lapsBody: document.getElementById('laps-body'),
      lapsEmpty: document.getElementById('laps-empty'),
      themeToggle: document.getElementById('theme-toggle')
    };

    this.init();
  }

  init() {
    this.buildTicks();
    this.applyTheme();
    this.elements.btnStart.addEventListener('click', () => this.startStop());
    this.elements.btnLap.addEventListener('click', () => this.addLap());
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // Keyboard accessibility
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.startStop();
      } else if (e.code === 'KeyL') {
        this.addLap();
      } else if (e.code === 'KeyR') {
        this.reset();
      }
    });
  }

  fmt(ms) {
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000) % 60;
    const h = Math.floor(ms / 3600000);
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  fmtMs(ms) {
    return `.${(ms % 1000).toString().padStart(3, '0')}`;
  }

  updateRing(ms) {
    const pct = (ms / 1000 % 60) / 60;
    this.elements.ring.style.strokeDashoffset = 753 * (1 - pct);
  }

  buildTicks() {
    const g = document.getElementById('tick-marks');
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const r1 = i % 5 === 0 ? 106 : 112;
      const r2 = 119;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 140 + r1 * Math.cos(angle));
      line.setAttribute('y1', 140 + r1 * Math.sin(angle));
      line.setAttribute('x2', 140 + r2 * Math.cos(angle));
      line.setAttribute('y2', 140 + r2 * Math.sin(angle));
      line.setAttribute('stroke', i % 5 === 0 ? 'rgba(120,100,220,0.45)' : 'rgba(160,140,255,0.2)');
      line.setAttribute('stroke-width', i % 5 === 0 ? '2.5' : '1.2');
      g.appendChild(line);
    }
  }

  tick() {
    const ms = this.elapsed + (Date.now() - this.startTime);
    this.elements.display.textContent = this.fmt(ms);
    this.elements.displayMs.textContent = this.fmtMs(ms);
    this.updateRing(ms);
    this.raf = requestAnimationFrame(() => this.tick());
  }

  startStop() {
    if (!this.running) {
      this.startTime = Date.now();
      this.running = true;
      this.elements.btnStart.textContent = 'PAUSE';
      this.elements.btnStart.className = 'btn btn-pause';
      this.elements.btnLap.disabled = false;
      this.elements.statusDot.className = 'status-dot running';
      if (this.laps.length === 0) this.lapStart = 0;
      this.tick();
    } else {
      this.elapsed += Date.now() - this.startTime;
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.elements.btnStart.textContent = 'RESUME';
      this.elements.btnStart.className = 'btn btn-start';
      this.elements.statusDot.className = 'status-dot paused';
    }
  }

  addLap() {
    if (!this.running) return;
    const total = this.elapsed + (Date.now() - this.startTime);
    const split = total - this.lapStart;
    this.lapStart = total;
    this.laps.unshift({ num: this.laps.length + 1, split, total });
    this.renderLaps();
    this.elements.lapsPanel.style.display = 'block';
    // Announce for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = `Lap ${this.laps[0].num}: ${this.fmt(split)}`;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }

  renderLaps() {
    const body = this.elements.lapsBody;
    if (!this.laps.length) {
      body.innerHTML = '<div class="empty-laps" id="laps-empty">NO LAPS RECORDED</div>';
      return;
    }
    const splits = this.laps.map(l => l.split);
    const best = Math.min(...splits);
    const worst = Math.max(...splits);
    body.innerHTML = this.laps.map((lap, i) => {
      let badge = i === 0 ? '<span class="lap-badge badge-last">LAST</span>' : '';
      if (this.laps.length > 2) {
        if (lap.split === best) badge = '<span class="lap-badge badge-best">BEST</span>';
        else if (lap.split === worst) badge = '<span class="lap-badge badge-worst">SLOW</span>';
      }
      const cls = `lap-row${this.laps.length > 2 && lap.split === best ? ' best' : this.laps.length > 2 && lap.split === worst ? ' worst' : ''}`;
      return `
        <div class="${cls}" role="row">
          <span class="lap-num" role="cell">LAP ${lap.num}</span>
          <span class="lap-split" role="cell">${this.fmt(lap.split)}${this.fmtMs(lap.split)}</span>
          <span class="lap-total" role="cell">${this.fmt(lap.total)}${this.fmtMs(lap.total)}</span>
          <span>${badge}</span>
        </div>
      `;
    }).join('');
  }

  exportLaps() {
    if (!this.laps.length) return;
    const csv = ['Lap,Split,Total', ...this.laps.map(lap => `${lap.num},${this.fmt(lap.split)},${this.fmt(lap.total)}`)].join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chrono-x-pro-laps-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  reset() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    this.elapsed = 0;
    this.lapStart = 0;
    this.laps = [];
    this.startTime = 0;
    this.elements.display.textContent = '00:00';
    this.elements.displayMs.textContent = '.000';
    this.elements.ring.style.strokeDashoffset = '753';
    this.elements.btnStart.textContent = 'START';
    this.elements.btnStart.className = 'btn btn-start';
    this.elements.btnLap.disabled = true;
    this.elements.statusDot.className = 'status-dot';
    this.elements.lapsPanel.style.display = 'none';
    this.renderLaps();
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', this.theme);
    this.applyTheme();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    this.elements.themeToggle.textContent = this.theme === 'light' ? '🌙' : '☀️';
    this.elements.themeToggle.setAttribute('aria-label', `Switch to ${this.theme === 'light' ? 'dark' : 'light'} theme`);
  }
}

// Export laps button (added in HTML)
document.addEventListener('DOMContentLoaded', () => {
  const app = new ChronoXPro();
  
  // Add export button dynamically or via HTML
  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn';
  exportBtn.textContent = 'EXPORT';
  exportBtn.onclick = () => app.exportLaps();
  exportBtn.setAttribute('aria-label', 'Export laps to CSV');
  document.querySelector('.btn-row').appendChild(exportBtn);
  
  // Theme toggle button
  const themeToggle = document.createElement('button');
  themeToggle.id = 'theme-toggle';
  themeToggle.className = 'theme-toggle';
  themeToggle.textContent = app.theme === 'light' ? '🌙' : '☀️';
  themeToggle.setAttribute('aria-label', `Switch to ${app.theme === 'light' ? 'dark' : 'light'} theme`);
  document.querySelector('.sw-root').appendChild(themeToggle);
});
