// QuickDot log view rendering module. Loaded by index.html.
function renderEntries() {
  const entries = filteredEntries();
  els.entryList.replaceChildren();
  els.entryList.classList.toggle("sort-mode", state.sortMode);
  els.emptyState.classList.toggle("visible", entries.length === 0);
  els.visibleCount.textContent = t("entriesCount", { count: entries.length });

  entries.forEach((entry) => {
    els.entryList.append(makeEntryNode(entry));
  });
}

function renderWeeklyLog() {
  const weekStart = startOfWeek(parseDateKey(state.selectedDate));
  const entries = filteredWeeklyEntries();
  els.weeklyList.replaceChildren();
  els.weeklyEmpty.classList.toggle("visible", entries.length === 0);
  els.weeklyCount.textContent = t("entriesCount", { count: entries.length });

  for (let offset = 0; offset < 7; offset += 1) {
    const dateObject = addDays(weekStart, offset);
    const date = toDateKey(dateObject);
    const items = entries.filter((entry) => entry.date === date);
    els.weeklyList.append(makeDateCard(dateObject, items));
  }

  renderMonthIndexList(els.weekMonthIndex, els.weekMonthEntryCount);
}

function renderMonthlyLog() {
  const monthKey = toMonthKey(state.calendarMonth);
  const entries = state.entries
    .filter((entry) => entry.date.startsWith(monthKey))
    .filter(entryMatchesActiveControls)
    .sort((a, b) => a.date.localeCompare(b.date) || compareEntriesForDisplay(a, b));

  els.monthlyList.replaceChildren();
  els.monthlyEmpty.classList.toggle("visible", entries.length === 0);
  els.monthlyCount.textContent = t("entriesCount", { count: entries.length });

  groupEntriesBy(entries, (entry) => entry.date).forEach((items, date) => {
    els.monthlyList.append(makeDateCard(parseDateKey(date), items));
  });

  const taskEntries = getOpenTaskEntries(entries);
  renderCompactEntries(
    els.monthlyTasks,
    taskEntries,
    t("noMonthTasks"),
  );
  els.monthlyTaskCount.textContent = t("entriesCount", { count: taskEntries.length });

  renderCompactEntries(
    els.monthlyImportant,
    entries.filter((entry) => entry.important),
    t("noMonthImportant"),
  );
  const importantEntries = entries.filter((entry) => entry.important);
  els.monthlyImportantCount.textContent = t("entriesCount", { count: importantEntries.length });
}

function makeDateCard(dateObject, items) {
  const date = toDateKey(dateObject);
  const group = document.createElement("li");
  group.className = "date-group";
  group.classList.toggle("active-day", date === toDateKey(new Date()));

  const heading = document.createElement("div");
  heading.className = "group-heading";
  const headingStrong = document.createElement("strong");
  headingStrong.textContent = formatDateCardTitle(dateObject);
  const headingSpan = document.createElement("span");
  headingSpan.textContent = makeEntryDots(items);
  heading.append(headingStrong, headingSpan);

  const list = document.createElement("ul");
  list.className = "entry-list";
  const isExpanded = state.expandedDateCards.has(date);
  const visibleItems = isExpanded ? items : items.slice(0, 2);
  visibleItems.forEach((entry) => list.append(makeEntryNode(entry)));
  if (items.length > 2) {
    const item = document.createElement("li");
    const more = document.createElement("button");
    item.className = "more-count";
    more.type = "button";
    more.dataset.expandDate = date;
    more.textContent = isExpanded ? (state.language === "en" ? "SHOW LESS" : state.language === "zh-Hans" ? "收合" : "收合") : `+ ${items.length - 2} MORE`;
    item.append(more);
    list.append(item);
  }

  group.append(heading, list);
  return group;
}

function formatDateCardTitle(dateObject) {
  const weekday = dateObject.toLocaleDateString(getLanguageLocale(), { weekday: "short" });
  return `${weekday} ${dateObject.getDate()}`;
}

