const DATABASE_NAME = 'michibinder';
const LEGACY_DATABASE_NAME = 'mochibinder';
const DATABASE_VERSION = 4;
const ARTWORK_STORE = 'artworks';
const META_STORE = 'meta';
const CARD_STORE = 'cards';
const BINDER_STORE = 'binders';
const COVER_STORE = 'covers';
const ALL_STORES = [ARTWORK_STORE, CARD_STORE, META_STORE, BINDER_STORE, COVER_STORE];

const Store = {
  database: null,

  async open() {
    await Store.openCurrent();
    await Store.migrateLegacy();
  },

  requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async migrateLegacy() {
    const databases = indexedDB.databases ? await indexedDB.databases() : [];
    if (!databases.some((database) => database.name === LEGACY_DATABASE_NAME)) {
      return;
    }
    const legacy = await Store.requestToPromise(indexedDB.open(LEGACY_DATABASE_NAME));
    const storeNames = ALL_STORES.filter((name) => legacy.objectStoreNames.contains(name));
    const entries = await Store.readEntries(legacy, storeNames);
    legacy.close();
    await Store.writeEntries(entries);
    await Store.requestToPromise(indexedDB.deleteDatabase(LEGACY_DATABASE_NAME));
  },

  readEntries(database, storeNames) {
    if (storeNames.length === 0) {
      return Promise.resolve([]);
    }
    const transaction = database.transaction(storeNames, 'readonly');
    return Promise.all(storeNames.map(async (storeName) => {
      const store = transaction.objectStore(storeName);
      const [keys, values] = await Promise.all([
        Store.requestToPromise(store.getAllKeys()),
        Store.requestToPromise(store.getAll()),
      ]);
      return { storeName, keys, values };
    }));
  },

  writeEntries(entries) {
    if (entries.length === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const transaction = Store.database.transaction(entries.map((entry) => entry.storeName), 'readwrite');
      for (const { storeName, keys, values } of entries) {
        const store = transaction.objectStore(storeName);
        values.forEach((value, index) => {
          if (store.keyPath) {
            store.put(value);
          } else {
            store.put(value, keys[index]);
          }
        });
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  openCurrent() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(ARTWORK_STORE)) {
          database.createObjectStore(ARTWORK_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE);
        }
        if (!database.objectStoreNames.contains(CARD_STORE)) {
          database.createObjectStore(CARD_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(BINDER_STORE)) {
          database.createObjectStore(BINDER_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(COVER_STORE)) {
          database.createObjectStore(COVER_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        Store.database = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  run(storeName, mode, operation) {
    return new Promise((resolve, reject) => {
      const transaction = Store.database.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
    });
  },

  loadArtworks() {
    return Store.run(ARTWORK_STORE, 'readonly', (store) => store.getAll());
  },

  saveArtwork(artwork) {
    return Store.run(ARTWORK_STORE, 'readwrite', (store) => store.put(artwork));
  },

  deleteArtwork(id) {
    return Store.run(ARTWORK_STORE, 'readwrite', (store) => store.delete(id));
  },

  loadCards() {
    return Store.run(CARD_STORE, 'readonly', (store) => store.getAll());
  },

  saveCard(card) {
    return Store.run(CARD_STORE, 'readwrite', (store) => store.put(card));
  },

  deleteCard(id) {
    return Store.run(CARD_STORE, 'readwrite', (store) => store.delete(id));
  },

  loadCovers() {
    return Store.run(COVER_STORE, 'readonly', (store) => store.getAll());
  },

  saveCover(cover) {
    return Store.run(COVER_STORE, 'readwrite', (store) => store.put(cover));
  },

  deleteCover(id) {
    return Store.run(COVER_STORE, 'readwrite', (store) => store.delete(id));
  },

  loadBinders() {
    return Store.run(BINDER_STORE, 'readonly', (store) => store.getAll());
  },

  saveBinder(binder) {
    return Store.run(BINDER_STORE, 'readwrite', (store) => store.put(binder));
  },

  deleteBinder(id) {
    return Store.run(BINDER_STORE, 'readwrite', (store) => store.delete(id));
  },

  loadMeta(key) {
    return Store.run(META_STORE, 'readonly', (store) => store.get(key));
  },

  saveMeta(key, value) {
    return Store.run(META_STORE, 'readwrite', (store) => store.put(value, key));
  },
};
