/* Тема: жълто-черна (ден) и черно-жълта (нощ).
   Автоматично: нощ от 20:00 до 06:00 по българско време (Europe/Sofia).
   Ръчният избор важи до следващата смяна ден/нощ, после пак е автоматично. */
(function () {
  "use strict";

  var TZ = "Europe/Sofia";
  var NIGHT_FROM = 20;   // от 20:00
  var NIGHT_TO = 6;      // до 06:00
  var KEY = "nm-theme";
  var root = document.documentElement;

  function sofiaHour() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).formatToParts(new Date());
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === "hour") return parseInt(parts[i].value, 10);
      }
    } catch (e) {}
    return new Date().getHours();
  }

  function autoTheme() {
    var h = sofiaHour();
    return (h >= NIGHT_FROM || h < NIGHT_TO) ? "night" : "day";
  }

  function override() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY));
      if (o && o.auto === autoTheme() && (o.theme === "day" || o.theme === "night")) return o.theme;
    } catch (e) {}
    return null;
  }

  function current() { return override() || autoTheme(); }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "night" ? "#1E2022" : "#0F2C59");
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.setAttribute("aria-pressed", theme === "night" ? "true" : "false");
  }

  apply(current());   // преди първото рисуване, без мигане

  document.addEventListener("DOMContentLoaded", function () {
    apply(current());
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        var next = current() === "night" ? "day" : "night";
        try { localStorage.setItem(KEY, JSON.stringify({ theme: next, auto: autoTheme() })); } catch (e) {}
        apply(next);
      });
    }
    setInterval(function () { apply(current()); }, 60000);   // сменя се сама в 20:00 и 06:00
  });
})();
