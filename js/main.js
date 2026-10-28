/* Форма за запазване на час. Всички настройки са в CONFIG. */
(function () {
  "use strict";

  var CONFIG = {
    // ЗА ПОДМЯНА: адрес, към който се изпраща заявката (Formspree, Cloudflare Worker и др.).
    // Получава POST с JSON: { name, phone, service, date, time, message }.
    // Ако е празно, заявката се копира в клипборда и се отваря Viber чат със сервиза.
    endpoint: "",
    viber: "viber://chat?number=%2B359897502285",
    // ЗА ПОДМЯНА: свободни часове
    slots: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
    closedWeekdays: [0]   // 0 = неделя. Празен масив [] = работи всеки ден
  };

  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  var form = document.getElementById("booking-form");
  if (!form) return;
  var status = document.getElementById("form-status");
  var dateEl = document.getElementById("date");
  var timeEl = document.getElementById("time");
  var serviceEl = document.getElementById("service");

  // часове
  var ph = document.createElement("option");
  ph.value = ""; ph.textContent = "– изберете –";
  timeEl.appendChild(ph);
  CONFIG.slots.forEach(function (t) {
    var o = document.createElement("option");
    o.value = t; o.textContent = t;
    timeEl.appendChild(o);
  });

  // минимална дата = днес
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var now = new Date();
  dateEl.min = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());

  // бутоните на услугите избират услугата във формата
  Array.prototype.forEach.call(document.querySelectorAll("[data-service]"), function (a) {
    a.addEventListener("click", function () {
      var wanted = a.getAttribute("data-service");
      Array.prototype.forEach.call(serviceEl.options, function (o) {
        if (o.value === wanted || o.text === wanted) serviceEl.value = o.value || o.text;
      });
    });
  });

  function setStatus(msg, state) {
    status.textContent = msg;
    status.setAttribute("data-state", state || "");
  }

  function validate(d) {
    if (d.name.length < 2) return "Моля, въведете име.";
    if (!/^\+?[0-9\s\-]{8,16}$/.test(d.phone)) return "Моля, въведете валиден телефон.";
    if (!d.service) return "Моля, изберете услуга.";
    if (!d.date) return "Моля, изберете дата.";
    var day = new Date(d.date + "T00:00:00").getDay();
    if (CONFIG.closedWeekdays.indexOf(day) !== -1) return "В избрания ден не работим. Изберете друга дата.";
    if (!d.time) return "Моля, изберете час.";
    return "";
  }

  function summary(d) {
    return "Заявка за час – NatevMotors\n" +
      "Име: " + d.name + "\nТелефон: " + d.phone + "\nУслуга: " + d.service +
      "\nДата: " + d.date + " " + d.time + (d.message ? "\nБележка: " + d.message : "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.elements.website.value) return;   // honeypot

    var d = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      service: form.elements.service.value,
      date: form.elements.date.value,
      time: form.elements.time.value,
      message: form.elements.message.value.trim()
    };
    var err = validate(d);
    if (err) { setStatus(err, "err"); return; }

    if (!CONFIG.endpoint) {
      // резервен вариант, докато няма сървър за приемане
      var text = summary(d);
      if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(function () {}); }
      setStatus("Заявката е копирана. Поставете я във Viber чата, който се отваря, или се обадете на 089 750 2285.", "ok");
      window.location.href = CONFIG.viber;
      return;
    }

    setStatus("Изпращане…", "");
    fetch(CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(d)
    }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      form.reset();
      setStatus("Благодарим! Заявката е приета – ще се свържем с вас за потвърждение.", "ok");
    }).catch(function () {
      setStatus("Грешка при изпращане. Моля, обадете се на 089 750 2285.", "err");
    });
  });
})();

/* ЧЗВ, отзиви и избор на държава */
(function () {
  "use strict";

  Array.prototype.forEach.call(document.querySelectorAll(".faq__item .question"), function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.parentNode;
      var ans = document.getElementById(btn.getAttribute("aria-controls"));
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      item.classList.toggle("faq__item--opened", !open);
      if (ans) ans.hidden = open;
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".feedback"), function (card) {
    function toggle() { card.classList.toggle("is-open"); }
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });

  // карта "държава" -> форма: услуга "Коли по поръчка" + бележка
  Array.prototype.forEach.call(document.querySelectorAll("[data-country]"), function (a) {
    a.addEventListener("click", function () {
      var svc = document.getElementById("service");
      var msg = document.getElementById("message");
      if (svc) svc.value = "Коли по поръчка";
      if (msg && !msg.value) msg.value = "Интересувам се от внос от: " + a.getAttribute("data-country") + ". Марка/модел и бюджет: ";
    });
  });
})();