function renderFutureLog() {
  const futureAnchor = new Date();
  const futureStartKey = toMonthKey(addMonths(startOfMonth(futureAnchor), 1));
  const entries = state.entries
    .filter((entry) => toMonthKey(parseDateKey(entry.date)) >= futureStartKey)
    .filter(entryMatchesActiveControls)
    .sort((a, b) => a.date.localeCompare(b.date) || compareEntriesForDisplay(a, b));

  els.futureLog.replaceChildren();
  els.futureEmpty.classList.remove("visible");
  els.futureCount.textContent = t("entriesCount", { count: entries.length });

  const months = getFutureLogMonths(entries, futureAnchor);
  const grouped = groupEntriesBy(entries, (entry) => toMonthKey(parseDateKey(entry.date)));

  months.forEach((month) => {
    const items = grouped.get(month) || [];
    const group = document.createElement("section");
    group.className = "future-month";

    const heading = document.createElement("div");
    heading.className = "group-heading";
    const headingStrong = document.createElement("strong");
    headingStrong.textContent = parseMonthKey(month).toLocaleDateString(getLanguageLocale(), { month: "long" });
    heading.append(headingStrong);

    const list = document.createElement("ul");
    list.className = "entry-list";
    items.forEach((entry) => list.append(makeEntryNode(entry)));

    group.append(heading, list);
    els.futureLog.append(group);
  });

  const nextMonthKey = toMonthKey(addMonths(startOfMonth(new Date()), 1));
  const nextMonthEntries = entries.filter((entry) => entry.date.startsWith(nextMonthKey));
  renderCompactEntries(els.nextMonthList, nextMonthEntries, t("noNextMonth"));
  els.nextMonthCount.textContent = t("entriesCount", { count: nextMonthEntries.length });

  const futureTasks = getOpenTaskEntries(entries);
  renderCompactEntries(els.futureTasks, futureTasks, t("noFutureTasks"));
  els.futureTaskCount.textContent = t("entriesCount", { count: futureTasks.length });
}

function getOpenTaskEntries(entries) {
  return entries.filter((entry) => entry.type === "task" && !entry.done && !entry.migrated);
}

function getFutureLogMonths(entries, anchorDate = new Date(), minimumMonthCount = 6) {
  const futureStart = addMonths(startOfMonth(anchorDate), 1);
  const futureStartKey = toMonthKey(futureStart);
  const baseMonths = Array.from({ length: minimumMonthCount }, (_, index) => toMonthKey(addMonths(futureStart, index)));
  const dataMonths = entries
    .map((entry) => toMonthKey(parseDateKey(entry.date)))
    .filter((month) => month >= futureStartKey);
  return Array.from(new Set([...baseMonths, ...dataMonths])).sort();
}

function makeEntryDots(items) {
  if (items.length === 0) return "•";
  return Array.from({ length: Math.min(items.length, 3) }, (_, index) => (index < 2 ? "●" : "○")).join(" ");
}

function renderMonthIndex() {
  renderMonthIndexList(els.monthIndex, els.monthEntryCount);
}

function renderMonthIndexList(container, countElement) {
  const monthStart = startOfMonth(state.calendarMonth);
  const monthKey = toMonthKey(monthStart);
  const grouped = new Map();

  state.entries
    .filter((entry) => entry.date.startsWith(monthKey))
    .forEach((entry) => {
      grouped.set(entry.date, (grouped.get(entry.date) || 0) + 1);
    });

  container.replaceChildren();
  countElement.textContent = t("entriesCount", { count: Array.from(grouped.values()).reduce((sum, count) => sum + count, 0) });

  if (grouped.size === 0) {
    container.append(makeEmptyCompactItem(t("noMonthEntries")));
    return;
  }

  Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 10)
    .forEach(([date, count]) => {
      const li = document.createElement("li");
      li.className = "compact-item";

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.date = date;
      button.textContent = formatShortDate(parseDateKey(date));

      const meta = document.createElement("span");
      meta.className = "compact-meta";
      meta.textContent = t("entriesCount", { count });

      li.append(button, meta);
      container.append(li);
    });
}
