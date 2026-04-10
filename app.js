/* ═══════════════════════════════════════════════════════════════
   OSIEDLE RŻĄKA — app.js
   Clean rebuild with full error handling and GunDB safety.
   ═══════════════════════════════════════════════════════════════ */

/* ───────────────────────────────────────────────────────────────
   SECTION 1: SCI-FI LOADER
   Canvas particle circuit + progress log + finishLoader()
   ─────────────────────────────────────────────────────────────── */
(function runLoader() {
  try {
    const loader = document.getElementById('scifiLoader');
    const canvas = document.getElementById('loaderCanvas');
    const ctx    = canvas.getContext('2d');
    const fill   = document.getElementById('ldrFill');
    const pct    = document.getElementById('ldrPct');
    const log    = document.getElementById('ldrLog');

    let W, H, particles = [], nodes = [];

    function resize() {
      try {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        buildNodes();
      } catch(e) { console.warn('loader resize:', e); }
    }

    function buildNodes() {
      nodes = [];
      const cols = Math.ceil(W / 80), rows = Math.ceil(H / 80);
      for (let r = 0; r <= rows; r++)
        for (let c = 0; c <= cols; c++)
          nodes.push({ x: c*80 + (Math.random()-0.5)*24, y: r*80 + (Math.random()-0.5)*24 });

      particles = Array.from({length:30}, () => ({
        ni: Math.floor(Math.random()*nodes.length),
        nj: 0, t: Math.random(), speed: 0.003+Math.random()*0.005,
        trail: [], alpha: 0.6+Math.random()*0.4
      }));
      particles.forEach(p => { p.nj = randNeighbour(p.ni); });
    }

    function randNeighbour(i) {
      const n  = nodes[i];
      let best = -1, bDist = Infinity;
      for (let j = 0; j < nodes.length; j++) {
        if (j === i) continue;
        const d = Math.hypot(nodes[j].x - n.x, nodes[j].y - n.y);
        if (d < 120 && d < bDist && Math.random() > .6) { best=j; bDist=d; }
      }
      return best < 0 ? (i+1)%nodes.length : best;
    }

    function drawFrame() {
      try {
        ctx.clearRect(0, 0, W, H);

        // Dim grid
        ctx.strokeStyle = '#001824';
        ctx.lineWidth   = .5;
        for (let x=0; x<W; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
        for (let y=0; y<H; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

        // Nodes
        nodes.forEach(n => {
          ctx.beginPath();
          ctx.arc(n.x, n.y, 1.5, 0, Math.PI*2);
          ctx.fillStyle = '#002030';
          ctx.fill();
        });

        // Moving particles
        particles.forEach(p => {
          const a = nodes[p.ni], b = nodes[p.nj];
          if (!a || !b) return;
          p.t += p.speed;
          if (p.t >= 1) { p.ni = p.nj; p.nj = randNeighbour(p.ni); p.t = 0; p.trail = []; }
          const x = a.x + (b.x-a.x)*p.t;
          const y = a.y + (b.y-a.y)*p.t;
          p.trail.push({x, y});
          if (p.trail.length > 14) p.trail.shift();

          p.trail.forEach((pt, i) => {
            const alpha = (i/p.trail.length)*p.alpha;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI*2);
            ctx.fillStyle = `rgba(0,212,255,${alpha*.5})`;
            ctx.fill();
          });

          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI*2);
          ctx.fillStyle = `rgba(0,212,255,${p.alpha})`;
          ctx.shadowColor = '#00d4ff';
          ctx.shadowBlur  = 10;
          ctx.fill();
          ctx.shadowBlur  = 0;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0,50,80,${p.alpha*.3})`;
          ctx.lineWidth   = .8;
          ctx.stroke();
        });
      } catch(e) { /* drawing errors are non-critical */ }
    }

    resize();
    window.addEventListener('resize', resize);

    let rafId = requestAnimationFrame(function loop() {
      drawFrame();
      rafId = requestAnimationFrame(loop);
    });

    // Log steps + progress bar
    const STEPS = [
      { ms:  200, text:'▶ INICJALIZACJA SYSTEMU…',               pct:  5 },
      { ms:  600, text:'▶ ŁADOWANIE MAPY SATELITARNEJ…',         pct: 20 },
      { ms: 1000, text:'▶ KALIBRACJA GPS · 50.0083°N 20.0053°E', pct: 42 },
      { ms: 1400, text:'▶ WCZYTYWANIE PUNKTÓW POI…',             pct: 60 },
      { ms: 1800, text:'▶ ŁĄCZENIE Z SIECIĄ P2P…',               pct: 78 },
      { ms: 2200, text:'▶ SYNCHRONIZACJA CHATU OSIEDLA…',        pct: 90 },
      { ms: 2600, text:'✓ SYSTEM ONLINE · RŻĄKA SYS v1.0',       pct:100 },
    ];

    let lines = [log.querySelector('.ldr-log-line')];

    STEPS.forEach(step => {
      setTimeout(() => {
        try {
          fill.style.width = step.pct + '%';
          pct.textContent  = step.pct + '%';

          lines.forEach(l => { l.classList.remove('active'); l.classList.add('done'); });

          const line = document.createElement('div');
          line.className = 'ldr-log-line';
          line.textContent = step.text;
          log.appendChild(line);
          requestAnimationFrame(() => line.classList.add('active'));
          lines = [line];

          if (step.pct === 100) {
            line.classList.add('ok');
            setTimeout(finishLoader, 700);
          }
        } catch(e) { console.warn('loader step error:', e); }
      }, step.ms);
    });

    function finishLoader() {
      try {
        startMapScan();
        loader.classList.add('done');
        cancelAnimationFrame(rafId);
        setTimeout(() => { try { loader.remove(); } catch(e){} }, 900);
      } catch(e) { console.warn('finishLoader:', e); }
    }

  } catch(e) {
    console.warn('Loader init failed:', e);
    // Skip loader if it fails
    try { document.getElementById('scifiLoader').remove(); } catch(_) {}
    startMapScan();
  }
})();

/* ───────────────────────────────────────────────────────────────
   SECTION 2: SCAN AUDIO (Web Audio API, procedural)
   ─────────────────────────────────────────────────────────────── */
const ScanAudio = {
  ctx: null,
  ok:  false,

  init() {
    try {
      const start = () => {
        if (this.ctx) return;
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          if (this.ctx.state === 'running') this.ok = true;
          this.ctx.resume().then(() => { this.ok = true; }).catch(() => {});
        } catch(e) {}
      };
      ['click','keydown','touchstart','pointerdown'].forEach(e =>
        document.addEventListener(e, start, { once: false })
      );
    } catch(e) { /* audio unavailable */ }
  },

  _osc(freq, type, vol, dur, freqEnd, startAt) {
    if (!this.ctx || !this.ok) return;
    try {
      const t    = (startAt ?? this.ctx.currentTime);
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur * .85);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur + .01);
    } catch(e) {}
  },

  _noise(vol, dur) {
    if (!this.ctx || !this.ok) return;
    try {
      const len = Math.ceil(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1);
      const src  = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      src.buffer = buf;
      src.connect(gain);
      gain.connect(this.ctx.destination);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      src.start();
    } catch(e) {}
  },

  boot() {
    this._osc(80, 'sawtooth', .04, .25, 160);
    this._osc(320, 'square',  .02, .12, 640, (this.ctx?.currentTime||0)+.1);
    this._osc(600, 'sine',    .05, .1,  1200, (this.ctx?.currentTime||0)+.2);
  },

  tick(progress) {
    const freq = 280 + progress * 9;
    this._osc(freq, 'sine', .055, .055, freq * 1.4);
  },

  glitch() {
    this._noise(.018, .028);
    this._osc(1800 + Math.random()*800, 'square', .015, .02);
  },

  complete() {
    if (!this.ctx || !this.ok) return;
    try {
      const t = this.ctx.currentTime;
      this._osc(150,  'sine',     .07,  .5,  2800, t);
      this._osc(75,   'triangle', .04,  .5,  150,  t);
      [[.42,880],[.57,1109],[.72,1319]].forEach(([d,f]) => {
        this._osc(f, 'sine', .09, .55, f*.98, t+d);
      });
      this._osc(90, 'sine', .1, .35, 35, t+.4);
      setTimeout(() => this._noise(.03, .06), 420);
    } catch(e) {}
  },

  markerPing(index) {
    const freq = 600 + index * 40;
    this._osc(freq, 'sine', .035, .08, freq * 1.6,
      (this.ctx?.currentTime||0) + index * .002);
  }
};

try { ScanAudio.init(); } catch(e) {}

/* ───────────────────────────────────────────────────────────────
   SECTION 3 (part a): MAP SCANNER (canvas scan overlay)
   ─────────────────────────────────────────────────────────────── */
let scanDone = false;

class MapScanner {
  constructor() {
    try {
      const wrap = document.getElementById('map');
      this.W = wrap.offsetWidth;
      this.H = wrap.offsetHeight;

      this.cv = document.createElement('canvas');
      this.cv.className = 'scan-cv';
      this.cv.style.cssText = 'position:absolute;inset:0;z-index:450;pointer-events:none;width:100%;height:100%;';
      wrap.appendChild(this.cv);
      this.cv.width  = this.W;
      this.cv.height = this.H;
      this.ctx = this.cv.getContext('2d');

      this.y    = 0;
      this.raf  = null;

      this.glitchLines = Array.from({length:12}, () => ({
        y: Math.random() * this.H,
        w: 30 + Math.random() * 200,
        x: Math.random() * this.W,
        life: Math.random()
      }));
    } catch(e) {
      console.warn('MapScanner constructor:', e);
    }
  }

  start() {
    try {
      ScanAudio.boot();
      this.raf = requestAnimationFrame(() => this._frame());
    } catch(e) {
      console.warn('MapScanner.start:', e);
      this._finish();
    }
  }

  _frame() {
    try {
      const { ctx, W, H } = this;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(0,6,14,0.92)';
      ctx.fillRect(0, this.y, W, H);

      for (let ly = 0; ly < this.y; ly += 6) {
        ctx.fillStyle = 'rgba(0,212,255,0.025)';
        ctx.fillRect(0, ly, W, 1);
      }
      for (let lx = 0; lx < W; lx += 120) {
        const a = (this.y / H) * 0.06;
        ctx.fillStyle = `rgba(0,212,255,${a})`;
        ctx.fillRect(lx, 0, 1, this.y);
      }

      const g = ctx.createLinearGradient(0, this.y - 30, 0, this.y + 8);
      g.addColorStop(0,   'rgba(0,212,255,0)');
      g.addColorStop(0.5, 'rgba(0,212,255,0.55)');
      g.addColorStop(0.8, 'rgba(0,212,255,0.25)');
      g.addColorStop(1,   'rgba(0,212,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, this.y - 30, W, 40);

      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur  = 14;
      ctx.fillStyle   = '#00d4ff';
      ctx.fillRect(0, this.y, W, 2);
      ctx.shadowBlur  = 0;

      for (let i = 0; i < 4; i++) {
        const gx = Math.random() * W;
        const gw = 20 + Math.random() * 100;
        const gy = this.y + (Math.random() - 0.5) * 40;
        const ga = Math.random() * 0.45;
        ctx.fillStyle = `rgba(0,212,255,${ga})`;
        ctx.fillRect(gx, gy, gw, 1);
      }

      if (Math.random() < 0.15) {
        if (Math.random() < .4) ScanAudio.glitch();
        const bx = Math.random() * W;
        const by = this.y + (Math.random() - 0.5) * 60;
        const bw = 40 + Math.random() * 80;
        ctx.fillStyle = `rgba(255,0,255,${Math.random() * 0.12})`;
        ctx.fillRect(bx, by, bw, 2);
        ctx.fillStyle = `rgba(0,255,136,${Math.random() * 0.1})`;
        ctx.fillRect(bx + 3, by + 1, bw - 6, 2);
      }

      const scanPct = Math.min(100, Math.round((this.y / H) * 100));
      ctx.font      = 'bold 11px "Space Grotesk", monospace';
      ctx.fillStyle = '#00d4ff';
      ctx.textAlign = 'left';
      ctx.fillText(`▶ SKANOWANIE TERENU  ${scanPct}%`, 16, Math.max(20, this.y - 8));
      ctx.textAlign = 'right';
      ctx.fillText('50.0083°N  20.0053°E', W - 16, Math.max(20, this.y - 8));
      ctx.textAlign = 'left';

      this._corners(ctx, W, H);

      const barH = H * 0.4;
      const barY = (H - barH) / 2;
      ctx.strokeStyle = 'rgba(0,212,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(W - 8, barY, 4, barH);
      ctx.fillStyle = 'rgba(0,212,255,0.6)';
      ctx.fillRect(W - 8, barY, 4, barH * (scanPct / 100));

      const _prevPct = Math.floor(((this.y - H/100) / H) * 100);
      this.y += H / 100;
      const _currPct = Math.floor((this.y / H) * 100);
      if (Math.floor(_currPct/8) > Math.floor(_prevPct/8)) ScanAudio.tick(_currPct);

      if (this.y >= H) { this._finish(); return; }
      this.raf = requestAnimationFrame(() => this._frame());
    } catch(e) {
      console.warn('scan frame error:', e);
      this._finish();
    }
  }

  _corners(ctx, W, H) {
    const s = 22, m = 12;
    ctx.strokeStyle = 'rgba(0,212,255,0.7)';
    ctx.lineWidth   = 1.5;
    [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([x,y,sx,sy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + sy*s); ctx.lineTo(x, y); ctx.lineTo(x + sx*s, y);
      ctx.stroke();
    });
  }

  _finish() {
    try {
      cancelAnimationFrame(this.raf);
      ScanAudio.complete();

      const { ctx, W, H } = this;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,212,255,0.08)';
      ctx.fillRect(0, 0, W, H);
      this._corners(ctx, W, H);

      ctx.font      = 'bold 13px "Space Grotesk", monospace';
      ctx.fillStyle = '#00d4ff';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 20;
      ctx.fillText('✓  SKANOWANIE ZAKOŃCZONE · SYSTEM AKTYWNY', W/2, H/2 - 8);
      ctx.shadowBlur = 0;
      ctx.font      = '11px "Space Grotesk", monospace';
      ctx.fillStyle = 'rgba(0,212,255,0.5)';
      ctx.fillText('RŻĄKA SYS v1.0 · WSZYSTKIE DANE ZAŁADOWANE', W/2, H/2 + 14);
      ctx.textAlign = 'left';

      setTimeout(() => { try { revealMarkers(); } catch(e){} }, 400);

      setTimeout(() => {
        try {
          this.cv.style.transition = 'opacity 1.2s ease';
          this.cv.style.opacity = '0';
          setTimeout(() => {
            try { this.cv.remove(); } catch(e){}
            scanDone = true;
            onScanComplete();
          }, 1300);
        } catch(e) {
          scanDone = true;
          onScanComplete();
        }
      }, 900);
    } catch(e) {
      console.warn('scan finish error:', e);
      scanDone = true;
      onScanComplete();
    }
  }
}

function revealMarkers() {
  try {
    const markers = [...document.querySelectorAll('.hud-mk')];
    markers.forEach((el, i) => {
      setTimeout(() => {
        try {
          el.classList.add('scanning-visible');
          ScanAudio.markerPing(i);
        } catch(e) {}
      }, i * 180);
    });
  } catch(e) { console.warn('revealMarkers:', e); }
}

function onScanComplete() {
  try {
    const setupBackdrop = document.getElementById('setupBackdrop');
    if (!profile) {
      // New user — show setup modal
      setupBackdrop.style.display = 'flex';
      setupBackdrop.style.animation = 'setupFadeIn .5s ease forwards';
    } else {
      // Returning user — init chat directly
      initChat();
    }
  } catch(e) { console.warn('onScanComplete:', e); }
}

function startMapScan() {
  try {
    setTimeout(() => {
      try {
        const scanner = new MapScanner();
        scanner.start();
      } catch(e) {
        console.warn('MapScanner failed:', e);
        scanDone = true;
        onScanComplete();
      }
    }, 50);
  } catch(e) {
    console.warn('startMapScan:', e);
  }
}

/* ───────────────────────────────────────────────────────────────
   SECTION 3 (part b): LEAFLET MAP INIT
   CRS.Simple, aerial.jpg as image overlay
   ─────────────────────────────────────────────────────────────── */
const IMG_W = 1935, IMG_H = 1080;

const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 4,
  zoomSnap: 0.25,
  zoomDelta: 0.5,
  attributionControl: false,
  zoomControl: false
});

const imgBounds = [[0, 0], [IMG_H, IMG_W]];
L.imageOverlay('./aerial.jpg', imgBounds).addTo(map);

function getCoverZoom() {
  try {
    const mw = document.getElementById('map').offsetWidth;
    const mh = document.getElementById('map').offsetHeight;
    return Math.log2(Math.max(mw / IMG_W, mh / IMG_H));
  } catch(e) { return -0.5; }
}

function setCoverView(animate) {
  try {
    const zoom = getCoverZoom();
    map.setMinZoom(zoom);
    map.setView([IMG_H / 2, IMG_W / 2], zoom, { animate: !!animate });
  } catch(e) { console.warn('setCoverView:', e); }
}

setCoverView(false);
window.addEventListener('resize', () => setCoverView(false));
map.setMaxBounds([[-IMG_H * 0.05, -IMG_W * 0.05], [IMG_H * 1.05, IMG_W * 1.05]]);
L.control.zoom({ position: 'topright' }).addTo(map);

/* ───────────────────────────────────────────────────────────────
   SECTION 4: POI MARKERS (HUD terminal style, draggable)
   ─────────────────────────────────────────────────────────────── */
const PLACES = [
  { lat: 880,  lng: 860,  name: 'Park Rżąka (staw)',         icon: '🌳', color: '#22c55e', desc: 'Zielony park osiedlowy o pow. 3,49 ha z małym stawem.' },
  { lat: 750,  lng: 1100, name: 'Szkoła Podstawowa nr 157',  icon: '🏫', color: '#3b82f6', desc: 'Szkoła podstawowa przy ul. Rydygiera 20.' },
  { lat: 710,  lng: 750,  name: 'Kościół Nawiedzenia NMP',   icon: '⛪', color: '#a855f7', desc: 'Parafia Nawiedzenia Najświętszej Maryi Panny.' },
  { lat: 580,  lng: 390,  name: 'Pętla autobusowa Rżąka',   icon: '🚌', color: '#f59e0b', desc: 'Główny węzeł komunikacji miejskiej MPK Kraków.' },
  { lat: 790,  lng: 140,  name: 'Szpital Uniwersytecki',     icon: '🏥', color: '#ef4444', desc: 'Nowa siedziba Szpitala Uniwersyteckiego w Krakowie.' },
  { lat: 600,  lng: 650,  name: 'SM Rżąka (Administracja)', icon: '🏛️', color: '#64748b', desc: 'Spółdzielnia Mieszkaniowa Rżąka, ul. Rydygiera 9/20.' },
  { lat: 720,  lng: 1180, name: 'ul. Rydygiera',             icon: '🛣️', color: '#94a3b8', desc: 'Główna ulica łącząca osiedle z ul. Wielicką.' },
  { lat: 420,  lng: 290,  name: 'Osiedle południe',          icon: '🏘️', color: '#22c55e', desc: 'Zabudowa jednorodzinna — domy z ogródkami.' },
];

function makePoiIcon(p) {
  const delay = (Math.random() * 3).toFixed(2);
  const html = `
    <div class="hud-mk" style="--c:${p.color};--delay:${delay}s">
      <div class="hud-mk-bg"></div>
      <div class="hud-mk-scan"></div>
      <div class="hud-mk-icon">${p.icon}</div>
      <div class="hud-mk-corner hud-tl"></div>
      <div class="hud-mk-corner hud-tr"></div>
      <div class="hud-mk-corner hud-bl"></div>
      <div class="hud-mk-corner hud-br"></div>
      <div class="hud-mk-ring"></div>
    </div>
    <div class="hud-mk-label">
      <span class="hud-mk-label-text">${p.name}</span>
      <span class="hud-mk-cursor">▌</span>
    </div>`;
  return L.divIcon({ html, className:'', iconSize:[52,70], iconAnchor:[26,64], popupAnchor:[0,-66] });
}

// Load saved POI positions
let savedPoiPositions = {};
try { savedPoiPositions = JSON.parse(window.localStorage?.getItem('rzaka-poi-pos')||'{}'); } catch(e){}

function savePoiPositions() {
  try {
    const data = {};
    Object.entries(poiMarkers).forEach(([id, m]) => {
      const ll = m.getLatLng();
      data[id] = { lat: ll.lat, lng: ll.lng };
    });
    window.localStorage?.setItem('rzaka-poi-pos', JSON.stringify(data));
  } catch(e) {}
}

const poiMarkers = {};

PLACES.forEach((p) => {
  try {
    const id = p.name;
    const savedPos = savedPoiPositions[id];
    const lat = savedPos ? savedPos.lat : p.lat;
    const lng = savedPos ? savedPos.lng : p.lng;

    const marker = L.marker([lat, lng], {
      icon: makePoiIcon(p),
      draggable: false, // kontrolowane przez admin mode
      autoPan: true
    }).addTo(map);

    marker.on('click', () => {
      try {
        document.getElementById('viewTitle').textContent = p.icon + '  ' + p.name;
        document.getElementById('viewDesc').textContent  = p.desc || 'Punkt widoczny na zdjęciu lotniczym.';
        document.getElementById('btnDelete').style.display = 'none';
        document.getElementById('viewBackdrop').classList.add('open');
        document.getElementById('viewClose').addEventListener('click',
          () => { document.getElementById('btnDelete').style.display = ''; }, {once:true});
      } catch(e) { console.warn('poi click:', e); }
    });

    marker.on('dragstart', () => {
      try { if (marker._icon) marker._icon.style.opacity = '0.7'; } catch(e){}
    });
    marker.on('dragend', () => {
      try {
        if (marker._icon) marker._icon.style.opacity = '';
        savedPoiPositions[id] = { lat: marker.getLatLng().lat, lng: marker.getLatLng().lng };
        savePoiPositions();
      } catch(e) {}
    });

    poiMarkers[id] = marker;
  } catch(e) { console.warn('poi marker error:', e); }
});

/* ───────────────────────────────────────────────────────────────
   SECTION 5: BUILDING DRAWING TOOL
   Click corners → double-click or snap to first point → name+color modal → save
   ─────────────────────────────────────────────────────────────── */
let drawMode         = false;
let drawPoints       = [];
let previewPoly      = null;
let previewLine      = null;
let drawDots         = [];
let pendingArea      = null;
let currentDrawColor = '#3b82f6';

// Clear old v1/v2 auto-generated areas — only manual areas in v3
try {
  if (window.localStorage?.getItem('rzaka-areas-ver') !== 'v3') {
    window.localStorage?.removeItem('rzaka-areas');
    window.localStorage?.setItem('rzaka-areas-ver', 'v3');
  }
} catch(e) {}

let areas = [];
window._rzakaAreas = () => areas; // Dostęp z konsoli: JSON.stringify(_rzakaAreas())
const HARDCODED_AREAS = [{"id": 1775819366930, "points": [[537.2243142024793, 850.2830872269456], [589.8467290413497, 827.9854538206446], [634.4419958539518, 825.6070395906391], [641.2799367652174, 854.4453121294551], [623.7391318189273, 860.9859512619701], [623.1445282614259, 857.418329916962], [604.7118179788837, 863.9589690494769], [605.6037233151358, 870.4996081819919], [590.1440308201004, 870.2023064032412], [599.3603859613714, 864.2562708282276], [582.4141845725827, 872.8780224119973], [542.2784444412408, 873.175324190748]], "name": "Blok", "desc": "", "color": "#3b82f6"}, {"id": 1775820994824, "points": [[404.05072752940987, 847.6235865757443], [401.5280382836487, 880.4185467706392], [399.0053490378876, 882.1003396011466], [390.5963848853504, 948.53115640619], [407.4143131904247, 949.3720528214437], [403.630279321783, 984.6897022620998], [395.6417633768727, 984.6897022620998], [389.3350402624699, 988.4737361307415], [379.24428327942525, 986.791943300234], [356.540080067575, 985.9510468849803], [362.426354974351, 946.4289153680558], [351.07425336842584, 944.3266743299215], [350.653805160799, 921.6224711180712], [351.07425336842584, 903.5431981901163], [352.7560461989333, 882.5207878087734], [361.1650103514704, 882.1003396011466], [366.2103888429927, 841.7373116689682], [385.5510063938281, 843.4191044994757]], "name": "xdd", "desc": "", "color": "#3b82f6"}, {"id": 1775821108038, "points": [[596.6160066225104, 956.5196723511003], [605.8658671903014, 979.6443237705774], [581.0594229403167, 994.7804592451444], [593.2524209614957, 1021.2686963256364], [652.1151700292556, 1022.1095927408901], [687.8532676775385, 1005.7121126434427], [682.3874409783893, 990.9964253765027], [687.0123712622848, 990.1555289612489], [684.4896820165237, 975.019393486682], [703.4098513597322, 967.8717739570254], [691.6373015461802, 935.9177101773843], [633.195000686047, 930.4518834782351]], "name": "wieżowiec", "desc": "", "color": "#60a5fa"}, {"id": 1775821127966, "points": [[666.4104090885688, 1048.597829821382], [656.3196521055243, 1046.9160369908745], [616.7975205885996, 1064.9953099188294], [631.9336560631665, 1128.482989270485], [638.6608273851962, 1127.6420928552313], [671.876235787718, 1114.1877502111718], [667.6717537114494, 1092.744891622202], [676.5011660716134, 1088.5404095459335]], "name": "1212", "desc": "", "color": "#64748b"}, {"id": 1775821156092, "points": [[599.272997055599, 584.4237546506815], [617.6577733664492, 664.6803743153546], [590.0806089001738, 674.5798692519663], [567.4531919022044, 678.8225099390855], [546.9470952477944, 594.6768029778864], [571.3422791987304, 585.8379682130546]], "name": "spottet żabka", "desc": "", "color": "#22c55e"}, {"id": 1775821208640, "points": [[335.3564064307674, 743.2544468767007], [375.78944834085985, 751.5788966817197], [375.4921465621092, 763.470967831747], [409.0872475609361, 770.903512300514], [406.41153155217995, 781.9036781142892], [434.06059697599323, 786.6605065743], [432.27678630348913, 810.7419506531052], [447.7364787985245, 813.714968440612], [447.1418752410231, 834.5260929531596], [439.41202899350543, 836.3099036256637], [437.6282183210014, 860.9859512619701], [451.30410014353265, 868.7157975094877], [449.2229876922779, 916.5813838883473], [439.7093307722561, 917.1759874458487], [437.3309165422507, 952.2575973384289], [455.7636268247929, 957.0144257984398], [480.14237268234865, 955.5279169046864], [484.3045975848582, 920.4463070121061], [500.3588936373949, 921.3382123483582], [502.4400060886497, 866.0400815007316], [489.35872782361974, 864.850874385729], [492.9263491686279, 813.714968440612], [478.95316556734593, 809.2554417593517], [482.2234851336034, 774.4711336455222], [459.33124816980103, 765.5520802830017], [458.1420410547983, 754.8492162479772], [427.2226560647276, 749.497784230465], [422.76312938346734, 739.6868255316925], [392.1410461721473, 734.632695292931], [391.2491408358953, 722.1460205854024], [359.14054873082176, 717.0918903466409], [343.08625267828506, 717.0918903466409]], "name": "blok", "desc": "", "color": "#3b82f6"}, {"id": 1775821260669, "points": [[402.5, 366], [498.5, 385], [496, 431.5], [483.5, 437], [470.5, 433], [471, 421.5], [423.5, 410], [421.5, 448], [470, 457.5], [468.5, 450.5], [487, 448.5], [495, 452], [493, 511], [476.5, 515], [465.5, 511], [466, 500.5], [419.5, 486.5], [419, 526.5], [466, 538.5], [465, 530], [485, 529], [493, 532.5], [490, 589], [478, 592.5], [466.5, 589.5], [463.5, 579], [416.5, 568], [415.5, 607.5], [462.5, 616], [463.5, 606], [481.5, 605.5], [490.5, 607], [489, 652.5], [467.5, 657.5], [378, 640.5], [387, 370]], "name": "tbs", "desc": "", "color": "#3b82f6"}, {"id": 1775821294305, "points": [[751, 727.5], [760, 741], [797.5, 735.5], [785.5, 780.5], [775.5, 800.5], [762.5, 838], [757, 841], [748.5, 800], [740, 799.5], [738.5, 789]], "name": "Kościół", "desc": "", "color": "#a855f7"}, {"id": 1775821344345, "points": [[544, 381.5], [546, 467], [581, 467], [587.5, 497], [575.5, 504.5], [587.5, 548], [605, 543], [610.5, 542.5], [621.5, 593.5], [631.5, 592], [633.5, 611.5], [664, 602], [665.5, 609.5], [692, 602], [692, 589], [703.5, 587], [714, 583.5], [704.5, 594.5], [711.5, 611], [772, 595.5], [761.5, 538], [695, 550.5], [694.5, 560.5], [673, 565], [672, 556], [657.5, 558], [652, 522.5], [669.5, 517.5], [665.5, 501], [669.5, 499.5], [667, 481.5], [653.5, 486.5], [653, 479.5], [634.5, 481.5], [631.5, 474], [612.5, 477], [589.5, 380]], "name": "szkoła", "desc": "", "color": "#a855f7"}, {"id": 1775821624855, "points": [[445.4772721475249, 1034.4972208759189], [450.4270196158307, 1059.9530649986348], [470.93311627024065, 1061.3672785610077], [487.90367901871775, 1053.5891039679557], [492.85342648702357, 1074.8023074035523], [502.0458146424487, 1073.3880938411792], [512.6524163602469, 1106.6221125569468], [525.3803384216047, 1109.450539681693], [538.1082604829626, 1149.0485194281396], [527.5016587651644, 1158.9480143647513], [543.0580079512685, 1206.32416870425], [574.1707063234766, 1207.0312754854365], [596.0910165402595, 1195.7175669864519], [576.2920266670362, 1147.6343058657665], [589.7270555095806, 1137.734810929155], [572.7564927611035, 1092.4799769332158], [555.7859300126263, 1089.6515498084696], [541.6437943888953, 1056.417531092702], [525.3803384216047, 1055.7104243115155], [513.3595231414334, 1027.4261530640536], [493.5605332682101, 1036.6185412194786], [485.0752518939716, 1026.0119395016804]], "name": "blok2", "desc": "", "color": "#3b82f6"}, {"id": 1775821661219, "points": [[441.9417382415922, 1138.4419177103414], [425.6782822743016, 1145.512985522207], [437.69909755447287, 1183.6967517062806], [455.3767670841366, 1182.989644925094], [464.56915523956167, 1221.880517890354], [484.36814511278504, 1221.1734111091675], [494.97474683058323, 1256.5287501684948], [492.85342648702357, 1263.5998179803603], [505.58134854838147, 1304.6120112891801], [485.0752518939716, 1311.6830791010457], [489.31789258109086, 1321.5825740376572], [458.20519420888274, 1342.0886706920671], [469.51890270786754, 1363.3018741276635], [483.6610383315985, 1366.8374080335964], [510.5310960166873, 1349.1597385039327], [514.7737367038065, 1337.8460300049478], [521.8448045156721, 1332.896282536642], [539.5224740453357, 1323.703894381217], [531.0371926710972, 1306.0262248515533], [547.3006486383878, 1289.7627688842626], [534.5727265770299, 1260.0642840744276], [543.765114732455, 1253.7003230437488], [529.622979108724, 1219.0520907656078], [522.5519112968586, 1220.4663043279809], [516.8950570473662, 1201.374421235944], [501.33870786126215, 1199.2531008923845], [487.90367901871775, 1163.1906550518706], [469.51890270786754, 1160.3622279271244], [458.9123009900693, 1139.8561312727145]], "name": "blok 3", "desc": "", "color": "#3b82f6"}, {"id": 1775821672783, "points": [[292.0351006300441, 980.7571055057414], [257.3868683519033, 982.1713190681145], [258.0939751330898, 1003.3845225037109], [267.28636328851496, 1005.5058428472705], [294.8635277547903, 1004.798736066084]], "name": "budynek 4", "desc": "", "color": "#3b82f6"}, {"id": 1775821697520, "points": [[759.9033464867388, 159.35375341036462], [740.8760326466953, 198.59758820545443], [770.6062105217633, 235.46300877053878], [782.4982816717906, 233.08459454053335], [801.525595511834, 195.02996686044625]], "name": "szpital", "desc": "", "color": "#ef4444"}, {"id": 1775821710066, "points": [[846.7154658819375, 19.027313840043536], [777.7414532117796, 126.05595419028845], [814.606873776864, 172.43503167539455], [885.9593006770273, 59.46035575013606]], "name": "szpital", "desc": "", "color": "#ef4444"}, {"id": 1775821721041, "points": [[901.4189931720626, 78.48766959017959], [834.8233947319102, 191.4623455154381], [882.3916793320191, 261.6255653005986], [919.2570998971034, 248.54428703556871], [969.2037987272178, 149.84009649034286]], "name": "szpital", "desc": "", "color": "#ef4444"}, {"id": 1775821786721, "points": [[896.6621647120518, 1.189207115002721], [1047.6914683173973, 203.35441666546532], [1060.7727465824273, 196.219173975449], [1061.9619536974299, 2.378414230005442]], "name": "szpital", "desc": "", "color": "#ef4444"}, {"id": 1775821806508, "points": [[705.6925676241743, 702.8641404994282], [630.0321420372138, 721.9560235914649], [637.1032098490792, 750.9474016201134], [655.4879861599295, 749.5331880577403], [712.7636354360399, 730.4413049657036]], "name": "blok 4", "desc": "", "color": "#3b82f6"}, {"id": 1775821819307, "points": [[694.3788591251896, 756.6042558696058], [642.0529573173851, 778.5245660863887], [648.4169183480641, 801.8590898655449], [668.9230150024739, 800.4448763031718], [728.3199846221439, 779.9387796487619], [719.8347032479053, 756.6042558696058]], "name": "blok 5", "desc": "", "color": "#3b82f6"}, {"id": 1775821840838, "points": [[869.9073415799677, 959.8832580121152], [856.0325507282814, 992.2577699993832], [872.0095826181021, 1004.0303198129352], [858.5552399740426, 1036.82528000783], [834.1692439316848, 1037.245728215457], [827.862520817282, 1072.5633776561128], [861.9188256350575, 1080.1314453933965], [890.0888555460568, 1080.1314453933965], [916.5770926265488, 1017.9051106646215], [909.8499213045192, 972.076256033294], [891.7706483765643, 959.8832580121152]], "name": "blok 5", "desc": "", "color": "#3b82f6"}, {"id": 1775821859222, "points": [[843.4191044994757, 1141.0964354992907], [850.9871722367592, 1160.0166048424992], [826.1807279867745, 1182.3003598467226], [834.5896921393118, 1204.1636666433192], [828.7034172325357, 1207.527252304334], [837.1123813850728, 1225.606525232289], [840.8964152537146, 1245.3675909907513], [836.2714849698191, 1248.3107284441394], [845.9417937452369, 1265.9695531644672], [830.3852100630431, 1280.6852404314072], [811.0445925122077, 1278.582999393273], [805.1583176054316, 1257.1401408043032], [811.0445925122077, 1251.2538658975272], [780.772321563074, 1185.2434973001107], [798.8515944910289, 1172.2096028636781], [793.8062159995065, 1161.6983976730066], [817.7717638342374, 1136.4715052153952]], "name": "blok 6", "desc": "", "color": "#3b82f6"}, {"id": 1775821903120, "points": [[273.6503243191939, 362.74577874869885], [272.94321753800733, 384.66608896548183], [279.30717856868625, 384.66608896548183], [281.4284989122459, 396.6869042456531], [268.70057685088807, 395.97979746446657], [268.70057685088807, 418.6072144624361], [281.4284989122459, 424.2640687119285], [278.6000717874997, 437.69909755447287], [249.60869375885125, 442.64884502277874], [248.19448019647817, 454.66966030295004], [243.95183950935888, 511.9453095790604], [235.46655813512032, 514.06662992262], [233.34523779156066, 531.7442994522837], [240.41630560342614, 534.5727265770299], [238.2949852598665, 542.3509011700819], [224.15284963613556, 541.6437943888953], [221.32442251138937, 565.6854249492379], [236.17366491630685, 568.5138520739841], [231.22391744800103, 579.1204537917824], [217.78888860545663, 577.7062402294093], [217.08178182427008, 590.4341622907672], [253.85133444597054, 602.4549775709385], [280.0142853498728, 595.3839097590729], [280.72139213105936, 576.9991334482228], [274.35743110038044, 575.5849198858497], [277.89296500631315, 558.6143571373725], [284.9640328181786, 557.907250356186], [292.0351006300441, 521.1376977344855], [304.76302269140194, 524.6732316404182], [312.541197284454, 447.59859249108456], [321.02647865869255, 454.66966030295004], [326.6833329081849, 447.59859249108456], [328.8046532517446, 408.7077195258244], [318.19805153394634, 408.0006127446379], [328.09754647055803, 357.79603128039304]], "name": "blok 7", "desc": "", "color": "#3b82f6"}, {"id": 1775821917807, "points": [[280.0142853498728, 628.6179284748407], [267.9934700697015, 745.2905473706211], [256.6797615707167, 743.1692270270614], [255.9726547895302, 798.3235559596121], [224.15284963613556, 799.0306627407987], [224.15284963613556, 788.4240610230005], [209.30360723121805, 786.3027406794408], [224.8599564173221, 628.6179284748407], [253.14422766478398, 623.6681810065348]], "name": "blok 8", "desc": "", "color": "#3b82f6"}, {"id": 1775821931993, "points": [[262.3366158202091, 1033.7901140947324], [264.45793616376875, 1116.5216074935586], [289.20667350529794, 1117.228714274745], [299.8132752230961, 1109.450539681693], [301.22748878546923, 1091.0657633708427], [298.399061660723, 1076.2165209659252], [300.5203820042827, 1067.7312395916867], [296.2777413171634, 1052.1748904055826], [298.399061660723, 1042.9825022501575], [294.15642097360376, 1032.3759005323593]], "name": "blok 8", "desc": "", "color": "#3b82f6"}, {"id": 1775821955205, "points": [[275.7716446627535, 1165.3119753954302], [283.5498192558055, 1182.989644925094], [289.20667350529794, 1182.989644925094], [294.15642097360376, 1188.6464991745863], [291.32799384885755, 1194.3033534240788], [309.7127701597078, 1232.4871196081522], [323.1477990022522, 1231.7800128269657], [350.017856687341, 1308.1475451951128], [339.41125496954277, 1310.975972319859], [359.91735162395264, 1354.8165927534249], [383.9589821842953, 1356.230806315798], [410.8290398693841, 1340.674457129694], [365.57420587344507, 1214.8094500784885], [357.0889244992065, 1217.6378772032347], [340.8254685319159, 1186.5251788310268], [335.1686142824235, 1188.6464991745863], [315.3696244092002, 1141.9774516162743], [301.9345955666558, 1137.734810929155]], "name": "blok 9", "desc": "", "color": "#3b82f6"}, {"id": 1775821992201, "points": [[694.1599907919414, 1265.5491049568404], [732.0003294783585, 1274.3785173170045], [766.8975307113877, 1281.526136846661], [764.7952896732534, 1299.605409774616], [785.8177000545962, 1303.8098918508845], [779.0905287325666, 1333.2412663847645], [773.6247020334174, 1333.2412663847645], [774.0451502410442, 1362.2521927110176], [766.4770825037608, 1363.0930891262713], [734.5230187241197, 1357.2068142194953], [742.51153466903, 1319.366475533078], [737.0457079698808, 1317.6846827025706], [739.568397215642, 1307.1734775118994], [685.7510266394042, 1292.4577902449594]], "name": "blok 10", "desc": "", "color": "#3b82f6"}, {"id": 1775822005096, "points": [[749.2387059910596, 1198.69783994417], [745.454672122418, 1222.663387778901], [671.0353393724643, 1215.9362164568713], [670.6148911648373, 1231.492800139065], [663.8877198428077, 1230.6519037238113], [658.8423413512853, 1265.1286567492136], [619.3202098343608, 1258.4014854271838], [633.195000686047, 1196.5955989060358], [657.5809967284048, 1196.5955989060358], [662.2059270123002, 1184.402600884857]], "name": "blok 11", "desc": "", "color": "#3b82f6"}, {"id": 1775822023180, "points": [[709.2961262665083, 1353.4227803508536], [707.6143334360008, 1379.070121016092], [673.1375804105985, 1377.8087763932112], [673.1375804105985, 1382.8541548847336], [633.6154488936739, 1377.3883281855844], [608.3885564360625, 1371.5020532788085], [592.4115245462419, 1360.5703998805102], [597.0364548301374, 1341.6502305373017], [689.9555087156727, 1347.5365054440776]], "name": "blok 12", "desc": "", "color": "#3b82f6"}, {"id": 1775822038828, "points": [[792.1244231689991, 1373.183846109316], [798.8515944910289, 1387.4790851686291], [806.8401104359391, 1389.5813262067634], [813.146833550342, 1407.2401509270912], [782.0336661859545, 1437.0919736685983], [779.0905287325666, 1441.7169039524936], [730.3185366478511, 1440.87600753724], [710.9779190970156, 1436.2510772533444], [718.5459868342991, 1413.967322249121], [743.7728792919105, 1415.2286668720017]], "name": "blok 12", "desc": "", "color": "#3b82f6"}, {"id": 1775822056068, "points": [[713.5006083427768, 1471.9891749016274], [715.1824011732842, 1495.5342745287314], [678.1829589021208, 1493.852481698224], [631.9336560631665, 1488.8071032067016], [627.3087257792711, 1496.7956191516118], [597.4569030377642, 1496.375170943985], [585.6843532242121, 1488.3866549990748], [552.4689448216905, 1485.4435175456867], [560.8779089742276, 1450.9667645202844], [601.6613851140328, 1460.2166250880753], [600.4000404911523, 1466.1028999948514], [616.7975205885996, 1467.784692825359], [620.1611062496145, 1456.0121430118068], [687.0123712622848, 1461.057521503329]], "name": "blok 13", "desc": "", "color": "#3b82f6"}, {"id": 1775822069896, "points": [[717.7050904190454, 1471.1482784863736], [724.4322617410751, 1512.7726510414325], [738.7275008003883, 1520.3407187787159], [758.0681183512237, 1511.5113064185518], [756.3863255207162, 1489.2275514143284], [745.8751203300449, 1485.4435175456867], [744.6137757071642, 1466.1028999948514], [732.4207776859854, 1461.477969710956]], "name": "blok 14", "desc": "", "color": "#3b82f6"}, {"id": 1775822113739, "points": [[920.4463070121061, 636.8204100839572], [986.4473018947572, 685.5779017990687], [976.9336449747354, 713.5242690016327], [991.204130354768, 724.2271330366572], [1001.9069943897925, 722.4433223641531], [1006.069219292302, 694.4969551615891], [1020.9343082298361, 704.0106120816109], [1008.4476335223076, 741.4706362041966], [1013.2044619823184, 749.7950860092157], [1010.2314441948116, 760.4979500442402], [1079.2054568649694, 803.9040097418394], [1079.2054568649694, 770.0116069642619], [1032.8263793798633, 734.9299970716817], [1049.4752789899014, 670.1182093040334], [1080.3946639799722, 697.4699729490959], [1080.3946639799722, 604.7118179788837], [992.3933374697708, 530.3863732912137], [972.7714200722259, 532.7647875212191], [972.1768165147245, 554.7651191487694], [1042.9346398573864, 613.6308713414041], [1026.2857402473483, 671.9020199765374], [943.6358457546592, 614.2254748989054], [923.4193247996129, 616.6038891289109]], "name": "hs", "desc": "", "color": "#ef4444"}];
try {
  areas = JSON.parse(window.localStorage?.getItem('rzaka-areas')||'[]');
  // Dołącz hardcoded budynki jeśli brakuje ich w localStorage
  const savedIds = new Set(areas.map(a => a.id));
  HARDCODED_AREAS.forEach(ha => { if (!savedIds.has(ha.id)) areas.push(ha); });
} catch(e) { areas = [...HARDCODED_AREAS]; }
const areaLayers = {};

function saveAreas() {
  try { window.localStorage?.setItem('rzaka-areas', JSON.stringify(areas)); } catch(e){}
}

function renderArea(area) {
  try {
    const latlngs = area.points.map(p => L.latLng(p[0], p[1]));
    const c = area.color || '#3b82f6';
    const styleNormal = { fillColor:c, fillOpacity:0.3, color:c, weight:2.5, dashArray:null, className:'area-poly' };
    const styleHover  = { fillColor:c, fillOpacity:0.55, color:'#fff', weight:3, dashArray:null, className:'area-poly area-hover' };
    const poly = L.polygon(latlngs, styleNormal).addTo(map);

    // Etykieta nazwy (ukryta domyślnie)
    let tooltip = null;
    if (area.name) {
      tooltip = L.tooltip({ permanent:false, direction:'top', className:'area-tooltip', offset:[0,-8] })
        .setContent(area.name);
      poly.bindTooltip(tooltip);
    }

    poly.on({
      mouseover() {
        this.setStyle(styleHover);
        if (this._path) {
          this._path.classList.add('area-hover');
          this._path.style.filter = `drop-shadow(0 0 12px ${c}) drop-shadow(0 0 4px ${c})`;
          this._path.style.transition = 'filter .2s, fill-opacity .2s, stroke-width .15s';
        }
      },
      mouseout() {
        this.setStyle(styleNormal);
        if (this._path) {
          this._path.classList.remove('area-hover');
          this._path.style.filter = '';
        }
      },
      click() { openAreaModal(area); }
    });
    areaLayers[area.id] = poly;
    console.log('[RZAKA] renderArea OK:', area.id, area.name, area.points.length, 'pts');
  } catch(e) { console.error('[RZAKA] renderArea FAIL:', e, area); }
}

function removeArea(id) {
  try {
    if (areaLayers[id]) { map.removeLayer(areaLayers[id]); delete areaLayers[id]; }
    areas = areas.filter(a => a.id !== id);
    saveAreas();
  } catch(e) { console.warn('removeArea:', e); }
}

// Render saved areas
areas.forEach(renderArea);

/* ═══════════════════════════════════════════════════════════════
   ADMIN MODE — tylko admin może edytować mapę
   Hasło: rzaka-admin-2026 (SHA-256 hash)
   ═══════════════════════════════════════════════════════════════ */
const ADMIN_HASH = '1645957d3b8903cba1a534bf8762900387172d9c43c7c28c57f8b5e7b44fddbd';
let isAdmin = false;

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function applyAdminMode() {
  // Pokaż/ukryj elementy edycji
  const editEls = ['btnDraw','btnPinMode','btnExport'];
  editEls.forEach(id => {
    try {
      const el = document.getElementById(id);
      if (el) el.style.display = isAdmin ? '' : 'none';
    } catch(e){}
  });
  // Admin badge
  const adminLink = document.querySelector('.btn-admin-link');
  if (adminLink) {
    adminLink.style.background = isAdmin ? 'rgba(74,222,128,.15)' : '';
    adminLink.style.borderColor = isAdmin ? '#4ade80' : '';
    adminLink.title = isAdmin ? '✓ Tryb administratora aktywny' : 'Panel administratora';
  }
  // POI markers draggable only for admin
  try {
    Object.values(poiMarkers || {}).forEach(m => {
      try { if (isAdmin) m.dragging.enable(); else m.dragging.disable(); } catch(e){}
    });
  } catch(e){}
  // W panelu bocznym budynku
  try {
    document.getElementById('bldgDelete').style.display = isAdmin ? '' : 'none';
    document.getElementById('bldgSave').style.display = isAdmin ? '' : 'none';
    document.getElementById('bldgPhotoArea').style.pointerEvents = isAdmin ? '' : 'none';
    document.getElementById('bldgPhotoArea').style.opacity = isAdmin ? '' : '0.5';
    document.getElementById('bldgDesc').readOnly = !isAdmin;
    document.getElementById('bldgDesc').style.opacity = isAdmin ? '' : '0.7';
  } catch(e){}
}

// Przycisk logowania admina w headerze (zamiast linku do admin.html)
try {
  const adminLink = document.querySelector('.btn-admin-link');
  if (adminLink) {
    adminLink.href = '#';
    adminLink.addEventListener('click', async (e) => {
      e.preventDefault();
      if (isAdmin) {
        isAdmin = false;
        applyAdminMode();
        return;
      }
      // Prosty prompt o hasło
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center';
      overlay.innerHTML = `
        <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:28px;width:320px;text-align:center">
          <div style="font-size:24px;margin-bottom:8px">🔒</div>
          <div style="color:#e2e8f0;font-size:16px;font-weight:700;margin-bottom:4px;font-family:'Space Grotesk',sans-serif">Tryb administratora</div>
          <p style="color:#6b7280;font-size:12px;margin-bottom:16px">Wpisz hasło aby odblokować edycję mapy</p>
          <input type="password" id="adminPwInput" placeholder="Hasło..." style="width:100%;padding:10px 14px;background:rgba(255,255,255,.05);border:1px solid #30363d;border-radius:8px;color:#e2e8f0;font-size:14px;margin-bottom:12px;outline:none" />
          <div style="display:flex;gap:8px">
            <button id="adminPwCancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid #30363d;background:transparent;color:#8b949e;cursor:pointer;font-weight:600">Anuluj</button>
            <button id="adminPwOk" style="flex:1;padding:10px;border-radius:8px;border:none;background:#3b82f6;color:#fff;cursor:pointer;font-weight:700">Zaloguj</button>
          </div>
          <p id="adminPwErr" style="color:#ef4444;font-size:12px;margin-top:8px;display:none">Nieprawidłowe hasło</p>
        </div>`;
      document.body.appendChild(overlay);
      const input = document.getElementById('adminPwInput');
      setTimeout(() => input.focus(), 50);
      document.getElementById('adminPwCancel').onclick = () => overlay.remove();
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
      const tryLogin = async () => {
        const hash = await sha256(input.value);
        if (hash === ADMIN_HASH) {
          isAdmin = true;
          applyAdminMode();
          overlay.remove();
        } else {
          document.getElementById('adminPwErr').style.display = 'block';
          input.value = '';
          input.focus();
        }
      };
      document.getElementById('adminPwOk').onclick = tryLogin;
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') tryLogin(); });
    });
  }
} catch(e) { console.warn('admin setup:', e); }

// Startuj w trybie widza
applyAdminMode();



const btnDraw     = document.getElementById('btnDraw');
const drawCounter = document.getElementById('drawCounter');

function clearDrawPreview() {
  try {
    if (previewPoly) { map.removeLayer(previewPoly); previewPoly = null; }
    if (previewLine) { map.removeLayer(previewLine); previewLine = null; }
    drawDots.forEach(d => { try { map.removeLayer(d); } catch(e){} });
    drawDots = [];
  } catch(e) {}
}

function setDrawMode(on) {
  try {
    drawMode = on;
    btnDraw.classList.toggle('active', on);
    map.getContainer().classList.toggle('draw-mode', on);
    drawCounter.style.display = on ? 'block' : 'none';
    if (!on) {
      drawPoints = [];
      clearDrawPreview();
    } else {
      drawCounter.textContent = 'Kliknij narożniki budynku  •  Dwuklik = zamknij obrys  •  PPM = cofnij punkt  •  Esc = anuluj';
    }
  } catch(e) { console.warn('setDrawMode:', e); }
}

btnDraw.addEventListener('click', () => setDrawMode(!drawMode));

// Add point on click
map.on('click', (e) => {
  if (!drawMode) return;
  try {
    e.originalEvent.stopPropagation();

    // Snap to first point
    if (drawPoints.length >= 3) {
      const first = map.latLngToContainerPoint(L.latLng(drawPoints[0][0], drawPoints[0][1]));
      const cur   = map.latLngToContainerPoint(e.latlng);
      if (Math.hypot(first.x - cur.x, first.y - cur.y) < 18) { finishArea(); return; }
    }

    drawPoints.push([e.latlng.lat, e.latlng.lng]);

    const isFirst = drawPoints.length === 1;
    const dot = L.marker(e.latlng, {
      icon: L.divIcon({ className: 'draw-dot' + (isFirst ? ' first' : ''), iconSize:[10,10] }),
      interactive: isFirst, zIndexOffset: 1000
    }).addTo(map);
    if (isFirst) dot.on('click', () => { if (drawMode && drawPoints.length >= 3) finishArea(); });
    drawDots.push(dot);

    updatePreview();
    const n = drawPoints.length;
    drawCounter.textContent = `● ${n} punkt${n===1?'':'y'}  —  ` + (n < 3 ? 'dodaj więcej narożników' : 'dwuklik lub kliknij ○ by zamknąć');
  } catch(e) { console.warn('draw click:', e); }
});

// Double-click to close polygon
map.on('dblclick', (e) => {
  if (!drawMode || drawPoints.length < 3) return;
  try {
    e.originalEvent.preventDefault();
    finishArea();
  } catch(e) { console.warn('draw dblclick:', e); }
});

// Mouse move — preview line
map.on('mousemove', (e) => {
  if (!drawMode || drawPoints.length === 0) return;
  try {
    const pts = [...drawPoints.map(p=>L.latLng(p[0],p[1])), e.latlng];
    if (previewLine) previewLine.setLatLngs(pts);
    else previewLine = L.polyline(pts, { color:currentDrawColor, weight:1.5, dashArray:'6,4', interactive:false, opacity:.7 }).addTo(map);
  } catch(e) {}
});

// Right-click — undo last point
map.on('contextmenu', (e) => {
  if (!drawMode || drawPoints.length === 0) return;
  try {
    e.originalEvent.preventDefault();
    drawPoints.pop();
    const last = drawDots.pop();
    if (last) map.removeLayer(last);
    updatePreview();
    const n = drawPoints.length;
    drawCounter.textContent = n === 0
      ? 'Kliknij narożniki budynku  •  Dwuklik = zamknij obrys'
      : `● ${n} punkt${n===1?'':'y'}  —  ` + (n < 3 ? 'dodaj więcej' : 'dwuklik by zamknąć');
  } catch(e) { console.warn('contextmenu:', e); }
});

function updatePreview() {
  try {
    const latlngs = drawPoints.map(p => L.latLng(p[0], p[1]));
    if (previewPoly) previewPoly.setLatLngs(latlngs);
    else previewPoly = L.polygon(latlngs, {
      fillColor:currentDrawColor, fillOpacity:0.22, color:currentDrawColor, weight:2, dashArray:null, interactive:false
    }).addTo(map);
  } catch(e) {}
}

function finishArea() {
  try {
    if (drawPoints.length < 3) return;
    const savedPoints = [...drawPoints]; // Kopiuj PRZED setDrawMode (który czyści drawPoints)
    clearDrawPreview();
    setDrawMode(false);
    pendingArea = { id: Date.now(), points: savedPoints, name:'', desc:'', color: currentDrawColor };
    renderArea(pendingArea);
    // Show name/color modal
    const nameInput = document.getElementById('areaEditName');
    if (nameInput) nameInput.value = '';
    document.querySelectorAll('.area-color-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.color === currentDrawColor)
    );
    const backdrop = document.getElementById('areaEditBackdrop');
    backdrop.style.display = 'flex';
    setTimeout(() => { try { document.getElementById('areaEditName').focus(); } catch(e){} }, 50);
    console.log('[RZAKA] finishArea OK, pendingArea:', pendingArea?.id, pendingArea?.points?.length, 'pts');
  } catch(e) { console.error('[RZAKA] finishArea FAIL:', e); }
}

// Area color picker
document.querySelectorAll('.area-color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    try {
      document.querySelectorAll('.area-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDrawColor = btn.dataset.color;
      if (pendingArea && areaLayers[pendingArea.id]) {
        areaLayers[pendingArea.id].setStyle({ fillColor:currentDrawColor, color:currentDrawColor });
        pendingArea.color = currentDrawColor;
      }
    } catch(e) {}
  });
});

document.getElementById('areaEditSave').addEventListener('click', () => {
  try {
    if (!pendingArea) return;
    pendingArea.name  = (document.getElementById('areaEditName').value.trim()) || 'Budynek';
    pendingArea.color = currentDrawColor;
    if (areaLayers[pendingArea.id]) {
      areaLayers[pendingArea.id].setStyle({ fillColor:currentDrawColor, color:currentDrawColor });
    }
    areas.push(pendingArea);
    saveAreas();
    pendingArea = null;
    document.getElementById('areaEditBackdrop').style.display = 'none';
    console.log('[RZAKA] areaEditSave OK:', pendingArea);
  } catch(e) { console.error('[RZAKA] areaEditSave FAIL:', e); }
});

document.getElementById('areaEditCancel').addEventListener('click', () => {
  try {
    if (pendingArea) {
      if (areaLayers[pendingArea.id]) map.removeLayer(areaLayers[pendingArea.id]);
      delete areaLayers[pendingArea.id];
      pendingArea = null;
    }
    document.getElementById('areaEditBackdrop').style.display = 'none';
  } catch(e) {}
});

document.getElementById('areaEditName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('areaEditSave').click();
});

// View existing area on click
let currentAreaId = null;

// ─── Building side panel ──────────────────────────────────────
const COLOR_CATEGORIES = {
  '#3b82f6':'Blok mieszkalny','#60a5fa':'Wieżowiec','#22c55e':'Dom / Zieleń',
  '#ef4444':'Szpital / Ważny','#a855f7':'Kościół / Szkoła','#f59e0b':'Użyteczność','#64748b':'Inne'
};

function openAreaModal(area) {
  try {
    currentAreaId = area.id;
    const panel = document.getElementById('bldgPanel');
    document.getElementById('bldgColorBar').style.background = area.color || '#3b82f6';
    document.getElementById('bldgCategory').textContent = COLOR_CATEGORIES[area.color] || 'Budynek';
    document.getElementById('bldgName').textContent = area.name || 'Budynek';
    document.getElementById('bldgDesc').value = area.desc || '';
    document.getElementById('bldgPts').textContent = area.points.length;
    document.getElementById('bldgClr').textContent = area.color || '#3b82f6';
    document.getElementById('bldgClr').style.color = area.color || '#3b82f6';
    // Photo
    const img = document.getElementById('bldgPhotoImg');
    const ph  = document.getElementById('bldgPhotoPlaceholder');
    if (area.photo) { img.src = area.photo; img.style.display = 'block'; ph.style.display = 'none'; }
    else { img.style.display = 'none'; ph.style.display = 'flex'; }
    panel.classList.add('open');
  } catch(e) { console.warn('openAreaModal:', e); }
}

function closeBldgPanel() {
  document.getElementById('bldgPanel').classList.remove('open');
  currentAreaId = null;
}

document.getElementById('bldgPanelClose').addEventListener('click', closeBldgPanel);

// Save description
document.getElementById('bldgSave').addEventListener('click', () => {
  try {
    if (!currentAreaId) return;
    const area = areas.find(a => a.id === currentAreaId);
    if (area) { area.desc = document.getElementById('bldgDesc').value.trim(); saveAreas(); }
    closeBldgPanel();
  } catch(e) { console.warn('bldgSave:', e); }
});

// Delete building
document.getElementById('bldgDelete').addEventListener('click', () => {
  try {
    if (currentAreaId) { removeArea(currentAreaId); closeBldgPanel(); }
  } catch(e) { console.warn('bldgDelete:', e); }
});

// Photo upload
document.getElementById('bldgPhotoArea').addEventListener('click', () => {
  document.getElementById('bldgPhotoInput').click();
});
document.getElementById('bldgPhotoInput').addEventListener('change', (e) => {
  try {
    const file = e.target.files[0];
    if (!file || !currentAreaId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const area = areas.find(a => a.id === currentAreaId);
      if (area) { area.photo = dataUrl; saveAreas(); }
      const img = document.getElementById('bldgPhotoImg');
      img.src = dataUrl; img.style.display = 'block';
      document.getElementById('bldgPhotoPlaceholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
  } catch(e) { console.warn('bldgPhotoInput:', e); }
});

/* ───────────────────────────────────────────────────────────────
   SECTION 6: PIN SYSTEM
   ─────────────────────────────────────────────────────────────── */
let pins        = [];
let selColor    = '#22c55e';
let pinMode     = false;
let pendingLatLng = null;
let selectedPinId = null;
const pinMarkers  = {};

try {
  const saved = window.localStorage?.getItem('rzaka-photo-pins');
  if (saved) pins = JSON.parse(saved);
} catch(e) {}

function savePins() {
  try { window.localStorage?.setItem('rzaka-photo-pins', JSON.stringify(pins)); } catch(e){}
}

function makeIcon(color, name) {
  const html = `
    <div class="pin-marker">
      <div class="pin-bubble" style="background:${color}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
      <div class="pin-label">${name}</div>
    </div>`;
  return L.divIcon({ html, className:'', iconSize:[36,52], iconAnchor:[18,50], popupAnchor:[0,-52] });
}

function renderPin(pin) {
  try {
    const marker = L.marker([pin.lat, pin.lng], { icon: makeIcon(pin.color, pin.name) }).addTo(map);
    marker.on('click', () => openViewModal(pin));
    pinMarkers[pin.id] = marker;
  } catch(e) { console.warn('renderPin:', e); }
}

function removePin(id) {
  try {
    if (pinMarkers[id]) { map.removeLayer(pinMarkers[id]); delete pinMarkers[id]; }
    pins = pins.filter(p => p.id !== id);
    savePins();
    updatePinList();
  } catch(e) { console.warn('removePin:', e); }
}

function addPin(lat, lng, name, desc, color) {
  try {
    const pin = { id: Date.now(), lat, lng, name, desc, color };
    pins.push(pin);
    savePins();
    renderPin(pin);
    updatePinList();
  } catch(e) { console.warn('addPin:', e); }
}

function updatePinList() {
  try {
    const list  = document.getElementById('pinList');
    const empty = document.getElementById('pinEmpty');
    const count = document.getElementById('pinCount');
    count.textContent = pins.length;
    empty.style.display = pins.length ? 'none' : 'flex';
    list.innerHTML = '';
    pins.forEach(pin => {
      const li = document.createElement('li');
      li.className = 'pin-item';
      li.innerHTML = `
        <div class="pin-dot" style="background:${pin.color};box-shadow:0 0 6px ${pin.color}60"></div>
        <div class="pin-info">
          <div class="pin-item-name">${pin.name}</div>
          <div class="pin-item-desc">${pin.desc || '—'}</div>
        </div>`;
      li.addEventListener('click', () => {
        try {
          map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 1));
          openViewModal(pin);
        } catch(e){}
      });
      list.appendChild(li);
    });
    // Sync badges
    try { document.getElementById('drawerBadge').textContent = pins.length; } catch(e){}
  } catch(e) { console.warn('updatePinList:', e); }
}

// Render existing pins
pins.forEach(renderPin);
updatePinList();

// Pin mode toggle
const btnPinMode = document.getElementById('btnPinMode');

function setPinMode(on) {
  try {
    pinMode = on;
    btnPinMode.classList.toggle('active', on);
    document.getElementById('map').classList.toggle('pin-mode', on);
  } catch(e) {}
}

btnPinMode.addEventListener('click', () => setPinMode(!pinMode));

map.on('click', (e) => {
  if (!pinMode) return;
  try {
    pendingLatLng = e.latlng;
    openAddModal();
  } catch(e) {}
});

// Add pin modal
const addBackdrop = document.getElementById('addBackdrop');

function openAddModal() {
  try {
    document.getElementById('pinName').value = '';
    document.getElementById('pinDesc').value = '';
    addBackdrop.classList.add('open');
    setTimeout(() => { try { document.getElementById('pinName').focus(); } catch(e){} }, 50);
  } catch(e) {}
}

function closeAddModal() {
  try { addBackdrop.classList.remove('open'); pendingLatLng = null; } catch(e){}
}

document.getElementById('addForm').addEventListener('submit', e => {
  e.preventDefault();
  try {
    if (!pendingLatLng) return;
    const name = document.getElementById('pinName').value.trim();
    if (!name) return;
    const desc = document.getElementById('pinDesc').value.trim();
    addPin(pendingLatLng.lat, pendingLatLng.lng, name, desc, selColor);
    closeAddModal();
    setPinMode(false);
  } catch(e) { console.warn('addForm submit:', e); }
});

document.getElementById('addCancel').addEventListener('click', closeAddModal);

// Color picker
document.querySelectorAll('.color').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selColor = btn.dataset.c;
  });
});

// View pin modal
const viewBackdrop = document.getElementById('viewBackdrop');

function openViewModal(pin) {
  try {
    selectedPinId = pin.id;
    document.getElementById('viewTitle').textContent = pin.name;
    document.getElementById('viewDesc').textContent  = pin.desc || '(brak opisu)';
    viewBackdrop.classList.add('open');
  } catch(e) {}
}

function closeViewModal() {
  try { viewBackdrop.classList.remove('open'); selectedPinId = null; currentAreaId = null; } catch(e){}
}

document.getElementById('viewClose').addEventListener('click', closeViewModal);
document.getElementById('btnDelete').addEventListener('click', () => {
  try {
    if (selectedPinId !== null && !currentAreaId) {
      removePin(selectedPinId);
      closeViewModal();
    }
  } catch(e) {}
});

// Drawer sidebar
const drawerToggle = document.getElementById('drawerToggle');
const sidebar      = document.getElementById('sidebar');

drawerToggle.addEventListener('click', () => {
  try {
    const open = sidebar.classList.toggle('open');
    drawerToggle.classList.toggle('open', open);
  } catch(e) {}
});

document.getElementById('map').addEventListener('click', () => {
  try {
    sidebar.classList.remove('open');
    drawerToggle.classList.remove('open');
  } catch(e) {}
});

/* ───────────────────────────────────────────────────────────────
   SECTION 7: GUNDB CHAT (real-time P2P)
   Wrapped in try-catch. All chatDB refs have null checks.
   ─────────────────────────────────────────────────────────────── */
let gun    = null;
let chatDB = null;

try {
  if (typeof Gun !== 'undefined') {
    gun = Gun([
      'https://gun.eco/gun',
      'https://peer.wallie.io/gun',
      'https://plankton.shot.holbrook.io/gun'
    ]);
    chatDB = gun.get('rzaka-osiedle-v1');
    console.log('GunDB: connected');
  } else {
    console.warn('GunDB: library not loaded — chat will be offline only');
  }
} catch(e) {
  console.warn('GunDB init error:', e);
  gun    = null;
  chatDB = null;
}

/* ───────────────────────────────────────────────────────────────
   SECTION 8: SETUP / REGISTRATION (3-step)
   ─────────────────────────────────────────────────────────────── */

// Load saved profile
let profile = null;
try { profile = JSON.parse(window.localStorage?.getItem('rzaka-profile')); } catch(e){}

let setupPickMode    = false;
let myMarker         = null;
const bubbleMap      = {};

const setupBackdrop  = document.getElementById('setupBackdrop');
const setupNameInput = document.getElementById('setupName');
const setupPick      = document.getElementById('setupPick');
const pickLabel      = document.getElementById('pickLabel');
const setupDone      = document.getElementById('setupDone');
const chatBar        = document.getElementById('chatBar');
const chatInput      = document.getElementById('chatInput');
const chatSend       = document.getElementById('chatSend');
const chatName       = document.getElementById('chatName');
const chatAvatar     = document.getElementById('chatAvatar');
const myBuildingHint = document.getElementById('myBuildingHint');
const myBuildingReset= document.getElementById('myBuildingReset');

// Setup is hidden by CSS (display:none) and shown by onScanComplete()

let selectedAvatar   = './avatars/av01.webp';
let currentSetupPage = 1;

function showSetupPage(n) {
  try {
    currentSetupPage = n;
    [1,2,3].forEach(i => {
      document.getElementById('setupPage'+i).style.display = i===n ? 'block' : 'none';
      const dot = document.querySelector('.setup-step-dot[data-step="'+i+'"]');
      if (dot) {
        dot.classList.toggle('active', i===n);
        dot.classList.toggle('done', i<n);
      }
    });
  } catch(e) { console.warn('showSetupPage:', e); }
}

// Step 1 → 2
document.getElementById('setupNext1').addEventListener('click', () => {
  try {
    if (!setupNameInput.value.trim()) { setupNameInput.focus(); return; }
    showSetupPage(2);
  } catch(e) {}
});

// Avatar selection
document.querySelectorAll('.av-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    try {
      document.querySelectorAll('.av-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAvatar = btn.dataset.av;
    } catch(e) {}
  });
});

// Step 2 → 3 / back
document.getElementById('setupNext2').addEventListener('click', () => showSetupPage(3));
document.getElementById('setupBack2').addEventListener('click', () => showSetupPage(1));
document.getElementById('setupBack3').addEventListener('click', () => showSetupPage(2));

// Validate name field
setupNameInput.addEventListener('input', checkSetupReady);

function checkSetupReady() {
  try {
    const hasName     = setupNameInput.value.trim().length >= 2;
    const hasBuilding = setupPick.classList.contains('done');
    setupDone.disabled = !(hasName && hasBuilding);
  } catch(e) {}
}

// Pick building on map — click to reveal map, click map to select position
map.on('click', (e) => {
  if (!setupPickMode) return;
  try {
    const { lat, lng } = e.latlng;
    map._tempSetupLatLng = { lat, lng };
    setupPickMode = false;

    // Restore modal
    setupBackdrop.style.opacity  = '1';
    setupBackdrop.style.pointerEvents = '';
    document.getElementById('map').classList.remove('draw-mode');
    const hint = document.getElementById('pickHint');
    if (hint) hint.remove();

    setupPick.classList.add('done');
    pickLabel.textContent = '✓ Budynek zaznaczony na mapie';
    checkSetupReady();
  } catch(e) { console.warn('setupPickMode click:', e); }
});

setupPick.addEventListener('click', () => {
  try {
    if (!setupNameInput.value.trim()) { setupNameInput.focus(); return; }
    setupPickMode = true;
    setupBackdrop.style.animation = 'none'; // Usuń forwards który blokuje opacity
    setupBackdrop.style.opacity  = '0';
    setupBackdrop.style.pointerEvents = 'none';
    document.getElementById('map').classList.add('draw-mode');

    // Show hint overlay
    const hint = document.createElement('div');
    hint.id = 'pickHint';
    hint.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:5000;background:rgba(13,17,23,.95);border:1.5px solid #4ade80;border-radius:12px;padding:16px 24px;color:#4ade80;font-size:14px;font-weight:600;pointer-events:none;text-align:center';
    hint.innerHTML = '📍 Kliknij swój budynek na mapie';
    document.body.appendChild(hint);
  } catch(e) { console.warn('setupPick click:', e); }
});

// Finalize registration
setupDone.addEventListener('click', () => {
  try {
    const name = setupNameInput.value.trim();
    const pos  = map._tempSetupLatLng;
    if (!name || !pos) return;

    const bName = (document.getElementById('setupBuilding')?.value || '').trim();
    profile = {
      name,
      lat: pos.lat,
      lng: pos.lng,
      buildingName: bName || null,
      avatar: selectedAvatar || './avatars/av01.webp'
    };
    try { window.localStorage?.setItem('rzaka-profile', JSON.stringify(profile)); } catch(e){}
    setupBackdrop.style.display = 'none';
    initChat();
  } catch(e) { console.warn('setupDone click:', e); }
});

// Reset / change location
myBuildingReset.addEventListener('click', () => {
  try {
    profile = null;
    window.localStorage?.removeItem('rzaka-profile');
    location.reload();
  } catch(e) {}
});

/* ───────────────────────────────────────────────────────────────
   CHAT INITIALIZATION (called after setup or for returning users)
   ─────────────────────────────────────────────────────────────── */
function initChat() {
  try {
    if (!profile) return;

    chatBar.style.display = 'flex';
    chatName.textContent  = profile.name;

    // Set avatar display
    if (profile.avatar && profile.avatar.startsWith('./avatars/')) {
      chatAvatar.innerHTML = `<img src="${profile.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
      chatAvatar.style.background = 'transparent';
    } else if (profile.avatar) {
      chatAvatar.textContent = profile.avatar;
      chatAvatar.classList.add('emoji');
    } else {
      chatAvatar.textContent = profile.name.charAt(0).toUpperCase();
    }

    myBuildingHint.style.display = 'flex';

    // Place marker
    placeMyMarker(profile.lat, profile.lng);

    // Listen for GunDB messages (null-guarded)
    if (!chatDB) return;
    try {
      chatDB.map().on((msg, key) => {
        try {
          if (!msg || !msg.text || !msg.lat || !msg.lng) return;
          if (!bubbleMap[key]) renderBubble(key, msg);
        } catch(e) { console.warn('gun.on handler:', e); }
      });
    } catch(e) { console.warn('chatDB.map().on:', e); }
  } catch(e) { console.warn('initChat:', e); }
}

function placeMyMarker(lat, lng) {
  try {
    if (myMarker) map.removeLayer(myMarker);
    myMarker = L.marker([lat, lng], {
      icon: L.divIcon({ html:'<div class="my-marker"></div>', className:'', iconSize:[16,16], iconAnchor:[8,8] }),
      zIndexOffset: 500
    }).addTo(map);
  } catch(e) { console.warn('placeMyMarker:', e); }
}

function sendMsg() {
  try {
    const text = chatInput.value.trim();
    if (!text || !profile) return;

    const key = Date.now().toString();
    const msg = {
      author: profile.name,
      avatar: profile.avatar || '😀',
      buildingName: profile.buildingName || null,
      text,
      lat: profile.lat,
      lng: profile.lng,
      mine: true,
      ts: Date.now()
    };

    if (chatDB) {
      try { chatDB.get(key).put(msg); } catch(e) { console.warn('chatDB.put:', e); }
    }
    // Always render locally even if gun fails
    if (!bubbleMap[key]) renderBubble(key, msg);
    chatInput.value = '';
  } catch(e) { console.warn('sendMsg:', e); }
}

chatSend.addEventListener('click', sendMsg);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
});

function renderBubble(key, msg) {
  try {
    const isMe   = profile && msg.author === profile.name;
    const time   = new Date(msg.ts || Date.now());
    const timeStr= time.getHours().toString().padStart(2,'0') + ':' + time.getMinutes().toString().padStart(2,'0');

    const avHtml = (msg.avatar && msg.avatar.startsWith('./avatars/'))
      ? `<img src="${msg.avatar}" style="width:16px;height:16px;border-radius:50%;vertical-align:middle;margin-right:3px;object-fit:cover">`
      : (msg.avatar || '💬');

    const html = `
      <div class="msg-bubble${isMe?' mine':''}">
        <div class="msg-bubble-author">${avHtml} ${escHtml(msg.author)}</div>
        <div class="msg-bubble-text">${escHtml(msg.text)}</div>
        <div class="msg-bubble-time">${timeStr}</div>
      </div>`;

    const marker = L.marker([msg.lat, msg.lng], {
      icon: L.divIcon({ html, className:'', iconSize:[210, 80], iconAnchor:[10, 80] }),
      zIndexOffset: 1000
    }).addTo(map);

    bubbleMap[key] = marker;
    addToHistory(key, msg);

    // Auto-remove after 10 minutes
    setTimeout(() => {
      try {
        if (bubbleMap[key]) {
          map.removeLayer(bubbleMap[key]);
          delete bubbleMap[key];
        }
      } catch(e) {}
    }, 10 * 60 * 1000);
  } catch(e) { console.warn('renderBubble:', e); }
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ───────────────────────────────────────────────────────────────
   CHAT HISTORY PANEL (last 20 messages)
   ─────────────────────────────────────────────────────────────── */
const MAX_HISTORY   = 20;
const chatHistory   = [];
const chatHistPanel = document.getElementById('chatHistPanel');
const chatHistToggle= document.getElementById('chatHistToggle');
const chatHistClose = document.getElementById('chatHistClose');
const chatHistBadge = document.getElementById('chatHistBadge');
const chpList       = document.getElementById('chpList');
const chpEmpty      = document.getElementById('chpEmpty');

function openHistPanel()  { try { chatHistPanel.classList.add('open');    chatHistToggle.classList.add('open');    } catch(e){} }
function closeHistPanel() { try { chatHistPanel.classList.remove('open'); chatHistToggle.classList.remove('open'); } catch(e){} }

chatHistToggle.addEventListener('click', () =>
  chatHistPanel.classList.contains('open') ? closeHistPanel() : openHistPanel()
);
chatHistClose.addEventListener('click', closeHistPanel);
map.on('click', () => { if (!setupPickMode) closeHistPanel(); });

function formatTime(ts) {
  try {
    const d = new Date(ts || Date.now());
    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  } catch(e) { return '--:--'; }
}

function addToHistory(key, msg) {
  try {
    if (chatHistory.find(m => m._key === key)) return;
    msg._key = key;
    chatHistory.unshift(msg);
    if (chatHistory.length > MAX_HISTORY) chatHistory.pop();
    renderHistoryPanel();
  } catch(e) { console.warn('addToHistory:', e); }
}

function renderHistoryPanel() {
  try {
    const count = chatHistory.length;
    chatHistBadge.textContent = count;
    chpEmpty.style.display    = count ? 'none' : 'flex';
    chpList.innerHTML = '';

    chatHistory.forEach(msg => {
      try {
        const isMe = profile && msg.author === profile.name;
        const li   = document.createElement('li');
        li.className = 'chp-item' + (isMe ? ' mine' : '');

        const building = msg.buildingName
          ? `<span class="chp-building" title="${escHtml(msg.buildingName)}">${escHtml(msg.buildingName)}</span>`
          : '';

        li.innerHTML = `
          <div class="chp-meta">
            <span class="chp-author">${escHtml(msg.author)}</span>
            ${building}
            <span class="chp-time">${formatTime(msg.ts)}</span>
          </div>
          <div class="chp-text">${escHtml(msg.text)}</div>`;

        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          try {
            map.setView([msg.lat, msg.lng], Math.max(map.getZoom(), 1));
            closeHistPanel();
          } catch(e){}
        });
        chpList.appendChild(li);
      } catch(e) {}
    });
  } catch(e) { console.warn('renderHistoryPanel:', e); }
}

