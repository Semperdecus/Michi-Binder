const TCGDEX_API = 'https://api.tcgdex.net/v2/en';
const CARD_IMAGE_FORMAT = 'webp';
const DIGITAL_ONLY_SERIES = 'tcgp';

const PRICE_FORMAT = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });

const Tcgdex = {
  sets: null,
  prices: new Map(),

  async fetchFresh(url) {
    try {
      return await fetch(url);
    } catch {
      return fetch(url, { cache: 'reload' });
    }
  },

  async getJson(url) {
    const response = await Tcgdex.fetchFresh(url);
    if (!response.ok) {
      throw new Error(`Card search failed (${response.status})`);
    }
    return response.json();
  },

  async loadSets() {
    if (!Tcgdex.sets) {
      const [list, digital] = await Promise.all([
        Tcgdex.getJson(`${TCGDEX_API}/sets`),
        Tcgdex.getJson(`${TCGDEX_API}/series/${DIGITAL_ONLY_SERIES}`),
      ]);
      const digitalIds = new Set(digital.sets.map((set) => set.id));
      Tcgdex.sets = new Map(list.map((set, index) => [set.id, {
        name: set.name,
        order: index,
        official: set.cardCount?.official,
        physical: !digitalIds.has(set.id),
      }]));
    }
    return Tcgdex.sets;
  },

  setIdOf(card) {
    return card.id.slice(0, card.id.length - card.localId.length - 1);
  },

  async search(name) {
    const [cards, sets] = await Promise.all([
      Tcgdex.getJson(`${TCGDEX_API}/cards?name=${encodeURIComponent(name)}`),
      Tcgdex.loadSets(),
    ]);
    return cards
      .filter((card) => card.image && sets.get(Tcgdex.setIdOf(card))?.physical !== false)
      .map((card) => {
        const setId = Tcgdex.setIdOf(card);
        const set = sets.get(setId);
        return {
          cardId: card.id,
          name: card.name,
          number: set?.official ? `${card.localId}/${set.official}` : card.localId,
          setName: set?.name ?? setId,
          setOrder: set?.order ?? -1,
          image: card.image,
        };
      })
      .sort((a, b) => b.setOrder - a.setOrder || a.number.localeCompare(b.number, undefined, { numeric: true }));
  },

  price(cardId) {
    if (!Tcgdex.prices.has(cardId)) {
      const request = Tcgdex.getJson(`${TCGDEX_API}/cards/${encodeURIComponent(cardId)}`)
        .then((detail) => {
          const market = detail.pricing?.cardmarket;
          return market?.trend || market?.['trend-holo'] || null;
        })
        .catch(() => {
          Tcgdex.prices.delete(cardId);
          return null;
        });
      Tcgdex.prices.set(cardId, request);
    }
    return Tcgdex.prices.get(cardId);
  },

  formatPrice(price) {
    return price ? PRICE_FORMAT.format(price) : 'no price';
  },

  imageUrl(card, quality) {
    return `${card.image}/${quality}.${CARD_IMAGE_FORMAT}`;
  },

  async imageBlob(card) {
    const response = await Tcgdex.fetchFresh(Tcgdex.imageUrl(card, 'high'));
    if (!response.ok) {
      throw new Error(`Card image failed to load (${response.status})`);
    }
    return response.blob();
  },
};
