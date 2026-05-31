// QuickDot entry rendering module. Loaded by index.html.
function filteredEntries() {
  return state.entries
    .filter((entry) => entry.date === state.selectedDate)
    .filter(entryMatchesActiveControls)
    .sort(compareDailyEntriesForDisplay);
}

function filteredWeeklyEntries() {
  const weekStartKey = toDateKey(startOfWeek(parseDateKey(state.selectedDate)));
  const weekEndKey = toDateKey(endOfWeek(parseDateKey(state.selectedDate)));
  return state.entries
    .filter((entry) => entry.date >= weekStartKey && entry.date <= weekEndKey)
    .filter(entryMatchesActiveControls)
    .sort((a, b) => a.date.localeCompare(b.date) || compareDailyEntriesForDisplay(a, b));
}

function entryMatchesActiveControls(entry) {
  if (state.search && !entryMatchesSearch(entry)) return false;
  return true;
}

function entryMatchesSearch(entry) {
  const query = state.search;
  return (
    entry.text.toLowerCase().includes(query) ||
    ensureSubitems(entry).some((subitem) => subitem.text.toLowerCase().includes(query))
  );
}

function makeEntryNode(entry) {
  const subitems = ensureSubitems(entry);
  const isSubitemExpanded = state.expandedSubitems.has(entry.id);
  const node = els.entryTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.id = entry.id;
  node.classList.toggle("done", entry.done);
  node.classList.toggle("important", entry.important);
  node.classList.toggle("migrated", entry.migrated);
  node.classList.toggle("subitems-open", isSubitemExpanded);

  const symbol = node.querySelector(".entry-symbol");
  symbol.textContent = entry.done ? "×" : entry.migrated ? "›" : typeSymbol[entry.type];
  symbol.title = entry.done ? t("toggleUndone") : t("toggleDone", { meaning: getMeaning("done") });

  node.querySelector(".entry-text").textContent = entry.text;
  node.querySelector(".entry-meta").replaceChildren(...buildMeta(entry));
  const subitemToggle = node.querySelector(".subitem-toggle");
  const subitemList = node.querySelector(".subitem-list");
  if (subitems.length) {
    subitemToggle.hidden = false;
    subitemToggle.textContent = isSubitemExpanded
      ? t("subitemCollapse", { count: subitems.length })
      : t("subitemCount", { count: subitems.length });
    subitemToggle.setAttribute("aria-expanded", String(isSubitemExpanded));
  } else {
    state.expandedSubitems.delete(entry.id);
  }

  if (isSubitemExpanded) {
    subitems.forEach((subitem) => subitemList.append(makeSubitemNode(subitem)));
  }
  return node;
}

function makeSubitemNode(subitem) {
  const node = document.createElement("li");
  node.className = "subitem";
  node.dataset.subitemId = subitem.id;
  node.classList.toggle("done", subitem.done);

  const toggle = document.createElement("button");
  toggle.className = "subitem-symbol";
  toggle.type = "button";
  toggle.dataset.subitemAction = "toggle";
  toggle.ariaLabel = subitem.done ? t("subitemUndone") : t("subitemDone");
  toggle.textContent = subitem.done ? "×" : "○";

  const text = document.createElement("span");
  text.className = "subitem-text";
  text.textContent = subitem.text;

  const remove = document.createElement("button");
  remove.className = "subitem-delete";
  remove.type = "button";
  remove.dataset.subitemAction = "delete";
  remove.ariaLabel = t("subitemDelete");
  remove.textContent = "×";

  node.append(toggle, text, remove);
  return node;
}

function renderCompactEntries(container, entries, emptyText) {
  container.replaceChildren();

  if (entries.length === 0) {
    container.append(makeEmptyCompactItem(emptyText));
    return;
  }

  entries.slice(0, 10).forEach((entry) => {
    const li = document.createElement("li");
    li.className = "compact-item";

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.date = entry.date;
    button.textContent = entry.text;

    const meta = document.createElement("span");
    meta.className = "compact-meta";
    meta.textContent = `${formatShortDate(parseDateKey(entry.date))} · ${getTypeLabel(entry.type)}${entry.important ? ` · ${getMeaning("important")}` : ""}`;

    li.append(button, meta);
    container.append(li);
  });
}

function groupEntriesBy(entries, getKey) {
  const grouped = new Map();
  entries.forEach((entry) => {
    const key = getKey(entry);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  });
  return grouped;
}

function getMeaning(key) {
  return state.symbolMeanings[key] || getDefaultSymbolMeanings()[key] || key;
}

function getTypeLabel(type) {
  return getMeaning(type);
}

function compareEntriesForDisplay(a, b) {
  const aOrder = getSortOrderValue(a);
  const bOrder = getSortOrderValue(b);
  if (aOrder !== bOrder) return aOrder - bOrder;
  return Number(b.important) - Number(a.important) || b.createdAt.localeCompare(a.createdAt);
}

function compareDailyEntriesForDisplay(a, b) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done);
  return compareEntriesForDisplay(a, b);
}

function getSortOrderValue(entry) {
  return Number.isFinite(entry.sortOrder) ? entry.sortOrder : Number.MAX_SAFE_INTEGER;
}

function getTopSortOrder(date) {
  const orders = state.entries
    .filter((entry) => entry.date === date && Number.isFinite(entry.sortOrder))
    .map((entry) => entry.sortOrder);
  return orders.length ? Math.min(...orders) - 1 : 0;
}

function ensureSubitems(entry) {
  if (!Array.isArray(entry.subitems)) entry.subitems = [];
  return entry.subitems;
}

function getYesterdayOpenEntries() {
  const yesterday = toDateKey(addDays(new Date(), -1));
  return state.entries.filter(
    (entry) => entry.date === yesterday && !entry.done && !entry.migrated,
  );
}

function buildMeta(entry) {
  const subitems = ensureSubitems(entry);
  const pieces =
    state.view === "daily" || state.view === "weekly"
      ? []
      : [getTypeLabel(entry.type), formatShortDate(parseDateKey(entry.date)), formatTime(entry.createdAt)];
  if (subitems.length > 0) {
    pieces.push(t("subitemsProgress", { done: subitems.filter((item) => item.done).length, total: subitems.length }));
  }
  if (entry.migrated && entry.migrationTarget) {
    pieces.push(t("migratedTo", { meaning: getMeaning("migrated"), date: formatShortDate(parseDateKey(entry.migrationTarget)) }));
  } else if (entry.migrated) {
    pieces.push(t("migrated", { meaning: getMeaning("migrated") }));
  }
  if (entry.copiedFrom) pieces.push(t("copiedFrom", { date: formatShortDate(parseDateKey(entry.copiedFrom)) }));
  if (entry.migratedFrom) pieces.push(t("migratedFrom", { date: formatShortDate(parseDateKey(entry.migratedFrom)) }));
  return pieces.map((piece) => {
    const span = document.createElement("span");
    span.textContent = piece;
    return span;
  });
}

function makeEmptyCompactItem(text) {
  const li = document.createElement("li");
  li.className = "compact-item";
  const span = document.createElement("span");
  span.className = "compact-meta";
  span.textContent = text;
  li.append(span);
  return li;
}