/* ───────────────────────────────────────────────────────────────
   SECTION 9: OVERLAYS — About, History, FAQ
   ─────────────────────────────────────────────────────────────── */

// ── FAQ ──────────────────────────────────────────────────────────
try {
  const faqPanel = document.getElementById('faqPanel');
  const btnFaq   = document.getElementById('btnFaq');
  const faqClose = document.getElementById('faqClose');

  function openFaq()  { faqPanel.classList.add('open');    btnFaq.classList.add('open');    }
  function closeFaq() { faqPanel.classList.remove('open'); btnFaq.classList.remove('open'); }

  btnFaq.addEventListener('click', () => faqPanel.classList.contains('open') ? closeFaq() : openFaq());
  faqClose.addEventListener('click', closeFaq);
  map.on('click', () => closeFaq());

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      try {
        const item = q.closest('.faq-item');
        const wasOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      } catch(e) {}
    });
  });
} catch(e) { console.warn('FAQ init:', e); }

// ── About ─────────────────────────────────────────────────────────
try {
  const aboutOverlay = document.getElementById('aboutOverlay');
  const aboutVideo   = document.getElementById('aboutVideo');
  const btnAbout     = document.getElementById('btnAbout');

  function openAbout() {
    aboutOverlay.classList.add('open');
    try { aboutVideo.play().catch(()=>{}); } catch(e){}
  }
  function closeAbout() {
    aboutOverlay.classList.remove('open');
    try { aboutVideo.pause(); } catch(e){}
  }

  btnAbout.addEventListener('click', openAbout);
  document.getElementById('aboutClose').addEventListener('click', closeAbout);
  document.getElementById('aboutMapBtn').addEventListener('click', closeAbout);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAbout(); });
} catch(e) { console.warn('About init:', e); }

