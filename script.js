/* ══════════════════════════════════════════════
   TARJETA 3D — Lógica
   - Vanilla JS, sin librerías
   - Giroscopio iOS (DeviceOrientationEvent) + mouse + touch
   - Suavizado: lerp + clamp + requestAnimationFrame
   ══════════════════════════════════════════════ */

/* ─── ✏️ TEXTOS EDITABLES — cambiá esto y listo ─── */
const BIRTHDAY_CONFIG = {
  title: "Feliz cumpleaños",
  subtitle: "Te deseo que la vida te regale momentos felices hoy y siempre. ✨",
  hintGyro: "Mové tu teléfono ✨",
  hintTouch: "Podés mover la tarjeta con el dedo ✨",
  musicVolume: 0.35, // presente pero no invasivo (0.0–1.0)
  // ── Reverso: reemplazá por tu texto propio ──
  backTitle: "Claw ❤️",
  backMessage:
    "Sos una de las mejores personas que me he cruzado en la vida. Sinceramente, cada vez que hablo con vos, mi día se siente realmente distinto, y pareciera que el tiempo no hubiera pasado.\n\n" +
    "Espero que, sea cual sea el camino que elijas transitar, esté lleno de aventuras, felicidad y, sobre todo, mucho amor.\n\n" +
    "Te deseo de todo corazón un muy feliz cumpleaños. Ojalá todos tus sueños se hagan realidad y que la vida te devuelva todo lo lindo que das. ❤️",
};

/* ─── Parámetros de movimiento (suave / lento / elegante) ─── */
const MAX_TILT_Y = 10;   // grados máx. rotateY (izq/der)
const MAX_TILT_X = 7;    // grados máx. rotateX (arriba/abajo)
const MAX_SHIFT = 30;    // px máx. base del parallax (se multiplica por depth)
const DEPTH_Z = 200;     // px de separación translateZ entre planos
const LERP = 0.06;       // menor = más suave/lento (0.05–0.08 ideal)
const GYRO_RANGE = 22;   // grados de inclinación que mapean a [-1,1]

const $ = (s) => document.querySelector(s);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const scene = $("#scene");
const layers = [...document.querySelectorAll(".layer[data-depth]")];
const openBtn = $("#openBtn");
const hint = $("#hint");
const friendImg = $("#friendImg");
const bgMusic = $("#bgMusic");
const musicBtn = $("#musicBtn");

/* ─── Música: tap abre barrita · slider = volumen · mute adentro ───
   (solo después de abrir, sin romper nada si falta music.mp3) */
let musicOn = true;
let lastVolume = BIRTHDAY_CONFIG.musicVolume;
const musicWrap = $("#musicWrap");
const volumePop = $("#volumePop");
const volumeSlider = $("#volumeSlider");
const muteBtn = $("#muteBtn");
if (bgMusic) bgMusic.volume = BIRTHDAY_CONFIG.musicVolume;
function volumeIcon(v) {
  return v <= 0 ? "🔇" : v < 0.5 ? "🔉" : "🔊";
}
function paintMusicUI() {
  const v = bgMusic ? bgMusic.volume : 0;
  const icon = !musicOn || v <= 0 ? "🔇" : volumeIcon(v);
  if (musicBtn) {
    musicBtn.textContent = icon;
    musicBtn.setAttribute("aria-label", musicOn ? "Volumen" : "Activar música");
    musicBtn.setAttribute("aria-expanded", volumePop ? String(volumePop.classList.contains("open")) : "false");
  }
  if (muteBtn) {
    muteBtn.textContent = icon;
    muteBtn.setAttribute("aria-label", musicOn ? "Silenciar música" : "Activar música");
  }
  if (volumeSlider && bgMusic) volumeSlider.value = String(Math.round(bgMusic.volume * 100));
}
function closeVolume() {
  if (volumePop) {
    volumePop.classList.remove("open");
    volumePop.setAttribute("aria-hidden", "true");
  }
  paintMusicUI();
}
if (musicBtn && bgMusic) {
  if (volumeSlider) volumeSlider.value = String(Math.round(BIRTHDAY_CONFIG.musicVolume * 100));
  // Tap en el botón = abrir/cerrar la barrita
  musicBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!volumePop) return;
    const willOpen = !volumePop.classList.contains("open");
    volumePop.classList.toggle("open", willOpen);
    volumePop.setAttribute("aria-hidden", String(!willOpen));
    musicBtn.setAttribute("aria-expanded", String(willOpen));
  });
  // Slider = volumen (en iOS Safari el hardware manda: igual se guarda y el mute pausa)
  if (volumeSlider) {
    volumeSlider.addEventListener("input", async () => {
      const v = Math.min(100, Math.max(0, Number(volumeSlider.value) || 0)) / 100;
      try {
        bgMusic.volume = v;
        if (v > 0) {
          lastVolume = v;
          if (bgMusic.paused) await bgMusic.play();
          musicOn = true;
        } else {
          bgMusic.pause();
          musicOn = false;
        }
      } catch (_) { /* sin audio: no rompe nada */ }
      paintMusicUI();
    });
  }
  // Mute adentro del panel: pausa/reanuda conservando el volumen del slider
  if (muteBtn) {
    muteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        if (bgMusic.paused) {
          if (bgMusic.volume <= 0) bgMusic.volume = lastVolume;
          await bgMusic.play();
          musicOn = true;
        } else {
          bgMusic.pause();
          musicOn = false;
        }
      } catch (_) { /* archivo faltante o silencio: no rompe nada */ }
      paintMusicUI();
    });
  }
  // Tap fuera = cerrar la barrita (no interfiere con el parallax: es un tap, no drag)
  document.addEventListener("click", (e) => {
    if (volumePop && volumePop.classList.contains("open") &&
        musicWrap && !musicWrap.contains(e.target)) closeVolume();
  });
  paintMusicUI();
}

