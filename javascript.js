/**
 * AgriTech IoT Dashboard — javascript.js
 * Logic: mô phỏng cảm biến, đồ thị Canvas, điều khiển thiết bị
 * Theme: do inline script trong index.html xử lý (toggleTheme)
 */

'use strict';

// ── Trạng thái cảm biến ──────────────────────────────────────────────────────
const sensor = {
  temp:     28.5,   // °C
  humidity: 68.2,   // %RH
  soil:     62.8,   // %
  light:    34500,  // Lux
  ph:       6.45,   // pH
  ec:       1.62,   // mS/cm
};

// ── Lịch sử biểu đồ (10 chu kỳ) ─────────────────────────────────────────────
const chart = {
  labels:   ['-54s','-48s','-42s','-36s','-30s','-24s','-18s','-12s','-6s','Hiện tại'],
  temp:     [27.8, 28.0, 28.2, 28.1, 28.4, 28.6, 28.3, 28.4, 28.5, 28.5],
  humidity: [65.0, 66.5, 67.0, 66.2, 68.0, 69.1, 68.5, 67.8, 68.0, 68.2],
};

// ── Thiết bị chấp hành ───────────────────────────────────────────────────────
const device = { pump: false, fan: true, mist: false, led: true };

// ── Chu kỳ 6 giây ────────────────────────────────────────────────────────────
const CYCLE = 6;
let countdown = CYCLE;
let timer = null;

// ─────────────────────────────────────────────────────────────────────────────
//  KHỞI TẠO
// ─────────────────────────────────────────────────────────────────────────────
function init() {
  stamp();
  renderAll(true);
  drawRealtimeChart();
  logInit();
  startCycle();

  document.getElementById('manualRefreshBtn')
          ?.addEventListener('click', manualRefresh);
  window.addEventListener('resize', drawRealtimeChart);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

// ─────────────────────────────────────────────────────────────────────────────
//  CHU KỲ 6 GIÂY
// ─────────────────────────────────────────────────────────────────────────────
function startCycle() {
  clearInterval(timer);
  countdown = CYCLE;
  syncUI();
  timer = setInterval(() => {
    countdown--;
    syncUI();
    if (countdown <= 0) { update(); countdown = CYCLE; syncUI(); }
  }, 1000);
}

function syncUI() {
  const t = document.getElementById('countdownTimer');
  const b = document.getElementById('syncProgressBar');
  if (t) t.textContent = countdown + 's';
  if (b) b.style.width  = (countdown / CYCLE * 100) + '%';
}

function manualRefresh() {
  const btn = document.getElementById('manualRefreshBtn');
  btn?.classList.add('spinning');
  update();
  countdown = CYCLE;
  syncUI();
  setTimeout(() => btn?.classList.remove('spinning'), 600);
}

// ─────────────────────────────────────────────────────────────────────────────
//  MÔ PHỎNG DỮ LIỆU
// ─────────────────────────────────────────────────────────────────────────────
function rand(a, b) { return Math.random() * (b - a) + a; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function update() {
  const prev = { ...sensor };

  let dT = rand(-0.28, 0.32);
  let dH = rand(-0.75, 0.85);
  if (device.mist) { dT -= 0.3; dH += 0.8; }
  if (device.fan)  { dT -= 0.1; }

  sensor.temp     = clamp(sensor.temp     + dT,          24,   34);
  sensor.humidity = clamp(sensor.humidity + dH,          55,   85);
  sensor.soil     = clamp(sensor.soil     + rand(-0.38, 0.42) + (device.pump ? 0.6 : 0), 45, 80);
  sensor.light    = clamp(sensor.light    + rand(-380, 420),  18000, 48000);
  sensor.ph       = clamp(sensor.ph       + rand(-0.03, 0.03), 5.8,  7.2);
  sensor.ec       = clamp(sensor.ec       + rand(-0.02, 0.02), 1.1,  2.4);

  renderAll(false, {
    temp: sensor.temp - prev.temp,
    hum:  sensor.humidity - prev.humidity,
    soil: sensor.soil - prev.soil,
    light:sensor.light - prev.light,
    ph:   sensor.ph - prev.ph,
    ec:   sensor.ec - prev.ec,
  });

  chart.temp.shift();     chart.temp.push(+sensor.temp.toFixed(1));
  chart.humidity.shift(); chart.humidity.push(+sensor.humidity.toFixed(1));
  drawRealtimeChart();
  stamp();
  checkAlerts();
}

// ─────────────────────────────────────────────────────────────────────────────
//  RENDER GIÁ TRỊ CARDS
// ─────────────────────────────────────────────────────────────────────────────
function renderAll(initial, d) {
  d = d || {};
  set('valTemp',     sensor.temp.toFixed(1),                    initial);
  set('valHumidity', sensor.humidity.toFixed(1),                initial);
  set('valSoil',     sensor.soil.toFixed(1),                    initial);
  set('valLight',    sensor.light.toLocaleString('vi-VN'),      initial);
  set('valPh',       sensor.ph.toFixed(2),                      initial);
  set('valEc',       sensor.ec.toFixed(2),                      initial);

  bar('tempBar',     sensor.temp,     15,    40);
  bar('humidityBar', sensor.humidity, 40,    100);
  bar('soilBar',     sensor.soil,     30,    90);
  bar('lightBar',    sensor.light,    10000, 50000);
  bar('phBar',       (sensor.ph - 5) / 3 * 100, 0, 100);
  bar('ecBar',       sensor.ec / 2.5 * 100,      0, 100);

  delta('tempDelta',  d.temp  ?? 0.2,  '°C',    1);
  delta('humDelta',   d.hum   ?? -0.4, '%',     1);
  delta('soilDelta',  d.soil  ?? 0.5,  '%',     1);
  delta('lightDelta', d.light ?? 120,  ' Lux',  0);
  delta('phDelta',    d.ph    ?? -0.05,'',       2);
  delta('ecDelta',    d.ec    ?? 0.03, ' mS',   2);

  pill('tempStatus',     sensor.temp,     22,    32,    'Tối ưu',     'Cao');
  pill('humidityStatus', sensor.humidity, 60,    80,    'Lý tưởng',   'Cần sương');
  pill('soilStatus',     sensor.soil,     50,    75,    'Đủ ẩm',      'Cần tưới');
  pill('lightStatus',    sensor.light,    25000, 45000, 'Đủ sáng',    'Ánh sáng yếu');
  pill('phStatus',       sensor.ph,       6.0,   7.0,   'Cân bằng',   'Lệch chuẩn');
  pill('ecStatus',       sensor.ec,       1.2,   2.2,   'Đạt chuẩn',  'Thiếu phân');
}

function set(id, txt, skip) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = txt;
  if (!skip) {
    el.classList.remove('updated');
    void el.offsetWidth;
    el.classList.add('updated');
  }
}

function bar(id, val, lo, hi) {
  const el = document.getElementById(id);
  if (el) el.style.width = clamp((val - lo) / (hi - lo) * 100, 3, 100) + '%';
}

function delta(id, v, unit, dec) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = (v >= 0 ? '+' : '') + v.toFixed(dec) + unit;
  el.classList.toggle('negative', v < 0);
}

