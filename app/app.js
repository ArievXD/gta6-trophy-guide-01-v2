// Leonida Trophy Guide — offline tracker for the 55 GTA VI trophies.
// Data: app/data/trophies.json (official names, descriptions, grades + our own
// guides, sources, kind, missable flag and roadmap stage). Progress lives in
// localStorage and can be exported to / imported from a JSON file. No network.
const STORAGE_KEY = 'gta6-trophy-guide-v1';
const DEMO_EARNED = [2, 3, 4, 8, 9, 10, 15, 16, 19, 21, 28, 33, 35, 42, 46, 53, 54, 55];

const ROADMAP_STAGES = [
  { n: 1, title: 'Play the story — Chapters 1–4 and the finale',
    text: 'Play the chapters in order. This is where the chapter trophies, the mission trophies and the story choice land — and where the one missable lives: meditate on Lucia\u2019s balcony in Chapter 1. Keep a manual save at the start of every chapter.' },
  { n: 2, title: 'Strangers and side stories',
    text: 'Finish the stranger strands — Andy, Kenton, Billy, Randy and Tyrone, Bret\u2019s hunt, and any 8 strands for Strangers & Freaks. These open as the story moves, so pick them up between chapters.' },
  { n: 3, title: 'Collectibles and exploration',
    text: 'Cards, WAiNK spots, vehicles and the map itself. Finish the meditation spots you started in Chapter 1 and fill in every region of Leonida.' },
  { n: 4, title: 'Activities and grinds',
    text: 'The long middle: stunts, races, the shooting range, fishing, the arcade, challenges, partner feats and the robberies that open in Chapters 3 and 4.' },
  { n: 5, title: 'Money, 100% and the Platinum',
    text: 'Launder the Marked Bills, spend, buy the garages, register the vehicles — then A Long Road (100% completion) and the Platinum, Vice Got a Price!' },
];

const KIND_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'story', label: 'Story' },
  { key: 'missable', label: 'Missable' },
  { key: 'collectible', label: 'Collectibles' },
  { key: 'activity', label: 'Activities' },
  { key: 'online', label: 'Online' },
];
const GRADE_LETTER = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };
const KIND_LABEL = { story: 'Story', collectible: 'Collectible', activity: 'Activity', platinum: 'Platinum', completion: '100%' };

const rowsEl = document.getElementById('rows');
const shownCountEl = document.getElementById('shownCount');
const emptyNoteEl = document.getElementById('emptyNote');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');

let trophies = [];
let earned = loadProgress();
let kindFilter = 'all';
let openGuideId = null;

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const ids = Array.isArray(parsed) ? parsed : parsed.earned;
    return new Set((ids ?? []).map(Number).filter((n) => Number.isInteger(n)));
  } catch {
    return new Set();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, earned: [...earned].sort((a, b) => a - b) }));
}

function isMasked(t) {
  return spoilerEl.checked && t.kind === 'story' && !earned.has(t.id);
}

function trophyMatches(t) {
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (kindFilter === 'story' && t.kind !== 'story') return false;
  if (kindFilter === 'missable' && !t.missable) return false;
  if (kindFilter === 'collectible' && t.kind !== 'collectible') return false;
  if (kindFilter === 'activity' && t.kind !== 'activity') return false;
  if (kindFilter === 'online') return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  document.getElementById('earnedCount').textContent = String(n);
  document.getElementById('earnedPct').textContent = total ? Math.round((n / total) * 100) + '%' : '0%';
  document.getElementById('barFill').style.width = total ? (n / total) * 100 + '%' : '0%';
  const byGrade = {};
  for (const t of trophies) {
    byGrade[t.grade] = byGrade[t.grade] ?? { got: 0, total: 0 };
    byGrade[t.grade].total += 1;
    if (earned.has(t.id)) byGrade[t.grade].got += 1;
  }
  document.getElementById('gradeCounts').textContent =
    ['platinum', 'gold', 'silver', 'bronze'].map((g) => `${GRADE_LETTER[g]} ${byGrade[g]?.got ?? 0}/${byGrade[g]?.total ?? 0}`).join('  ·  ');
}

