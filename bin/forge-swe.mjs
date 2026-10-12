#!/usr/bin/env node
// forge-swe installer: copy agents, workflows, skills and templates into a project.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cwd = process.cwd();
const PLUGIN_ROOT_TEMPLATES = "${CLAUDE_PLUGIN_ROOT}/templates/";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [cmd = "help", ...names] = args.filter((a) => !a.startsWith("--"));
const targets = flags.has("--codex") && !flags.has("--claude") ? ["codex"]
  : flags.has("--claude") && !flags.has("--codex") ? ["claude"]
  : ["claude", "codex"];
const force = flags.has("--force");

const walk = (dir) => fs.existsSync(dir)
  ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])
  : [];
const list = (dir, ext) => walk(path.join(pkg, dir)).filter((f) => f.endsWith(ext)).map((f) => path.relative(path.join(pkg, dir), f));

const catalog = {
  agents: list("agents", ".md").map((f) => f.replace(/\.md$/, "")),
  commands: list("commands", ".md").map((f) => f.replace(/\.md$/, "").split(path.sep).join(":")),
  skills: fs.readdirSync(path.join(pkg, "skills")),
};

const stats = { written: 0, skipped: 0 };
function copy(src, dest, { rewrite = false } = {}) {
  const target = path.join(cwd, dest);
  if (fs.existsSync(target) && !force) { stats.skipped++; return; }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (rewrite) fs.writeFileSync(target, fs.readFileSync(src, "utf8").replaceAll(PLUGIN_ROOT_TEMPLATES, "templates/"));
  else fs.copyFileSync(src, target);
  stats.written++;
}

// Follow `backticked` agent/skill names and templates/*.tmpl.md references inside a file.
function deps(file) {
  const text = fs.readFileSync(file, "utf8");
  const found = { agents: new Set(), skills: new Set(), templates: new Set() };
  for (const [, tok] of text.matchAll(/`([a-z][a-z-]+)`/g)) {
    if (catalog.agents.includes(tok)) found.agents.add(tok);
    if (catalog.skills.includes(tok)) found.skills.add(tok);
  }
  for (const [, t] of text.matchAll(/templates\/([a-z-]+\.tmpl\.md)/g)) found.templates.add(t);
  return found;
}

function resolve(selection) {
  const sel = { agents: new Set(), commands: new Set(), skills: new Set(), templates: new Set() };
  const queue = [];
  const add = (kind, name) => { if (!sel[kind].has(name)) { sel[kind].add(name); queue.push([kind, name]); } };
  for (const n of selection) {
    const kind = ["agents", "commands", "skills"].find((k) => catalog[k].includes(n));
    if (!kind) { console.error(`Unknown item "${n}". Run: npx forge-swe list`); process.exit(1); }
    add(kind, n);
  }
  while (queue.length) {
    const [kind, name] = queue.shift();
    const file = kind === "agents" ? `agents/${name}.md` : kind === "commands" ? `commands/${name.split(":").join("/")}.md` : `skills/${name}/SKILL.md`;
    const d = deps(path.join(pkg, file));
    d.agents.forEach((a) => add("agents", a));
    d.skills.forEach((s) => add("skills", s));
    d.templates.forEach((t) => sel.templates.add(t));
  }
  return sel;
}

function install(sel) {
  if (targets.includes("claude")) {
    for (const a of sel.agents) copy(path.join(pkg, "agents", `${a}.md`), `.claude/agents/${a}.md`, { rewrite: true });
    for (const c of sel.commands) { const rel = `${c.split(":").join("/")}.md`; copy(path.join(pkg, "commands", rel), `.claude/commands/${rel}`, { rewrite: true }); }
    for (const s of sel.skills) for (const f of walk(path.join(pkg, "skills", s))) copy(f, `.claude/skills/${path.relative(path.join(pkg, "skills"), f)}`);
  }
  if (targets.includes("codex")) {
    for (const a of sel.agents) copy(path.join(pkg, "codex/agents", `${a}.toml`), `.codex/agents/${a}.toml`);
    for (const s of sel.skills) for (const f of walk(path.join(pkg, "codex/skills", s))) copy(f, `.agents/skills/${path.relative(path.join(pkg, "codex/skills"), f)}`);
    if (sel.commands.size) for (const f of walk(path.join(pkg, "codex/skills/agentic-swe-workflows"))) copy(f, `.agents/skills/${path.relative(path.join(pkg, "codex/skills"), f)}`);
  }
  for (const t of sel.templates) copy(path.join(pkg, "templates", t), `templates/${t}`);
}

function mergeContract() {
  const snippet = fs.readFileSync(path.join(pkg, "CLAUDE.snippet.md"), "utf8");
  const files = [targets.includes("claude") && "CLAUDE.md", targets.includes("codex") && "AGENTS.md"].filter(Boolean);
  for (const f of files) {
    const p = path.join(cwd, f);
    const existing = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
    const re = /<!-- forge-swe:begin -->[\s\S]*?<!-- forge-swe:end -->\n?/;
    const body = f === "AGENTS.md" ? snippet.replaceAll("CLAUDE.md", "AGENTS.md").replaceAll("Claude", "Codex") : snippet;
    fs.writeFileSync(p, re.test(existing) ? existing.replace(re, body) : existing + (existing && !existing.endsWith("\n\n") ? "\n\n" : "") + body);
    console.log(`  contract → ${f}`);
  }
}

const report = () => console.log(`Done: ${stats.written} written, ${stats.skipped} skipped (exist; use --force to overwrite).`);

switch (cmd) {
  case "list":
    for (const k of Object.keys(catalog)) console.log(`${k}:\n  ${catalog[k].join("\n  ")}\n`);
    break;
  case "init": // everything
    {
      const sel = resolve([...catalog.agents, ...catalog.commands, ...catalog.skills]);
      list("templates", "").forEach((t) => sel.templates.add(t));
      install(sel);
    }
    mergeContract();
    report();
    break;
  case "add":
    if (!names.length) { console.error("Usage: npx forge-swe add <agent|command|skill>... [--claude|--codex]"); process.exit(1); }
    install(resolve(names));
    mergeContract();
    report();
    break;
  default:
    console.log(`forge-swe — SWE agents, workflows and skills for Claude Code and Codex

  npx forge-swe init                 install everything (+ operating contract)
  npx forge-swe add <name>...        install specific items and their dependencies
  npx forge-swe list                 show agents, commands, skills

  --claude | --codex    limit to one tool (default: both)
  --force               overwrite existing files`);
}