/* Aplicar textos editables */
$("#birthdayTitle").textContent = BIRTHDAY_CONFIG.title;
$("#birthdaySubtitle").textContent = BIRTHDAY_CONFIG.subtitle;
$("#backTitle").textContent = BIRTHDAY_CONFIG.backTitle;
$("#backMessage").textContent = BIRTHDAY_CONFIG.backMessage;

/* ─── Flip frente ↔ reverso (la música sigue: no se toca el audio) ─── */
const flipBtn = $("#flipBtn");
const backBtn = $("#backBtn");
if (flipBtn) flipBtn.addEventListener("click", () => document.body.classList.add("flipped"));
if (backBtn) backBtn.addEventListener("click", () => document.body.classList.remove("flipped"));

/* ─── Foto: mostrar placeholder si aún no hay friend.png ─── */
(function initPhoto() {
  const frame = friendImg.closest(".photo-frame");
  const show = () => { frame.classList.add("has-photo"); friendImg.dataset.loaded = "1"; friendImg.style.display = "block"; };
  const hide = () => { frame.classList.remove("has-photo"); friendImg.style.display = "none"; };
  if (friendImg.complete && friendImg.naturalWidth > 1) show();
  friendImg.addEventListener("load", show);
  friendImg.addEventListener("error", hide);
  // Si el archivo no existe, el navegador dispara error → queda el placeholder.
  if (friendImg.complete && (!friendImg.naturalWidth)) hide();
})();

/* ─── Foto del reverso: back-photo.png → friend.png → ocultar ─── */
(function initBackPhoto() {
  const wrap = $("#backPhotoWrap");
  const img = $("#backImg");
  if (!wrap || !img) return;
  let triedFriend = false;
  const hide = () => wrap.classList.add("hidden");
  img.addEventListener("load", () => {
    if (img.naturalWidth > 1) wrap.classList.remove("hidden");
    else if (!triedFriend) { triedFriend = true; img.src = "assets/friend.png"; }
    else hide();
  });
  img.addEventListener("error", () => {
    if (!triedFriend) { triedFriend = true; img.src = "assets/friend.png"; }
    else hide();
  });
  if (img.complete) {
    if (img.naturalWidth > 1) wrap.classList.remove("hidden");
    else { triedFriend = true; img.src = "assets/friend.png"; }
  }
})();

/* ─── Video vertical trasero: tap en la foto → overlay mudo ───
   La canción sigue sonando (no se toca el audio). Al terminar vuelve solo.
   Si assets/video.mp4 no existe, el tap no hace nada. */
