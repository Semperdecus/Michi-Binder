const DEFAULT_BINDER_NAME = 'My binder';
const BINDER_FILE_FORMAT = 'michi-binder';
const BINDER_FILE_VERSION = 1;
const CURRENT_BINDER_KEY = 'currentBinderId';
const LEGACY_PAGE_COUNT_KEY = 'pageCount';
const JSON_INDENT = 2;

const Binders = {
  async loadAll() {
    const binders = await Store.loadBinders();
    return binders.sort((a, b) => a.createdAt - b.createdAt);
  },

  async create(name, pageCount = DEFAULT_PAGE_COUNT) {
    const binder = { id: App.newId(), name, pageCount, createdAt: Date.now() };
    await Store.saveBinder(binder);
    return binder;
  },

  async ensureDefault() {
    let binders = await Binders.loadAll();
    if (binders.length === 0) {
      const legacyPageCount = await Store.loadMeta(LEGACY_PAGE_COUNT_KEY);
      binders = [await Binders.create(DEFAULT_BINDER_NAME, legacyPageCount || DEFAULT_PAGE_COUNT)];
    }
    const [artworks, cards] = await Promise.all([Store.loadArtworks(), Store.loadCards()]);
    for (const artwork of artworks.filter((item) => !item.binderId)) {
      await Store.saveArtwork({ ...artwork, binderId: binders[0].id });
    }
    for (const card of cards.filter((item) => !item.binderId)) {
      await Store.saveCard({ ...card, binderId: binders[0].id });
    }
    return binders;
  },

  async contents(binderId) {
    const [artworks, cards, covers] = await Promise.all([Store.loadArtworks(), Store.loadCards(), Store.loadCovers()]);
    return {
      artworks: artworks.filter((artwork) => artwork.binderId === binderId),
      cards: cards.filter((card) => card.binderId === binderId),
      covers: covers.filter((cover) => cover.binderId === binderId),
    };
  },

  async counts() {
    const [artworks, cards, covers] = await Promise.all([Store.loadArtworks(), Store.loadCards(), Store.loadCovers()]);
    const counts = new Map();
    const bump = (binderId, key) => {
      const entry = counts.get(binderId) || { artworks: 0, cards: 0, covers: 0 };
      entry[key] += 1;
      counts.set(binderId, entry);
    };
    artworks.forEach((artwork) => bump(artwork.binderId, 'artworks'));
    cards.forEach((card) => bump(card.binderId, 'cards'));
    covers.forEach((cover) => bump(cover.binderId, 'covers'));
    return counts;
  },

  async remove(binderId) {
    const { artworks, cards, covers } = await Binders.contents(binderId);
    for (const artwork of artworks) {
      await Store.deleteArtwork(artwork.id);
    }
    for (const card of cards) {
      await Store.deleteCard(card.id);
    }
    for (const cover of covers) {
      await Store.deleteCover(cover.id);
    }
    await Store.deleteBinder(binderId);
  },

  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  },

  async dataUrlToBlob(dataUrl) {
    const response = await fetch(dataUrl);
    return response.blob();
  },

  async withImageData(record) {
    const { blob, binderId, ...rest } = record;
    return { ...rest, image: await Binders.blobToDataUrl(blob) };
  },

  async toJson(binder) {
    const { artworks, cards, covers } = await Binders.contents(binder.id);
    const file = {
      format: BINDER_FILE_FORMAT,
      version: BINDER_FILE_VERSION,
      exportedAt: Date.now(),
      binder: { name: binder.name, pageCount: binder.pageCount },
      artworks: await Promise.all(artworks.map(Binders.withImageData)),
      cards: await Promise.all(cards.map(Binders.withImageData)),
      covers: covers.map(({ binderId, ...rest }) => rest),
    };
    return JSON.stringify(file, null, JSON_INDENT);
  },

  fileName(binder) {
    const slug = binder.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'binder';
    return `${slug}-${Binder.formatDate(Date.now())}.json`;
  },

  async exportFile(binder) {
    const json = await Binders.toJson(binder);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = Binders.fileName(binder);
    link.click();
    URL.revokeObjectURL(url);
  },

  async fromRecord(record, binderId) {
    const { image, ...rest } = record;
    return { ...rest, id: App.newId(), binderId, blob: await Binders.dataUrlToBlob(image) };
  },

  async importFile(file) {
    const parsed = JSON.parse(await file.text());
    if (parsed.format !== BINDER_FILE_FORMAT || !Array.isArray(parsed.artworks) || !Array.isArray(parsed.cards)) {
      throw new Error('This is not a Michi Binder file.');
    }
    const name = parsed.binder?.name || DEFAULT_BINDER_NAME;
    const taken = (await Binders.loadAll()).some((binder) => binder.name === name);
    const binder = await Binders.create(taken ? `${name} (imported)` : name, parsed.binder?.pageCount || DEFAULT_PAGE_COUNT);
    for (const record of parsed.artworks) {
      await Store.saveArtwork(await Binders.fromRecord(record, binder.id));
    }
    for (const record of parsed.cards) {
      await Store.saveCard(await Binders.fromRecord(record, binder.id));
    }
    for (const record of parsed.covers || []) {
      await Store.saveCover({ ...record, id: App.newId(), binderId: binder.id });
    }
    return binder;
  },
};