/* Търсачка + каталог: филтрира data/cars.js и показва карти; запитването към кола пълни формата за час */
(function () {
  "use strict";

  // ЗА ПОДМЯНА: марки и модели за подсказки (моделът може да се въведе и ръчно)
  var MODELS = {
    "Audi": ["A3", "A4", "A6", "Q3", "Q5", "Q7"],
    "BMW": ["3 Series", "5 Series", "X3", "X5", "X6"],
    "Chevrolet": ["Camaro", "Equinox", "Malibu", "Silverado", "Tahoe"],
    "Dodge": ["Challenger", "Charger", "Durango", "RAM 1500"],
    "Ford": ["Escape", "Explorer", "F-150", "Fusion", "Mustang"],
    "Honda": ["Accord", "Civic", "CR-V", "Pilot"],
    "Hyundai": ["Elantra", "Santa Fe", "Sonata", "Tucson"],
    "Jeep": ["Cherokee", "Compass", "Grand Cherokee", "Wrangler"],
    "Kia": ["Optima", "Sorento", "Sportage", "Stinger"],
    "Lexus": ["ES", "GX", "IS", "RX"],
    "Mazda": ["3", "6", "CX-5", "CX-9"],
    "Mercedes-Benz": ["C-Class", "E-Class", "G-Class", "GLC", "GLE", "S-Class"],
    "Nissan": ["Altima", "Qashqai", "Rogue", "Sentra"],
    "Subaru": ["Forester", "Impreza", "Outback", "WRX"],
    "Tesla": ["Model 3", "Model S", "Model X", "Model Y"],
    "Toyota": ["Camry", "Corolla", "Highlander", "RAV4"],
    "Volkswagen": ["Golf", "Jetta", "Passat", "Tiguan"],
    "Volvo": ["S60", "XC60", "XC90"]
  };
  var PAGE = 6;

  var form = document.getElementById("car-search");
  if (!form) return;
  var make = document.getElementById("s-make");
  var model = document.getElementById("s-model");
  var list = document.getElementById("s-models");
  var from = document.getElementById("s-from");
  var to = document.getElementById("s-to");
  var section = document.getElementById("results");
  var grid = document.getElementById("cars");
  var count = document.getElementById("results-count");
  var empty = document.getElementById("r-empty");
  var more = document.getElementById("r-more");
  var sortEl = document.getElementById("r-sort");
  var cars = (window.CARS && window.CARS.length) ? window.CARS.slice() : [];
  var hasCatalog = cars.length > 0;
  var filtered = [], shown = 0, filtersActive = false;

  function opt(parent, value, text) {
    var o = document.createElement("option");
    o.value = value; o.textContent = text;
    parent.appendChild(o);
  }

  // марки: от подсказките + от каталога
  var makes = Object.keys(MODELS);
  cars.forEach(function (c) { if (c.make && makes.indexOf(c.make) === -1) makes.push(c.make); });
  makes.sort().forEach(function (m) { opt(make, m, m); });
  opt(make, "Друга", "Друга марка");

  var thisYear = new Date().getFullYear();
  for (var y = thisYear + 1; y >= 1940; y--) { opt(from, y, String(y)); opt(to, y, String(y)); }
  from.value = "1940";
  to.value = String(thisYear + 1);

  make.addEventListener("change", function () {
    list.innerHTML = "";
    model.value = "";
    (MODELS[make.value] || []).forEach(function (m) {
      var o = document.createElement("option");
      o.value = m;
      list.appendChild(o);
    });
  });

  function fmtPrice(p) { return p ? p.toLocaleString("bg-BG") + " €" : "По запитване"; }
  function fmtKm(k) { return k ? k.toLocaleString("bg-BG") + " км" : ""; }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function criteria() {
    var f = form.elements;
    var yf = parseInt(f.yfrom.value, 10), yt = parseInt(f.yto.value, 10);
    if (yf > yt) { var t = yf; yf = yt; yt = t; }
    return {
      vtype: f.vtype.value, make: f.make.value, model: f.model.value.trim(),
      yf: yf, yt: yt, source: f.source.value,
      price: parseInt(f.price.value, 10) || 0, fuel: f.fuel.value
    };
  }

  function matches(c, q) {
    if (q.vtype && c.type !== q.vtype) return false;
    if (q.make && q.make !== "Друга" && c.make !== q.make) return false;
    if (q.model && (c.model || "").toLowerCase().indexOf(q.model.toLowerCase()) === -1) return false;
    if (c.year < q.yf || c.year > q.yt) return false;
    if (q.source && c.source !== q.source) return false;
    if (q.price && c.price && c.price > q.price) return false;
    if (q.fuel && c.fuel !== q.fuel) return false;
    return true;
  }

  function sorted(arr) {
    var s = sortEl.value, a = arr.slice();
    if (s === "cheap") a.sort(function (x, y) { return (x.price || 9e9) - (y.price || 9e9); });
    else if (s === "dear") a.sort(function (x, y) { return (y.price || 0) - (x.price || 0); });
    else if (s === "km") a.sort(function (x, y) { return (x.km || 9e9) - (y.km || 9e9); });
    else a.sort(function (x, y) { return y.year - x.year; });
    return a;
  }

  function card(c) {
    var art = el("article", "car");
    var pic = el("div", "car__pic");
    if (c.image) {
      var img = document.createElement("img");
      img.src = c.image; img.alt = c.make + " " + c.model + " " + c.year; img.loading = "lazy";
      img.onerror = function () { img.remove(); pic.appendChild(icon()); };
      pic.appendChild(img);
    } else { pic.appendChild(icon()); }
    var st = el("span", "car__status car__status--" + (c.status === "В наличност" ? "in" : c.status === "На път" ? "way" : "order"), c.status || "");
    pic.appendChild(st);
    art.appendChild(pic);

    var body = el("div", "car__body");
    body.appendChild(el("h3", "car__title", c.make + " " + c.model));
    var meta = [c.year, fmtKm(c.km), c.fuel, c.gearbox].filter(Boolean).join(" · ");
    body.appendChild(el("p", "car__meta", meta));
    if (c.engine) body.appendChild(el("p", "car__src", c.engine));
    if (c.source) body.appendChild(el("p", "car__src", "Внос от " + c.source));
    if (c.note) body.appendChild(el("p", "car__note", c.note));
    var foot = el("div", "car__foot");
    foot.appendChild(el("strong", "car__price", fmtPrice(c.price)));
    var btns = el("div", "car__btns");
    var d = el("button", "btn btn--ghost", "Детайли");
    d.type = "button";
    d.addEventListener("click", function () { openDetails(c); });
    var a = el("a", "btn", "Запитване");
    a.href = "#booking";
    a.addEventListener("click", function () { inquire(c); });
    btns.appendChild(d); btns.appendChild(a);
    foot.appendChild(btns);
    body.appendChild(foot);
    art.appendChild(body);
    return art;
  }

  function icon() {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "icon car__icon");
    s.setAttribute("aria-hidden", "true");
    var u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u.setAttribute("href", "#i-car");
    s.appendChild(u);
    return s;
  }

  function inquire(c) {
    var svc = document.getElementById("service");
    var msg = document.getElementById("message");
    if (svc) svc.value = "Коли по поръчка";
    if (msg) msg.value = "Интересувам се от: " + c.make + " " + c.model + " " + c.year +
      " (код " + c.id + (c.price ? ", " + fmtPrice(c.price) : "") + "). Въпроси/бележка: ";
  }

  var dlg = document.getElementById("car-dialog");
  function openDetails(c) {
    var body = document.getElementById("car-dialog-body");
    body.innerHTML = "";
    var pic = el("div", "cardlg__pic");
    if (c.image) {
      var im = document.createElement("img");
      im.src = c.image; im.alt = c.make + " " + c.model;
      im.onerror = function () { im.remove(); pic.appendChild(icon()); };
      pic.appendChild(im);
    } else { pic.appendChild(icon()); }
    body.appendChild(pic);
    var t = el("h3", "cardlg__title", c.year + " " + c.make + " " + c.model);
    t.id = "cd-title";
    body.appendChild(t);
    body.appendChild(el("p", "cardlg__price", fmtPrice(c.price)));
    var rows = [["Код", c.id], ["Статус", c.status], ["Година", c.year], ["Пробег", fmtKm(c.km)],
      ["Гориво", c.fuel], ["Двигател", c.engine], ["Скоростна кутия", c.gearbox], ["Каросерия", c.body],
      ["Цвят", c.color], ["Внос от", c.source]];
    var dl = el("dl", "cardlg__specs");
    rows.forEach(function (r) {
      if (!r[1]) return;
      dl.appendChild(el("dt", null, r[0]));
      dl.appendChild(el("dd", null, String(r[1])));
    });
    body.appendChild(dl);
    if (c.desc || c.note) body.appendChild(el("p", "car__note cardlg__desc", c.desc || c.note));
    var acts = el("div", "cardlg__acts");
    var inq = el("a", "btn", "Запитване");
    inq.href = "#booking";
    inq.addEventListener("click", function () { inquire(c); dlg.close(); });
    var tel = el("a", "btn btn--black", "Обади се");
    tel.href = "tel:0897502285";
    acts.appendChild(inq); acts.appendChild(tel);
    body.appendChild(acts);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  if (dlg) dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

  function renderMore() {
    var next = filtered.slice(shown, shown + PAGE);
    next.forEach(function (c) { grid.appendChild(card(c)); });
    shown += next.length;
    more.hidden = shown >= filtered.length;
  }

  function render() {
    grid.innerHTML = "";
    shown = 0;
    filtered = sorted(cars.filter(function (c) { return matches(c, criteria()); }));
    if (!filtersActive) filtered = sorted(cars);
    count.textContent = filtered.length
      ? (filtersActive ? "Намерени: " : "Общо: ") + filtered.length + (filtered.length === 1 ? " автомобил" : " автомобила")
      : "";
    empty.hidden = filtered.length > 0;
    renderMore();
  }

  function setCustomInquiry() {
    var q = criteria();
    var what = (q.vtype || "Превозно средство") +
      (q.make ? ", " + q.make : "") + (q.model ? " " + q.model : "");
    var text = "Търся: " + what + ", " + q.yf + "–" + q.yt + " г." +
      (q.source ? ", от " + q.source : "") + (q.fuel ? ", " + q.fuel : "") +
      (q.price ? ", до " + q.price.toLocaleString("bg-BG") + " €" : "") + ". Бюджет/бележка: ";
    var svc = document.getElementById("service");
    var msg = document.getElementById("message");
    if (svc) svc.value = "Коли по поръчка";
    if (msg) msg.value = text;
  }

  function goTo(id, focusName) {
    var t = document.getElementById(id);
    if (!t) return;
    t.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focusName) {
      var name = document.getElementById("name");
      if (name) setTimeout(function () { name.focus({ preventScroll: true }); }, 600);
    }
  }

  if (hasCatalog) {
    section.hidden = false;
    render();
    sortEl.addEventListener("change", render);
    more.addEventListener("click", renderMore);
    document.getElementById("r-reset").addEventListener("click", function () {
      form.reset();
      list.innerHTML = "";
      from.value = "1940"; to.value = String(thisYear + 1);
      filtersActive = false;
      render();
    });
    document.getElementById("r-custom").addEventListener("click", setCustomInquiry);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (hasCatalog) {
      filtersActive = true;
      render();
      goTo("results", false);
    } else {
      setCustomInquiry();
      goTo("booking", true);
    }
  });
})();

/* Връзки за модели във footer-а -> запитване */
(function () {
  "use strict";
  Array.prototype.forEach.call(document.querySelectorAll("[data-model]"), function (a) {
    a.addEventListener("click", function () {
      var svc = document.getElementById("service");
      var msg = document.getElementById("message");
      if (svc) svc.value = "Коли по поръчка";
      if (msg) msg.value = "Интересувам се от: " + a.getAttribute("data-model") + ". Година и бюджет: ";
    });
  });
})();
