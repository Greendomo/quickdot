// QuickDot entry drag sorting. Loaded by index.html before entries.js.
function startDragHold(event) {
  if (!canDragSort()) return;
  if (event.button !== undefined && event.button !== 0) return;
  if (event.target.closest("button, input, select, textarea, a, .subitem-list")) return;

  const item = event.target.closest(".entry-item");
  if (!item || !els.entryList.contains(item)) return;

  const pointerId = event.pointerId;
  state.dragSort = {
    item,
    pointerId,
    startX: event.clientX,
    startY: event.clientY,
    dragging: false,
    didDrag: false,
    timer: window.setTimeout(() => beginDragSort(pointerId), 450),
  };

  item.classList.add("drag-armed");
  item.setPointerCapture?.(pointerId);
}

function beginDragSort(pointerId) {
  if (!state.dragSort || state.dragSort.pointerId !== pointerId) return;
  clearDragTextSelection();
  state.dragSort.dragging = true;
  state.dragSort.didDrag = true;
  state.dragSort.item.classList.remove("drag-armed");
  state.dragSort.item.classList.add("dragging");
  els.entryList.classList.add("sorting");
}

function moveDragSort(event) {
  const drag = state.dragSort;
  if (!drag || drag.pointerId !== event.pointerId) return;

  if (!drag.dragging && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 10) {
    cancelDragSort();
    return;
  }

  if (!drag.dragging) return;
  event.preventDefault();

  const afterElement = getDragAfterElement(event.clientY);
  if (!afterElement) {
    els.entryList.append(drag.item);
  } else {
    els.entryList.insertBefore(drag.item, afterElement);
  }
}

function finishDragSort(event) {
  const drag = state.dragSort;
  if (!drag || drag.pointerId !== event.pointerId) return;

  window.clearTimeout(drag.timer);
  drag.item.classList.remove("drag-armed");

  if (drag.dragging) {
    clearDragTextSelection();
    drag.item.classList.remove("dragging");
    els.entryList.classList.remove("sorting");
    persistVisibleEntryOrder();
    saveEntries();
    render();
    state.dragSort = { didDrag: true };
    window.setTimeout(() => {
      if (state.dragSort?.didDrag) state.dragSort = null;
    }, 0);
    return;
  }

  state.dragSort = null;
}

function cancelDragSort() {
  if (!state.dragSort) return;
  if (state.dragSort.didDrag) return;
  window.clearTimeout(state.dragSort.timer);
  state.dragSort.item?.classList.remove("drag-armed", "dragging");
  els.entryList.classList.remove("sorting");
  clearDragTextSelection();
  state.dragSort = null;
}

function blockDragNativeSelection(event) {
  const drag = state.dragSort;
  if (!drag?.item) return;
  if (!drag.dragging && !drag.item.classList.contains("drag-armed")) return;
  if (!drag.item.contains(event.target)) return;
  event.preventDefault();
  clearDragTextSelection();
}

function clearDragTextSelection() {
  const selection = document.getSelection?.();
  if (selection?.rangeCount) selection.removeAllRanges();
}

function canDragSort() {
  return state.view === "daily" && state.search === "";
}

function getDragAfterElement(y) {
  const items = Array.from(els.entryList.querySelectorAll(".entry-item:not(.dragging)"));
  return items.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null },
  ).element;
}
