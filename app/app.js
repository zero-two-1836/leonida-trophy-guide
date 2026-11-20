// Leonida Trophy Guide — the app.
//
// Loads app/data/trophies.json (the official 55-trophy list with this app's
// own guides), renders the roadmap to the platinum, the missable warning and
// the tracker cards, and keeps the reader's earned set in the store
// (store.js, localStorage). Everything is client-side and offline: the only
// request the page ever makes is for its own data file.

import { loadEarned, saveEarned, clearEarned, exportText, parseImport, downloadText } from './store.js';

const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = {
  story: 'Story',
  side: 'Side strand',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  cleanup: 'Cleanup',
};

const els = {
  overallCount: document.getElementById('overall-count'),
  overallPct: document.getElementById('overall-pct'),
  overallFill: document.getElementById('overall-fill'),
  gradeProgress: document.getElementById('grade-progress'),
  missableAlert: document.getElementById('missable-alert'),
  roadmap: document.getElementById('roadmap'),
  search: document.getElementById('search'),
  gradeFilter: document.getElementById('grade-filter'),
  spoilerToggle: document.getElementById('spoiler-toggle'),
  hideEarned: document.getElementById('hide-earned'),
  kindChips: document.getElementById('kind-chips'),
  cards: document.getElementById('cards'),
  empty: document.getElementById('empty'),
  resultCount: document.getElementById('result-count'),
  ioNote: document.getElementById('io-note'),
};

let doc = null;
let earned = loadEarned();
let activeKind = 'all';
const openDetails = new Set();

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function isSpoilerHidden(trophy) {
  return els.spoilerToggle.checked && trophy.kind === 'story' && !earned.has(trophy.id);
}

function renderProgress() {
  const total = doc.trophies.length;
  const pct = Math.round((earned.size / total) * 100);
  els.overallCount.textContent = `${earned.size} of ${total} earned`;
  els.overallPct.textContent = `${pct}%`;
  els.overallFill.style.width = `${pct}%`;

  els.gradeProgress.replaceChildren();
  for (const grade of GRADE_ORDER) {
    const inGrade = doc.trophies.filter((t) => t.grade === grade);
    const got = inGrade.filter((t) => earned.has(t.id)).length;
    const wrap = el('div', 'gp');
    wrap.append(el('b', null, `${GRADE_LABEL[grade]} — ${got}/${inGrade.length}`));
    const bar = el('div', 'bar');
    const fill = el('div', `fill fill-${grade}`);
    fill.style.width = `${inGrade.length ? (got / inGrade.length) * 100 : 0}%`;
    bar.append(fill);
    wrap.append(bar);
    els.gradeProgress.append(wrap);
  }
}

function renderRoadmap() {
  const missable = doc.trophies.find((t) => t.missable);
  els.missableAlert.replaceChildren();
  const head = el('b', null, 'MISSABLE — ');
  els.missableAlert.append(
    head,
    document.createTextNode(
      `${missable.name}: ${doc.missableNote} It is flagged on its card below and in the Missable filter.`,
    ),
  );

  els.roadmap.replaceChildren();
  for (const stage of doc.roadmap) {
    const count = doc.trophies.filter((t) => t.stage === stage.stage).length;
    const li = el('li');
    li.append(el('div', 'stage-num', String(stage.stage)));
    const body = el('div');
    body.append(el('h3', null, stage.title));
    body.append(el('p', null, stage.text));
    body.append(el('span', 'stage-count', `${count} trophies in this stage`));
    li.append(body);
    els.roadmap.append(li);
  }
}

function renderChips() {
  const kinds = ['all', ...Object.keys(KIND_LABEL)];
  els.kindChips.replaceChildren();
  for (const kind of kinds) {
    const count = kind === 'all' ? doc.trophies.length : doc.trophies.filter((t) => t.kind === kind).length;
    if (kind !== 'all' && count === 0) continue;
    const chip = el('button', 'chip');
    chip.type = 'button';
    chip.setAttribute('aria-pressed', String(activeKind === kind));
    chip.append(document.createTextNode(kind === 'all' ? 'All kinds ' : `${KIND_LABEL[kind]} `));
    chip.append(el('span', 'n', String(count)));
    chip.addEventListener('click', () => {
      activeKind = kind;
      renderChips();
      renderCards();
    });
    els.kindChips.append(chip);
  }
}

