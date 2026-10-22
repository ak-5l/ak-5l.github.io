/* Turns window.PROJECTS / window.SITE into DOM. You should rarely need to edit this file. */
(function () {
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var btn = function (l, extra) {
    return '<a class="nb-btn is-' + (l.color || "yellow") + (extra || "") + '" href="' + esc(l.href) + '"' +
      (l.download ? " download" : /^https?:/.test(l.href) ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + esc(l.label) + "</a>";
  };

  function projectHTML(p) {
    var notes = (p.notes || []).map(function (n, i) {
      return '<article><span class="note-num is-' + (p.color || "teal") + '">0' + (i + 1) + "</span><h4>" + esc(n.title) + "</h4><p>" + esc(n.body) + "</p></article>";
    }).join("");
    return '<article class="project" id="' + esc(p.id) + '">' +
      '<div class="project-top"><span class="nb-pill is-' + (p.color || "teal") + '">' + esc(p.status || "Project") + "</span>" +
      (p.stack || []).map(function (s) { return '<span class="nb-pill">' + esc(s) + "</span>"; }).join("") + "</div>" +
      "<h3>" + esc(p.title) + '</h3><p class="project-summary">' + esc(p.summary) + "</p>" +
      (p.demo ? '<div data-demo="' + esc(p.demo) + '"></div>' : "") +
      (notes ? '<div class="project-notes">' + notes + "</div>" : "") +
      (p.snippet ? '<div class="project-snippet"><h4>From ' + esc(p.snippet.file) + '</h4><pre class="nb-code"><code>' + esc(p.snippet.code) + "</code></pre></div>" : "") +
      ((p.links || []).length ? '<div class="project-links">' + p.links.map(function (l) { return btn(l); }).join("") + "</div>" : "") +
      "</article>";
  }

  var list = document.getElementById("projectList");
  list.insertAdjacentHTML("afterbegin", window.PROJECTS.map(projectHTML).join("") +
    '<p class="coming">More projects are on the way. Check back soon.</p>');

  list.querySelectorAll("[data-demo]").forEach(function (el) {
    var mount = (window.DEMOS || {})[el.dataset.demo];
    if (mount) mount(el); else el.remove();   // unknown demo name: fail quietly, keep the page working
  });

  document.getElementById("contactLinks").innerHTML = window.SITE.links.map(function (l) { return btn(l); }).join("");
  document.getElementById("year").textContent = new Date().getFullYear();
})();