function pill(id, val, lo, hi, ok, bad) {
  const el = document.getElementById(id);
  if (!el) return;
  const good = val >= lo && val <= hi;
  el.textContent = good ? ok : bad;
  el.className   = 'status-pill ' + (good ? 'optimal' : 'warning');
}

function stamp() {
  const el = document.getElementById('lastUpdatedLabel');
  if (el) el.textContent = 'Cập nhật lần cuối: ' + new Date().toLocaleTimeString('vi-VN');
}

// ─────────────────────────────────────────────────────────────────────────────
//  BIỂU ĐỒ CANVAS
// ─────────────────────────────────────────────────────────────────────────────
function drawRealtimeChart() {
  const canvas = document.getElementById('realtimeChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const R = canvas.getBoundingClientRect();

  canvas.width  = R.width  * dpr;
  canvas.height = R.height * dpr;
  ctx.scale(dpr, dpr);

  const W = R.width, H = R.height;
  const P = { top:25, right:30, bottom:35, left:42 };
  const gW = W - P.left - P.right;
  const gH = H - P.top  - P.bottom;

  // Detect light mode trên <html>
  const light = document.documentElement.classList.contains('light-mode');

  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.fillStyle  = light ? '#64748b' : '#94a3b8';
  ctx.font = '10px "Plus Jakarta Sans",sans-serif';
  ctx.textAlign = 'right';

  for (let i = 0; i <= 4; i++) {
    const y = P.top + gH / 4 * i;
    ctx.beginPath(); ctx.moveTo(P.left, y); ctx.lineTo(W - P.right, y); ctx.stroke();
    ctx.fillText(String(100 - 25 * i), P.left - 6, y + 4);
  }

  // X labels
  ctx.textAlign = 'center';
  const N = chart.temp.length;
  for (let i = 0; i < N; i++) {
    ctx.fillText(chart.labels[i], P.left + gW / (N-1) * i, H - 10);
  }

  const getX = i => P.left + gW / (N-1) * i;
  const getY = (v, lo, hi) => P.top + gH - (v - lo) / (hi - lo) * gH;
  const botY  = H - P.bottom;
  const nodeBg = light ? '#ffffff' : '#0a0f0d';

  // Humidity (cyan)
  drawSeries(ctx, chart.humidity, i => getY(chart.humidity[i], 40, 100), getX, N,
    '#06b6d4', light ? 'rgba(6,182,212,0.18)' : 'rgba(6,182,212,0.14)', nodeBg, botY);

  // Temperature (rose)
  drawSeries(ctx, chart.temp, i => getY(chart.temp[i], 20, 40), getX, N,
    '#f43f5e', light ? 'rgba(244,63,94,0.20)' : 'rgba(244,63,94,0.16)', nodeBg, botY);
}

function drawSeries(ctx, data, yFn, xFn, n, stroke, fill, nodeBg, botY) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xFn(i), y = yFn(i);
    if (i === 0) { ctx.moveTo(x, y); continue; }
    const px = xFn(i-1), py = yFn(i-1);
    const mx = (px + x) / 2;
    ctx.bezierCurveTo(mx, py, mx, y, x, y);
  }
  ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.lineTo(xFn(n-1), botY); ctx.lineTo(xFn(0), botY);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();

  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(xFn(i), yFn(i), i === n-1 ? 4.5 : 3, 0, Math.PI*2);
    ctx.fillStyle = stroke; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = nodeBg; ctx.stroke();
  }
}