(function initBackVideo() {
  const wrap = $("#backPhotoWrap");
  const overlay = $("#videoOverlay");
  const video = $("#backVideo");
  const closeBtn = $("#videoClose");
  if (!wrap || !overlay || !video) return;
  let videoReady = false;
  video.muted = true; // iOS exige setearlo por código además del atributo
  video.addEventListener("canplay", () => { videoReady = true; });
  video.addEventListener("error", () => { videoReady = false; });
  const open = async () => {
    if (!videoReady && video.readyState < 2) return; // sin archivo: queda la foto
    try {
      video.muted = true;
      video.currentTime = 0;
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      await video.play();
    } catch (_) { close(); }
  };
  const close = () => {
    try { video.pause(); video.currentTime = 0; } catch (_) {}
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
  };
  wrap.addEventListener("click", (e) => { e.stopPropagation(); open(); });
  video.addEventListener("ended", close); // al terminar vuelve sola a la tarjeta
  if (closeBtn) closeBtn.addEventListener("click", (e) => { e.stopPropagation(); close(); });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
})();

/* ─── Estrellas (frente + reverso) + polvo delantero ─── */
const STAR_COLORS = ["#ffffff", "#ffe9a8", "#cfe4ff", "#ffc7e3"];
const DPR_BOOST = (window.devicePixelRatio || 1) > 2 ? 0.5 : 0;
/* Rect de exclusión en fracciones 0..1 del contenedor, con 2px de margen:
   ningún centro de estrella cae dentro (pegado al borde de la foto). */
function getAvoidRect(container, avoidEl, marginPx = 2) {
  if (!container || !avoidEl) return null;
  try {
    const c = container.getBoundingClientRect();
    const r = avoidEl.getBoundingClientRect();
    if (!c.width || !c.height) return null;
    const mx = marginPx / c.width;
    const my = marginPx / c.height;
    const x0 = (r.left - c.left) / c.width - mx;
    const x1 = (r.right - c.left) / c.width + mx;
    const y0 = (r.top - c.top) / c.height - my;
    const y1 = (r.bottom - c.top) / c.height + my;
    if (x1 < 0 || x0 > 1 || y1 < 0 || y0 > 1) return null; // fuera del campo
    return {
      x0: Math.max(0, x0), x1: Math.min(1, x1),
      y0: Math.max(0, y0), y1: Math.min(1, y1),
    };
  } catch (_) { return null; }
}
function insideAvoid(x, y, avoid) {
  return avoid && x >= avoid.x0 && x <= avoid.x1 && y >= avoid.y0 && y <= avoid.y1;
}
function pickOutside(avoid) {
  for (let t = 0; t < 10; t++) {
    const x = Math.random();
    const y = Math.random();
    if (!insideAvoid(x, y, avoid)) return { x, y };
  }
  // Sin suerte: empujar al borde más cercano fuera del rect (pegado, sin margen extra)
  const x = Math.random();
  const y = Math.random();
  if (!insideAvoid(x, y, avoid)) return { x, y };
  const dl = Math.abs(x - avoid.x0);
  const dr = Math.abs(avoid.x1 - x);
  const dt = Math.abs(y - avoid.y0);
  const db = Math.abs(avoid.y1 - y);
  const m = Math.min(dl, dr, dt, db);
  if (m === dl) return { x: Math.max(0, avoid.x0 - 0.005), y };
  if (m === dr) return { x: Math.min(1, avoid.x1 + 0.005), y };
  if (m === dt) return { x, y: Math.max(0, avoid.y0 - 0.005) };
  return { x, y: Math.min(1, avoid.y1 + 0.005) };
}
function makeStars(container, count, maxO = 1.0, minO = 0.6, avoid = null) {
  if (!container) return;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    const roll = Math.random();
    const isBright = roll > 0.92;      // ~8% con mini destello sutil
    const isColored = !isBright && roll > 0.7; // ~22% pastel delicado
    s.className = isBright ? "star star--bright" : "star";
    let size, dur, color = "#ffffff", glow;
    if (isBright) {
      size = Math.random() * 1.5 + 3 + DPR_BOOST; // 3–4.5px máx: delicada
      dur = (2 + Math.random() * 1.5).toFixed(2); // 2–3.5s: ritmo lento igual
      color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
      glow = `0 0 6px ${color}, 0 0 12px ${color}`;
    } else if (isColored) {
      size = Math.random() * 1.5 + 2 + DPR_BOOST; // 2–3.5px
      dur = (2 + Math.random() * 1.5).toFixed(2); // 2–3.5s
      color = STAR_COLORS[1 + Math.floor(Math.random() * (STAR_COLORS.length - 1))];
      glow = `0 0 ${Math.round(size * 2)}px ${color}`;
    } else {
      size = Math.random() * 1.5 + 1.5 + DPR_BOOST; // 1.5–3px: puntito fino
      if (size < 1.5) size = 1.5;
      dur = (2 + Math.random() * 1.5).toFixed(2); // 2–3.5s: destello suave
      glow = `0 0 ${Math.round(size * 2)}px rgba(255,255,255,.85)`;
    }
    const o = (Math.random() * (maxO - minO) + minO).toFixed(2);
    const delay = (-(Math.random() * parseFloat(dur))).toFixed(2);
    const p = pickOutside(avoid);
    // Duración y delay INLINE fijos (estándar + -webkit para Safari):
    // Safari invalida `animation: twinkle var(--d)` y apaga todo.
    s.style.cssText = `left:${(p.x * 100).toFixed(2)}%;top:${(p.y * 100).toFixed(2)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;background:${color};color:${color};opacity:${o};animation-duration:${dur}s;-webkit-animation-duration:${dur}s;animation-delay:${delay}s;-webkit-animation-delay:${delay}s;box-shadow:${glow};`;
    container.appendChild(s);
  }
}
(function buildParticles() {
  const starField = $("#starField");
  const backStarField = $("#backStarField");
  const fg = $("#foregroundField");
  // Zonas prohibidas pegadas a la foto (margen 2px): ningún centro cae encima.
  const avoidFront = getAvoidRect(starField, document.querySelector(".photo-frame"), 2);
  const avoidBack = getAvoidRect(backStarField, document.querySelector(".back-card"), 2);
  makeStars(starField, 140, 1.0, 0.6, avoidFront);            // frente
  makeStars(backStarField, 60, 1.0, 0.6, avoidBack); // reverso, más visibles
  if (!fg) return;
  const avoidFg = getAvoidRect(fg, document.querySelector(".photo-frame"), 2);
  for (let i = 0; i < 22; i++) {
    const d = document.createElement("div");
    d.className = "speck";
    const size = Math.random() * 14 + 4;
    // Solo bordes (nunca centro): el polvo frontal está ENCIMA de la foto (z-index 5),
    // así que no puede haber ninguno sobre ella.
    const leftSide = Math.random() < 0.5;
    const x = leftSide ? Math.random() * 16 : 84 + Math.random() * 16;
    const y = Math.random() * 100;
    if (avoidFg && x / 100 >= avoidFg.x0 && x / 100 <= avoidFg.x1 &&
        y / 100 >= avoidFg.y0 && y / 100 <= avoidFg.y1) continue; // fuera: no va sobre la foto
    const dd = (4 + Math.random() * 3).toFixed(2); // 4–7s: flote lento (drift, padre)
    const dl = (-(Math.random() * parseFloat(dd))).toFixed(2);
    const gd = (2 + Math.random() * 1.5).toFixed(2); // 2–3.5s: parpadeo como las estrellas (::before)
    const gl = (-(Math.random() * parseFloat(gd))).toFixed(2);
    // Blur en el padre + --gd/--gl para el halo del ::before (Safari-safe en longhands).
    d.style.cssText = `left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;--gd:${gd}s;--gl:${gl}s;animation-duration:${dd}s;-webkit-animation-duration:${dd}s;animation-delay:${dl}s;-webkit-animation-delay:${dl}s;filter:blur(${(Math.random() * 2).toFixed(1)}px);`;
    fg.appendChild(d);
  }
})();

