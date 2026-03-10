/**
 * Speech Pace Assessment — app.js
 *
 * Architecture:
 *   - SpeechRecognition (Web Speech API) supplies a stream of recognised words.
 *   - Each finalised word is stored in a ring buffer with a timestamp.
 *   - A sliding-window query over that buffer yields the current WPM.
 *   - The chart holds one data point per second for the most recent N seconds.
 */

'use strict';

// ─── DOM references ───────────────────────────────────────────────────────────

const btnToggle          = document.getElementById('btn-toggle');
const btnReset           = document.getElementById('btn-reset');
const btnCopy            = document.getElementById('btn-copy');
const windowSizeInput    = document.getElementById('window-size');
const windowSizeDisplay  = document.getElementById('window-size-display');
const targetWpmInput     = document.getElementById('target-wpm');
const targetWpmDisplay   = document.getElementById('target-wpm-display');
const statusIcon         = document.getElementById('status-icon');
const statusText         = document.getElementById('status-text');
const wpmDisplay         = document.getElementById('wpm-display');
const windowLabel        = document.getElementById('window-label');
const paceLabel          = document.getElementById('gauge__pace-label') ||
                           document.getElementById('pace-label');
const gaugeCard          = document.getElementById('gauge-card');
const statSessionWpm     = document.getElementById('stat-session-wpm');
const statWordCount      = document.getElementById('stat-word-count');
const statElapsed        = document.getElementById('stat-elapsed');
const transcriptEl       = document.getElementById('transcript');
const langSelect         = document.getElementById('lang-select');
const browserWarning     = document.getElementById('browser-warning');
const chartCanvas        = document.getElementById('wpm-chart');

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {{ word: string; ts: number }[]} Ring buffer of recognised words */
let wordBuffer = [];

/** WPM data points sampled once per second: { ts, wpm }[] */
let chartData = [];

/** Full final transcript string */
let finalTranscript = '';

/** Elapsed seconds since Start */
let elapsedSeconds = 0;

/** Interval timer references */
let tickInterval   = null;   // 1-second tick for stats + chart
let elapsedTimer   = null;   // 1-second elapsed counter (same as tickInterval, combined)

let isRecording = false;

/** @type {SpeechRecognition|null} */
let recognition = null;

// ─── Settings ─────────────────────────────────────────────────────────────────

let windowSize = parseInt(windowSizeInput.value, 10);   // seconds
let targetWpm  = parseInt(targetWpmInput.value,  10);   // wpm
let lang       = langSelect.value;                       // BCP-47 language tag

// ─── Browser support check ────────────────────────────────────────────────────

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  browserWarning.classList.remove('hidden');
  btnToggle.disabled = true;
}

// ─── Settings listeners ───────────────────────────────────────────────────────

windowSizeInput.addEventListener('input', () => {
  windowSize = parseInt(windowSizeInput.value, 10);
  windowSizeDisplay.textContent = `${windowSize} s`;
  windowLabel.textContent = `last ${windowSize} s`;
});

targetWpmInput.addEventListener('input', () => {
  targetWpm = parseInt(targetWpmInput.value, 10);
  targetWpmDisplay.textContent = `${targetWpm} wpm`;
  redrawChart();
});

langSelect.addEventListener('change', () => {
  lang = langSelect.value;
});

// ─── Main toggle ──────────────────────────────────────────────────────────────

btnToggle.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

btnReset.addEventListener('click', resetSession);

btnCopy.addEventListener('click', () => {
  if (!finalTranscript) return;
  navigator.clipboard.writeText(finalTranscript).then(() => {
    btnCopy.textContent = 'Copied!';
    setTimeout(() => { btnCopy.textContent = 'Copy'; }, 1500);
  });
});

// ─── Recording lifecycle ──────────────────────────────────────────────────────

function startRecording() {
  recognition = new SpeechRecognition();
  recognition.continuous      = true;
  recognition.interimResults  = true;
  recognition.lang            = lang;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isRecording = true;
    setStatus('active', 'Listening…');
    btnToggle.querySelector('.btn__label').textContent = 'Stop';
    btnToggle.querySelector('.btn__icon').textContent  = '⏹';
    btnToggle.classList.add('recording');

    // Tick every second: update WPM, elapsed, chart
    tickInterval = setInterval(onTick, 1000);
  };

  recognition.onresult = onRecognitionResult;

  recognition.onerror = (e) => {
    if (e.error === 'no-speech') return;   // benign, recognition will restart
    const messages = {
      'not-allowed':  'Microphone access denied. Please allow microphone access and try again.',
      'audio-capture':'No microphone found. Please connect a microphone.',
      'network':      'Network error during speech recognition.',
    };
    setStatus('error', messages[e.error] || `Error: ${e.error}`);
    stopRecording();
  };

  recognition.onend = () => {
    // Auto-restart if we're still supposed to be recording
    // (the browser stops recognition after a silence timeout)
    if (isRecording) {
      try { recognition.start(); } catch (_) { /* already starting */ }
    }
  };

  recognition.start();
}

