/* ============================================================
   المقدمة السينمائية — الزجاجة + البخاخ + الرذاذ
   تسلسل زمني واحد (~6.5 ثانية) تقوده requestAnimationFrame.
   الرذاذ والجسيمات تُرسم على Canvas (حركة فيزيائية حقيقية لا صور متتابعة).
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var el = document.getElementById('intro');
  if (!el) return;

  // ---- هل تُعرض المقدمة؟ (مرة واحدة لكل جلسة) ----
  var skipClass = root.classList.contains('intro-skip');
  if (skipClass) { el.parentNode.removeChild(el); return; }
  var markSeen = function () { try { sessionStorage.setItem('introSeen', '1'); } catch (e) {} };
  root.classList.add('intro-lock', 'intro-hold');

  var stage = document.getElementById('introStage');
  var canvas = document.getElementById('introCanvas');
  var skipBtn = document.getElementById('introSkip');
  var press = el.querySelector('#ig-press');
  var nozzle = el.querySelector('#ig-nozzle');
  var cap = el.querySelector('#ig-cap');
  var glow = el.querySelector('.intro__glow');
  var beam = el.querySelector('.intro__beam');
  var haze = el.querySelector('.intro__haze');
  var bg = el.querySelector('.intro__bg');
  var vig = el.querySelector('.intro__vignette');
  var imgBody = document.getElementById('ig-body');
  var imgSpray = press.querySelector('img');
  var sweepCv = document.getElementById('igSweep');
  var layers = [imgSpray, imgBody, cap];

  var finished = false, leaving = false, raf = 0, failsafe = 0;

  // ---------- إنهاء وتنظيف ----------
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    clearTimeout(failsafe);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    root.classList.remove('intro-lock', 'intro-hold');
    if (el.parentNode) el.parentNode.removeChild(el);
    try { window.dispatchEvent(new Event('intro:done')); } catch (e) {}
  }
  function leave(ms) {
    if (leaving || finished) return;
    leaving = true;
    cancelAnimationFrame(raf);
    el.classList.add('is-leaving');
    setTimeout(finish, ms || 480);
  }
  function onKey(e) { if (e.key === 'Escape') leave(); }

  skipBtn.addEventListener('click', function () { leave(); });
  document.addEventListener('keydown', onKey);
  failsafe = setTimeout(finish, 9500); // شبكة أمان

  // ---------- تقليل الحركة: انتقال بسيط ----------
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    markSeen();
    el.classList.add('intro--reduced');
    setTimeout(function () { leave(700); }, 1700);
    return;
  }

  skipBtn.classList.add('is-on');

  // ---------- أدوات رياضية ----------
  var TAU = Math.PI * 2;
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var smooth = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  var easeOut = function (x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  var PRESS_DEPTH = 0.022; // عمق ضغط البخاخ كنسبة من ارتفاع الزجاجة

  // ---------- الجدول الزمني (بالثواني) ----------
  var T = {
    bottleIn: 0.6,     // ظهور الزجاجة
    sweep: 1.2,        // مرور لمعة الضوء على الزجاج (مدتها 0.9 ث)
    capOff: 2.0,       // رفع الغطاء الكريستالي (مدته 0.65 ث)
    press: 2.8,        // ضغط البخاخ
    sprayDelay: 0.12,  // بدء الرذاذ بعد بدء الضغط
    sprayLen: 1.6,     // مدة الانبعاث
    hazeIn: 3.8,
    bgOut: 4.7,
    fade: 5.2,         // بدء انكشاف الصفحة
    end: 6.5
  };

  // ---------- Canvas ----------
  var ctx = canvas.getContext && canvas.getContext('2d');
  var W = 0, H = 0, D = 0, S = 1, small = false;
  var ox = 0, oy = 0, stageW = 1, stageH = 1;   // موضع الفوهة وأبعاد الزجاجة بالبكسل
  var swx = sweepCv.getContext && sweepCv.getContext('2d'), swW = 0, swH = 0;
  function measure() {
    var r = nozzle.getBoundingClientRect();
    ox = r.left + r.width / 2;
    oy = r.top + r.height / 2;
    stageW = stage.offsetWidth; stageH = stage.offsetHeight;
  }
  function sizeSweep() {
    var k = Math.min(window.devicePixelRatio || 1, 1.5);
    swW = Math.max(1, Math.round(stage.offsetWidth * k));
    swH = Math.max(1, Math.round(stage.offsetHeight * k));
    sweepCv.width = swW; sweepCv.height = swH;
  }
  // لمعة ضوء مائلة تعبر الزجاجة: تُرسم فقط حيث توجد الزجاجة (حسب شفافية الصورة)
  function drawSweep(p) {
    if (!swx) return;
    swx.globalCompositeOperation = 'source-over';
    swx.clearRect(0, 0, swW, swH);
    if (p <= 0 || p >= 1) return;
    swx.drawImage(imgBody, 0, 0, swW, swH);
    swx.drawImage(imgSpray, 0, 0, swW, swH);
    swx.drawImage(cap, 0, 0, swW, swH);
    swx.globalCompositeOperation = 'source-in';
    var x = (-0.35 + 1.7 * p) * swW, w = 0.34 * swW;
    var g = swx.createLinearGradient(x - w, -0.1 * swH, x + w, 0.35 * swH);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    swx.fillStyle = g;
    swx.fillRect(0, 0, swW, swH);
  }
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    D = Math.hypot(W, H);
    small = Math.min(W, H) < 640;
    S = Math.min(1, 720 / Math.max(W, H));
    canvas.width = Math.max(1, Math.round(W * S));
    canvas.height = Math.max(1, Math.round(H * S));
    if (ctx) ctx.setTransform(S, 0, 0, S, 0, 0);
    sizeSweep();
    measure();
  }
  var rzTimer = 0;
  function onResize() { clearTimeout(rzTimer); rzTimer = setTimeout(resize, 120); }
  window.addEventListener('resize', onResize);
  resize();

  // سبرايتات ناعمة جاهزة مسبقاً (أسرع بكثير من التدرجات في كل إطار)
  function sprite(size, stops) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d'), r = size / 2;
    var gr = g.createRadialGradient(r, r, 0, r, r, r);
    for (var i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }
  var fogWhite = sprite(128, [[0, 'rgba(255,250,242,1)'], [.35, 'rgba(255,250,242,.55)'], [.7, 'rgba(255,250,242,.14)'], [1, 'rgba(255,250,242,0)']]);
  var fogWarm  = sprite(128, [[0, 'rgba(232,240,255,1)'], [.35, 'rgba(232,240,255,.5)'],  [.7, 'rgba(232,240,255,.12)'], [1, 'rgba(232,240,255,0)']]);
  var dropSp   = sprite(32,  [[0, 'rgba(250,251,255,1)'], [.3, 'rgba(238,244,255,.75)'], [1, 'rgba(225,236,255,0)']]);

  // ---------- الجسيمات ----------
  var fog = [], drops = [];
  var density = small ? 0.55 : 1;
  var FOG_TOTAL = 52 * density, DROP_TOTAL = 160 * density;
  var fogAcc = 0, dropAcc = 0, burstDone = false;

  function spawnFog(t, dyPx) {
    var a = rand(0, TAU), sp = rand(240, 620);
    fog.push({
      t0: t, x: ox + rand(-3, 3), y: oy + dyPx + rand(-3, 3),
      vx: Math.cos(a) * sp * 1.15, vy: Math.sin(a) * sp * 0.8 - 40,
      k: rand(1.6, 2.6), r0: rand(6, 14), rg: D * rand(0.16, 0.34),
      life: rand(1.8, 2.5), peak: rand(0.09, 0.2),
      spr: Math.random() < 0.35 ? fogWarm : fogWhite
    });
  }
  function spawnDrop(t, dyPx) {
    var a = rand(0, TAU), bokeh = Math.random() < 0.07;
    var sp = rand(220, 1000) * (Math.random() < 0.2 ? 1.4 : 1);
    drops.push({
      t0: t, x: ox, y: oy + dyPx,
      vx: Math.cos(a) * sp * 1.1, vy: Math.sin(a) * sp * 0.85 - 30,
      k: rand(1.1, 2.2), r0: bokeh ? rand(2, 4) : rand(0.7, 1.9),
      grow: bokeh ? rand(14, 34) : rand(1.5, 5),
      life: bokeh ? rand(1.6, 2.4) : rand(0.9, 2.1),
      peak: bokeh ? 0.2 : rand(0.55, 1), bokeh: bokeh
    });
  }

  // غبار معلّق في شعاع الضوء قبل الرش
  var motes = [];
  for (var i = 0; i < (small ? 14 : 26); i++) {
    motes.push({ x: rand(0.3, 0.7), y: rand(0.08, 0.92), vy: rand(2, 9), ph: rand(0, TAU), r: rand(0.7, 1.7), a: rand(0.25, 0.7) });
  }
  // قطرات على "زجاج الشاشة"
  var beads = [];
  for (var j = 0; j < (small ? 14 : 28); j++) {
    beads.push({ x: rand(0.16, 0.84), y: rand(0.14, 0.86), r: rand(1.2, 3.4), t0: 3.4 + rand(0, 1.1) });
  }

  function drawParticles(t) {
    ctx.clearRect(0, 0, W, H);
    var i, p, age, u, a, d, x, y, r;

    // غبار
    var mA = smooth((t - 0.9) / 0.9) * (1 - smooth((t - 3.5) / 0.8));
    if (mA > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < motes.length; i++) {
        p = motes[i];
        x = (p.x + Math.sin(t * 0.5 + p.ph) * 0.02) * W;
        y = (((p.y - (t * p.vy) / H) % 1) + 1) % 1 * H;
        a = mA * p.a * (0.6 + 0.4 * Math.sin(t * 1.3 + p.ph));
        ctx.globalAlpha = a;
        ctx.drawImage(dropSp, x - p.r * 2, y - p.r * 2, p.r * 4, p.r * 4);
      }
    }

    // ضباب
    ctx.globalCompositeOperation = 'source-over';
    for (i = fog.length - 1; i >= 0; i--) {
      p = fog[i]; age = t - p.t0; u = age / p.life;
      if (u >= 1) { fog.splice(i, 1); continue; }
      d = (1 - Math.exp(-p.k * age)) / p.k;
      x = p.x + p.vx * d;
      y = p.y + p.vy * d - 22 * age;
      r = p.r0 + p.rg * (1 - Math.pow(1 - u, 2));
      a = p.peak * smooth(u / 0.1) * (1 - smooth((u - 0.35) / 0.65));
      if (a < 0.003) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(p.spr, x - r, y - r, r * 2, r * 2);
    }

    // رذاذ دقيق (قطرات) — تكبر وتتلاشى كأنها تقترب من المشاهد
    ctx.globalCompositeOperation = 'lighter';
    for (i = drops.length - 1; i >= 0; i--) {
      p = drops[i]; age = t - p.t0; u = age / p.life;
      if (u >= 1) { drops.splice(i, 1); continue; }
      d = (1 - Math.exp(-p.k * age)) / p.k;
      x = p.x + p.vx * d;
      y = p.y + p.vy * d - 14 * age;
      r = p.bokeh ? p.r0 + p.grow * Math.pow(u, 1.1) : p.r0 * (1 + p.grow * Math.pow(u, 1.4));
      a = p.peak * smooth(u / 0.08) * (1 - smooth((u - 0.4) / 0.6));
      if (a < 0.01) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(dropSp, x - r * 2, y - r * 2, r * 4, r * 4);
    }

    // قطرات ملامسة للشاشة
    if (t > 3.4) {
      ctx.globalCompositeOperation = 'source-over';
      var bOut = 1 - smooth((t - 4.9) / 0.9);
      for (i = 0; i < beads.length; i++) {
        p = beads[i];
        a = smooth((t - p.t0) / 0.25) * bOut;
        if (a < 0.01) continue;
        x = p.x * W; y = p.y * H;
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, TAU); ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.stroke();
        ctx.strokeStyle = 'rgba(110,80,40,.35)';
        ctx.beginPath(); ctx.arc(x, y, p.r, 0.2, 1.3); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath(); ctx.arc(x - p.r * 0.35, y - p.r * 0.35, Math.max(0.5, p.r * 0.22), 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- الحلقة الرئيسية ----------
  var t0 = 0, lastT = 0, lastDy = -1, measured = false, bgDone = false, skipOff = false, covered = false, capDone = false, capStarted = false, sweepDone = false;

  function frame(now) {
    if (finished || leaving) return;
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    if (t >= T.end) { finish(); return; }
    var dt = Math.min(t - lastT, 0.05);
    lastT = t;

    // الإضاءة
    var tp = t - T.press;
    var flash = tp > 0 ? Math.exp(-tp * 2.4) : 0;
    glow.style.opacity = clamp(0.8 * smooth((t - 0.4) / 2.0) + 0.2 * flash, 0, 1).toFixed(3);
    beam.style.opacity = (0.95 * smooth((t - 0.7) / 1.6) * (1 - smooth((t - 4.2) / 0.6))).toFixed(3);

    // الزجاجة: ظهور تدريجي ثم اقتراب الكاميرا عند اختفائها في الضباب
    var sIn = smooth((t - T.bottleIn) / 1.4);
    var sOut = smooth((t - 4.4) / 0.8);
    var sc = 1.05 - 0.05 * easeOut((t - T.bottleIn) / 2.2) + 0.1 * sOut;
    stage.style.opacity = (sIn * (1 - sOut)).toFixed(3);
    stage.style.transform = 'translateY(1vh) scale(' + sc.toFixed(4) + ')';

    // لمعة الضوء على الزجاج (والغطاء ما زال في مكانه)
    var sp = (t - T.sweep) / 0.9;
    if (!sweepDone && sp > 0) {
      drawSweep(sp);
      if (sp >= 1) { sweepDone = true; sweepCv.style.display = 'none'; }
    }

    // رفع الغطاء: يصعد ويميل ويتلاشى قبل الضغط
    if (!capDone) {
      var cu = (t - T.capOff) / 0.65;
      if (cu > 0) {
        if (!capStarted) { capStarted = true; press.style.opacity = 1; }   // يظهر البخاخ الحقيقي تحت الغطاء
        var ce = easeOut(cu);
        cap.style.transform = 'translate(' + (ce * 0.07 * stageW).toFixed(1) + 'px,' + (-ce * 0.2 * stageH).toFixed(1) +
                              'px) rotate(' + (-ce * 14).toFixed(2) + 'deg)';
        cap.style.opacity = (1 - smooth((cu - 0.2) / 0.8)).toFixed(3);
        cap.style.filter = 'blur(' + (ce * 3).toFixed(1) + 'px)';
        if (cu >= 1) { capDone = true; cap.style.visibility = 'hidden'; }
      }
    }

    // ضغط البخاخ
    var dy = 0;
    if (tp >= 0 && tp < 0.16) dy = PRESS_DEPTH * easeOut(tp / 0.16);
    else if (tp >= 0.16 && tp < 0.34) dy = PRESS_DEPTH;
    else if (tp >= 0.34 && tp < 0.8) dy = PRESS_DEPTH * (1 - easeOut((tp - 0.34) / 0.46));
    if (dy !== lastDy) { press.style.transform = 'translateY(' + (dy * stageH).toFixed(2) + 'px)'; lastDy = dy; }

    // قياس موضع الفوهة قبل الرش مباشرة
    if (!measured && tp > -0.15) { measure(); measured = true; }

    // انبعاث الرذاذ
    var ts = t - (T.press + T.sprayDelay);
    if (ctx && ts >= 0 && ts < T.sprayLen) {
      var dyPx = dy * stageH;
      if (!burstDone) {
        burstDone = true;
        for (var b = 0; b < 12 * density; b++) spawnFog(t, dyPx);
        for (var c = 0; c < 36 * density; c++) spawnDrop(t, dyPx);
      }
      var env = Math.exp(-ts * 2.0);
      fogAcc += 2 * FOG_TOTAL * env * dt;
      dropAcc += 2 * DROP_TOTAL * env * dt;
      while (fogAcc >= 1) { spawnFog(t, dyPx); fogAcc--; }
      while (dropAcc >= 1) { spawnDrop(t, dyPx); dropAcc--; }
    }

    // رسم الجسيمات
    if (ctx && t < 6.3) drawParticles(t);

    // الانتقال إلى الصفحة: ضباب كريمي يغطي الشاشة ثم ينقشع
    haze.style.opacity = (smooth((t - T.hazeIn) / 0.7) * (1 - smooth((t - T.fade) / 1.2))).toFixed(3);
    if (t > T.bgOut && !bgDone) {
      var a = 1 - smooth((t - T.bgOut) / 0.5);
      bg.style.opacity = a.toFixed(3);
      if (a <= 0) bgDone = true;
    }
    // بعد أن يغطي الضباب الشاشة كلياً: أخفِ الطبقات الثقيلة وأطلق حركة الموقع
    if (!covered && t > 4.9) {
      covered = true;
      [glow, beam, stage, vig].forEach(function (n) { n.classList.add('is-gone'); });
      root.classList.remove('intro-hold');
    }
    if (t > T.fade) canvas.style.opacity = (1 - smooth((t - T.fade) / 1.0)).toFixed(3);

    if (!skipOff && t > 4.0) { skipOff = true; skipBtn.classList.remove('is-on'); skipBtn.classList.add('is-off'); }

    raf = requestAnimationFrame(frame);
  }
  function whenReady(go) {
    var left = layers.length, started = false;
    function start() { if (!started && !finished && !leaving) { started = true; clearTimeout(slow); markSeen(); go(); } }
    var slow = setTimeout(function () {                        // تحميل بطيء: لا تؤخّر الموقع
      if (window.console) console.warn('[intro] تأخّر تحميل صور المقدمة أكثر من 3.5 ثوانٍ، فتم تخطّيها.');
      leave(1);
    }, 3500);
    layers.forEach(function (im) {
      var ok = function () { if (--left === 0) start(); };
      var bad = function () {                                  // ملف ناقص: لا تعرض مقدمة مكسورة
        clearTimeout(slow);
        if (window.console) console.warn('[intro] لم أجد الصورة: ' + im.getAttribute('src') + ' — ضع الصور الثلاث (intro-body / intro-cap / intro-spray .webp) داخل مجلد images بجانب index.html.');
        leave(1);
      };
      if (im.complete) return im.naturalWidth ? ok() : bad();   // انتهى تحميلها قبل تشغيل هذا الكود
      im.addEventListener('load', ok);
      im.addEventListener('error', bad);
    });
  }
  whenReady(function () { raf = requestAnimationFrame(frame); });
})();