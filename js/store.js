const DATABASE_NAME = 'mochibinder';
const DATABASE_VERSION = 2;
const ARTWORK_STORE = 'artworks';
const META_STORE = 'meta';
const CARD_STORE = 'cards';

const Store = {
  database: null,

  open() {
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

  loadMeta(key) {
    return Store.run(META_STORE, 'readonly', (store) => store.get(key));
  },

  saveMeta(key, value) {
    return Store.run(META_STORE, 'readwrite', (store) => store.put(value, key));
  },
};