function renderChips() {
  const box = document.getElementById('kindChips');
  box.replaceChildren();
  for (const f of KIND_FILTERS) {
    const count = f.key === 'all' ? trophies.length
      : f.key === 'missable' ? trophies.filter((t) => t.missable).length
      : f.key === 'online' ? 0
      : trophies.filter((t) => t.kind === f.key).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('aria-pressed', String(kindFilter === f.key));
    b.innerHTML = '';
    b.append(document.createTextNode(f.label + ' '));
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = String(count);
    b.append(n);
    b.addEventListener('click', () => { kindFilter = f.key; renderChecklist(); renderChips(); });
    box.append(b);
  }
}

function renderChecklist() {
  const shown = trophies.filter(trophyMatches);
  rowsEl.replaceChildren();
  for (const t of shown) {
    const masked = isMasked(t);
    const card = document.createElement('article');
    card.className = 'trophy' + (earned.has(t.id) ? ' earned' : '') + (t.missable ? ' missable' : '');
    card.id = 'trophy-' + t.id;

    const head = document.createElement('div');
    head.className = 'trophy-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', 'Earned: ' + t.name);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      saveProgress();
      renderProgress();
      renderChecklist();
    });
    const badge = document.createElement('span');
    badge.className = 'grade-badge ' + t.grade;
    badge.textContent = GRADE_LETTER[t.grade];
    badge.title = t.grade;
    const main = document.createElement('div');
    main.className = 'trophy-main';
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = masked ? 'Hidden story trophy' : t.name;
    if (masked) {
      const tag = document.createElement('span');
      tag.className = 'hidden-tag';
      tag.textContent = ' — hidden until earned';
      name.append(tag);
    }
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = masked ? 'Turn spoilers off, or earn this trophy, to reveal its name and description.' : t.description;
    const tags = document.createElement('div');
    tags.className = 'tags';
    const kindTag = document.createElement('span');
    kindTag.className = 'tag story';
    kindTag.textContent = KIND_LABEL[t.kind] ?? t.kind;
    tags.append(kindTag);
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'tag miss';
      m.textContent = 'Missable';
      tags.append(m);
    }
    const stageTag = document.createElement('span');
    stageTag.className = 'tag';
    stageTag.textContent = 'Stage ' + t.stage;
    tags.append(stageTag);
    if (t.count) {
      const c = document.createElement('span');
      c.className = 'tag';
      c.textContent = '× ' + t.count.toLocaleString('en-US');
      tags.append(c);
    }
    main.append(name, desc, tags);
    head.append(box, badge, main);

    if (!masked) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'guide-toggle';
      toggle.textContent = openGuideId === t.id ? 'Hide guide' : 'Guide';
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        openGuideId = openGuideId === t.id ? null : t.id;
        renderChecklist();
      });
      head.append(toggle);
    }
    head.addEventListener('click', (e) => {
      if (e.target === box || masked) return;
      openGuideId = openGuideId === t.id ? null : t.id;
      renderChecklist();
    });
    card.append(head);

    if (!masked && openGuideId === t.id) {
      const guide = document.createElement('div');
      guide.className = 'guide';
      const p = document.createElement('p');
      p.textContent = t.guide;
      const src = document.createElement('p');
      src.className = 'src';
      src.append(document.createTextNode('Sources: '));
      for (const s of t.sources ?? []) {
        const a = document.createElement('a');
        a.href = s.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = s.name;
        src.append(a);
      }
      guide.append(p, src);
      card.append(guide);
    }
    rowsEl.append(card);
  }
  shownCountEl.textContent = `— showing ${shown.length} of ${trophies.length}`;
  emptyNoteEl.hidden = shown.length !== 0;
}

