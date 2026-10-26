// «Кобальт»: пружины, наклейки и сцены по прокрутке. Сцены: docs/Раскадровка.md.
// Пружина: у наклейки положение, скорость, упругость и затухание, поэтому она выпрыгивает с отскоком.
// «Меньше движения»: всё видно сразу, сцены идут обычными разделами.
(function () {
  var PHONE = "79234104903";
  var TEXT = "Здравствуйте, Магомед Солтахович. Хочу записаться на приём.";
  var waHref = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(TEXT);
  document.querySelectorAll("[data-wa]").forEach(function (a) { a.href = waHref; });

  var root = document.documentElement;
  var bar = document.getElementById("top");
  var dock = document.getElementById("dock");
  var dockLink = dock.querySelector("a");
  var hero = document.getElementById("hero");
  var finalSec = document.getElementById("final");

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function px(n) { return Math.round(n * 10) / 10 + "px"; }

  // Шапка и нижняя кнопка. Классы и атрибуты меняются только при смене состояния, не в каждом кадре
  var dockOn = null, barOn = null;
  function applyChrome(h, f, vh) {
    var heroGone = h.bottom < vh * 0.4;
    var on = heroGone && !(f.top < vh && f.bottom > 0);
    if (on !== dockOn) {
      dockOn = on;
      dock.classList.toggle("is-on", on);
      dock.setAttribute("aria-hidden", on ? "false" : "true");
      dockLink.tabIndex = on ? 0 : -1;
    }
    if (heroGone !== barOn) { barOn = heroGone; bar.classList.toggle("is-on", heroGone); }
  }
  function chrome() { applyChrome(hero.getBoundingClientRect(), finalSec.getBoundingClientRect(), innerHeight); }

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("requestAnimationFrame" in window)) {
    root.classList.add("no-motion");
    addEventListener("scroll", chrome, { passive: true });
    chrome();
    return;
  }
  root.classList.add("motion");

  function Spring(k, d) { this.x = 0; this.v = 0; this.to = 0; this.k = k || 0.09; this.d = d || 0.76; }
  Spring.prototype.step = function () { this.v += (this.to - this.x) * this.k; this.v *= this.d; this.x += this.v; return this.x; };
  Spring.prototype.still = function () { return Math.abs(this.v) < 0.0004 && Math.abs(this.to - this.x) < 0.0004; };

  function splitWords(el, cls) {
    var nodes = [];
    el.childNodes.forEach(function (n) { nodes.push(n); });
    nodes.forEach(function (n) {
      if (n.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      n.textContent.split(/( +)/).forEach(function (part) {
        if (!part) return;
        if (/^ +$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
        var s = document.createElement("span"); s.className = cls; s.textContent = part; frag.appendChild(s);
      });
      el.replaceChild(frag, n);
    });
    return [].slice.call(el.querySelectorAll("." + cls));
  }

  // ---------- Выпрыгивание при входе в экран ----------
  var pops = [];
  document.querySelectorAll(".pops").forEach(function (h) {
    splitWords(h, "pw").forEach(function (w, i) { pops.push({ el: w, r: 0, i: i, s: new Spring(0.1, 0.72), lift: 60 }); });
  });
  document.querySelectorAll("[data-pop]").forEach(function (el) {
    var i = 0, prev = el.previousElementSibling;
    while (prev) { if (prev.hasAttribute("data-pop")) i++; prev = prev.previousElementSibling; }
    pops.push({ el: el, r: +(el.dataset.r || 0), i: i, s: new Spring(0.085, 0.74), lift: 40 });
  });
  // Вход в экран сообщает браузер (IntersectionObserver): без сотни замеров в каждом кадре
  function popOn(o) {
    o.on = true; o.t = performance.now() + o.i * 80;
    // На телефоне плашка во всю ширину: при том же угле её углы задевают соседей, поэтому угол меньше
    if (innerWidth < 900 && o.r) o.r *= Math.min(1, 140 / o.el.offsetWidth);
  }
  if ("IntersectionObserver" in window) {
    var popIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var o = e.target.__pop;
        if (!e.isIntersecting || !o || o.on) return;
        popOn(o); popIO.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    pops.forEach(function (o) { o.el.__pop = o; popIO.observe(o.el); });
  } else pops.forEach(popOn);
  function updatePops(now) {
    for (var j = 0; j < pops.length; j++) {
      var o = pops[j];
      if (o.done || !o.on) continue;
      o.s.to = now > o.t ? 1 : 0;
      var v = o.s.step();
      o.el.style.opacity = clamp(v * 2, 0, 1).toFixed(3);
      o.el.style.transform = "translate3d(0," + px((1 - v) * o.lift) + ",0) scale(" + Math.max(0, 0.5 + 0.5 * v).toFixed(3) + ") rotate(" + (o.r + (1 - v) * -10).toFixed(2) + "deg)";
      if (o.s.to === 1 && o.s.still()) { o.done = true; o.el.style.opacity = "1"; o.el.style.transform = o.r ? "rotate(" + o.r + "deg)" : ""; }
    }
  }

  // ---------- 1. Первый экран ----------
  var giant = [].slice.call(hero.querySelectorAll(".giant span"));
  var gS = giant.map(function () { return new Spring(0.07, 0.8); });
  var doc = hero.querySelector(".doc"), docS = new Spring(0.06, 0.82);
  var heroCta = hero.querySelector(".cta"), ctaS = new Spring(0.12, 0.7);
  var sts = [].map.call(hero.querySelectorAll("[data-st]"), function (el, i) {
    // На телефоне высота наклейки считается от низа первого экрана (mb): между бородой доктора и кнопкой
    var o = { el: el, x: +el.dataset.x, y: +el.dataset.y, mx: +(el.dataset.mx || 0), mb: +(el.dataset.mb || 0), r: +el.dataset.r, s: new Spring(0.09, 0.78), dx: 0, dy: 0, delay: 700 + i * 140, f: 0.6 + i * 0.25, moved: false };
    // Наклейку можно тянуть пальцем. Ссылка-наклейка открывается, только если её не тянули.
    el.addEventListener("pointerdown", function (e) { el.setPointerCapture(e.pointerId); o.drag = { x: e.clientX - o.dx, y: e.clientY - o.dy, sx: e.clientX, sy: e.clientY, x0: o.dx, y0: o.dy }; o.moved = false; });
    el.addEventListener("pointermove", function (e) { if (!o.drag) return; o.dx = e.clientX - o.drag.x; o.dy = e.clientY - o.drag.y; if (Math.abs(e.clientX - o.drag.sx) + Math.abs(e.clientY - o.drag.sy) > 6) o.moved = true; });
    el.addEventListener("pointerup", function () { o.drag = null; });
    // Браузер забрал жест под прокрутку: наклейка остаётся там, где была до касания
    el.addEventListener("pointercancel", function () { if (o.drag) { o.dx = o.drag.x0; o.dy = o.drag.y0; } o.drag = null; o.moved = false; });
    el.addEventListener("click", function (e) { if (o.moved) e.preventDefault(); });
    return o;
  });
  function updateHero(now, t, p, vw, vh) {
    var mob = vw < 900;
    for (var i = 0; i < giant.length; i++) {
      gS[i].to = t > 250 + i * 120 ? 1 : 0;
      var v = gS[i].step();
      giant[i].style.opacity = clamp(v * 1.4, 0, 1).toFixed(3);
      // Слова расходятся при прокрутке. «Не» уходит влево только до края экрана, иначе его режет край
      var gx = i ? p * 0.12 * vw : -Math.min(p * 0.12 * vw, giantLeft - 4);
      giant[i].style.transform = "translate3d(" + px(gx) + "," + ((1 - v) * 40).toFixed(1) + "%,0) scale(" + (0.8 + 0.2 * v).toFixed(3) + ")";
    }
    docS.to = t > 150 ? 1 : 0;
    var dv = docS.step();
    doc.style.transform = "translate3d(-50%," + ((1 - dv) * 30 - p * 14).toFixed(2) + "%,0) scale(" + (1 + p * 0.08).toFixed(3) + ")";
    for (var j = 0; j < sts.length; j++) {
      var s = sts[j];
      s.s.to = t > s.delay ? 1 : 0;
      var sv = s.s.step();
      var fl = Math.sin(t / 1000 * s.f) * 6;
      var x = (mob ? s.mx : s.x) * vw + s.dx;
      // При прокрутке верхние наклейки улетают вверх быстрее страницы. Нижние едут вместе со страницей:
      // иначе они наезжают на заголовок, лицо доктора или кнопку
      var low = mob || s.y > 0.5;
      var y = (mob ? heroH - s.mb : s.y * vh) + s.dy + fl - (low ? 0 : p * vh * (0.2 + s.f * 0.15));
      s.el.style.opacity = clamp(sv * 2, 0, 1).toFixed(3);
      // На телефоне наклейка над кнопкой повёрнута вдвое меньше: её конец не поднимается к бороде
      s.el.style.transform = "translate3d(" + px(x) + "," + px(y) + ",0) rotate(" + ((mob ? s.r / 2 : s.r) * sv + Math.sin(t / 900 * s.f) * 2).toFixed(2) + "deg) scale(" + Math.max(0, sv).toFixed(3) + ")";
    }
    ctaS.to = t > 1300 ? 1 : 0;
    var cv = ctaS.step();
    heroCta.style.opacity = clamp(cv * 2, 0, 1).toFixed(3);
    heroCta.style.transform = "scale(" + Math.max(0, cv).toFixed(3) + ") rotate(" + ((1 - cv) * -12).toFixed(2) + "deg)";
  }

  // Лента болезней: бежит сама и ускоряется от прокрутки
  var band = document.getElementById("band");
  band.innerHTML += band.innerHTML;
  var bx = 0;

  // ---------- 3. Колода ----------
  var deck = (function () {
    var el = document.getElementById("deck");
    var cards = [].map.call(el.querySelectorAll(".card"), function (c) { return { el: c, r: +(c.dataset.r || 0), land: new Spring(0.075, 0.74), depth: new Spring(0.1, 0.76) }; });
    var nEl = el.querySelector(".deck__i"), kr = 1;
    return {
      el: el, pin: true,
      // Широкая колода (планшет): тот же угол поднимает угол карточки выше, к счётчику «N из 5». Угол меньше
      measure: function () { kr = innerWidth < 900 ? Math.min(1, 300 / Math.max(1, cards[0].el.offsetWidth)) : 1; },
      update: function (p, v, now, vw, vh) {
        if (!el.classList.contains("pinned")) { cards.forEach(function (c) { c.el.style.transform = c.r ? "rotate(" + c.r + "deg)" : ""; }); return; }
        var n = cards.length;
        var k = seg(p, 0.02, 0.9) * n;
        var top = 0;
        for (var i = 0; i < n; i++) { cards[i].land.to = (i === 0 ? p > 0.001 || k > 0 : k > i + 0.1) ? 1 : 0; if (cards[i].land.to) top = i; }
        for (var j = 0; j < n; j++) {
          var c = cards[j], lv = c.land.step();
          c.depth.to = c.land.to ? top - j : 0;
          var d = c.depth.step();
          // На телефоне над колодой ярлык «N из 5»: задние карточки поднимаются меньше и не задевают его
          var fromX = vw * 0.7, fromY = vh * 0.55, lift = vw < 900 ? 9 : 16;
          c.el.style.zIndex = String(10 + j);
          c.el.style.transform = "translate3d(" + px((1 - lv) * fromX) + "," + px((1 - lv) * fromY - d * lift) + ",0) rotate(" + ((c.r + (1 - lv) * 28 + d * (j % 2 ? 1.5 : -1.5)) * kr).toFixed(2) + "deg) scale(" + (1 - Math.min(d, 4) * 0.04).toFixed(3) + ")";
          c.el.style.opacity = lv < 0.02 ? "0" : "1";
        }
        nEl.textContent = top + 1;
      }
    };
  })();

  // ---------- 4. Слова пациента ----------
  var quote = (function () {
    var el = document.getElementById("quote");
    var words = splitWords(el.querySelector(".quote__q"), "qw").map(function (w) { return { el: w, s: new Spring(0.1, 0.7) }; });
    var who = el.querySelector(".quote__who"), whoS = new Spring(0.09, 0.72);
    return {
      el: el, pin: true,
      update: function (p) {
        var n = words.length;
        for (var i = 0; i < n; i++) {
          var w = words[i];
          w.s.to = p > 0.04 + (i / n) * 0.72 ? 1 : 0;
          var v = w.s.step();
          w.el.style.opacity = clamp(0.12 + v * 1.2, 0, 1).toFixed(3);
          w.el.style.transform = "translate3d(0," + px((1 - v) * 36) + ",0) scale(" + (0.7 + 0.3 * v).toFixed(3) + ") rotate(" + ((1 - v) * (i % 2 ? 6 : -6)).toFixed(2) + "deg)";
        }
        whoS.to = p > 0.82 ? 1 : 0;
        var wv = whoS.step();
        who.style.opacity = clamp(wv * 2, 0, 1).toFixed(3);
        who.style.transform = "scale(" + Math.max(0, wv).toFixed(3) + ") rotate(" + (-3 + (1 - wv) * -12).toFixed(2) + "deg)";
      }
    };
  })();

  // ---------- 5. Запись за минуту ----------
  var chat = (function () {
    var el = document.getElementById("chat");
    var body = el.querySelector(".phone__body"), bodyS = new Spring(0.07, 0.78);
    var typed = el.querySelector(".phone__typed");
    var msg = el.querySelector(".bubble__t").dataset.text;
    var steps = [].map.call(el.querySelectorAll(".steps li"), function (li) { return { li: li, num: li.querySelector(".num"), s: new Spring(0.12, 0.7) }; });
    var lastN = -1;
    return {
      el: el, pin: true,
      update: function (p) {
        bodyS.to = p > 0.01 ? 1 : 0;
        var b = bodyS.step();
        body.style.transform = "translate3d(0," + px((1 - b) * 120) + ",0) rotate(" + (-4 + (1 - b) * 18).toFixed(2) + "deg) scale(" + (0.85 + 0.15 * b).toFixed(3) + ")";
        var sent = p > 0.62;
        var n = sent ? 0 : Math.round(seg(p, 0.28, 0.58) * msg.length);
        if (n !== lastN) { typed.textContent = msg.slice(0, n); lastN = n; }
        el.classList.toggle("is-sent", sent);
        el.classList.toggle("is-typing", p > 0.72);
        var act = p < 0.28 ? 0 : p < 0.66 ? 1 : 2;
        steps.forEach(function (s, i) {
          s.li.classList.toggle("is-dim", i !== act);
          s.s.to = i === act ? 1 : 0;
          var v = s.s.step();
          s.num.style.transform = "scale(" + (1 + v * 0.22).toFixed(3) + ") rotate(" + (v * -10).toFixed(2) + "deg)";
        });
      }
    };
  })();

  // ---------- 6. Где принимает ----------
  var where = (function () {
    var el = document.getElementById("where");
    var line = el.querySelector(".route__line");
    return {
      el: el,
      update: function (p) {
        line.style.strokeDashoffset = (1 - seg(p, 0.1, 0.5)).toFixed(4);
        el.classList.toggle("is-on", p > 0.45);
      }
    };
  })();

  // ---------- 7. Путь доктора ----------
  var path = (function () {
    var el = document.getElementById("path");
    var roll = el.querySelector(".year__roll"), yearBox = el.querySelector(".year");
    var miles = [].slice.call(el.querySelectorAll(".miles li"));
    var snap = el.querySelector(".snap");
    var lastA = -1, yh = 0;
    function smooth(x) { return x * x * (3 - 2 * x); }
    return {
      el: el, pin: true,
      measure: function () { yh = yearBox.offsetHeight; },
      update: function (p) {
        var n = miles.length - 1;
        var k = seg(p, 0.05, 0.92) * n;
        var i0 = Math.min(n, Math.floor(k));
        var pos = i0 + smooth(seg(k - i0, 0.3, 0.7));
        roll.style.transform = "translate3d(0," + px(-pos * yh) + ",0)";
        var a = Math.round(pos);
        if (a !== lastA) { miles.forEach(function (li, i) { li.classList.toggle("is-on", i === a); }); lastA = a; }
        snap.style.transform = "translate3d(0," + px((0.5 - p) * 40) + ",0) rotate(" + (4 - p * 6).toFixed(2) + "deg)";
      }
    };
  })();

  // ---------- 8. Отзывы: счёт ----------
  var reviews = (function () {
    var el = document.getElementById("reviews");
    var odos = [].slice.call(el.querySelectorAll(".odo"));
    var start = 0, doneOdo = false;
    odos.forEach(function (o) { o.textContent = o.dataset.to.indexOf(",") > -1 ? "0,0" : "0"; });
    return {
      el: el,
      // Счёт идёт по времени, а не по прокрутке: иначе при остановке на середине виден чужой рейтинг, например 3,7
      update: function (p, v, now) {
        if (doneOdo) return;
        if (!start) { if (p < 0.05) return; start = now; }
        var f = 1 - Math.pow(1 - seg(now - start, 0, 1100), 3);
        if (f >= 1) doneOdo = true;
        odos.forEach(function (o) {
          var to = o.dataset.to;
          o.textContent = to.indexOf(",") > -1 ? (Math.round(f * 49) / 10).toFixed(1).replace(".", ",") : String(Math.round(f * +to));
        });
      }
    };
  })();

  // Финальная кнопка подпрыгивает раз в несколько секунд
  var jig = document.querySelector("[data-jiggle]"), jigS = new Spring(0.14, 0.82), jigNext = 0;
  jigS.x = jigS.to = 0;
  function updateJiggle(now, vh, r) {
    if (r.top > vh || r.bottom < 0) return;
    if (now > jigNext) { jigS.v = 0.09; jigNext = now + 3200; }
    var v = jigS.step();
    jig.style.transform = "rotate(" + (v * 40).toFixed(2) + "deg) scale(" + (1 + Math.abs(v) * 0.6).toFixed(3) + ")";
  }

  var scenes = [deck, quote, chat, where, path, reviews];
  scenes.forEach(function (s) { s.p = 0; });

  // Размеры, которые меняются только при смене окна: замеряем здесь, а не в каждом кадре
  var heroH = hero.offsetHeight, bandHalf = 0, giantLeft = 16;
  function layout() {
    var vh = innerHeight;
    heroH = hero.offsetHeight;
    giantLeft = hero.querySelector(".giant").offsetLeft;
    scenes.forEach(function (s) {
      if (!s.pin) { s.pinned = false; return; }
      s.el.classList.add("pinned");
      var fit = s.el.querySelector("[data-fit]") || s.el.querySelector(".stage");
      s.pinned = !(fit.scrollHeight > vh + 2);
      if (!s.pinned) s.el.classList.remove("pinned");
    });
    path.measure();
    deck.measure();
    bandHalf = band.scrollWidth / 2;
  }
  function rawP(s, r, vh) {
    if (s.pinned) return clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
    return clamp((vh * 0.85 - r.top) / Math.max(1, r.height * 0.8), 0, 1);
  }

  var t0 = performance.now(), last = t0, lastY = scrollY, vel = 0;
  function frame(now) {
    var dt = Math.min(64, now - last); last = now;
    var t = now - t0, vw = innerWidth, vh = innerHeight, y = scrollY;
    // Сначала все замеры, потом все записи: замер после записи заставляет браузер пересчитывать вид посреди кадра
    var hr = hero.getBoundingClientRect(), fr = finalSec.getBoundingClientRect(), jr = jig.getBoundingClientRect();
    for (var i = 0; i < scenes.length; i++) scenes[i].r = scenes[i].el.getBoundingClientRect();
    vel += ((y - lastY) - vel) * 0.2; lastY = y;
    if (hr.bottom > -vh * 0.2) updateHero(now, t, clamp(y / vh, 0, 1), vw, vh);
    bx -= (1.4 + Math.abs(vel) * 0.5) * dt / 16.7;
    if (bandHalf && -bx > bandHalf) bx += bandHalf;
    band.style.transform = "translate3d(" + bx.toFixed(1) + "px,0,0)";
    var k = 1 - Math.pow(1 - 0.14, dt / 16.7);
    for (i = 0; i < scenes.length; i++) {
      var s = scenes[i], r = s.r;
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;
      var raw = rawP(s, r, vh);
      s.p += (raw - s.p) * k;
      if (Math.abs(raw - s.p) < 0.0004) s.p = raw;
      s.update(s.p, vel, now, vw, vh);
    }
    updatePops(now);
    updateJiggle(now, vh, jr);
    applyChrome(hr, fr, vh);
    requestAnimationFrame(frame);
  }
  layout();
  // Строка адреса на телефоне прячется при прокрутке и меняет высоту окна. Из-за неё сцены заново не раскладываем:
  // раскладка всех сцен тяжёлая и давала на телефоне долгий кадр
  var rt, lastW = innerWidth, lastH = innerHeight;
  addEventListener("resize", function () {
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 160) return;
    lastW = innerWidth; lastH = innerHeight;
    clearTimeout(rt); rt = setTimeout(layout, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  requestAnimationFrame(frame);
})();