/* ═══════════ MOTOR DE PARALLAX ═══════════ */
const target = { x: 0, y: 0 };   // -1..1 (deseado)
const current = { x: 0, y: 0 };  // -1..1 (suavizado)
let gyroActive = false;
let gyroBase = null;             // calibración del "cero" al sostener el teléfono
let lastGyroTime = 0;
let started = false;

function handleOrientation(e) {
  if (e.beta == null || e.gamma == null) return;
  // Primera lectura = posición neutra (como esté sosteniendo el teléfono)
  if (!gyroBase) gyroBase = { beta: e.beta, gamma: e.gamma };
  const landscape = window.innerWidth > window.innerHeight;
  let nx, ny;
  if (landscape) {
    // En horizontal se intercambian ejes para no romper la experiencia
    nx = (e.beta - gyroBase.beta) / GYRO_RANGE;
    ny = -(e.gamma - gyroBase.gamma) / GYRO_RANGE;
  } else {
    nx = (e.gamma - gyroBase.gamma) / GYRO_RANGE;
    ny = (e.beta - gyroBase.beta) / GYRO_RANGE;
  }
  target.x = clamp(nx, -1, 1);
  target.y = clamp(ny, -1, 1);
  gyroActive = true;
  lastGyroTime = Date.now();
}

