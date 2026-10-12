// Data-driven parts of the public site, read from data/site.json:
//  - home page facilities grid (published spaces only)
//  - equipment lists on space pages (confirmed items only)
//  - Members link (shown once portalUrl is set)
//  - draft banner on unpublished space pages
// Add ?preview to a URL to see unpublished spaces and unconfirmed equipment.
// If anything fails to load, the static HTML stays as it is.
(function () {
  var script = document.currentScript;
  var root = (script && script.getAttribute("data-root")) || "./";
  var preview = /[?&]preview\b/.test(location.search);

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function isHttp(url) { return /^https:\/\//.test(url || ""); }

  function portal(site) {
    if (!isHttp(site.portalUrl)) return;
    document.querySelectorAll("[data-portal]").forEach(function (a) {
      a.href = site.portalUrl;
      a.hidden = false;
    });
  }

  function spacesGrid(site) {
    var grid = document.getElementById("space-grid");
    if (!grid) return;
    var shown = site.spaces.filter(function (s) { return s.published || preview; });
    if (!shown.length) return;
    grid.textContent = "";
    shown.forEach(function (s) {
      var card = el("article", "place");
      if (s.image) {
        var img = el("img");
        img.src = root + s.image;
        img.alt = s.imageAlt || "";
        img.loading = "lazy";
        card.appendChild(img);
      } else {
        card.appendChild(el("div", "place-blank", s.name));
      }
      var body = el("div", "place-body");
      var where = [s.place, s.rooms].filter(Boolean).join(" · ");
      if (where) body.appendChild(el("span", "room-no", where.toUpperCase()));
      var h = el("h3", null, s.name);
      if (!s.published) h.appendChild(el("span", "badge", "Draft"));
      body.appendChild(h);
      body.appendChild(el("p", null, s.blurb));
      var a = el("a", "btn btn-primary", "Explore " + s.name);
      a.href = root + s.href + (preview ? "?preview" : "");
      body.appendChild(a);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  function equipment(items) {
    document.querySelectorAll("[data-equipment]").forEach(function (box) {
      var space = box.getAttribute("data-equipment");
      var list = items.filter(function (it) {
        if (it.space !== space || it.public === false) return false;
        return preview || it.status === "confirmed";
      });
      var section = box.closest("[data-equipment-section]");
      if (!list.length) { if (section) section.hidden = true; return; }

      var groups = [];
      var byCat = {};
      list.forEach(function (it) {
        var c = it.category || "Other";
        if (!byCat[c]) { byCat[c] = []; groups.push(c); }
        byCat[c].push(it);
      });

      box.textContent = "";
      groups.forEach(function (c) {
        var g = el("div", "equip-group");
        g.appendChild(el("h3", "equip-sub", c));
        var ul = el("ul", "equip-list");
        byCat[c].forEach(function (it) {
          var li = el("li");
          var name = el("strong", null, it.name);
          if (it.status !== "confirmed") name.appendChild(el("span", "badge", "Unconfirmed"));
          li.appendChild(name);
          if (it.qty) li.appendChild(el("span", "qty", "× " + it.qty));
          if (it.detail) li.appendChild(el("span", "detail", it.detail));
          ul.appendChild(li);
        });
        g.appendChild(ul);
        box.appendChild(g);
      });
      if (section) section.hidden = false;
    });
  }

  function draft(site) {
    var id = document.body.getAttribute("data-space");
    if (!id) return;
    var space = site.spaces.filter(function (s) { return s.id === id; })[0];
    if (!space || space.published) return;
    var main = document.getElementById("main");
    var note = el("div", "draft-banner");
    note.appendChild(el("strong", null, "Draft page. "));
    note.appendChild(document.createTextNode(
      "It isn't linked from the site yet. To publish it, set \"published\": true for \"" + id +
      "\" in data/site.json and remove the noindex tag from this page."));
    main.insertBefore(note, main.firstChild);
  }

  fetch(root + "data/site.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (site) {
      portal(site);
      spacesGrid(site);
      draft(site);
      // A live feed from the members portal, when configured, replaces the static list.
      var live = (!preview && isHttp(site.equipmentFeed))
        ? fetch(site.equipmentFeed).then(function (r) { return r.json(); })
            .then(function (d) { return d && Array.isArray(d.items) ? d.items : null; })
            .catch(function () { return null; })
        : Promise.resolve(null);
      return live.then(function (items) { equipment(items || site.equipment); });
    })
    .catch(function () { /* keep static content */ });
})();
