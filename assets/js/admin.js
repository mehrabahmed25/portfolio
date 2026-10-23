(function () {
  "use strict";
  var cfg = window.PORTFOLIO_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  if (!window.supabase) {
    $("loginView").hidden = false;
    $("loginMsg").textContent = "Couldn't load the editor. Check your internet connection and refresh the page.";
    $("loginForm").querySelector("button").disabled = true;
    return;
  }
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toast(t) {
    var el = $("toast"); el.textContent = t; el.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  // ---------- Section definitions ----------
  // Field types: text, url, email, int, textarea, list (one item per line), bool, image, pdf
  var SECTIONS = {
    profile: {
      title: "Profile", single: true,
      hint: "Your name, intro, photo, CV and links. Saved changes appear on the site immediately.",
      groups: [
        ["Basics", [
          ["full_name", "Full name", "text"], ["headline", "Headline", "text", "Shown under your name, e.g. AI/ML Researcher · Precision Agriculture & IoT"],
          ["tagline", "Tagline", "textarea", "One or two sentences at the top of the page", "wide"],
          ["about", "About", "textarea", "Leave a blank line between paragraphs", "wide", 8],
          ["research_interests", "Research interests", "list", "One per line", "wide"],
          ["open_to_work", "Show “Open to roles” badge", "bool"]
        ]],
        ["Photo and CV", [
          ["photo_url", "Profile photo", "image"], ["cv_url", "CV (PDF)", "pdf", "Replaces the Download CV file"]
        ]],
        ["Contact and links", [
          ["email", "Public email", "email"], ["location", "Location", "text"],
          ["phone", "Phone", "text", "Anything entered here is public. Leave empty to keep it private."],
          ["show_phone", "Show phone on the site", "bool"],
          ["linkedin_url", "LinkedIn URL", "url"], ["github_url", "GitHub URL", "url"],
          ["scholar_url", "Google Scholar URL", "url"], ["researchgate_url", "ResearchGate URL", "url"],
          ["orcid_url", "ORCID URL", "url"]
        ]]
      ]
    },
    publications: {
      title: "Publications", hint: "Papers appear in the Research section, in this order.",
      label: function (r) { return r.title; }, sub: function (r) { return [r.year, r.venue].filter(Boolean).join(" · "); },
      thumb: "image_url",
      fields: [
        ["title", "Title", "text", "", "wide"], ["authors", "Authors", "textarea", "Comma-separated, your name is highlighted automatically", "wide", 2],
        ["venue", "Journal / conference", "text"], ["publisher", "Publisher", "text"],
        ["year", "Year", "int"], ["pub_type", "Type", "text", "e.g. Journal Article, Conference Paper, Preprint"],
        ["summary", "Summary", "textarea", "", "wide", 5],
        ["highlights", "Highlights", "list", "One per line. Write “95.9% | Accuracy” to show it as a big number; other lines show as bullets.", "wide"],
        ["tags", "Tags", "list", "One per line", "wide"],
        ["doi_url", "Paper link (DOI)", "url"], ["pdf_url", "PDF", "pdf"],
        ["featured", "Featured (highlighted)", "bool"], ["visible", "Visible on site", "bool"]
      ],
      defaults: { pub_type: "Journal Article", visible: true }
    },
    projects: {
      title: "Projects", hint: "Project cards, in this order. Add a cover image to any project.",
      label: function (r) { return r.title; }, sub: function (r) { return r.period || ""; }, thumb: "image_url",
      fields: [
        ["title", "Title", "text", "", "wide"], ["period", "Period", "text", "e.g. 2024 — 2025"],
        ["image_url", "Cover image", "image"],
        ["summary", "Summary", "textarea", "", "wide", 3],
        ["details", "Key points", "list", "One per line", "wide"],
        ["tech", "Tools and tech", "list", "One per line", "wide"],
        ["link_url", "Project link", "url"], ["repo_url", "Source code link", "url"],
        ["featured", "Featured", "bool"], ["visible", "Visible on site", "bool"]
      ],
      defaults: { visible: true }
    },
    experience: {
      title: "Experience", hint: "Jobs and research positions, newest first.",
      label: function (r) { return r.role + " — " + r.organization; }, sub: function (r) { return r.start_label + (r.end_label ? " – " + r.end_label : ""); },
      fields: [
        ["role", "Role", "text"], ["organization", "Organisation", "text"],
        ["start_label", "Start", "text", "e.g. Jan 2024"], ["end_label", "End", "text", "e.g. Present"],
        ["location", "Location", "text"],
        ["bullets", "What you did", "list", "One point per line", "wide", 6],
        ["visible", "Visible on site", "bool"]
      ],
      defaults: { visible: true }
    },
    education: {
      title: "Education", hint: "Degrees and schools.",
      label: function (r) { return r.degree; }, sub: function (r) { return r.institution; },
      fields: [
        ["degree", "Degree", "text", "", "wide"], ["institution", "Institution", "text"], ["location", "Location", "text"],
        ["start_label", "Start", "text"], ["end_label", "End", "text"],
        ["details", "Details", "textarea", "Optional — CGPA, thesis, awards", "wide", 3],
        ["visible", "Visible on site", "bool"]
      ],
      defaults: { visible: true }
    },
    skills: {
      title: "Skills", hint: "Skill groups, in this order.",
      label: function (r) { return r.category; }, sub: function (r) { return (r.items || []).join(", "); },
      fields: [
        ["category", "Group name", "text", "", "wide"], ["items", "Skills", "list", "One per line", "wide", 6],
        ["visible", "Visible on site", "bool"]
      ],
      defaults: { visible: true }
    },
    gallery: {
      title: "Photos", hint: "Field work, events and lab photos. Shown in an “In the field” section once you add one.",
      label: function (r) { return r.caption || "Untitled photo"; }, sub: function () { return ""; }, thumb: "image_url",
      fields: [
        ["image_url", "Photo", "image", "", "wide"], ["caption", "Caption", "text", "", "wide"],
        ["visible", "Visible on site", "bool"]
      ],
      defaults: { visible: true }
    },
    messages: { title: "Messages", hint: "Messages sent through the contact form.", custom: true },
    account: { title: "Account", hint: "Change your admin password.", custom: true }
  };
  var ORDER = ["profile", "publications", "projects", "experience", "education", "skills", "gallery", "messages", "account"];
  var current = "profile";
  var rows = [];

  // ---------- Auth ----------
  async function boot() {
    var s = (await sb.auth.getSession()).data.session;
    if (s && (await checkAdmin())) return showApp();
    if (s) await sb.auth.signOut();
    showLogin();
  }
  async function checkAdmin() {
    var r = await sb.rpc("is_admin");
    return !r.error && r.data === true;
  }
  function showLogin() { $("appView").hidden = true; $("loginView").hidden = false; }
  function showApp() { $("loginView").hidden = true; $("appView").hidden = false; buildTabs(); go(current); }

  $("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var f = e.target, btn = f.querySelector("button"), msg = $("loginMsg");
    msg.textContent = ""; btn.disabled = true; btn.textContent = "Signing in…";
    var r = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    if (r.error) { msg.textContent = "Email or password is incorrect."; }
    else if (!(await checkAdmin())) { await sb.auth.signOut(); msg.textContent = "This account doesn't have admin access."; }
    else { f.reset(); showApp(); }
    btn.disabled = false; btn.textContent = "Sign in";
  });
  $("signOut").addEventListener("click", async function () { await sb.auth.signOut(); showLogin(); });

  // ---------- Navigation ----------
  function buildTabs() {
    $("tabs").innerHTML = ORDER.map(function (k) {
      return '<button type="button" data-k="' + k + '">' + SECTIONS[k].title + (k === "messages" ? '<span class="badge" id="unreadBadge" hidden></span>' : "") + "</button>";
    }).join("");
    $("tabs").querySelectorAll("button").forEach(function (b) { b.addEventListener("click", function () { go(b.dataset.k); }); });
    refreshUnread();
  }
  async function refreshUnread() {
    var r = await sb.from("messages").select("id", { count: "exact", head: true }).eq("is_read", false);
    var b = $("unreadBadge"); if (!b) return;
    b.hidden = !r.count; b.textContent = r.count || "";
  }
  function go(k) {
    current = k;
    var sec = SECTIONS[k];
    $("tabs").querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-current", b.dataset.k === k ? "true" : "false"); });
    $("sectionTitle").textContent = sec.title;
    $("sectionHint").textContent = sec.hint || "";
    $("addBtn").hidden = !!(sec.single || sec.custom);
    $("sectionBody").innerHTML = '<p class="muted">Loading…</p>';
    if (k === "profile") return loadProfile();
    if (k === "messages") return loadMessages();
    if (k === "account") return renderAccount();
    loadList();
  }

  // ---------- Field rendering ----------
  function fieldHtml(f, val) {
    var key = f[0], label = f[1], type = f[2], help = f[3] || "", cls = f[4] || "", rowsN = f[5] || 4;
    var h = help ? '<span class="help">' + esc(help) + "</span>" : "";
    var id = "f_" + key;
    if (type === "bool") {
      return '<label class="check ' + cls + '"><input type="checkbox" name="' + key + '"' + (val ? " checked" : "") + "> " + esc(label) + "</label>";
    }
    if (type === "textarea" || type === "list") {
      var v = type === "list" ? (val || []).join("\n") : (val || "");
      return '<label class="' + (cls || "wide") + '">' + esc(label) + '<textarea name="' + key + '" rows="' + rowsN + '">' + esc(v) + "</textarea>" + h + "</label>";
    }
    if (type === "image" || type === "pdf") {
      var accept = type === "image" ? "image/*" : "application/pdf";
      var preview = type === "image" ? '<img id="' + id + '_prev" alt=""' + (val ? ' src="' + esc(val) + '"' : "") + ">" : "";
      return '<div class="' + cls + '"><label for="' + id + '_file">' + esc(label) + "</label>" +
        '<div class="upload">' + preview +
        '<span class="file-name" id="' + id + '_name">' + (val ? esc(val.split("/").pop()) : "No file yet") + "</span>" +
        '<input type="hidden" name="' + key + '" value="' + esc(val || "") + '">' +
        '<input type="file" id="' + id + '_file" data-key="' + key + '" data-kind="' + type + '" accept="' + accept + '">' +
        '<button type="button" class="btn small" data-pick="' + id + '_file">Upload</button>' +
        (val ? '<button type="button" class="btn small ghost" data-clear="' + key + '">Remove</button>' : "") +
        "</div>" + h + "</div>";
    }
    var inputType = { url: "url", email: "email", int: "number" }[type] || "text";
    return '<label class="' + cls + '">' + esc(label) + '<input type="' + inputType + '" name="' + key + '" value="' + esc(val == null ? "" : val) + '">' + h + "</label>";
  }
  function wireUploads(root) {
    root.querySelectorAll("[data-pick]").forEach(function (b) {
      b.addEventListener("click", function () { $(b.dataset.pick).click(); });
    });
    root.querySelectorAll("[data-clear]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.dataset.clear; root.querySelector('[name="' + k + '"]').value = "";
        $("f_" + k + "_name").textContent = "Removed — save to apply";
        var p = $("f_" + k + "_prev"); if (p) p.removeAttribute("src");
      });
    });
    root.querySelectorAll('input[type=file]').forEach(function (inp) {
      inp.addEventListener("change", async function () {
        var file = inp.files[0]; if (!file) return;
        var key = inp.dataset.key, nameEl = $("f_" + key + "_name");
        nameEl.textContent = "Uploading…";
        try {
          var url = await upload(file, inp.dataset.kind, current);
          root.querySelector('[name="' + key + '"]').value = url;
          nameEl.textContent = file.name + " — uploaded, save to apply";
          var p = $("f_" + key + "_prev"); if (p) p.src = url;
        } catch (err) { nameEl.textContent = "Upload failed: " + (err.message || err); }
        inp.value = "";
      });
    });
  }
  function readFields(form, fields) {
    var out = {};
    fields.forEach(function (f) {
      var el = form.querySelector('[name="' + f[0] + '"]'); if (!el) return;
      var t = f[2];
      if (t === "bool") out[f[0]] = el.checked;
      else if (t === "list") out[f[0]] = el.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      else if (t === "int") out[f[0]] = el.value === "" ? null : parseInt(el.value, 10);
      else out[f[0]] = el.value.trim();
    });
    return out;
  }

  // ---------- Uploads (images are resized in the browser first) ----------
  async function shrinkImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    var bmp;
    try { bmp = await createImageBitmap(file); } catch (e) { return file; }
    var max = 1800, scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900000) return file;
    var c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    var blob = await new Promise(function (res) { c.toBlob(res, "image/jpeg", 0.86); });
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  }
  async function upload(file, kind, folder) {
    if (kind === "pdf" && file.type !== "application/pdf") throw new Error("choose a PDF file");
    if (kind === "image" && !/^image\//.test(file.type)) throw new Error("choose an image file");
    if (kind === "image") file = await shrinkImage(file);
    if (file.size > 10 * 1024 * 1024) throw new Error("file is larger than 10 MB");
    var safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "file";
    var path = folder + "/" + Date.now() + "-" + safe;
    var r = await sb.storage.from(cfg.mediaBucket).upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    if (r.error) throw r.error;
    return sb.storage.from(cfg.mediaBucket).getPublicUrl(path).data.publicUrl;
  }

  // ---------- Profile ----------
  async function loadProfile() {
    var r = await sb.from("profile").select("*").eq("id", 1).maybeSingle();
    if (r.error) return fail(r.error);
    var p = r.data || {};
    var sec = SECTIONS.profile, all = [];
    var html = '<form class="card" id="profileForm"><div class="fields">';
    sec.groups.forEach(function (g) {
      html += "<fieldset><legend>" + esc(g[0]) + "</legend>";
      g[1].forEach(function (f) { all.push(f); html += fieldHtml(f, p[f[0]]); });
      html += "</fieldset>";
    });
    html += '</div><div class="save-bar"><p class="msg" id="profileMsg"></p><button class="btn primary" type="submit">Save profile</button></div></form>';
    $("sectionBody").innerHTML = html;
    var form = $("profileForm");
    wireUploads(form);
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]"); btn.disabled = true;
      var data = readFields(form, all); data.id = 1;
      var res = await sb.from("profile").upsert(data);
      btn.disabled = false;
      if (res.error) { $("profileMsg").className = "msg"; $("profileMsg").textContent = "Couldn't save: " + res.error.message; return; }
      toast("Profile saved — live on the site");
      loadProfile();
    });
  }

  // ---------- Lists ----------
  async function loadList() {
    var k = current;
    var r = await sb.from(k).select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (k !== current) return;
    if (r.error) return fail(r.error);
    rows = r.data || [];
    var sec = SECTIONS[k];
    if (!rows.length) {
      $("sectionBody").innerHTML = '<div class="empty">Nothing here yet. Use “Add new” to create the first one.</div>';
      return;
    }
    $("sectionBody").innerHTML = '<div class="rows">' + rows.map(function (row, i) {
      var thumb = sec.thumb ? (row[sec.thumb] ? '<img class="row-thumb" src="' + esc(row[sec.thumb]) + '" alt="">' : '<span class="row-thumb"></span>') : "";
      return '<div class="row' + (row.visible === false ? " hidden-item" : "") + '">' + thumb +
        '<div class="row-main"><div class="row-title">' + esc(sec.label(row)) + "</div>" +
        '<div class="row-sub">' + esc(sec.sub(row)) + "</div></div>" +
        '<div class="row-actions">' +
        (row.featured ? '<span class="pill">Featured</span>' : "") + (row.visible === false ? '<span class="pill">Hidden</span>' : "") +
        '<button class="icon-btn" data-act="up" data-i="' + i + '" aria-label="Move up"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button class="icon-btn" data-act="down" data-i="' + i + '" aria-label="Move down"' + (i === rows.length - 1 ? " disabled" : "") + ">↓</button>" +
        '<button class="btn small" data-act="vis" data-i="' + i + '">' + (row.visible === false ? "Show" : "Hide") + "</button>" +
        '<button class="btn small" data-act="edit" data-i="' + i + '">Edit</button>' +
        '<button class="btn small danger" data-act="del" data-i="' + i + '">Delete</button>' +
        "</div></div>";
    }).join("") + "</div>";
    $("sectionBody").querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () { act(b.dataset.act, parseInt(b.dataset.i, 10)); });
    });
  }
  async function act(a, i) {
    var row = rows[i], t = current;
    if (a === "edit") return openEditor(row);
    if (a === "del") {
      if (!confirm("Delete “" + SECTIONS[t].label(row) + "”? This can't be undone.")) return;
      var d = await sb.from(t).delete().eq("id", row.id);
      if (d.error) return toast("Couldn't delete: " + d.error.message);
      toast("Deleted"); return loadList();
    }
    if (a === "vis") {
      var v = await sb.from(t).update({ visible: row.visible === false }).eq("id", row.id);
      if (v.error) return toast("Couldn't update: " + v.error.message);
      toast(row.visible === false ? "Now visible on the site" : "Hidden from the site"); return loadList();
    }
    if (a === "up" || a === "down") {
      var j = a === "up" ? i - 1 : i + 1; if (j < 0 || j >= rows.length) return;
      // normalise order then swap
      var order = rows.map(function (r) { return r.id; });
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
      var ups = order.map(function (id, idx) { return sb.from(t).update({ sort_order: idx + 1 }).eq("id", id); });
      var res = await Promise.all(ups);
      var err = res.find(function (x) { return x.error; });
      if (err) toast("Couldn't reorder: " + err.error.message);
      return loadList();
    }
  }

  // ---------- Editor dialog ----------
  var editing = null;
  function openEditor(row) {
    var sec = SECTIONS[current];
    editing = row ? row.id : null;
    var vals = row || Object.assign({}, sec.defaults || {});
    $("editorTitle").textContent = (row ? "Edit " : "Add to ") + sec.title.toLowerCase();
    $("editorFields").innerHTML = '<div class="fields">' + sec.fields.map(function (f) { return fieldHtml(f, vals[f[0]]); }).join("") + "</div>";
    $("editorMsg").textContent = "";
    wireUploads($("editorFields"));
    $("editor").showModal();
    var first = $("editorFields").querySelector("input:not([type=hidden]):not([type=file]), textarea");
    if (first) first.focus();
  }
  function closeEditor() { $("editor").close(); editing = null; }
  $("editorClose").addEventListener("click", closeEditor);
  $("editorCancel").addEventListener("click", closeEditor);
  $("addBtn").addEventListener("click", function () { openEditor(null); });
  $("editorForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var sec = SECTIONS[current];
    var data = readFields($("editorForm"), sec.fields);
    var req = sec.fields[0][0];
    if (sec.fields[0][2] !== "image" && !data[req]) { $("editorMsg").textContent = sec.fields[0][1] + " is required."; return; }
    if (sec.fields[0][2] === "image" && !data[req]) { $("editorMsg").textContent = "Upload a photo first."; return; }
    var btn = $("editorSave"); btn.disabled = true;
    var res;
    if (editing) res = await sb.from(current).update(data).eq("id", editing);
    else {
      data.sort_order = rows.length ? Math.max.apply(null, rows.map(function (r) { return r.sort_order || 0; })) + 1 : 1;
      res = await sb.from(current).insert(data);
    }
    btn.disabled = false;
    if (res.error) { $("editorMsg").textContent = "Couldn't save: " + res.error.message; return; }
    closeEditor(); toast("Saved — live on the site"); loadList();
  });

  // ---------- Messages ----------
  async function loadMessages() {
    var r = await sb.from("messages").select("*").order("created_at", { ascending: false });
    if (current !== "messages") return;
    if (r.error) return fail(r.error);
    var list = r.data || [];
    if (!list.length) { $("sectionBody").innerHTML = '<div class="empty">No messages yet. They will appear here when someone uses the contact form.</div>'; return; }
    $("sectionBody").innerHTML = '<div class="rows">' + list.map(function (m, i) {
      return '<article class="message' + (m.is_read ? "" : " unread") + '"><div class="message-head"><div><strong>' + esc(m.name) + "</strong> · " +
        '<a href="mailto:' + esc(m.email) + "?subject=" + encodeURIComponent("Re: your message") + '">' + esc(m.email) + "</a></div>" +
        '<span class="muted small">' + esc(new Date(m.created_at).toLocaleString()) + "</span></div><p>" + esc(m.message) + "</p>" +
        '<div class="row-actions"><a class="btn small" href="mailto:' + esc(m.email) + "?subject=" + encodeURIComponent("Re: your message") + '">Reply by email</a>' +
        '<button class="btn small" data-m="read" data-i="' + i + '">' + (m.is_read ? "Mark unread" : "Mark read") + "</button>" +
        '<button class="btn small danger" data-m="del" data-i="' + i + '">Delete</button></div></article>';
    }).join("") + "</div>";
    $("sectionBody").querySelectorAll("[data-m]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var m = list[parseInt(b.dataset.i, 10)], res;
        if (b.dataset.m === "del") {
          if (!confirm("Delete this message from " + m.name + "?")) return;
          res = await sb.from("messages").delete().eq("id", m.id);
        } else res = await sb.from("messages").update({ is_read: !m.is_read }).eq("id", m.id);
        if (res.error) toast("Couldn't update: " + res.error.message);
        refreshUnread(); loadMessages();
      });
    });
  }

  // ---------- Account ----------
  async function renderAccount() {
    var u = (await sb.auth.getUser()).data.user;
    $("sectionBody").innerHTML = '<form class="card" id="pwForm"><div class="fields">' +
      '<label class="wide">Signed in as<input value="' + esc(u ? u.email : "") + '" disabled></label>' +
      '<label>New password<input type="password" name="pw" minlength="10" autocomplete="new-password" required><span class="help">At least 10 characters</span></label>' +
      '<label>Confirm new password<input type="password" name="pw2" autocomplete="new-password" required></label>' +
      '</div><div class="save-bar"><p class="msg" id="pwMsg"></p><button class="btn primary" type="submit">Change password</button></div></form>';
    $("pwForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = e.target, m = $("pwMsg");
      m.className = "msg";
      if (f.pw.value.length < 10) { m.textContent = "Use at least 10 characters."; return; }
      if (f.pw.value !== f.pw2.value) { m.textContent = "The two passwords don't match."; return; }
      var r = await sb.auth.updateUser({ password: f.pw.value });
      if (r.error) { m.textContent = "Couldn't change password: " + r.error.message; return; }
      f.reset(); m.className = "msg ok"; m.textContent = "Password changed.";
    });
  }

  function fail(err) {
    $("sectionBody").innerHTML = '<div class="empty">Couldn\'t load this section: ' + esc(err.message || err) + ". Refresh the page to try again.</div>";
  }

  boot();
})();