/* Fallback PC: mouse simula el MISMO sistema nx/ny */
window.addEventListener("mousemove", (e) => {
  if (!started || gyroActive) return;
  target.x = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1);
  target.y = clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1);
}, { passive: true });

/* Fallback táctil: el dedo simula el MISMO sistema nx/ny */
function pointerToTarget(clientX, clientY) {
  if (!started || gyroActive) return;
  target.x = clamp((clientX / window.innerWidth - 0.5) * 2, -1, 1);
  target.y = clamp((clientY / window.innerHeight - 0.5) * 2, -1, 1);
}
window.addEventListener("touchstart", (e) => {
  if (e.touches[0]) pointerToTarget(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });
window.addEventListener("touchmove", (e) => {
  if (e.touches[0]) pointerToTarget(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

/* Si el usuario vuelve a enderezar, el giroscopio retoma solo.
   Si pasan >4s sin eventos gyro (PC), el mouse/touch retoman. */
setInterval(() => {
  if (Date.now() - lastGyroTime > 4000) gyroActive = false;
}, 2000);

/* Loop principal: smoothing + aplicación por capa */
function frame() {
  // lerp → movimiento suave, sin saltos
  current.x += (target.x - current.x) * LERP;
  current.y += (target.y - current.y) * LERP;
  // zona muerta diminuta para quedar QUIETA en reposo
  const nx = Math.abs(current.x) < 0.001 ? 0 : current.x;
  const ny = Math.abs(current.y) < 0.001 ? 0 : current.y;

  scene.style.transform =
    `rotateY(${(nx * MAX_TILT_Y).toFixed(3)}deg) rotateX(${(-ny * MAX_TILT_X).toFixed(3)}deg)`;

  for (const el of layers) {
    const d = parseFloat(el.dataset.depth || "0.3");
    const x = (-nx * d * MAX_SHIFT).toFixed(2);
    const y = (-ny * d * MAX_SHIFT).toFixed(2);
    const z = (d * DEPTH_Z).toFixed(1);
    el.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ═══════════ FLUJO DE APERTURA + PERMISOS iOS ═══════════ */
let hintTimer = null;
function showHint(text, ms = 3500) {
  hint.textContent = text;
  hint.classList.add("show");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => hint.classList.remove("show"), ms);
}

openBtn.addEventListener("click", async () => {
  openBtn.disabled = true;
  let granted = false;
  let needsPermission = false;

  try {
    // Solo iOS tiene requestPermission, y DEBE llamarse en el gesto del tap.
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      needsPermission = true;
      const res = await DeviceOrientationEvent.requestPermission();
      granted = res === "granted";
    }
  } catch (_) {
    granted = false;
  }

  // Registrar listener de orientación (en Android/desktop no pide permiso)
  try {
    if (!needsPermission && typeof DeviceOrientationEvent !== "undefined") {
      window.addEventListener("deviceorientation", handleOrientation, true);
      // Si en 2.5s no llegó ningún evento → no hay sensor → modo touch/mouse
      setTimeout(() => {
        if (!gyroActive && started) showHint(BIRTHDAY_CONFIG.hintTouch);
      }, 2500);
    } else if (granted) {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
  } catch (_) { /* sensor no disponible: seguimos igual */ }

  // Revelar tarjeta + activar motor (ya corre, solo habilitamos input)
  started = true;
  document.body.classList.add("revealed");

  // Música: arranca dentro del gesto del tap (requisito de iOS).
  // Si falla (sin archivo / iPhone en silencio), la tarjeta sigue igual.
  try {
    if (bgMusic) {
      bgMusic.volume = BIRTHDAY_CONFIG.musicVolume;
      bgMusic.play().catch(() => {
        musicOn = false;
        paintMusicUI();
      });
    }
  } catch (_) { /* sin música: no rompe nada */ }

  // Hint según resultado (nunca mensajes técnicos)
  if (!needsPermission) {
    // Desktop/Android: esperamos a ver si hay sensor; hint gyro por defecto breve
    setTimeout(() => { if (gyroActive) showHint(BIRTHDAY_CONFIG.hintGyro); }, 600);
  } else if (granted) {
    setTimeout(() => showHint(BIRTHDAY_CONFIG.hintGyro), 600);
  } else {
    // Denegado o error → fallback táctil, la tarjeta sigue funcionando
    setTimeout(() => showHint(BIRTHDAY_CONFIG.hintTouch, 4200), 600);
  }
});
