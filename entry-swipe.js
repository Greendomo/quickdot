// QuickDot entry swipe actions. Loaded by index.html before entry-drag.js.
const ENTRY_SWIPE_START_WIDTH = 332;
const ENTRY_SWIPE_END_WIDTH = 94;
const ENTRY_SWIPE_ACTIVATE_THRESHOLD = 14;
const ENTRY_SWIPE_OPEN_THRESHOLD = 54;

function startEntrySwipe(event) {
  if (!canSwipeEntry()) return;
  if (event.button !== undefined && event.button !== 0) return;
  if (event.target.closest("button, input, select, textarea, a, .subitem-list")) return;

  const item = event.target.closest(".entry-item");
  if (!item || !els.entryList.contains(item)) return;

  state.entrySwipe = {
    item,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: getEntrySwipeOffset(item),
    active: false,
  };
}

function moveEntrySwipe(event) {
  const swipe = state.entrySwipe;
  if (!swipe || swipe.pointerId !== event.pointerId) return;

  const deltaX = event.clientX - swipe.startX;
  const deltaY = event.clientY - swipe.startY;
  if (!swipe.active) {
    if (Math.abs(deltaY) > ENTRY_SWIPE_ACTIVATE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
      cancelEntrySwipe();
      return;
    }
    if (Math.abs(deltaX) < ENTRY_SWIPE_ACTIVATE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    swipe.active = true;
    closeOpenSwipeRows(swipe.item);
    cancelDragSort();
    swipe.item.classList.add("swiping");
    swipe.item.setPointerCapture?.(swipe.pointerId);
  }

  event.preventDefault();
  setEntrySwipeOffset(swipe.item, swipe.offsetX + deltaX);
}

function finishEntrySwipe(event) {
  const swipe = state.entrySwipe;
  if (!swipe || swipe.pointerId !== event.pointerId) return;

  const item = swipe.item;
  const offset = getEntrySwipeOffset(item);
  const openedBySwipe = swipe.active && Math.abs(offset) > ENTRY_SWIPE_OPEN_THRESHOLD;
  item.classList.remove("swiping");

  if (openedBySwipe && offset > 0) {
    openSwipeRow(item, "start");
    blockClickAfterSwipe();
  } else if (openedBySwipe && offset < 0) {
    openSwipeRow(item, "end");
    blockClickAfterSwipe();
  } else {
    resetSwipeRow(item);
  }

  state.entrySwipe = null;
}

function cancelEntrySwipe() {
  if (!state.entrySwipe) return;
  state.entrySwipe.item?.classList.remove("swiping");
  state.entrySwipe = null;
}

function closeOpenSwipeRows(exceptItem = null) {
  els.entryList.querySelectorAll(".entry-item.swipe-open-start, .entry-item.swipe-open-end").forEach((item) => {
    if (item === exceptItem) return;
    resetSwipeRow(item);
  });
}

function closeSwipeRowOnContentClick(event) {
  const item = event.target.closest(".entry-item.swipe-open-start, .entry-item.swipe-open-end");
  if (!item || event.target.closest("[data-action]")) return false;
  resetSwipeRow(item);
  return true;
}

function shouldIgnoreClickAfterSwipe(event) {
  if (!state.entrySwipeBlockClick) return false;
  event.preventDefault();
  event.stopPropagation();
  window.clearTimeout(state.entrySwipeBlockClickTimer);
  state.entrySwipeBlockClick = false;
  state.entrySwipeBlockClickTimer = null;
  return true;
}

function blockClickAfterSwipe() {
  window.clearTimeout(state.entrySwipeBlockClickTimer);
  state.entrySwipeBlockClick = true;
  state.entrySwipeBlockClickTimer = window.setTimeout(() => {
    state.entrySwipeBlockClick = false;
    state.entrySwipeBlockClickTimer = null;
  }, 250);
}

function openSwipeRow(item, side) {
  const offset = side === "start" ? ENTRY_SWIPE_START_WIDTH : -ENTRY_SWIPE_END_WIDTH;
  item.classList.toggle("swipe-open-start", side === "start");
  item.classList.toggle("swipe-open-end", side === "end");
  setEntrySwipeOffset(item, offset);
}

function resetSwipeRow(item) {
  item.classList.remove("swiping", "swipe-open-start", "swipe-open-end");
  setEntrySwipeOffset(item, 0);
}

function setEntrySwipeOffset(item, offset) {
  const content = item.querySelector(".entry-swipe-content");
  if (!content) return;
  const clamped = clampSwipeOffset(offset);
  item.dataset.swipeOffset = String(clamped);
  content.style.transform = `translateX(${clamped}px)`;
}

function getEntrySwipeOffset(item) {
  return Number(item.dataset.swipeOffset || 0);
}

function clampSwipeOffset(offset) {
  return Math.max(-ENTRY_SWIPE_END_WIDTH, Math.min(ENTRY_SWIPE_START_WIDTH, offset));
}

function canSwipeEntry() {
  return state.view === "daily" && !state.search && !state.dragSort?.dragging;
}
