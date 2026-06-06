// QuickDot calendar rendering module. Loaded by index.html before render.js.
function renderCalendar() {
  els.monthTitle.textContent = formatMonth(state.calendarMonth);
  els.calendar.replaceChildren();

  getWeekdayLabels().forEach((label) => {
    const weekday = document.createElement("div");
    weekday.className = "weekday";
    weekday.textContent = label;
    els.calendar.append(weekday);
  });

  const firstDay = startOfMonth(state.calendarMonth);
  const offset = firstDay.getDay();
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  for (let i = 0; i < offset; i += 1) {
    els.calendar.append(document.createElement("span"));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), day);
    const dateKey = toDateKey(date);
    const button = document.createElement("button");
    button.className = "day-button";
    button.type = "button";
    button.dataset.date = dateKey;
    button.textContent = String(day);
    button.ariaLabel = formatDateLong(date);
    button.classList.toggle("active", dateKey === state.selectedDate);
    button.classList.toggle("today", dateKey === todayKey);
    button.classList.toggle("has-items", state.entries.some((entry) => entry.date === dateKey));
    els.calendar.append(button);
  }
}
