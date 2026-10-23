(function () {
  "use strict";
  var cfg = window.PORTFOLIO_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var sb = null;
  try { sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: false } }); } catch (e) {}

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    if (!u) return "";
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return ""; // block javascript:, data:, etc.
    return u; // relative path
  }
  var ICONS = {
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.6 8.65 21 11.2 21 14.5V21h-4v-5.8c0-1.4 0-3.2-1.95-3.2S12.8 13.5 12.8 15.1V21H9z"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>',
    scholar: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3zm-6 9.2V16c0 1.7 2.7 4 6 4s6-2.3 6-4v-3.8l-6 3.3-6-3.3z"/></svg>',
    researchgate: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 3h18v18H3zm5 4v10h2v-4h1.2l2.3 4h2.3l-2.6-4.4A3 3 0 0 0 11.5 7zm2 2h1.4a1 1 0 0 1 0 2H10z"/></svg>',
    orcid: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 7.2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM7.2 10h1.6v7H7.2zm3 0h3c2.4 0 3.8 1.6 3.8 3.5S15.6 17 13.2 17h-3zm1.6 1.4v4.2h1.3c1.5 0 2.3-.9 2.3-2.1s-.8-2.1-2.3-2.1z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
  };
  var SOCIALS = [
    ["linkedin_url", "LinkedIn", "linkedin"], ["github_url", "GitHub", "github"],
    ["scholar_url", "Google Scholar", "scholar"], ["researchgate_url", "ResearchGate", "researchgate"],
    ["orcid_url", "ORCID", "orcid"]
  ];

  async function loadFromSupabase() {
    if (!sb) throw new Error("no client");
    var q = function (t) { return sb.from(t).select("*").eq("visible", true).order("sort_order", { ascending: true }); };
    var res = await Promise.all([
      sb.from("profile").select("*").eq("id", 1).maybeSingle(),
      q("publications"), q("projects"), q("experience"), q("education"), q("skills"), q("gallery")
    ]);
    res.forEach(function (r) { if (r.error) throw r.error; });
    if (!res[0].data) throw new Error("empty profile");
    return { profile: res[0].data, publications: res[1].data, projects: res[2].data, experience: res[3].data,
      education: res[4].data, skills: res[5].data, gallery: res[6].data };
  }
  async function loadFallback() {
    var r = await fetch(cfg.fallbackUrl, { cache: "no-cache" });
    if (!r.ok) throw new Error("fallback missing");
    return r.json();
  }

  function render(d) {
    var p = d.profile || {};
    var name = p.full_name || "Mehrab Uddin Ahmed";
    $("heroName").textContent = name;
    $("brand").textContent = name;
    document.title = name + (p.headline ? " — " + p.headline.split("·")[0].trim() : "");
    $("heroHeadline").textContent = p.headline || "";
    $("heroTagline").textContent = p.tagline || "";
    $("openToWork").hidden = !p.open_to_work;
    $("heroLocation").textContent = p.location || "";
    var initials = name.split(/\s+/).filter(Boolean);
    $("monogram").textContent = ((initials[0] || "")[0] || "") + ((initials[initials.length - 1] || "")[0] || "");
    var photo = safeUrl(p.photo_url);
    if (photo) {
      var img = $("heroPhoto");
      img.onload = function () { img.hidden = false; $("monogram").hidden = true; };
      img.src = photo;
    }
    var cv = safeUrl(p.cv_url) || cfg.defaultCv;
    $("cvLink").href = cv;

    var social = SOCIALS.filter(function (s) { return safeUrl(p[s[0]]); }).map(function (s) {
      return '<li><a href="' + esc(safeUrl(p[s[0]])) + '" target="_blank" rel="noopener" aria-label="' + s[1] + '" title="' + s[1] + '">' + ICONS[s[2]] + "</a></li>";
    });
    $("heroSocial").innerHTML = social.join("");

    // About
    $("aboutText").innerHTML = String(p.about || "").split(/\n\s*\n/).filter(Boolean).map(function (para) {
      return "<p>" + esc(para.trim()) + "</p>";
    }).join("");
    $("about").hidden = !p.about;

    // Research
    $("interests").innerHTML = (p.research_interests || []).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("");
    $("publications").innerHTML = (d.publications || []).map(function (pub) { return paper(pub, name); }).join("");
    $("research").hidden = !(d.publications || []).length && !(p.research_interests || []).length;

    // Projects
    $("projectList").innerHTML = (d.projects || []).map(project).join("");
    $("projects").hidden = !(d.projects || []).length;

    // Experience & education
    $("experienceList").innerHTML = (d.experience || []).map(function (x) {
      return "<li><div class=\"when\">" + esc(x.start_label) + (x.end_label ? " – " + esc(x.end_label) : "") + "</div><div><h3>" + esc(x.role) +
        "</h3><p class=\"org\">" + esc(x.organization) + (x.location ? " <span>· " + esc(x.location) + "</span>" : "") + "</p>" +
        ((x.bullets || []).length ? "<ul>" + x.bullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" : "") + "</div></li>";
    }).join("");
    $("experience").hidden = !(d.experience || []).length;
    $("educationList").innerHTML = (d.education || []).map(function (x) {
      return "<li><div class=\"when\">" + esc(x.start_label) + (x.end_label ? " – " + esc(x.end_label) : "") + "</div><div><h3>" + esc(x.degree) +
        "</h3><p class=\"org\">" + esc(x.institution) + (x.location ? " <span>· " + esc(x.location) + "</span>" : "") + "</p>" +
        (x.details ? "<p>" + esc(x.details) + "</p>" : "") + "</div></li>";
    }).join("");
    $("education").hidden = !(d.education || []).length;

    // Skills
    $("skillList").innerHTML = (d.skills || []).map(function (s) {
      return "<dt>" + esc(s.category) + "</dt><dd>" + (s.items || []).map(function (i) { return "<span>" + esc(i) + "</span>"; }).join("") + "</dd>";
    }).join("");
    $("skills").hidden = !(d.skills || []).length;

    // Gallery
    var g = (d.gallery || []).filter(function (x) { return safeUrl(x.image_url); });
    $("galleryGrid").innerHTML = g.map(function (x) {
      return '<figure><img loading="lazy" src="' + esc(safeUrl(x.image_url)) + '" alt="' + esc(x.caption || "Photo") + '">' +
        (x.caption ? "<figcaption>" + esc(x.caption) + "</figcaption>" : "") + "</figure>";
    }).join("");
    $("gallery").hidden = !g.length;

    // Contact
    var c = [];
    if (p.email) c.push("<li>" + ICONS.email + '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + "</a></li>");
    if (p.show_phone && p.phone) c.push("<li>" + ICONS.phone + '<a href="tel:' + esc(p.phone.replace(/[^+\d]/g, "")) + '">' + esc(p.phone) + "</a></li>");
    SOCIALS.forEach(function (s) {
      var u = safeUrl(p[s[0]]);
      if (u) c.push("<li>" + ICONS[s[2]] + '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")) + "</a></li>");
    });
    if (p.location) c.push("<li>" + ICONS.pin + "<span>" + esc(p.location) + "</span></li>");
    $("contactList").innerHTML = c.join("");
  }

  function paper(pub, name) {
    var figs = [], bullets = [];
    (pub.highlights || []).forEach(function (h) {
      var parts = String(h).split("|");
      if (parts.length >= 2) figs.push([parts[0].trim(), parts.slice(1).join("|").trim()]);
      else bullets.push(h);
    });
    var authors = esc(pub.authors || "");
    if (name) authors = authors.split(esc(name)).join("<mark>" + esc(name) + "</mark>");
    var meta = [pub.pub_type, pub.year].filter(Boolean).map(esc);
    var links = [];
    if (safeUrl(pub.doi_url)) links.push('<a class="btn btn-primary" href="' + esc(safeUrl(pub.doi_url)) + '" target="_blank" rel="noopener">Read the paper</a>');
    if (safeUrl(pub.pdf_url)) links.push('<a class="btn" href="' + esc(safeUrl(pub.pdf_url)) + '" target="_blank" rel="noopener">PDF</a>');
    return '<article class="paper' + (pub.featured ? " featured" : "") + '">' +
      '<p class="paper-meta">' + (pub.featured ? "<strong>Featured</strong> · " : "") + meta.join(" · ") +
      (pub.venue ? " · <em>" + esc(pub.venue) + "</em>" : "") + (pub.publisher ? ", " + esc(pub.publisher) : "") + "</p>" +
      "<h3>" + esc(pub.title) + "</h3>" +
      (authors ? '<p class="authors">' + authors + "</p>" : "") +
      (pub.summary ? '<p class="summary">' + esc(pub.summary) + "</p>" : "") +
      (figs.length ? '<div class="figures">' + figs.map(function (f) { return '<div class="figure"><b>' + esc(f[0]) + "</b><span>" + esc(f[1]) + "</span></div>"; }).join("") + "</div>" : "") +
      (bullets.length ? '<ul class="hl">' + bullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" : "") +
      ((pub.tags || []).length ? '<ul class="tags">' + pub.tags.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "") +
      (links.length ? '<div class="paper-links">' + links.join("") + "</div>" : "") +
      "</article>";
  }

  function project(x) {
    var img = safeUrl(x.image_url);
    var links = [];
    if (safeUrl(x.link_url)) links.push('<a href="' + esc(safeUrl(x.link_url)) + '" target="_blank" rel="noopener">View project</a>');
    if (safeUrl(x.repo_url)) links.push('<a href="' + esc(safeUrl(x.repo_url)) + '" target="_blank" rel="noopener">Source code</a>');
    return '<article class="project' + (x.featured ? " featured" : "") + '">' +
      (img ? '<div class="project-img"><img loading="lazy" src="' + esc(img) + '" alt=""></div>' : "") +
      '<div class="project-body">' + (x.period ? '<p class="project-period">' + esc(x.period) + "</p>" : "") +
      "<h3>" + esc(x.title) + "</h3>" + (x.summary ? "<p>" + esc(x.summary) + "</p>" : "") +
      ((x.details || []).length ? '<ul class="details">' + x.details.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" : "") +
      ((x.tech || []).length ? '<ul class="tags">' + x.tech.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "") +
      (links.length ? '<div class="project-links">' + links.join("") + "</div>" : "") +
      "</div></article>";
  }

  // Contact form
  $("contactForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var f = e.target, st = $("formStatus"), btn = f.querySelector("button");
    st.className = "form-status"; st.textContent = "";
    if (f.website.value) return; // bot
    var name = f.name.value.trim(), email = f.email.value.trim(), message = f.message.value.trim();
    if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      st.className = "form-status err"; st.textContent = "Add your name, a valid email and a message, then send again."; return;
    }
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      var r = await sb.from("messages").insert({ name: name, email: email, message: message });
      if (r.error) throw r.error;
      f.reset(); st.className = "form-status ok"; st.textContent = "Message sent. I'll reply to " + email + " soon.";
    } catch (err) {
      st.className = "form-status err";
      st.textContent = "The message couldn't be sent. Please email me directly instead.";
    } finally { btn.disabled = false; btn.textContent = "Send message"; }
  });

  // Theme toggle
  $("themeToggle").addEventListener("click", function () {
    var root = document.documentElement;
    var cur = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });
  var bar = document.querySelector(".topbar");
  addEventListener("scroll", function () { bar.classList.toggle("scrolled", scrollY > 8); }, { passive: true });
  $("year").textContent = new Date().getFullYear();

  (async function init() {
    var data;
    try { data = await loadFromSupabase(); }
    catch (e) { try { data = await loadFallback(); } catch (e2) { data = null; } }
    if (data) render(data);
  })();
})();