function stopRecording() {
  isRecording = false;

  if (recognition) {
    recognition.onend = null;  // prevent auto-restart
    recognition.stop();
    recognition = null;
  }

  clearInterval(tickInterval);
  tickInterval = null;

  btnToggle.querySelector('.btn__label').textContent = 'Start';
  btnToggle.querySelector('.btn__icon').textContent  = '▶';
  btnToggle.classList.remove('recording');

  // Clear interim text from transcript
  renderTranscript('');

  const finalWpm = computeSessionWpm();
  setStatus('idle',
    finalWpm > 0
      ? `Stopped — session average: ${finalWpm} WPM`
      : 'Stopped'
  );
}

function resetSession() {
  stopRecording();

  wordBuffer       = [];
  chartData        = [];
  finalTranscript  = '';
  elapsedSeconds   = 0;

  wpmDisplay.textContent  = '—';
  wpmDisplay.className    = 'gauge__value';
  paceLabel.textContent   = '';
  paceLabel.className     = 'gauge__pace-label';
  gaugeCard.className     = 'gauge card';

  statSessionWpm.textContent = '—';
  statWordCount.textContent  = '0';
  statElapsed.textContent    = '0:00';

  transcriptEl.innerHTML =
    '<span class="transcript__placeholder">Transcript will appear here when recording starts…</span>';

  setStatus('idle', 'Ready — click Start to begin');
  redrawChart();
}

// ─── Speech recognition results ───────────────────────────────────────────────

function onRecognitionResult(event) {
  let interimText = '';

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result     = event.results[i];
    const transcript = result[0].transcript;

    if (result.isFinal) {
      const now   = Date.now();
      const words = tokenise(transcript);
      words.forEach(word => wordBuffer.push({ word, ts: now }));
      finalTranscript += transcript + ' ';
      renderTranscript('');
    } else {
      interimText += transcript;
    }
  }

  renderTranscript(interimText);
}

/** Split transcript into words, filtering punctuation-only tokens */
function tokenise(text) {
  return text.trim().split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w));
}

// ─── Tick (called every second while recording) ───────────────────────────────

function onTick() {
  elapsedSeconds++;

  // Purge words older than the window (we keep them for session WPM; only filter for current WPM)
  const now = Date.now();

  // Current WPM: words within the trailing window, always divided by windowSize
  const windowMs      = windowSize * 1000;
  const wordsInWindow = wordBuffer.filter(w => now - w.ts <= windowMs);
  const currentWpm    = Math.round((wordsInWindow.length / windowSize) * 60);

  updateGauge(currentWpm);

  // Session WPM
  const sessionWpm = computeSessionWpm();
  statSessionWpm.textContent = sessionWpm > 0 ? sessionWpm : '—';

  // Word count
  statWordCount.textContent = wordBuffer.length;

  // Elapsed
  statElapsed.textContent = formatTime(elapsedSeconds);

  // Chart data point
  chartData.push({ ts: now, wpm: currentWpm });
  // Keep only the last 10 minutes of history
  const maxHistory = 600;
  if (chartData.length > maxHistory) chartData.shift();

  redrawChart();
}

// ─── Gauge ────────────────────────────────────────────────────────────────────

function updateGauge(wpm) {
  if (wpm === 0) {
    wpmDisplay.textContent  = '—';
    wpmDisplay.className    = 'gauge__value';
    paceLabel.textContent   = '';
    paceLabel.className     = 'gauge__pace-label';
    gaugeCard.className     = 'gauge card';
    return;
  }

  wpmDisplay.textContent = wpm;

  const ratio = wpm / targetWpm;
  let pace, modifier;

  if (ratio < 0.80) {
    pace = 'Too slow'; modifier = 'slow';
  } else if (ratio > 1.20) {
    pace = 'Too fast'; modifier = 'fast';
  } else {
    pace = 'Good pace'; modifier = 'ok';
  }

  wpmDisplay.className  = `gauge__value gauge__value--${modifier}`;
  paceLabel.textContent = pace;
  paceLabel.className   = `gauge__pace-label gauge__pace-label--${modifier}`;
  gaugeCard.className   = `gauge card gauge--${modifier}`;
}

// ─── Chart ────────────────────────────────────────────────────────────────────

