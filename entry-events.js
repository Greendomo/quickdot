// QuickDot entry list interaction handlers. Loaded before app-events.js.

function handleMainClick(event) {
  if (shouldIgnoreClickAfterSwipe(event)) return;

  if (state.dragSort?.didDrag) {
    event.preventDefault();
    event.stopPropagation();
    state.dragSort = null;
    return;
  }

  if (event.target.closest(".empty-action")) {
    closeOpenSwipeRows();
    openEntryDialog();
    return;
  }

  if (closeSwipeRowOnContentClick(event)) return;
  if (handleDateCardExpandClick(event)) return;
  if (handleDateNavigationClick(event)) return;
  if (handleSubitemActionClick(event)) return;
  if (handleEntryItemClick(event)) return;

  closeOpenSwipeRows(event.target.closest(".entry-item"));
}

function handleDateCardExpandClick(event) {
  const moreButton = event.target.closest("[data-expand-date]");
  if (!moreButton) return false;

  closeOpenSwipeRows();
  const date = moreButton.dataset.expandDate;
  if (state.expandedDateCards.has(date)) {
    state.expandedDateCards.delete(date);
  } else {
    state.expandedDateCards.add(date);
  }
  render();
  return true;
}

function handleSubitemActionClick(event) {
  const subitemButton = event.target.closest("[data-subitem-action]");
  if (!subitemButton) return false;

  const item = event.target.closest("[data-id]");
  if (!item) return true;

  if (subitemButton.dataset.subitemAction === "expand") {
    toggleSubitemPanel(item.dataset.id);
    return true;
  }

  const subitemId = subitemButton.closest("[data-subitem-id]")?.dataset.subitemId;
  if (subitemButton.dataset.subitemAction === "toggle") toggleSubitem(item.dataset.id, subitemId);
  if (subitemButton.dataset.subitemAction === "delete") openDeleteDialog(item.dataset.id, subitemId);
  return true;
}

function handleEntryItemClick(event) {
  const item = event.target.closest("[data-id]");
  if (!item) return false;

  if (event.target.closest(".entry-symbol")) {
    closeOpenSwipeRows(item);
    toggleDone(item.dataset.id);
    return true;
  }

  if (event.target.closest(".entry-menu-button")) {
    openEntryActionsDialog(item.dataset.id);
    return true;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return false;

  closeOpenSwipeRows();
  const action = actionButton.dataset.action;
  if (action === "edit") openEditDialog(item.dataset.id);
  if (action === "subitem") openSubitemDialog(item.dataset.id);
  if (action === "priority") togglePriority(item.dataset.id);
  if (action === "copy") openCopyDialog(item.dataset.id);
  if (action === "migrate") openMigrationDialog(item.dataset.id);
  if (action === "delete") openDeleteDialog(item.dataset.id);
  return true;
}
