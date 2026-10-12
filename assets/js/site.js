// Copy buttons: <button data-copy="elementId">
document.querySelectorAll("[data-copy]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var el = document.getElementById(btn.getAttribute("data-copy"));
    if (!el) return;
    var text = el.textContent.trim();
    var done = function () {
      var old = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = old; }, 1600);
    };
    var fallback = function () {
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    };
    try {
      navigator.clipboard.writeText(text).then(done, fallback);
    } catch (e) {
      fallback();
    }
  });
});

// Lightbox for [data-gallery] tiles
(function () {
  var box = document.getElementById("lightbox");
  if (!box || typeof box.showModal !== "function") return;
  var img = document.getElementById("lightbox-img");
  var cap = document.getElementById("lightbox-cap");
  var tiles = Array.prototype.slice.call(document.querySelectorAll("[data-gallery] .tile"));
  var i = 0;
  function show(n) {
    i = (n + tiles.length) % tiles.length;
    var t = tiles[i];
    img.src = t.getAttribute("data-full");
    img.alt = t.querySelector("img").alt;
    cap.textContent = t.getAttribute("data-caption") || "";
  }
  tiles.forEach(function (t, n) {
    t.addEventListener("click", function () { show(n); box.showModal(); });
  });
  box.addEventListener("click", function (e) {
    var a = e.target.getAttribute && e.target.getAttribute("data-lb");
    if (a === "close" || e.target === box) box.close();
    else if (a === "prev") show(i - 1);
    else if (a === "next") show(i + 1);
  });
  box.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") show(i - 1);
    if (e.key === "ArrowRight") show(i + 1);
  });
})();

// Annotated photo: link numbered spots and legend items
(function () {
  var spots = document.querySelectorAll(".spot");
  var items = document.querySelectorAll(".glass-legend li");
  if (!spots.length) return;
  function set(n) {
    spots.forEach(function (s) { s.classList.toggle("is-on", s.getAttribute("data-spot") === n); });
    items.forEach(function (l) { l.classList.toggle("is-on", l.getAttribute("data-spot") === n); });
  }
  spots.forEach(function (s) {
    var n = s.getAttribute("data-spot");
    s.addEventListener("mouseenter", function () { set(n); });
    s.addEventListener("focus", function () { set(n); });
    s.addEventListener("click", function () { set(n); });
  });
  items.forEach(function (l) {
    l.addEventListener("mouseenter", function () { set(l.getAttribute("data-spot")); });
  });
})();

// Spaces dropdown in the nav
(function () {
  document.querySelectorAll(".nav-menu").forEach(function (menu) {
    var btn = menu.querySelector(".nav-menu-btn");
    var list = menu.querySelector(".nav-menu-list");
    if (!btn || !list) return;
    function set(open) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      list.hidden = !open;
    }
    btn.addEventListener("click", function () { set(list.hidden); });
    list.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    document.addEventListener("click", function (e) { if (!menu.contains(e.target)) set(false); });
    menu.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !list.hidden) { set(false); btn.focus(); }
    });
    menu.addEventListener("focusout", function (e) {
      if (e.relatedTarget && !menu.contains(e.relatedTarget)) set(false);
    });
  });
})();
