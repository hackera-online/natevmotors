/* Админ панел на BM Auto Group.
   Работи изцяло в браузъра: промените се пазят като ЧЕРНОВА (localStorage) и се виждат веднага в прегледа.
   Към живия сайт се публикуват по два начина: „Публикувай в GitHub“ или „Свали data/site.js“ и го качваш ръчно. */
(function () {
  "use strict";

  var KEY = "bm-site-draft";
  var GH_KEY = "bm-admin-github";
  var BASE = window.SITE_BASE || {};

  /* ---------- помощни ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }
  function merge(b, d) {
    if (!isObj(b) || !isObj(d)) return d === undefined ? b : d;
    var o = {}, k;
    for (k in b) o[k] = merge(b[k], d[k]);
    for (k in d) if (!(k in o)) o[k] = d[k];
    return o;
  }
  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  var BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  // пътищата в данните са спрямо корена на сайта, а админът е в /admin/
  function src(v) { return !v ? BLANK : (/^(https?:|data:|\/|\.\.\/)/.test(v) ? v : "../" + v); }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function serialize(s) {
    return "/* BM Auto Group – ДАННИ НА САЙТА.\n   Този файл се генерира от админ панела (/admin/) – ръчна редакция е възможна, но се презаписва при публикуване.\n" +
      "   Всички текстове, контакти, услуги, ЧЗВ, настройки за резервации и каталогът с автомобили са тук. */\n" +
      "window.SITE_BASE = " + JSON.stringify(s, null, 2) + ";\n";
  }

  /* ---------- състояние ---------- */
  var state;
  try {
    var raw = localStorage.getItem(KEY);
    state = raw ? merge(clone(BASE), JSON.parse(raw)) : clone(BASE);
  } catch (e) { state = clone(BASE); }
  ["features", "sections", "theme", "catalog", "booking", "contact", "social", "hero", "about", "services", "import", "reviews", "faq", "seo", "brand"].forEach(function (k) { if (!state[k]) state[k] = {}; });
  ["cars", "nav"].forEach(function (k) { if (!Array.isArray(state[k])) state[k] = []; });

  var statusEl = document.getElementById("status");
  var saveTimer, frameTimer;
  function setStatus(t, err) { statusEl.textContent = t; statusEl.className = "top__status" + (err ? " err" : ""); }

  function save() {
    setStatus("Запазва се…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        setStatus("Чернова запазена · не е публикувана");
      } catch (e) {
        setStatus("Паметта на браузъра е пълна – публикувайте или махнете големи снимки", true);
      }
      clearTimeout(frameTimer);
      frameTimer = setTimeout(reloadPreview, 500);
    }, 250);
  }

  /* ---------- преглед (iframe) ---------- */
  var frame = document.getElementById("frame");
  var anchor = "";
  function reloadPreview() {
    try {
      var w = frame.contentWindow, y = w.scrollY;
      frame.addEventListener("load", function once() {
        frame.removeEventListener("load", once);
        try { if (!anchor) frame.contentWindow.scrollTo({ top: y, behavior: "instant" }); else jump(); } catch (e) {}
      });
      w.location.reload();
    } catch (e) { frame.src = frame.src; }
  }
  function jump() {
    try {
      var t = frame.contentDocument.getElementById(anchor);
      if (t) t.scrollIntoView({ behavior: "instant", block: "start" });
      else if (anchor === "top") frame.contentWindow.scrollTo(0, 0);
    } catch (e) {}
  }
  document.getElementById("preview-reload").onclick = reloadPreview;
  document.getElementById("preview-btn").onclick = function () { app.classList.add("show-preview"); };
  document.getElementById("preview-close").onclick = function () { app.classList.remove("show-preview"); };
  var devices = document.getElementById("devices");
  devices.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    Array.prototype.forEach.call(devices.children, function (x) { x.classList.toggle("on", x === b); });
    frame.style.width = b.getAttribute("data-w");
  });
  var app = document.getElementById("app");
  document.getElementById("menu-btn").onclick = function () { app.classList.toggle("show-menu"); };

  /* ---------- полета ---------- */
  function field(label, obj, key, o) {
    o = o || {};
    var inp;
    if (o.options) {
      inp = h("select");
      o.options.forEach(function (op) {
        var v = Array.isArray(op) ? op[0] : op, t = Array.isArray(op) ? op[1] : op;
        var el = h("option", { value: v, text: t }); inp.appendChild(el);
      });
      inp.value = obj[key] == null ? "" : obj[key];
    } else if (o.rows) {
      inp = h("textarea", { rows: o.rows });
      inp.value = obj[key] == null ? "" : obj[key];
    } else {
      inp = h("input", { type: o.type || "text", placeholder: o.ph || "" });
      if (o.type === "number") { if (o.min != null) inp.min = o.min; if (o.max != null) inp.max = o.max; inp.step = o.step || 1; }
      if (o.list) { inp.setAttribute("list", o.list); }
      inp.value = obj[key] == null ? "" : obj[key];
    }
    inp.addEventListener("input", function () {
      var v = inp.value;
      if (o.type === "number") v = v === "" ? "" : Number(v);
      obj[key] = v;
      if (o.onchange) o.onchange(v);
      save();
    });
    return h("label", { class: "f" + (o.wide ? " wide" : "") }, [h("span", { text: label }), inp, o.hint ? h("small", { text: o.hint }) : null]);
  }
  function check(label, obj, key, hint) {
    var i = h("input", { type: "checkbox" });
    i.checked = obj[key] !== false && !!obj[key];
    i.addEventListener("change", function () { obj[key] = i.checked; save(); });
    return h("label", { class: "chk" }, [i, h("span", { text: label }), hint ? h("small", { text: hint }) : null]);
  }
  function linesField(label, obj, key, hint) {
    var t = h("textarea", { rows: 5 });
    t.value = (obj[key] || []).join("\n");
    t.addEventListener("input", function () {
      obj[key] = t.value.split(/\n|,/).map(function (s) { return s.trim(); }).filter(Boolean);
      save();
    });
    return h("label", { class: "f wide" }, [h("span", { text: label }), t, hint ? h("small", { text: hint }) : null]);
  }
  function card(title, kids) { return h("section", { class: "card" }, [title ? h("h3", { text: title }) : null].concat(kids)); }
  function grid(kids) { return h("div", { class: "grid" }, kids); }
  function page(title, lead, kids) {
    var m = document.getElementById("main");
    m.innerHTML = "";
    m.appendChild(h("h2", { text: title }));
    if (lead) m.appendChild(h("p", { class: "lead", text: lead }));
    kids.forEach(function (k) { m.appendChild(k); });
    m.scrollTop = 0;
  }

  /* ---------- снимки ---------- */
  function readImage(file, max, type) {
    return new Promise(function (res, rej) {
      if (/svg/.test(file.type)) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(file); return; }
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
        var x = c.getContext("2d");
        if (type === "image/jpeg") { x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); }
        x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        res(c.toDataURL(type, 0.82));
      };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error("Невалидна снимка")); };
      img.src = u;
    });
  }
  function imageField(label, obj, key, o) {
    o = o || {};
    var prev = h("img", { alt: "" });
    var url = h("input", { type: "text", placeholder: "images/cars/снимка.jpg или https://…" });
    function sync() {
      var v = obj[key] || "";
      url.value = /^data:/.test(v) ? "(качена снимка)" : v;
      url.readOnly = /^data:/.test(v);
      prev.src = src(v);
    }
    url.addEventListener("input", function () { obj[key] = url.value.trim(); prev.src = src(obj[key]); save(); });
    var file = h("input", { type: "file", accept: "image/*", hidden: true });
    file.addEventListener("change", function () {
      var f = file.files[0]; if (!f) return;
      readImage(f, o.max || 1200, o.type || "image/jpeg").then(function (d) { obj[key] = d; sync(); save(); })
        .catch(function () { setStatus("Снимката не може да се прочете", true); });
      file.value = "";
    });
    var clear = h("button", { type: "button", class: "btn btn--ghost btn--sm", text: "Махни", onclick: function () { obj[key] = ""; sync(); save(); } });
    var up = h("button", { type: "button", class: "btn btn--sm", text: "Качи снимка", onclick: function () { file.click(); } });
    sync();
    return h("div", { class: "f wide" }, [h("span", { text: label }),
      h("div", { class: "imgbox" }, [prev, h("div", { class: "row", style: "flex:1;min-width:200px" }, [url, up, clear, file])]),
      o.hint ? h("small", { text: o.hint }) : null]);
  }

  /* ---------- списъци ---------- */
  function listEditor(arr, o) {
    var wrap = h("div");
    function draw() {
      wrap.innerHTML = "";
      arr.forEach(function (it, i) {
        var d = h("details", { class: "item" });
        var tools = h("div", { class: "item__tools" }, [
          h("button", { type: "button", title: "Нагоре", text: "↑", onclick: function (e) { e.preventDefault(); if (i) { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); save(); draw(); } } }),
          h("button", { type: "button", title: "Надолу", text: "↓", onclick: function (e) { e.preventDefault(); if (i < arr.length - 1) { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); save(); draw(); } } }),
          o.dup ? h("button", { type: "button", title: "Дублирай", text: "⧉", onclick: function (e) { e.preventDefault(); arr.splice(i + 1, 0, o.dup(clone(it))); save(); draw(); } }) : null,
          h("button", { type: "button", title: "Изтрий", text: "✕", onclick: function (e) { e.preventDefault(); if (confirm("Да се изтрие ли този запис?")) { arr.splice(i, 1); save(); draw(); } } })
        ]);
        var title = h("span", { class: "item__title" });
        function t() { title.textContent = ""; var s = o.title(it, i); title.appendChild(document.createTextNode(s[0] || "(без име)")); if (s[1]) title.appendChild(h("small", { text: s[1] })); }
        t();
        d.appendChild(h("summary", null, [o.thumb ? o.thumb(it) : null, title, tools]));
        d.appendChild(h("div", { class: "item__body" }, [grid(o.fields(it, t))]));
        wrap.appendChild(d);
      });
      if (!arr.length) wrap.appendChild(h("p", { class: "lead", text: o.empty || "Още няма записи." }));
    }
    draw();
    var add = h("button", { type: "button", class: "btn", text: o.addText || "+ Добави", onclick: function () {
      arr.push(o.make()); save(); draw();
      var last = wrap.querySelectorAll("details.item"); if (last.length) { last[last.length - 1].open = true; last[last.length - 1].scrollIntoView({ block: "center" }); }
    } });
    return h("div", null, [wrap, add]);
  }

  /* =====================  РАЗДЕЛИ  ===================== */
  var CAR_TYPES = ["Автомобил", "Мотоциклет", "ATV", "Джет"];
  var ICONS = [["car", "Автомобил"], ["leasing", "Лизинг"], ["wrench", "Ключ (сервиз)"], ["paint", "Капка (боя)"], ["gear", "Зъбно колело (части)"], ["calendar", "Календар"], ["chat", "Съобщение"], ["phone", "Телефон"], ["pin", "Локация"]];
  var WEEKDAYS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  var TABS = [
    { id: "general", label: "Общи и лого", anchor: "top", render: function () {
      var B = state.brand, SEO = state.seo;
      page("Общи настройки", "Име, лого и данни за търсачките (Google).", [
        card("Фирма и лого", [grid([
          field("Име на фирмата", B, "name"),
          field("Надпис в лентата на логото", B, "tagline", { hint: "Тъмната лента под „BM AUTO GROUP“ в хедъра. Кратко – 3 думи." }),
          imageField("Собствено лого (по желание)", B, "logoUrl", { max: 600, type: "image/png", hint: "Ако не качите – използва се стандартното лого „BM Auto Group“. Подходящ е PNG/SVG с прозрачен фон, до 15 см ширина." })
        ])]),
        card("SEO – заглавие и описание в Google", [grid([
          field("Заглавие на страницата", SEO, "title", { wide: true, hint: "до ~60 символа" }),
          field("Описание", SEO, "description", { wide: true, rows: 3, hint: "до ~160 символа" })
        ])])
      ]);
    } },
    { id: "contact", label: "Контакти", anchor: "contacts", render: function () {
      var C = state.contact, S = state.social;
      page("Контакти", "Телефонът и Viber се сменят автоматично във всички бутони и връзки на сайта.", [
        card("Контакти", [grid([
          field("Телефон (както да се показва)", C, "phone", { ph: "089 750 2285" }),
          field("Viber номер", C, "viber", { ph: "+359897502285", hint: "С кода на държавата. Празно = бутонът Viber се скрива." }),
          field("Адрес", C, "address", { wide: true, hint: "Празно = не се показва." }),
          field("Работно време", C, "hours", { wide: true, ph: "Пн–Пт 9:00–18:00, Сб 9:00–14:00" })
        ])]),
        card("Социални мрежи (пълен линк, започващ с https://)", [grid([
          field("Facebook", S, "facebook", { type: "url" }), field("Instagram", S, "instagram", { type: "url" }),
          field("TikTok", S, "tiktok", { type: "url" }), field("YouTube", S, "youtube", { type: "url" })
        ])])
      ]);
    } },
    { id: "hero", label: "Начална секция", anchor: "top", render: function () {
      var H = state.hero;
      var anchors = h("datalist", { id: "anchors" });
      ["#search", "#results", "#about", "#services", "#import", "#feedbacks", "#faq", "#booking", "#contacts"].concat((state.services.items || []).map(function (s) { return "#" + s.id; })).forEach(function (a) { anchors.appendChild(h("option", { value: a })); });
      page("Начална секция и меню", "Първото, което виждат посетителите.", [
        card("Заглавна част", [grid([
          field("Бадж над заглавието", H, "badge", { wide: true }),
          field("Заглавие", H, "title", { wide: true }),
          field("Подзаглавие", H, "lead", { wide: true, rows: 3 }),
          field("YouTube видео (ID) за фон", H, "videoId", { hint: "Например EPo5WSmNMn8 от youtube.com/watch?v=EPo5WSmNMn8" })
        ])]),
        card("3-те предимства", [listEditor(H.checks = H.checks || [], {
          title: function (it) { return [it.title]; }, make: function () { return { title: "Ново предимство", text: "" }; }, addText: "+ Добави предимство",
          fields: function (it, t) { return [field("Заглавие", it, "title", { onchange: t }), field("Текст", it, "text")]; }
        })]),
        card("Менюто горе", [anchors, listEditor(state.nav, {
          title: function (it) { return [it.label, it.href]; }, make: function () { return { label: "Нова връзка", href: "#booking" }; }, addText: "+ Добави връзка",
          fields: function (it, t) { return [field("Текст", it, "label", { onchange: t }), field("Към (секция)", it, "href", { list: "anchors", onchange: t })]; }
        })])
      ]);
    } },
    { id: "cars", label: "Автомобили", anchor: "results", render: function () { renderCars(); } },
    { id: "about", label: "За нас", anchor: "about", render: function () {
      var A = state.about;
      page("За нас", null, [
        card("Текст и снимка", [grid([
          field("Заглавие", A, "title", { wide: true }),
          field("Първи абзац", A, "p1", { wide: true, rows: 4 }),
          field("Втори абзац", A, "p2", { wide: true, rows: 4 }),
          imageField("Снимка", A, "image", { max: 1200, hint: "Сега е примерна снимка от Unsplash – сложете своя." })
        ])]),
        card("Предимства", [listEditor(A.checks = A.checks || [], {
          title: function (it) { return [it.title]; }, make: function () { return { title: "Ново предимство", text: "" }; }, addText: "+ Добави предимство",
          fields: function (it, t) { return [field("Заглавие", it, "title", { onchange: t }), field("Текст", it, "text")]; }
        })])
      ]);
    } },
    { id: "services", label: "Услуги", anchor: "services", render: function () {
      var S = state.services; S.items = S.items || [];
      page("Услуги", "Всяка услуга има бутон, който избира услугата във формата за резервация.", [
        card("Заглавие на секцията", [grid([field("Заглавие", S, "title"), field("Подзаглавие", S, "subtitle")])]),
        card("Услуги", [listEditor(S.items, {
          title: function (it) { return [it.title, it.highlight ? "★ изтъкната" : ""]; },
          make: function () { return { id: uid("svc-"), icon: "gear", title: "Нова услуга", text: "", button: "Запитване", service: (state.booking.services || [])[0] || "", highlight: false }; },
          addText: "+ Добави услуга",
          fields: function (it, t) { return [
            field("Заглавие", it, "title", { onchange: t }),
            field("Икона", it, "icon", { options: ICONS }),
            field("Описание", it, "text", { wide: true, rows: 3 }),
            field("Текст на бутона", it, "button"),
            field("Избира в формата услуга", it, "service", { options: [["", "— никоя —"]].concat((state.booking.services || []).map(function (x) { return [x, x]; })), hint: "Списъкът се управлява в „Резервации“." }),
            field("Код на секцията (за менюто)", it, "id", { hint: "Само латински букви/цифри/тире, напр. svc-leasing" }),
            check("Изтъкната (тъмна карта)", it, "highlight")
          ]; }
        })])
      ]);
    } },
    { id: "import", label: "Внос по държави", anchor: "import", render: function () {
      var I = state.import; I.items = I.items || [];
      page("Внос по държави", null, [
        card("Заглавие", [grid([field("Заглавие", I, "title"), field("Подзаглавие", I, "subtitle")])]),
        card("Държави", [listEditor(I.items, {
          title: function (it) { return [it.name, it.code]; }, make: function () { return { code: "EU", name: "Нова държава", image: "" }; }, addText: "+ Добави държава",
          fields: function (it, t) { return [field("Име", it, "name", { onchange: t }), field("Код в кръгчето", it, "code", { hint: "напр. US, CA, DE" }),
            imageField("Снимка (по желание)", it, "image", { max: 900, hint: "Препоръчително 800×600" })]; }
        })])
      ]);
    } },
    { id: "reviews", label: "Отзиви", anchor: "feedbacks", render: function () {
      var R = state.reviews; R.items = R.items || [];
      page("Отзиви на клиенти", "Докато няма добавени отзиви, секцията не се показва на сайта. Добавяйте само реални мнения.", [
        card("Заглавие", [grid([field("Заглавие", R, "title"), field("Подзаглавие", R, "subtitle")])]),
        card("Отзиви", [listEditor(R.items, {
          title: function (it) { return [it.name, it.car]; }, make: function () { return { name: "", car: "", preview: "", full: "" }; }, addText: "+ Добави отзив",
          empty: "Няма отзиви – секцията е скрита на сайта.",
          fields: function (it, t) { return [field("Име на клиента", it, "name", { onchange: t }), field("Автомобил", it, "car", { onchange: t }),
            field("Пълен текст", it, "full", { wide: true, rows: 4 }), field("Кратко начало (по желание)", it, "preview", { wide: true, rows: 2, hint: "Ако е празно – взема се от началото на пълния текст." })]; }
        })])
      ]);
    } },
    { id: "faq", label: "Въпроси (ЧЗВ)", anchor: "faq", render: function () {
      var Q = state.faq; Q.items = Q.items || [];
      page("Често задавани въпроси", null, [
        card("Заглавие", [grid([field("Заглавие", Q, "title"), field("Текст под заглавието", Q, "text", { rows: 2 })])]),
        card("Въпроси", [listEditor(Q.items, {
          title: function (it) { return [it.q]; }, make: function () { return { q: "", a: "" }; }, addText: "+ Добави въпрос",
          fields: function (it, t) { return [field("Въпрос", it, "q", { wide: true, onchange: t }), field("Отговор", it, "a", { wide: true, rows: 3 })]; }
        })])
      ]);
    } },
    { id: "booking", label: "Резервации", anchor: "booking", render: function () {
      var B = state.booking, CT = state.catalog;
      var days = h("div", { class: "days" });
      WEEKDAYS.forEach(function (n, d) {
        var i = h("input", { type: "checkbox" }); i.checked = (B.closedWeekdays || []).indexOf(d) !== -1;
        i.onchange = function () {
          var s = (B.closedWeekdays || []).filter(function (x) { return x !== d; });
          if (i.checked) s.push(d);
          B.closedWeekdays = s.sort(); save();
        };
        days.appendChild(h("label", { class: "chk" }, [i, h("span", { text: n })]));
      });
      page("Резервации и форма", "Как работи формата „Запази час“.", [
        card("Текстове", [grid([field("Заглавие", B, "title"), field("Подзаглавие", B, "subtitle")])]),
        card("Изпращане на заявките", [
          h("div", { class: "note", text: "Сайтът е статичен и няма собствен сървър. За да получавате заявките на имейл/в система, въведете адрес на услуга за формуляри (напр. Formspree или Cloudflare Worker) – получава POST с JSON {name, phone, service, date, time, message}. Ако е празно, заявката се копира и се отваря Viber чат." }),
          grid([field("Адрес за изпращане (endpoint)", B, "endpoint", { type: "url", wide: true, ph: "https://formspree.io/f/xxxx" })])
        ]),
        card("Свободни часове и почивни дни", [grid([
          linesField("Часове (по един на ред)", B, "slots", "Формат ЧЧ:ММ, напр. 09:00"),
          h("div", { class: "f wide" }, [h("span", { text: "Почивни дни (не се приемат заявки)" }), days])
        ])]),
        card("Услуги във формата", [grid([linesField("Списък с услуги (по една на ред)", B, "services", "След промяна задайте съответната услуга в „Услуги“, за да се избира автоматично от бутоните.")])]),
        card("Каталог", [grid([field("Колко коли да се показват наведнъж", CT, "pageSize", { type: "number", min: 1, max: 48 })])])
      ]);
    } },
    { id: "features", label: "Функции и тема", anchor: "top", render: function () {
      var F = state.features, S = state.sections, T = state.theme;
      var secs = [["search", "Търсачка за автомобил"], ["results", "Каталог „Налични автомобили“"], ["about", "За нас"], ["services", "Услуги"], ["import", "Внос по държави"], ["feedbacks", "Отзиви"], ["faq", "Въпроси (ЧЗВ)"], ["booking", "Запази час и контакти"]];
      page("Функции и тема", "Включване и изключване на части от сайта.", [
        card("Функции", [
          check("Фоново видео в началото", F, "heroVideo", "– изключва и YouTube заявките, сайтът зарежда по-бързо"),
          check("Бутон за дневен/нощен режим", F, "themeToggle"),
          check("Лента „Обади се / Запази час“ на телефон", F, "mobileBar")
        ]),
        card("Секции на страницата", secs.map(function (s) { return check(s[1], S, s[0]); })),
        card("Дневен / нощен режим", [grid([
          field("Режим", T, "mode", { options: [["auto", "Автоматично (нощ по график)"], ["day", "Винаги светъл"], ["night", "Винаги тъмен"]] }),
          h("span"),
          field("Нощ от (час)", T, "nightFrom", { type: "number", min: 0, max: 23 }),
          field("Нощ до (час)", T, "nightTo", { type: "number", min: 0, max: 23 })
        ])])
      ]);
    } },
    { id: "publish", label: "Публикуване", anchor: "top", render: function () { renderPublish(); } }
  ];

  /* ---------- автомобили ---------- */
  function nextCarId() {
    var max = 0;
    state.cars.forEach(function (c) { var m = /(\d+)$/.exec(c.id || ""); if (m) max = Math.max(max, +m[1]); });
    return "BM-" + String(max + 1).padStart(3, "0");
  }
  function renderCars() {
    var q = "";
    var listBox = h("div");
    function draw() {
      listBox.innerHTML = "";
      var shown = state.cars.map(function (c, i) { return { c: c, i: i }; }).filter(function (x) {
        return !q || (x.c.id + " " + x.c.make + " " + x.c.model + " " + x.c.year).toLowerCase().indexOf(q) !== -1;
      });
      if (!shown.length) listBox.appendChild(h("p", { class: "lead", text: state.cars.length ? "Няма съвпадения." : "Още няма автомобили – секцията „Налични автомобили“ е скрита на сайта." }));
      shown.forEach(function (x) {
        var c = x.c, i = x.i;
        var d = h("details", { class: "item" });
        var th = h("img", { class: "thumb", alt: "" });
        function thumb() { th.src = src(c.image); }
        thumb();
        var title = h("span", { class: "item__title" });
        function t() { title.textContent = (c.year || "") + " " + (c.make || "") + " " + (c.model || ""); title.appendChild(h("small", { text: c.id + " · " + (c.price ? Number(c.price).toLocaleString("bg-BG") + " €" : "по запитване") + " · " + (c.status || "") })); }
        t();
        var tools = h("div", { class: "item__tools" }, [
          h("button", { type: "button", title: "Нагоре", text: "↑", onclick: function (e) { e.preventDefault(); if (i) { state.cars.splice(i - 1, 0, state.cars.splice(i, 1)[0]); save(); draw(); } } }),
          h("button", { type: "button", title: "Надолу", text: "↓", onclick: function (e) { e.preventDefault(); if (i < state.cars.length - 1) { state.cars.splice(i + 1, 0, state.cars.splice(i, 1)[0]); save(); draw(); } } }),
          h("button", { type: "button", title: "Дублирай", text: "⧉", onclick: function (e) { e.preventDefault(); var n = clone(c); n.id = nextCarId(); state.cars.splice(i + 1, 0, n); save(); draw(); } }),
          h("button", { type: "button", title: "Изтрий", text: "✕", onclick: function (e) { e.preventDefault(); if (confirm("Да се изтрие ли " + c.make + " " + c.model + "?")) { state.cars.splice(i, 1); save(); draw(); } } })
        ]);
        d.appendChild(h("summary", null, [th, title, tools]));
        var imgF = imageField("Снимка", c, "image", { max: 1200, hint: "Качете снимка (смалява се автоматично до 1200px) или въведете път/линк." });
        d.addEventListener("input", function () { t(); thumb(); });
        d.addEventListener("change", function () { t(); thumb(); });
        d.appendChild(h("div", { class: "item__body" }, [grid([
          field("Код", c, "id"), field("Вид", c, "type", { options: CAR_TYPES }),
          field("Марка", c, "make"), field("Модел", c, "model"),
          field("Година", c, "year", { type: "number", min: 1900, max: 2100 }), field("Цена в € (0 = по запитване)", c, "price", { type: "number", min: 0 }),
          field("Пробег (км)", c, "km", { type: "number", min: 0 }), field("Гориво", c, "fuel", { options: ["", "Бензин", "Дизел", "Хибрид", "Електро"] }),
          field("Скоростна кутия", c, "gearbox", { options: ["", "Автоматик", "Ръчна"] }), field("Внос от", c, "source", { options: ["САЩ", "Канада"] }),
          field("Статус", c, "status", { options: ["В наличност", "На път", "По поръчка"] }), field("Двигател", c, "engine"),
          field("Цвят", c, "color"), field("Каросерия", c, "body"),
          field("Кратко описание (за картата)", c, "note", { wide: true, rows: 2 }),
          field("Пълно описание (в „Детайли“)", c, "desc", { wide: true, rows: 5 }),
          imgF
        ])]));
        listBox.appendChild(d);
      });
    }
    var search = h("input", { type: "search", placeholder: "Търси по марка, модел, код…", style: "padding:.55rem .7rem;border:1px solid var(--line);border-radius:8px;min-width:200px;flex:1" });
    search.addEventListener("input", function () { q = search.value.trim().toLowerCase(); draw(); });
    var add = h("button", { type: "button", class: "btn", text: "+ Нов автомобил", onclick: function () {
      state.cars.unshift({ id: nextCarId(), type: "Автомобил", make: "", model: "", year: new Date().getFullYear(), price: 0, km: 0, fuel: "Бензин", gearbox: "Автоматик", source: "САЩ", status: "По поръчка", image: "", engine: "", color: "", body: "", note: "", desc: "" });
      q = ""; search.value = ""; save(); draw();
      var f = listBox.querySelector("details"); if (f) { f.open = true; f.scrollIntoView({ block: "start" }); }
    } });
    page("Автомобили (" + state.cars.length + ")", "Каталогът „Налични автомобили“. Цената е в евро.", [
      h("div", { class: "row", style: "margin-bottom:1rem" }, [add, search]), listBox
    ]);
    draw();
  }

  /* ---------- публикуване ---------- */
  function renderPublish() {
    var gh = { owner: "", repo: "", branch: "main", token: "", remember: false };
    try { var g = JSON.parse(localStorage.getItem(GH_KEY)); if (g) gh = Object.assign(gh, g); } catch (e) {}
    var log = h("div", { class: "log", role: "log", text: "Готов." });
    function say(t) { log.textContent += "\n" + t; log.scrollTop = log.scrollHeight; }

    function download(name, text, type) {
      var a = h("a", { href: URL.createObjectURL(new Blob([text], { type: type })), download: name });
      document.body.appendChild(a); a.click(); a.remove();
    }
    var fileIn = h("input", { type: "file", accept: ".js,.json", hidden: true });
    fileIn.addEventListener("change", function () {
      var f = fileIn.files[0]; if (!f) return;
      f.text().then(function (txt) {
        var s = txt.trim();
        if (/^[\s\S]*?window\.SITE_BASE\s*=/.test(s)) s = s.replace(/^[\s\S]*?window\.SITE_BASE\s*=\s*/, "").replace(/;\s*$/, "");
        var o = JSON.parse(s);
        if (!isObj(o) || !o.brand) throw new Error("Файлът не прилича на данни на сайта");
        state = merge(clone(BASE), o); save(); TABS[0].render(); select("general");
        setStatus("Данните са заредени (чернова)");
      }).catch(function (e) { alert("Неуспешно зареждане: " + e.message); });
      fileIn.value = "";
    });

    function ghField(label, key, type, hint) {
      var i = h("input", { type: type || "text", autocomplete: "off" }); i.value = gh[key] || "";
      i.oninput = function () { gh[key] = i.value.trim(); persist(); };
      return h("label", { class: "f" }, [h("span", { text: label }), i, hint ? h("small", { text: hint }) : null]);
    }
    function persist() {
      try { localStorage.setItem(GH_KEY, JSON.stringify({ owner: gh.owner, repo: gh.repo, branch: gh.branch, remember: gh.remember, token: gh.remember ? gh.token : "" })); } catch (e) {}
    }
    var rem = h("input", { type: "checkbox" }); rem.checked = !!gh.remember;
    rem.onchange = function () { gh.remember = rem.checked; persist(); };

    function dataUrlParts(u) { var m = /^data:([^;,]+)(;base64)?,(.*)$/.exec(u); return m ? { mime: m[1], b64: m[2] ? m[3] : btoa(unescape(decodeURIComponent(m[3]))) } : null; }
    function hash(s) { var x = 5381; for (var i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); }
    function utf8b64(str) { var b = new TextEncoder().encode(str), s = ""; for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
    function api(path, opts) {
      var url = "https://api.github.com/repos/" + gh.owner + "/" + gh.repo + "/contents/" + path;
      opts = opts || {};
      return fetch(url + (opts.method === "PUT" ? "" : "?ref=" + encodeURIComponent(gh.branch)), {
        method: opts.method || "GET",
        headers: { "Authorization": "Bearer " + gh.token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    }
    function putFile(path, b64, msg) {
      return api(path).then(function (r) {
        if (r.status === 401 || r.status === 403) throw new Error("Няма достъп – проверете токена (нужно е право Contents: Read and write).");
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("GitHub отговори " + r.status);
        return r.json();
      }).then(function (cur) {
        var body = { message: msg, content: b64, branch: gh.branch };
        if (cur && cur.sha) body.sha = cur.sha;
        return api(path, { method: "PUT", body: body });
      }).then(function (r) {
        if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error("Грешка при запис на " + path + ": " + (j.message || r.status)); });
      });
    }
    function publish() {
      if (!gh.owner || !gh.repo || !gh.token) { alert("Попълнете собственик, хранилище и токен."); return; }
      var out = clone(state), jobs = [], seen = {};
      (function walk(o) {
        Object.keys(o).forEach(function (k) {
          var v = o[k];
          if (typeof v === "string" && /^data:image\//.test(v)) {
            var p = dataUrlParts(v); if (!p) return;
            var ext = /svg/.test(p.mime) ? "svg" : /png/.test(p.mime) ? "png" : "jpg";
            var path = "images/uploads/" + hash(v) + "." + ext;
            o[k] = path;
            if (!seen[path]) { seen[path] = 1; jobs.push({ path: path, b64: p.b64 }); }
          } else if (v && typeof v === "object") walk(v);
        });
      })(out);
      btn.disabled = true; log.textContent = "Публикуване…";
      var chain = Promise.resolve();
      jobs.forEach(function (j) { chain = chain.then(function () { say("Качвам " + j.path); return putFile(j.path, j.b64, "Админ: снимка " + j.path); }); });
      chain.then(function () { say("Записвам data/site.js"); return putFile("data/site.js", utf8b64(serialize(out)), "Админ: обновяване на сайта"); })
        .then(function () {
          state = out; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
          say("✔ Готово. GitHub Pages обновява сайта за 1–2 минути.");
          setStatus("Публикувано в GitHub");
        })
        .catch(function (e) { say("✖ " + e.message); setStatus("Публикуването не успя", true); })
        .then(function () { btn.disabled = false; });
    }
    var btn = h("button", { type: "button", class: "btn", text: "Публикувай в GitHub", onclick: publish });

    page("Публикуване", "Чернова: всичко, което променяте, се запазва в този браузър и се вижда в прегледа. На живия сайт стига чак след публикуване.", [
      card("Вариант 1: директно в GitHub (препоръчително)", [
        h("div", { class: "note", text: "Нужен е личен токен (GitHub → Settings → Developer settings → Fine-grained tokens) само за това хранилище, с право Contents: Read and write. Токенът не се изпраща никъде освен към api.github.com и по подразбиране не се запомня." }),
        grid([ghField("Собственик (потребител/организация)", "owner"), ghField("Хранилище", "repo"), ghField("Клон (branch)", "branch"), ghField("Токен", "token", "password")]),
        h("label", { class: "chk" }, [rem, h("span", { text: "Запомни токена в този браузър" })]),
        h("div", { class: "row", style: "margin:.6rem 0" }, [btn]), log
      ]),
      card("Вариант 2: ръчно", [
        h("p", { text: "Свалете файла и го качете като data/site.js в хранилището (презаписва стария). Качените снимки са вградени в него." }),
        h("div", { class: "row" }, [
          h("button", { type: "button", class: "btn", text: "Свали data/site.js", onclick: function () { download("site.js", serialize(state), "text/javascript"); } }),
          h("button", { type: "button", class: "btn btn--ghost", text: "Свали като JSON (резервно копие)", onclick: function () { download("bm-site-backup.json", JSON.stringify(state, null, 2), "application/json"); } }),
          h("button", { type: "button", class: "btn btn--ghost", text: "Зареди от файл…", onclick: function () { fileIn.click(); } }), fileIn
        ])
      ]),
      card("Чернова", [
        h("div", { class: "row" }, [
          h("a", { class: "btn btn--ghost", href: "../index.html", target: "_blank", rel: "noopener", text: "Отвори сайта с черновата ↗" }),
          h("button", { type: "button", class: "btn btn--danger", text: "Откажи промените (върни публикуваното)", onclick: function () {
            if (!confirm("Всички непубликувани промени ще бъдат загубени. Продължавате ли?")) return;
            try { localStorage.removeItem(KEY); } catch (e) {}
            state = clone(BASE); setStatus("Черновата е изчистена"); reloadPreview(); select("publish");
          } })
        ])
      ])
    ]);
  }

  /* ---------- навигация ---------- */
  var side = document.getElementById("side");
  var current = "general";
  function select(id) {
    current = id;
    Array.prototype.forEach.call(side.children, function (b) { b.classList.toggle("on", b.getAttribute("data-id") === id); });
    var t = TABS.filter(function (x) { return x.id === id; })[0];
    t.render();
    app.classList.remove("show-menu");
    try { location.hash = id; } catch (e) {}
    if (t.anchor && t.anchor !== anchor) { anchor = t.anchor; jump(); }
    else { anchor = t.anchor; jump(); }
  }
  TABS.forEach(function (t) {
    side.appendChild(h("button", { type: "button", "data-id": t.id, text: t.label, onclick: function () { select(t.id); } }));
  });
  frame.addEventListener("load", function () { if (anchor) jump(); });
  window.addEventListener("beforeunload", function () { /* всичко се автозапазва; нищо за губене */ });

  var start = (location.hash || "").slice(1);
  select(TABS.some(function (t) { return t.id === start; }) ? start : "general");
  if (localStorage.getItem(KEY)) setStatus("Има непубликувана чернова");
})();