// ── History ───────────────────────────────────────────────────────
try {
  const histOverlay = document.getElementById('historyOverlay');
  const btnHistory  = document.getElementById('btnHistory');

  function openHistory()  { histOverlay.classList.add('open');    }
  function closeHistory() { histOverlay.classList.remove('open'); }

  btnHistory.addEventListener('click', openHistory);
  document.getElementById('historyClose').addEventListener('click', closeHistory);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeHistory(); });

  // Dot navigation → scroll to card
  const track = document.getElementById('histTrack');
  document.querySelectorAll('.hdot').forEach(dot => {
    dot.addEventListener('click', () => {
      try {
        document.querySelectorAll('.hdot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const i     = parseInt(dot.dataset.i);
        const cards = track.querySelectorAll('.hist-card');
        cards[i]?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'start' });
      } catch(e) {}
    });
  });

  // Sync dots on scroll
  track.addEventListener('scroll', () => {
    try {
      const cards  = [...track.querySelectorAll('.hist-card')];
      const center = track.scrollLeft + track.clientWidth / 2;
      let closest = 0, minDist = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth/2 - center);
        if (d < minDist) { minDist=d; closest=i; }
      });
      document.querySelectorAll('.hdot').forEach((d,i) => d.classList.toggle('active', i===closest));
    } catch(e) {}
  });
} catch(e) { console.warn('History init:', e); }

/* ───────────────────────────────────────────────────────────────
   SECTION 10: ADMIN LINK
   (static <a href="admin.html"> in HTML — no JS needed)
   ─────────────────────────────────────────────────────────────── */
// Admin link is already in the header HTML. No additional JS required.

/* ───────────────────────────────────────────────────────────────
   GLOBAL KEYBOARD SHORTCUTS (Escape)
   ─────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  try {
    if (e.key !== 'Escape') return;
    if (drawMode)  { setDrawMode(false); return; }
    closeBldgPanel();
    closeAddModal();
    closeViewModal();
    try { document.getElementById('areaEditBackdrop').style.display = 'none'; } catch(_){}
    try { document.getElementById('setupBackdrop').style.display    = 'none'; } catch(_){}
  } catch(e) { console.warn('keydown handler:', e); }
});