// expose cho toggleTheme trong HTML
window.drawRealtimeChart = drawRealtimeChart;

// ─────────────────────────────────────────────────────────────────────────────
//  THIẾT BỊ CHẤP HÀNH
// ─────────────────────────────────────────────────────────────────────────────
const DEV_MAP = {
  pump: { txt:'txtPump', on:'Đang BẬT (1.2 bar)', name:'Máy Bơm Tưới' },
  fan:  { txt:'txtFan',  on:'Đang BẬT (Cấp 2)',   name:'Quạt Thông Gió' },
  mist: { txt:'txtMist', on:'Đang BẬT (Phun mịn)', name:'Phun Sương' },
  led:  { txt:'txtLed',  on:'Đang BẬT (Auto)',     name:'Đèn LED' },
};

function toggleDevice(type, on) {
  device[type] = on;
  const d = DEV_MAP[type];
  if (!d) return;
  const el = document.getElementById(d.txt);
  if (el) { el.textContent = on ? d.on : 'Đang TẮT'; el.classList.toggle('active', on); }
  addActivityLog((on ? 'BẬT ' : 'TẮT ') + d.name, on ? 'normal' : 'warning');
}
window.toggleDevice = toggleDevice;

// ─────────────────────────────────────────────────────────────────────────────
//  NHẬT KÝ
// ─────────────────────────────────────────────────────────────────────────────
function logInit() {
  addActivityLog('Khởi động trạm quan trắc IoT.', 'normal');
  addActivityLog('Chu kỳ đo: 6 giây / lần.', 'normal');
  addActivityLog('Hệ thống tưới ở chế độ tự động.', 'normal');
}

function addActivityLog(msg, level) {
  const ul = document.getElementById('activityLogsList');
  if (!ul) return;
  const t = new Date().toLocaleTimeString('vi-VN');
  const li = document.createElement('li');
  li.className = 'log-item' + (level === 'warning' ? ' warning' : '');
  li.innerHTML = `<span class="log-time">${t}</span><span class="log-msg">${msg}</span>`;
  ul.insertBefore(li, ul.firstChild);
  while (ul.children.length > 15) ul.removeChild(ul.lastChild);
}
window.addActivityLog = addActivityLog;

// ─────────────────────────────────────────────────────────────────────────────
//  CẢNH BÁO
// ─────────────────────────────────────────────────────────────────────────────
function checkAlerts() {
  const badge = document.getElementById('systemHealthBadge');
  const txt   = document.getElementById('systemStatusText');
  if (!badge || !txt) return;

  if (sensor.soil < 50 && !device.pump) {
    txt.textContent = 'Cảnh báo: Đất khô'; badge.className = 'system-badge warning';
  } else if (sensor.temp > 32) {
    txt.textContent = 'Cảnh báo: Nhiệt độ cao'; badge.className = 'system-badge warning';
  } else {
    txt.textContent = 'Hệ Thống Bình Thường'; badge.className = 'system-badge normal';
  }
}
