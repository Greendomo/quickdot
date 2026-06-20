// QuickDot dates module. Loaded by index.html.
const dateFormatterCache = new Map();

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(date) {
  return toDateKey(date).slice(0, 7);
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseMonthKey(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function getDefaultEntryDate() {
  if (state.view === "future") {
    const futureStart = addMonths(startOfMonth(new Date()), 1);
    const selectedMonth = toMonthKey(parseDateKey(state.selectedDate));
    return selectedMonth >= toMonthKey(futureStart) ? state.selectedDate : toDateKey(futureStart);
  }

  if (state.view === "monthly" || state.view === "weekly") {
    return state.selectedDate.startsWith(toMonthKey(state.calendarMonth))
      ? state.selectedDate
      : toDateKey(state.calendarMonth);
  }

  return state.selectedDate;
}

function getSuggestedMigrationDate(entry) {
  const todayKey = toDateKey(new Date());
  const nextDayKey = toDateKey(addDays(parseDateKey(entry.date), 1));
  return nextDayKey > todayKey ? nextDayKey : todayKey;
}

function getSuggestedCopyDate(entry) {
  return getSuggestedMigrationDate(entry);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfWeek(date) {
  return addDays(startOfWeek(date), 6);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getDateFormatter(options) {
  const locale = getLanguageLocale();
  const key = `${locale}:${JSON.stringify(options)}`;
  if (!dateFormatterCache.has(key)) {
    dateFormatterCache.set(key, new Intl.DateTimeFormat(locale, options));
  }
  return dateFormatterCache.get(key);
}

function formatDateWithOptions(date, options) {
  return getDateFormatter(options).format(date);
}

function formatDateLong(date) {
  return formatDateWithOptions(date, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatMonth(date) {
  return formatDateWithOptions(date, {
    year: "numeric",
    month: "long",
  });
}

function formatWeekRange(date) {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function formatShortDate(date) {
  return formatDateWithOptions(date, {
    month: "short",
    day: "numeric",
  });
}

function formatTime(value) {
  return formatDateWithOptions(new Date(value), {
    hour: "2-digit",
    minute: "2-digit",
  });
}
