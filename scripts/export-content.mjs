// Exports the public portfolio content from Supabase into data/content.json.
// Runs in GitHub Actions every few days: it keeps the free Supabase project
// awake (no auto-pause) and keeps an offline backup the site can fall back to.
import { readFile, writeFile } from "node:fs/promises";

const cfgSrc = await readFile(new URL("../assets/js/config.js", import.meta.url), "utf8");
const url = cfgSrc.match(/supabaseUrl:\s*"([^"]+)"/)[1];
const key = cfgSrc.match(/supabaseAnonKey:\s*\n?\s*"([^"]+)"/)[1];
const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function get(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
const list = (t) => get(`${t}?select=*&visible=eq.true&order=sort_order.asc`);

const [profile, publications, projects, experience, education, skills, gallery] = await Promise.all([
  get("profile?select=*&id=eq.1"), list("publications"), list("projects"), list("experience"),
  list("education"), list("skills"), list("gallery"),
]);
if (!profile[0]) throw new Error("Profile row missing — refusing to overwrite backup.");

const out = { profile: profile[0], publications, projects, experience, education, skills, gallery };
const next = JSON.stringify(out, null, 2) + "\n";
const prev = await readFile(new URL("../data/content.json", import.meta.url), "utf8").catch(() => "");
if (prev !== next) {
  await writeFile(new URL("../data/content.json", import.meta.url), next);
  console.log("content.json updated");
} else {
  console.log("content.json unchanged");
}
