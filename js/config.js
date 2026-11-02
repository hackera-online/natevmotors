/* Данни на сайта: data/site.js (публикуваните) + чернова от админ панела (само в този браузър).
   Зарежда се в <head>, преди theme.js и всичко останало. */
(function () {
  "use strict";
  var KEY = "bm-site-draft";

  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }
  // чернова върху базата: обекти се сливат, масиви и стойности се заменят
  function merge(base, draft) {
    if (!isObj(base) || !isObj(draft)) return draft === undefined ? base : draft;
    var out = {}, k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = merge(base[k], draft[k]);
    for (k in draft) if (Object.prototype.hasOwnProperty.call(draft, k) && !(k in out)) out[k] = draft[k];
    return out;
  }

  var base = window.SITE_BASE || {};
  var site = base, isDraft = false;
  try {
    var raw = window.localStorage.getItem(KEY);
    if (raw) {
      if (raw === JSON.stringify(base)) {
        window.localStorage.removeItem(KEY);          // публикувано и вече е същото – чернова не трябва
      } else {
        site = merge(base, JSON.parse(raw));
        isDraft = true;
      }
    }
  } catch (e) { site = base; isDraft = false; }

  window.SITE = site;
  window.SITE_IS_DRAFT = isDraft;
  window.SITE_DRAFT_KEY = KEY;
  window.CARS = Array.isArray(site.cars) ? site.cars : [];
})();