function redrawChart() {
  const canvas = chartCanvas;
  const dpr    = window.devicePixelRatio || 1;
  const width  = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width  = width  * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Colours from CSS vars (read once; canvas can't use CSS vars directly)
  const BG           = '#1a1d27';
  const GRID         = '#2d3250';
  const LINE_ACTUAL  = '#6c63ff';
  const LINE_TARGET  = '#f59e0b';
  const TEXT_COLOR   = '#8892a4';
  const AREA_FILL    = 'rgba(108, 99, 255, 0.12)';

  const PAD = { top: 10, right: 20, bottom: 30, left: 44 };
  const W   = width  - PAD.left - PAD.right;
  const H   = height - PAD.top  - PAD.bottom;

  // ---- Determine y-axis range ----
  const wpmValues  = chartData.map(d => d.wpm);
  const dataMax    = wpmValues.length > 0 ? Math.max(...wpmValues) : targetWpm + 40;
  const yMax       = Math.ceil(Math.max(dataMax, targetWpm + 20) / 20) * 20;
  const yMin       = 0;

  // ---- Helpers ----
  function xOf(index, total) {
    if (total <= 1) return PAD.left + W;
    return PAD.left + (index / (total - 1)) * W;
  }

  function yOf(wpm) {
    return PAD.top + H - ((wpm - yMin) / (yMax - yMin)) * H;
  }

  // ---- Clear ----
  ctx.clearRect(0, 0, width, height);

  // ---- Grid lines ----
  ctx.strokeStyle = GRID;
  ctx.lineWidth   = 1;
  ctx.setLineDash([3, 4]);

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const wpm = yMin + ((yMax - yMin) / gridSteps) * i;
    const y   = yOf(wpm);

    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + W, y);
    ctx.stroke();

    ctx.fillStyle  = TEXT_COLOR;
    ctx.font       = '10px monospace';
    ctx.textAlign  = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(wpm), PAD.left - 6, y);
  }

  ctx.setLineDash([]);

  // ---- Target WPM dashed line ----
  const targetY = yOf(targetWpm);
  ctx.strokeStyle = LINE_TARGET;
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(PAD.left, targetY);
  ctx.lineTo(PAD.left + W, targetY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Label the target line
  ctx.fillStyle    = LINE_TARGET;
  ctx.font         = '10px monospace';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${targetWpm}`, PAD.left + W + 2, targetY);

  if (chartData.length === 0) return;

  const total = chartData.length;

  // ---- Filled area under the WPM line ----
  ctx.beginPath();
  ctx.moveTo(xOf(0, total), yOf(0));
  chartData.forEach((d, i) => ctx.lineTo(xOf(i, total), yOf(d.wpm)));
  ctx.lineTo(xOf(total - 1, total), yOf(0));
  ctx.closePath();
  ctx.fillStyle = AREA_FILL;
  ctx.fill();

  // ---- WPM line ----
  ctx.beginPath();
  chartData.forEach((d, i) => {
    const x = xOf(i, total);
    const y = yOf(d.wpm);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = LINE_ACTUAL;
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  ctx.stroke();

  // ---- X-axis labels ----
  ctx.fillStyle    = TEXT_COLOR;
  ctx.font         = '10px monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';

  const labelCount = Math.min(6, total);
  for (let li = 0; li <= labelCount; li++) {
    const idx = Math.round((li / labelCount) * (total - 1));
    const sec = elapsedSeconds - (total - 1 - idx);
    if (sec < 0) continue;
    const x = xOf(idx, total);
    ctx.fillText(formatTime(sec), x, PAD.top + H + 6);
  }
}

// ─── Transcript rendering ─────────────────────────────────────────────────────

function renderTranscript(interimText) {
  const placeholder = transcriptEl.querySelector('.transcript__placeholder');
  if (placeholder) placeholder.remove();

  // Rebuild: final text + interim span
  transcriptEl.innerHTML = '';

  if (finalTranscript) {
    const finalNode = document.createTextNode(finalTranscript);
    transcriptEl.appendChild(finalNode);
  }

  if (interimText) {
    const interimSpan = document.createElement('span');
    interimSpan.className   = 'transcript__interim';
    interimSpan.textContent = interimText;
    transcriptEl.appendChild(interimSpan);
  }

  if (!finalTranscript && !interimText) {
    const ph = document.createElement('span');
    ph.className   = 'transcript__placeholder';
    ph.textContent = 'Transcript will appear here when recording starts…';
    transcriptEl.appendChild(ph);
  }

  // Auto-scroll to bottom
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

// ─── Session WPM helper ───────────────────────────────────────────────────────

function computeSessionWpm() {
  if (elapsedSeconds === 0 || wordBuffer.length === 0) return 0;
  return Math.round((wordBuffer.length / elapsedSeconds) * 60);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function setStatus(type, message) {
  statusText.textContent = message;
  statusIcon.className   = 'status-bar__icon';
  if (type === 'active') statusIcon.classList.add('active');
  if (type === 'error')  statusIcon.classList.add('error');
}

// ─── Resize chart on window resize ───────────────────────────────────────────

window.addEventListener('resize', redrawChart);

// ─── Initial render ───────────────────────────────────────────────────────────

redrawChart();
