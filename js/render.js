/* Рисува съдържанието на страницата от window.SITE (data/site.js + чернова от /admin/).
   Зарежда се в края на <body>, преди main.js. Статичният HTML е само резервен вариант. */
(function () {
  "use strict";
  var S = window.SITE;
  if (!S) return;

  var NS = "http://www.w3.org/2000/svg";
  var ICONS = ["car", "leasing", "wrench", "paint", "gear", "calendar", "chat", "phone", "pin", "arrow"];

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function get(path) {
    var o = S, p = path.split(".");
    for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; }
    return o;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgIcon(name, cls) {
    if (ICONS.indexOf(name) === -1) name = "car";
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("class", cls || "icon");
    s.setAttribute("aria-hidden", "true");
    var u = document.createElementNS(NS, "use");
    u.setAttribute("href", "#i-" + name);
    s.appendChild(u);
    return s;
  }
  function digits(s) { return String(s || "").replace(/[^\d+]/g, ""); }
  function hide(n) { if (n) n.hidden = true; }
  function setMeta(sel, attr, val) { var m = $(sel); if (m && val) m.setAttribute(attr, val); }

  /* ---------- SEO ---------- */
  var seo = S.seo || {};
  if (seo.title) document.title = seo.title;
  setMeta('meta[name="description"]', "content", seo.description);
  setMeta('meta[property="og:title"]', "content", seo.title);
  setMeta('meta[property="og:description"]', "content", seo.description);
  setMeta('meta[property="og:site_name"]', "content", (S.brand || {}).name);

  /* ---------- текстове: data-bind="път" ---------- */
  $$("[data-bind]").forEach(function (n) {
    var v = get(n.getAttribute("data-bind"));
    if (v != null && v !== "") n.textContent = v;
  });
  // елементи, които се показват само ако има стойност
  $$("[data-show-if]").forEach(function (n) {
    var v = get(n.getAttribute("data-show-if"));
    if (!v || (Array.isArray(v) && !v.length)) n.hidden = true;
  });

  /* ---------- лого ---------- */
  var brand = (S.brand || {}).name || "";
  var logo = $(".logo");
  if (logo) {
    logo.setAttribute("aria-label", brand + ", начало");
    if (S.brand && S.brand.logoUrl) {
      logo.classList.add("logo--img");
      logo.innerHTML = "";
      var li = el("img");
      li.src = S.brand.logoUrl; li.alt = brand;
      logo.appendChild(li);
    }
  }

  /* ---------- контакти ---------- */
  var c = S.contact || {};
  $$("[data-tel]").forEach(function (a) { a.setAttribute("href", "tel:" + digits(c.phone)); });
  $$("[data-phone]").forEach(function (n) { n.textContent = c.phone || ""; });
  $$("[data-viber]").forEach(function (a) {
    if (c.viber) a.setAttribute("href", "viber://chat?number=" + encodeURIComponent(digits(c.viber)));
    else a.hidden = true;
  });
  var addrLines = [c.address, c.hours].filter(Boolean);
  var ab = $("#contact-address");
  if (ab) { if (addrLines.length) { ab.innerHTML = ""; addrLines.forEach(function (t, i) { if (i) ab.appendChild(document.createElement("br")); ab.appendChild(document.createTextNode(t)); }); } else hide(ab.closest("li")); }
  var fa = $("#footer-address"); if (fa) { if (c.address) fa.textContent = c.address; else hide(fa.closest("li")); }
  var fh = $("#footer-hours"); if (fh) { if (c.hours) fh.textContent = c.hours; else hide(fh.closest("li")); }

  /* ---------- социални мрежи ---------- */
  var social = S.social || {}, anySocial = false;
  $$("[data-social]").forEach(function (a) {
    var u = social[a.getAttribute("data-social")];
    if (u && /^https?:\/\//i.test(u)) { a.href = u; a.target = "_blank"; a.rel = "noopener"; anySocial = true; }
    else a.hidden = true;
  });
  if (!anySocial) { var sb = $("#footer-social-block"); if (sb) sb.hidden = true; }

  /* ---------- функции ---------- */
  var F = S.features || {};
  var iframe = $("#hero-video");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  if (iframe) {
    if (F.heroVideo !== false && (S.hero || {}).videoId && !reduce && !saveData) {
      var id = encodeURIComponent(S.hero.videoId);
      iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&mute=1&loop=1&playlist=" + id +
        "&controls=0&disablekb=1&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3";
    } else { var hv = iframe.closest(".hero__video"); if (hv) hv.remove(); }
  }
  if (F.themeToggle === false) hide($("#theme-toggle"));
  if (F.mobileBar === false) { var mb = $(".mobile-sticky-bar"); if (mb) mb.remove(); document.documentElement.classList.add("no-mobile-bar"); }

  /* ---------- навигация ---------- */
  var nav = $(".nav");
  if (nav && Array.isArray(S.nav)) {
    nav.innerHTML = "";
    S.nav.forEach(function (n) { if (n.label && n.href) { var a = el("a", null, n.label); a.setAttribute("href", n.href); nav.appendChild(a); } });
  }

  /* ---------- списъци ---------- */
  function checks(target, items) {
    var ul = $(target); if (!ul) return;
    ul.innerHTML = "";
    (items || []).forEach(function (it) {
      var li = el("li"), d = el("div");
      d.appendChild(el("strong", null, it.title));
      if (it.text) d.appendChild(el("span", null, it.text));
      li.appendChild(d); ul.appendChild(li);
    });
  }
  checks("#hero-checks", (S.hero || {}).checks);
  checks("#about-checks", (S.about || {}).checks);

  var about = S.about || {};
  var aimg = $("#about-img");
  if (aimg) { if (about.image) aimg.src = about.image; else hide(aimg.closest(".about__photo")); }

  var grid = $("#services-grid");
  if (grid) {
    grid.innerHTML = "";
    ((S.services || {}).items || []).forEach(function (s) {
      var a = el("article", "service" + (s.highlight ? " service--hot" : ""));
      if (s.id) a.id = s.id;
      a.appendChild(svgIcon(s.icon, "icon icon--lg"));
      a.appendChild(el("h3", null, s.title));
      a.appendChild(el("p", null, s.text));
      var b = el("a", "btn" + (s.highlight ? " btn--black" : ""), s.button || "Запитване");
      b.setAttribute("href", "#booking");
      if (s.service) b.setAttribute("data-service", s.service);
      a.appendChild(b);
      grid.appendChild(a);
    });
  }

  var cg = $("#country-grid");
  if (cg) {
    cg.innerHTML = "";
    ((S.import || {}).items || []).forEach(function (k) {
      var a = el("a", "country-category__item");
      a.setAttribute("href", "#booking");
      a.setAttribute("data-country", k.name);
      a.appendChild(svgIcon("car", "country-category__img icon"));
      if (k.image) {
        var im = el("img", "country-category__photo");
        im.src = k.image; im.alt = k.name; im.loading = "lazy";
        im.onerror = function () { im.remove(); };
        a.appendChild(im);
      }
      var fl = el("span", "country-category__flag", k.code || "+"); fl.setAttribute("aria-hidden", "true");
      a.appendChild(fl);
      var lk = el("span", "country-category__link");
      lk.appendChild(el("span", "country-category__link-text", k.name));
      lk.appendChild(svgIcon("arrow", "country-category__link-icon icon"));
      a.appendChild(lk);
      cg.appendChild(a);
    });
  }

  var tg = $("#testimonials");
  var revs = ((S.reviews || {}).items || []).filter(function (r) { return r.name && (r.full || r.preview); });
  if (tg) {
    tg.innerHTML = "";
    revs.forEach(function (r) {
      var card = el("article", "feedback"); card.tabIndex = 0;
      card.setAttribute("role", "button"); card.setAttribute("aria-expanded", "false");
      var head = el("div", "feedback__header"), d = el("div");
      d.appendChild(el("div", "feedback__header-name", r.name));
      if (r.car) d.appendChild(el("div", "feedback__header-car", r.car));
      head.appendChild(d); card.appendChild(head);
      var full = r.full || r.preview;
      var prev = r.preview || (full.length > 140 ? full.slice(0, 137).replace(/\s+\S*$/, "") + "…" : full);
      card.appendChild(el("p", "feedback__preview", prev));
      card.appendChild(el("p", "feedback__content", full));
      tg.appendChild(card);
    });
  }
  if (!revs.length) hide($("#feedbacks"));

  var fq = $("#faq-list");
  if (fq) {
    fq.innerHTML = "";
    ((S.faq || {}).items || []).forEach(function (it, i) {
      if (!it.q) return;
      var item = el("div", "faq__item");
      var btn = el("button", "question"); btn.type = "button";
      btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "faq-a" + i); btn.id = "faq-q" + i;
      btn.appendChild(el("span", "question__text", it.q));
      var pl = el("span", "question__btn", "+"); pl.setAttribute("aria-hidden", "true");
      btn.appendChild(pl);
      var ans = el("div", "faq__item-answer", it.a || ""); ans.id = "faq-a" + i; ans.hidden = true;
      ans.setAttribute("role", "region"); ans.setAttribute("aria-labelledby", "faq-q" + i);
      item.appendChild(btn); item.appendChild(ans); fq.appendChild(item);
    });
    if (!fq.children.length) hide($("#faq"));
  }

  /* ---------- форма: услуги ---------- */
  var sel = $("#service");
  if (sel) {
    $$("option", sel).forEach(function (o) { if (o.value) o.remove(); });
    ((S.booking || {}).services || []).forEach(function (t) { var o = el("option", null, t); o.value = t; sel.appendChild(o); });
  }

  /* ---------- секции ---------- */
  var sec = S.sections || {};
  $$("[data-section]").forEach(function (n) { if (sec[n.getAttribute("data-section")] === false) n.hidden = true; });

  // връзки към липсващи/скрити секции (меню, footer) се махат
  function dead(a) {
    var h = a.getAttribute("href");
    if (!h || h.length < 2 || h.charAt(0) !== "#") return false;
    var t = null;
    try { t = document.getElementById(decodeURIComponent(h.slice(1))); } catch (e) {}
    return !t || !!t.closest("[hidden]");
  }
  $$(".nav a, .footer a[href^='#'], .footer__legal a[href^='#']").forEach(function (a) {
    if (a.id === "r-custom") return;
    if (dead(a)) { var li = a.closest("li"); if (li) li.hidden = true; else a.hidden = true; }
  });
  // ако в колона на footer-а не е останала връзка – скриваме колоната
  $$(".footer__col").forEach(function (col) {
    var ul = $("ul", col);
    if (ul && !$$("li:not([hidden])", ul).length) col.hidden = true;
  });


  /* ---------- лента под логото: текстът заема точно ширината на „BM AUTO GROUP“ ---------- */
  function fitLogoBar() {
    var bar = $(".logo__bar");
    if (!bar) return;
    var txt = bar.textContent || "";
    bar.style.letterSpacing = "0px";
    var cs = getComputedStyle(bar);
    var pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    var avail = bar.clientWidth - pad;
    // ширина на текста без разредка: временен span
    var probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;letter-spacing:0";
    probe.textContent = txt;
    bar.appendChild(probe);
    var natural = probe.getBoundingClientRect().width;
    bar.removeChild(probe);
    var n = txt.length;
    if (avail > 0 && n > 1) {
      var ls = (avail - natural) / n;
      var max = parseFloat(cs.fontSize) * 0.6;
      bar.style.letterSpacing = Math.max(0, Math.min(ls, max)).toFixed(2) + "px";
    }
  }
  fitLogoBar();
  window.addEventListener("resize", fitLogoBar);
  window.addEventListener("load", fitLogoBar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLogoBar);

  /* ---------- структурирани данни за търсачки ---------- */
  var ld = $("#ld-json");
  if (ld) {
    var o = {
      "@context": "https://schema.org", "@type": "AutoRepair",
      name: brand, description: seo.description || "", telephone: c.phone || "",
      areaServed: { "@type": "Country", name: "България" }
    };
    if (c.address) o.address = { "@type": "PostalAddress", streetAddress: c.address, addressCountry: "BG" };
    if (c.hours) o.openingHours = c.hours;
    var sameAs = ["facebook", "instagram", "tiktok", "youtube"].map(function (k) { return social[k]; }).filter(function (u) { return /^https?:\/\//i.test(u || ""); });
    if (sameAs.length) o.sameAs = sameAs;
    ld.textContent = JSON.stringify(o);
  }

  /* ---------- лента „чернова“ (вижда се само в браузъра на администратора) ---------- */
  if (window.SITE_IS_DRAFT && window.self === window.top) {
    var bar = el("div", "draft-bar");
    bar.setAttribute("role", "status");
    bar.appendChild(el("span", null, "Преглед на непубликувани промени"));
    var edit = el("a", null, "Админ панел"); edit.href = "admin/";
    var clr = el("button", null, "Изчисти"); clr.type = "button";
    clr.addEventListener("click", function () {
      try { localStorage.removeItem(window.SITE_DRAFT_KEY); } catch (e) {}
      location.reload();
    });
    bar.appendChild(edit); bar.appendChild(clr);
    document.body.appendChild(bar);
  }
})();
