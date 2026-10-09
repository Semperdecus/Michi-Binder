const DEFAULT_PAGE_COUNT = 2;
const ID_RADIX = 36;
const CROP_CENTER = 0.5;

const App = {
  state: {
    settings: { ...DEFAULT_SETTINGS },
    artworks: [],
    images: new Map(),
    cards: [],
    cardUrls: new Map(),
    covers: [],
    binders: [],
    binder: null,
    pageCount: DEFAULT_PAGE_COUNT,
    view: 'binder',
    exportChecks: [],
  },

  async init() {
    await Store.open();
    const savedSettings = await Store.loadMeta(SETTINGS_STORAGE_KEY);
    App.state.settings = { ...DEFAULT_SETTINGS, ...savedSettings };
    App.state.binders = await Binders.ensureDefault();
    await Covers.loadFonts();
    Editor.init(App.saveArtwork);
    SettingsPanel.init(App.saveSettings);
    Binder.init(document.getElementById('binder'), {
      onPlace: App.place,
      onPocketClick: (pocket, card) => CardPicker.open(
        pocket,
        card,
        App.state.settings,
        card ? App.state.cardUrls.get(card.id) : null,
        CoverActions.atPocket(pocket),
      ),
      onMoveCard: App.moveCard,
      onEditArtwork: App.edit,
      onAddPage: App.addPage,
      onRemovePage: App.removePage,
      onEditCover: App.editCover,
      onPlaceCover: CoverActions.place,
    });
    CardPicker.init({ place: App.placeCard, remove: App.removeCard });
    CoverEditor.init(CoverActions);
    Sheets.init(document.getElementById('sheets'));
    Library.init(document.getElementById('library'), {
      edit: App.edit,
      remove: App.remove,
      place: App.place,
      setPrint: App.setPrint,
      setAllPrint: App.setAllPrint,
      setAllCoverPrint: CoverActions.setAllPrint,
      editCover: App.editCover,
      removeCover: CoverActions.remove,
      placeCover: CoverActions.place,
      setCoverPrint: CoverActions.setPrint,
    });
    BindersPanel.init({
      current: () => ({ binders: App.state.binders, currentId: App.state.binder.id }),
      open: App.openBinder,
      create: App.createBinder,
      rename: App.renameBinder,
      remove: App.deleteBinder,
      import: App.importBinder,
    });
    App.bindControls();
    await App.openBinder(await Store.loadMeta(CURRENT_BINDER_KEY));
  },

  async openBinder(id) {
    const binder = App.state.binders.find((candidate) => candidate.id === id) || App.state.binders[0];
    const { artworks, cards, covers } = await Binders.contents(binder.id);
    App.state.cardUrls.forEach((url) => URL.revokeObjectURL(url));
    App.state.images = new Map();
    App.state.cardUrls = new Map();
    for (const artwork of artworks) {
      App.state.images.set(artwork.id, await createImageBitmap(artwork.blob));
    }
    cards.forEach((card) => App.state.cardUrls.set(card.id, URL.createObjectURL(card.blob)));
    App.state.artworks = artworks.sort((a, b) => a.createdAt - b.createdAt);
    App.state.cards = cards;
    App.state.covers = covers.sort((a, b) => a.createdAt - b.createdAt);
    App.state.binder = binder;
    App.state.pageCount = binder.pageCount;
    App.state.exportChecks = [];
    await Store.saveMeta(CURRENT_BINDER_KEY, binder.id);
    BindersPanel.renderSelect(App.state.binders, binder.id);
    App.render();
  },

  async refreshBinders() {
    App.state.binders = await Binders.loadAll();
    BindersPanel.renderSelect(App.state.binders, App.state.binder.id);
  },

  async createBinder() {
    const name = window.prompt('Name for the new binder:', `Binder ${App.state.binders.length + 1}`);
    if (!name?.trim()) {
      return;
    }
    const binder = await Binders.create(name.trim());
    await App.refreshBinders();
    await App.openBinder(binder.id);
  },

  async renameBinder(id) {
    const binder = App.state.binders.find((candidate) => candidate.id === id);
    const name = window.prompt('New name:', binder.name);
    if (!name?.trim()) {
      return;
    }
    binder.name = name.trim();
    await Store.saveBinder(binder);
    await App.refreshBinders();
  },

  async deleteBinder(id) {
    const binder = App.state.binders.find((candidate) => candidate.id === id);
    if (!window.confirm(`Delete binder "${binder.name}" with all its artwork and cards? Export it first if you want a backup.`)) {
      return;
    }
    await Binders.remove(id);
    App.state.binders = await Binders.ensureDefault();
    if (id === App.state.binder.id) {
      await App.openBinder(App.state.binders[0].id);
    } else {
      await App.refreshBinders();
    }
  },

  async importBinder(file) {
    const binder = await Binders.importFile(file);
    await App.refreshBinders();
    await App.openBinder(binder.id);
  },

  bindControls() {
    document.getElementById('upload').addEventListener('change', (event) => {
      App.upload([...event.target.files]);
      event.target.value = '';
    });
    document.getElementById('open-settings').addEventListener('click', () => SettingsPanel.open(App.state.settings));
    document.getElementById('export').addEventListener('click', App.exportPdf);
    document.querySelectorAll('[data-view]').forEach((tab) => {
      tab.addEventListener('click', () => {
        App.state.view = tab.dataset.view;
        App.render();
      });
    });
  },

  newId() {
    return `${Date.now().toString(ID_RADIX)}-${Math.random().toString(ID_RADIX).slice(2)}`;
  },

  async upload(files) {
    let last = null;
    for (const file of files.filter((candidate) => candidate.type.startsWith('image/'))) {
      const artwork = {
        id: App.newId(),
        binderId: App.state.binder.id,
        name: file.name.replace(/\.[^.]+$/, ''),
        blob: file,
        createdAt: Date.now(),
        cols: 1,
        rows: 1,
        joins: Cutter.defaultJoins(1, 1),
        crop: { zoom: 1, centerX: CROP_CENTER, centerY: CROP_CENTER },
        frame: 'none',
        frameMode: 'outer',
        seamMode: 'window',
        placement: null,
      };
      App.state.images.set(artwork.id, await createImageBitmap(file));
      App.state.artworks.push(artwork);
      await Store.saveArtwork(artwork);
      last = artwork;
    }
    App.render();
    if (last) {
      App.edit(last.id);
    }
  },

  find(id) {
    return App.state.artworks.find((artwork) => artwork.id === id);
  },

  edit(id) {
    const artwork = App.find(id);
    Editor.open(artwork, App.state.images.get(id), App.state.settings);
  },

  freePlacement(artwork) {
    Binder.state = App.state;
    for (let page = 0; page < App.state.pageCount; page++) {
      for (let row = 0; row < BINDER_ROWS; row++) {
        for (let col = 0; col < BINDER_COLUMNS; col++) {
          const placement = { page, col, row };
          if (Binder.canPlace(artwork, placement)) {
            return placement;
          }
        }
      }
    }
    return null;
  },

  async saveArtwork(draft) {
    const index = App.state.artworks.findIndex((artwork) => artwork.id === draft.id);
    App.state.artworks[index] = draft;
    Binder.state = App.state;
    if (!draft.placement || !Binder.canPlace(draft, draft.placement)) {
      draft.placement = App.freePlacement(draft);
    }
    await Store.saveArtwork(draft);
    App.render();
  },

  async remove(id) {
    const artwork = App.find(id);
    if (!window.confirm(`Delete "${artwork.name}"?`)) {
      return;
    }
    App.state.artworks = App.state.artworks.filter((candidate) => candidate.id !== id);
    App.state.images.delete(id);
    await Store.deleteArtwork(id);
    App.render();
  },

  async setPrint(id, print) {
    const artwork = App.find(id);
    artwork.print = print;
    await Store.saveArtwork(artwork);
    App.render();
  },

  async setAllPrint(print) {
    for (const artwork of App.state.artworks) {
      artwork.print = print;
      await Store.saveArtwork(artwork);
    }
    App.render();
  },

  async place(id, placement) {
    const artwork = App.find(id);
    artwork.placement = placement;
    await Store.saveArtwork(artwork);
    App.render();
  },

  async placeCard(pocket, card, blob) {
    await App.removeCard(pocket);
    const record = {
      id: App.newId(),
      binderId: App.state.binder.id,
      ...pocket,
      cardId: card.cardId,
      name: card.name,
      setName: card.setName,
      number: card.number,
      price: card.price ?? null,
      priceDate: Date.now(),
      blob,
    };
    App.state.cards.push(record);
    App.state.cardUrls.set(record.id, URL.createObjectURL(blob));
    await Store.saveCard(record);
    App.render();
  },

  async moveCard(card, placement) {
    const other = Binder.cardAt(App.state, placement.page, placement.col, placement.row);
    if (other === card) {
      return;
    }
    if (other) {
      Object.assign(other, { page: card.page, col: card.col, row: card.row });
      await Store.saveCard(other);
    }
    Object.assign(card, placement);
    await Store.saveCard(card);
    App.render();
  },

  async removeCard(pocket) {
    const existing = Binder.cardAt(App.state, pocket.page, pocket.col, pocket.row);
    if (!existing) {
      return;
    }
    App.state.cards = App.state.cards.filter((card) => card !== existing);
    URL.revokeObjectURL(App.state.cardUrls.get(existing.id));
    App.state.cardUrls.delete(existing.id);
    await Store.deleteCard(existing.id);
    App.render();
  },

  async setPageCount(count) {
    App.state.pageCount = count;
    App.state.binder.pageCount = count;
    await Store.saveBinder(App.state.binder);
    App.render();
  },

  async addPage() {
    await App.setPageCount(App.state.pageCount + 1);
  },

  editCover(id) {
    const cover = CoverActions.find(id);
    const card = cover.placement
      ? Binder.cardAt(App.state, cover.placement.page, cover.placement.col, cover.placement.row)
      : null;
    CardPicker.openCover(cover, card, card ? App.state.cardUrls.get(card.id) : null, App.state.settings);
  },

  pageContentsText(groups) {
    const parts = groups.filter(([items]) => items.length > 0).map(([items, noun]) => `${items.length} ${noun}`);
    return new Intl.ListFormat('en', { type: 'conjunction' }).format(parts);
  },

  async removePage(index) {
    const artworks = App.state.artworks.filter((artwork) => artwork.placement?.page === index);
    const cards = App.state.cards.filter((card) => card.page === index);
    const covers = App.state.covers.filter((cover) => cover.placement?.page === index);
    const contents = App.pageContentsText([[artworks, 'artwork(s)'], [covers, 'frame(s)'], [cards, 'card(s)']]);
    const confirmed = await ConfirmDialog.ask({
      title: `Remove page ${index + 1}?`,
      message: contents
        ? `Are you sure you want to remove this page and its ${contents}? This cannot be undone.`
        : 'Are you sure you want to remove this empty page?',
      confirmLabel: 'Remove page',
    });
    if (!confirmed) {
      return;
    }
    for (const artwork of artworks) {
      App.state.images.delete(artwork.id);
      await Store.deleteArtwork(artwork.id);
    }
    for (const card of cards) {
      URL.revokeObjectURL(App.state.cardUrls.get(card.id));
      App.state.cardUrls.delete(card.id);
      await Store.deleteCard(card.id);
    }
    App.state.artworks = App.state.artworks.filter((artwork) => !artworks.includes(artwork));
    for (const cover of covers) {
      await Store.deleteCover(cover.id);
    }
    App.state.cards = App.state.cards.filter((card) => !cards.includes(card));
    App.state.covers = App.state.covers.filter((cover) => !covers.includes(cover));
    for (const cover of App.state.covers.filter((item) => item.placement?.page > index)) {
      cover.placement.page -= 1;
      await Store.saveCover(cover);
    }
    for (const artwork of App.state.artworks.filter((item) => item.placement?.page > index)) {
      artwork.placement.page -= 1;
      await Store.saveArtwork(artwork);
    }
    for (const card of App.state.cards.filter((item) => item.page > index)) {
      card.page -= 1;
      await Store.saveCard(card);
    }
    await App.setPageCount(App.state.pageCount - 1);
  },

  async saveSettings(settings) {
    App.state.settings = settings;
    await Store.saveMeta(SETTINGS_STORAGE_KEY, settings);
    App.render();
  },

  async exportPdf() {
    const button = document.getElementById('export');
    button.disabled = true;
    button.textContent = 'Exporting...';
    try {
      App.state.exportChecks = await Exporter.export(App.state);
    } catch (error) {
      App.state.exportChecks = [{ level: CHECK_ERROR, text: `Export failed: ${error.message}` }];
    }
    button.textContent = 'Export PDF';
    App.render();
  },

  renderChecks(checks) {
    const list = document.getElementById('checks');
    const exportList = document.getElementById('export-checks');
    const toItem = (check) => {
      const item = document.createElement('li');
      item.className = `check check--${check.level}`;
      item.textContent = check.text;
      return item;
    };
    list.replaceChildren(...checks.map(toItem));
    exportList.replaceChildren(...App.state.exportChecks.map(toItem));
    const blocked = Verifier.hasErrors(checks) || !Exporter.hasPrintable(App.state);
    document.getElementById('export').disabled = blocked;
  },

  render() {
    const { state } = App;
    const plan = Exporter.plan(state);
    Library.render(state);
    document.querySelectorAll('[data-view]').forEach((tab) => {
      tab.setAttribute('aria-selected', String(tab.dataset.view === state.view));
    });
    document.getElementById('binder-view').hidden = state.view !== 'binder';
    document.getElementById('sheets-view').hidden = state.view !== 'sheets';
    if (state.view === 'binder') {
      Binder.render(state);
    } else {
      Sheets.render(state, plan);
    }
    document.getElementById('sheet-count').textContent = `${plan.sheets.length} sheet(s)`;
    App.renderChecks(Verifier.preExport(state, plan));
  },
};

App.init();