function matchesFilters(trophy) {
  if (activeKind !== 'all' && trophy.kind !== activeKind) return false;
  if (els.gradeFilter.value !== 'all' && trophy.grade !== els.gradeFilter.value) return false;
  if (els.hideEarned.checked && earned.has(trophy.id)) return false;
  const query = els.search.value.trim().toLowerCase();
  if (query) {
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide} ${KIND_LABEL[trophy.kind]}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function buildCard(trophy) {
  const card = el('article', `card${earned.has(trophy.id) ? ' earned' : ''}`);

  const top = el('div', 'card-top');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(trophy.id);
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(trophy.id);
    else earned.delete(trophy.id);
    saveEarned(earned);
    renderProgress();
    renderCards();
  });
  top.append(box);

  const heading = el('div');
  if (isSpoilerHidden(trophy)) {
    heading.append(el('h3', 'tname', 'Hidden trophy'));
    heading.append(el('p', 'tdesc', 'A story trophy, shielded until you earn it.'));
  } else {
    heading.append(el('h3', 'tname', trophy.name));
    heading.append(el('p', 'tdesc', trophy.description));
  }
  top.append(heading);
  card.append(top);

  const badges = el('div', 'badges');
  badges.append(el('span', `badge badge-${trophy.grade}`, GRADE_LABEL[trophy.grade]));
  badges.append(el('span', 'tag', KIND_LABEL[trophy.kind]));
  badges.append(el('span', 'tag', `Stage ${trophy.stage}`));
  if (trophy.missable) badges.append(el('span', 'tag tag-missable', 'Missable'));
  card.append(badges);

  if (isSpoilerHidden(trophy)) {
    card.append(el('p', 'spoiler-note', 'Spoiler shield is on: this story trophy’s name, description and guide stay hidden until it is earned. Tick it off above to reveal it.'));
    return card;
  }

  const toggle = el('button', 'guide-toggle', openDetails.has(trophy.id) ? 'Hide guide ▴' : 'Read the guide ▾');
  toggle.type = 'button';
  toggle.addEventListener('click', () => {
    if (openDetails.has(trophy.id)) openDetails.delete(trophy.id);
    else openDetails.add(trophy.id);
    renderCards();
  });
  card.append(toggle);

  if (openDetails.has(trophy.id)) {
    const detail = el('div', 'detail');
    detail.append(el('p', 'guide', trophy.guide));
    if (Array.isArray(trophy.steps) && trophy.steps.length) {
      const list = el('ol');
      for (const step of trophy.steps) list.append(el('li', null, step));
      detail.append(list);
    }
    const sources = el('p', 'sources');
    sources.append(el('b', null, 'Sources: '), document.createTextNode(trophy.sources));
    detail.append(sources);
    card.append(detail);
  }
  return card;
}

function renderCards() {
  const shown = doc.trophies.filter(matchesFilters);
  els.cards.replaceChildren(...shown.map(buildCard));
  els.empty.hidden = shown.length !== 0;
  els.resultCount.textContent = `Showing ${shown.length} of ${doc.trophies.length} trophies · ${earned.size} earned overall`;
}

function wireControls() {
  for (const input of [els.search, els.gradeFilter, els.spoilerToggle, els.hideEarned]) {
    input.addEventListener('input', renderCards);
    input.addEventListener('change', renderCards);
  }
  document.getElementById('export-btn').addEventListener('click', () => {
    downloadText('leonida-trophy-progress.json', exportText(earned));
    els.ioNote.textContent = `Exported ${earned.size} earned trophies to leonida-trophy-progress.json.`;
  });
  document.getElementById('import-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = parseImport(await file.text());
      const known = new Set(doc.trophies.map((t) => t.id));
      earned = new Set([...imported].filter((id) => known.has(id)));
      saveEarned(earned);
      renderProgress();
      renderCards();
      els.ioNote.textContent = `Imported progress: ${earned.size} trophies marked earned.`;
    } catch {
      els.ioNote.textContent = 'That file could not be read as a progress export. Nothing was changed.';
    }
    event.target.value = '';
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    earned = new Set();
    openDetails.clear();
    clearEarned();
    renderProgress();
    renderCards();
    els.ioNote.textContent = 'Tracker reset: no trophies marked earned.';
  });
}

async function init() {
  const response = await fetch('data/trophies.json');
  doc = await response.json();
  earned = new Set([...earned].filter((id) => doc.trophies.some((t) => t.id === id)));
  renderRoadmap();
  renderChips();
  renderProgress();
  wireControls();
  renderCards();
}

init();