function renderRoadmap() {
  const box = document.getElementById('stages');
  box.replaceChildren();
  for (const s of ROADMAP_STAGES) {
    const stageTrophies = trophies.filter((t) => t.stage === s.n);
    const div = document.createElement('div');
    div.className = 'stage';
    const h = document.createElement('h3');
    const num = document.createElement('span');
    num.className = 'n';
    num.textContent = 'Stage ' + s.n;
    h.append(num, document.createTextNode(s.title + ` (${stageTrophies.length} trophies)`));
    const p = document.createElement('p');
    p.textContent = s.text;
    const names = document.createElement('div');
    names.className = 'names';
    stageTrophies.forEach((t, i) => {
      if (i) names.append(document.createTextNode(' · '));
      const b = document.createElement('b');
      b.textContent = t.name;
      names.append(b);
      if (t.missable) {
        const m = document.createElement('span');
        m.textContent = ' ⚠ missable';
        names.append(m);
      }
    });
    div.append(h, p, names);
    box.append(div);
  }
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', version: 1, earned: [...earned].sort((a, b) => a - b) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const ids = Array.isArray(parsed) ? parsed : parsed.earned;
    const valid = new Set(trophies.map((t) => t.id));
    earned = new Set((ids ?? []).map(Number).filter((n) => valid.has(n)));
    saveProgress();
    renderProgress();
    renderChecklist();
  } catch {
    alert('That file is not a valid progress export.');
  }
}

// Screenshot / deep-link presets, read from the URL hash. Each demo sets a
// coherent, real state (the same state a reader could reach by hand): a set of
// earned trophies, a filter, the spoiler setting and one open guide. Explicit
// hash keys override the demo defaults, so #demo=guide&open=30 opens another.
const DEMO_PRESETS = {
  cover: { spoiler: true, open: 1, scroll: 'top' },
  roadmap: { spoiler: true, scroll: 'roadmap' },
  tracker: { spoiler: true, filter: 'story', scroll: 'checklist' },
  guide: { spoiler: false, filter: 'collectible', open: 31, scroll: 'trophy-31' },
};

function applyHashPreset() {
  const params = new URLSearchParams(location.hash.slice(1));
  const demo = params.get('demo');
  const preset = DEMO_PRESETS[demo] ?? {};
  if (demo) {
    earned = new Set(DEMO_EARNED);
    saveProgress();
  }
  kindFilter = params.get('filter') ?? preset.filter ?? 'all';
  if (params.get('grade')) gradeEl.value = params.get('grade');
  spoilerEl.checked = params.get('spoiler') ? params.get('spoiler') === 'on' : (preset.spoiler ?? false);
  if (params.get('search')) searchEl.value = params.get('search');
  openGuideId = params.get('open') ? Number(params.get('open')) : (preset.open ?? null);
  renderProgress();
  renderChips();
  renderChecklist();
  const scrollId = params.get('scroll') ?? preset.scroll ?? (openGuideId ? 'trophy-' + openGuideId : null);
  if (scrollId === 'top') window.scrollTo(0, 0);
  else if (scrollId) document.getElementById(scrollId)?.scrollIntoView({ block: 'start' });
}

async function init() {
  const doc = await (await fetch('data/trophies.json')).json();
  trophies = doc.trophies;
  renderProgress();
  renderChips();
  renderRoadmap();
  renderChecklist();
  searchEl.addEventListener('input', renderChecklist);
  gradeEl.addEventListener('change', renderChecklist);
  spoilerEl.addEventListener('change', renderChecklist);
  document.getElementById('export').addEventListener('click', exportProgress);
  document.getElementById('import').addEventListener('change', (e) => importProgress(e.target.files[0]));
  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('Clear all earned trophies?')) return;
    earned = new Set();
    saveProgress();
    renderProgress();
    renderChecklist();
  });
  applyHashPreset();
}

init();
