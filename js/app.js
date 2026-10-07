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
    pageCount: DEFAULT_PAGE_COUNT,
    view: 'binder',
    exportChecks: [],
  },

  async init() {
    await Store.open();
    const savedSettings = await Store.loadMeta(SETTINGS_STORAGE_KEY);
    App.state.settings = { ...DEFAULT_SETTINGS, ...savedSettings };
    App.state.pageCount = (await Store.loadMeta('pageCount')) || DEFAULT_PAGE_COUNT;
    const artworks = await Store.loadArtworks();
    for (const artwork of artworks) {
      App.state.images.set(artwork.id, await createImageBitmap(artwork.blob));
    }
    App.state.artworks = artworks.sort((a, b) => a.createdAt - b.createdAt);
    App.state.cards = await Store.loadCards();
    App.state.cards.forEach((card) => App.state.cardUrls.set(card.id, URL.createObjectURL(card.blob)));
    Editor.init(App.saveArtwork);
    SettingsPanel.init(App.saveSettings);
    Binder.init(document.getElementById('binder'), {
      onPlace: App.place,
      onPocketClick: (pocket, card) => CardPicker.open(pocket, card, App.state.settings),
      onMoveCard: App.moveCard,
    });
    CardPicker.init({ place: App.placeCard, remove: App.removeCard });
    Sheets.init(document.getElementById('sheets'));
    Library.init(document.getElementById('library'), { edit: App.edit, remove: App.remove, place: App.place });
    App.bindControls();
    App.render();
  },

  bindControls() {
    document.getElementById('upload').addEventListener('change', (event) => {
      App.upload([...event.target.files]);
      event.target.value = '';
    });
    document.getElementById('open-settings').addEventListener('click', () => SettingsPanel.open(App.state.settings));
    document.getElementById('export').addEventListener('click', App.exportPdf);
    document.getElementById('add-spread').addEventListener('click', () => App.changePages(PAGES_PER_SPREAD));
    document.getElementById('remove-spread').addEventListener('click', () => App.changePages(-PAGES_PER_SPREAD));
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
        name: file.name.replace(/\.[^.]+$/, ''),
        blob: file,
        createdAt: Date.now(),
        cols: 1,
        rows: 1,
        joins: Cutter.defaultJoins(1, 1),
        crop: { zoom: 1, centerX: CROP_CENTER, centerY: CROP_CENTER },
        frame: 'none',
        frameMode: 'outer',
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

  async changePages(delta) {
    const next = App.state.pageCount + delta;
    const lastUsedPage = Math.max(
      -1,
      ...App.state.artworks.map((artwork) => artwork.placement?.page ?? -1),
      ...App.state.cards.map((card) => card.page),
    );
    if (next < PAGES_PER_SPREAD || next <= lastUsedPage) {
      window.alert('Cannot remove pages that still hold artwork or cards.');
      return;
    }
    App.state.pageCount = next;
    await Store.saveMeta('pageCount', next);
    App.render();
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
    const blocked = Verifier.hasErrors(checks) || App.state.artworks.length === 0;
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
