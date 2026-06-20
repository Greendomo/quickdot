// QuickDot symbol settings panel module. Loaded before app-events.js.
function openSymbolSettings() {
  closeSyncDialog();
  state.collapseState.symbols = true;
  saveCollapseState();
  renderCollapseState();
  requestAnimationFrame(() => els.symbolSheetClose?.focus());
}

function closeSymbolSettings() {
  state.collapseState.symbols = false;
  closeSymbolEditor();
  saveCollapseState();
  renderCollapseState();
}

function renderSymbolSettings(options = {}) {
  if (!els.symbolSettingsList) return;
  const footer = els.symbolSheet?.querySelector(".symbol-footer");
  const previousScrollTop = footer?.scrollTop || 0;
  const definitions = getSymbolDefinitions();
  els.symbolSettingsList.replaceChildren(...definitions.map(makeSymbolSettingsRow));
  renderSymbolEditorState();
  if (options.preserveScroll && footer) {
    requestAnimationFrame(() => {
      footer.scrollTop = previousScrollTop;
    });
  }
}

function makeSymbolSettingsRow(definition) {
  const row = document.createElement("button");
  row.className = "symbol-editor symbol-settings-row";
  row.type = "button";
  row.dataset.symbolEdit = definition.id;

  const glyph = document.createElement("span");
  glyph.className = "symbol-glyph";
  glyph.textContent = definition.symbol;

  const copy = document.createElement("span");
  copy.className = "symbol-setting-copy";

  const label = document.createElement("span");
  label.className = "symbol-meaning";
  label.textContent = definition.label;

  const meta = document.createElement("span");
  meta.className = "symbol-setting-meta";
  const metaPieces = [];
  if (definition.description) metaPieces.push(definition.description);
  if (definition.role === "entry" && definition.quickAdd) metaPieces.push(t("symbolQuickAddShort"));
  if (definition.builtIn) metaPieces.push(t("symbolBuiltin"));
  meta.textContent = metaPieces.join(" · ");

  const edit = document.createElement("span");
  edit.className = "symbol-setting-edit";
  edit.textContent = "›";
  edit.setAttribute("aria-hidden", "true");

  copy.append(label, meta);
  row.append(glyph, copy, edit);
  return row;
}

function renderSymbolEditorState() {
  if (!els.symbolEditorForm) return;
  const definition = state.pendingSymbolIsNew ? state.pendingSymbolDraft : state.pendingSymbolId ? getSymbolDefinition(state.pendingSymbolId) : null;
  els.symbolEditorForm.hidden = !definition;
  if (!definition) return;

  els.symbolEditorId.value = definition.id;
  els.symbolGlyphInput.value = definition.symbol;
  els.symbolGlyphInput.disabled = definition.builtIn;
  els.symbolNameInput.value = definition.label;
  els.symbolDescriptionInput.value = definition.description || "";
  els.symbolQuickAddInput.checked = definition.role === "entry" && definition.quickAdd !== false;
  els.symbolQuickAddInput.disabled = definition.role !== "entry";
  els.symbolDeleteButton.hidden = definition.builtIn;
  els.symbolEditorError.textContent = "";
}

function revealSymbolEditor() {
  requestAnimationFrame(() => {
    const form = els.symbolEditorForm;
    const footer = els.symbolSheet?.querySelector(".symbol-footer");
    if (!form || !footer || form.hidden) return;

    const footerRect = footer.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    const bottomOverflow = formRect.bottom - footerRect.bottom + 16;
    const topOverflow = footerRect.top - formRect.top + 16;

    if (bottomOverflow > 0) {
      footer.scrollTop += bottomOverflow;
    } else if (topOverflow > 0) {
      footer.scrollTop -= topOverflow;
    }
  });
}

function openSymbolEditor(id) {
  state.pendingSymbolIsNew = false;
  state.pendingSymbolDraft = null;
  state.pendingSymbolId = id;
  renderSymbolSettings({ preserveScroll: true });
  revealSymbolEditor();
}

function closeSymbolEditor() {
  state.pendingSymbolId = null;
  state.pendingSymbolIsNew = false;
  state.pendingSymbolDraft = null;
  if (els.symbolEditorForm) els.symbolEditorForm.hidden = true;
  renderSymbolSettings();
}

function addCustomSymbolDefinition() {
  const definition = {
    id: makeCustomSymbolId(),
    symbol: "★",
    label: t("symbolNewLabel"),
    description: "",
    role: "entry",
    type: "note",
    builtIn: false,
    enabled: true,
    quickAdd: true,
  };
  state.pendingSymbolIsNew = true;
  state.pendingSymbolDraft = definition;
  state.pendingSymbolId = definition.id;
  renderSymbolSettings();
  revealSymbolEditor();
  requestAnimationFrame(() => els.symbolGlyphInput?.focus({ preventScroll: true }));
}

function saveSymbolEditor(event) {
  event.preventDefault();
  const id = els.symbolEditorId.value;
  const existing = state.pendingSymbolIsNew ? state.pendingSymbolDraft : getSymbolDefinition(id);
  if (!existing) return;

  const symbol = els.symbolGlyphInput.value.trim().slice(0, 2);
  const label = els.symbolNameInput.value.trim();
  if (!symbol || !label) {
    els.symbolEditorError.textContent = t("symbolRequired");
    return;
  }

  const duplicate = getSymbolDefinitions().find((definition) => definition.id !== id && definition.symbol === symbol);
  if (duplicate) {
    els.symbolEditorError.textContent = t("symbolDuplicate");
    return;
  }

  const savedDefinition = normalizeSymbolDefinition({
    ...existing,
    symbol: existing.builtIn ? existing.symbol : symbol,
    label,
    description: els.symbolDescriptionInput.value,
    quickAdd: existing.role === "entry" ? els.symbolQuickAddInput.checked : false,
  });
  if (!savedDefinition) return;

  if (state.pendingSymbolIsNew && isPlaceholderCustomSymbol(savedDefinition)) {
    els.symbolEditorError.textContent = t("symbolCustomizeRequired");
    return;
  }

  if (state.pendingSymbolIsNew) {
    state.symbolDefinitions = [...getSymbolDefinitions(), savedDefinition];
  } else {
    state.symbolDefinitions = getSymbolDefinitions().map((definition) => (
      definition.id === id ? savedDefinition : definition
    ));
  }

  state.pendingSymbolId = null;
  state.pendingSymbolIsNew = false;
  state.pendingSymbolDraft = null;
  saveSymbolDefinitions();
  render();
}

function deleteCustomSymbolDefinition() {
  const id = els.symbolEditorId.value;
  const definition = getSymbolDefinition(id);
  if (!definition || definition.builtIn) return;
  const deletedAt = new Date().toISOString();
  state.deletedSymbolDefinitions = normalizeDeletedSymbolDefinitions([
    ...state.deletedSymbolDefinitions,
    { id, deletedAt },
  ]);
  state.symbolDefinitions = getSymbolDefinitions().filter((item) => item.id !== id);
  state.entries.forEach((entry) => {
    if (entry.symbolId === id) {
      entry.symbolId = entry.type || "note";
      entry.updatedAt = deletedAt;
      queueEntryUpsert(entry);
    }
  });
  state.pendingSymbolId = null;
  state.pendingSymbolIsNew = false;
  state.pendingSymbolDraft = null;
  saveSymbolDefinitions();
  saveEntries();
  render();
}

function resetSymbolsToDefault() {
  if (!confirm(t("symbolResetConfirm"))) return;
  resetSymbolDefinitions();
  render();
}
