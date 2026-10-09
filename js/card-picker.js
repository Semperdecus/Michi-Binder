const CardPicker = {
  dialog: null,
  actions: null,
  pocket: null,
  results: [],
  selected: null,
  showPrices: false,
  priceObserver: null,

  init(actions) {
    CardPicker.actions = actions;
    CardPicker.dialog = document.getElementById('card-picker');
    CardPicker.element('card-search').addEventListener('submit', (event) => {
      event.preventDefault();
      CardPicker.search();
    });
    CardPicker.element('card-set-filter').addEventListener('input', CardPicker.renderResults);
    CardPicker.element('card-confirm').addEventListener('click', CardPicker.confirm);
    CardPicker.element('card-remove').addEventListener('click', CardPicker.remove);
    CardPicker.element('card-cancel').addEventListener('click', () => CardPicker.dialog.close());
    CardPicker.priceObserver = new IntersectionObserver(CardPicker.onPriceVisible);
    document.querySelectorAll('[data-pocket-tab]').forEach((tab) => {
      tab.addEventListener('click', () => CardPicker.showTab(tab.dataset.pocketTab));
    });
  },

  showTab(name) {
    document.querySelectorAll('[data-pocket-tab]').forEach((tab) => {
      tab.setAttribute('aria-selected', String(tab.dataset.pocketTab === name));
    });
    CardPicker.element('pocket-card-panel').hidden = name !== 'card';
    CardPicker.element('pocket-frame-panel').hidden = name !== 'frame';
  },

  pocketText(pocket) {
    return `Page ${pocket.page + 1}, row ${pocket.row + 1}, column ${pocket.col + 1}`;
  },

  openCover(cover, card, cardUrl, settings) {
    if (cover.placement) {
      CardPicker.open(cover.placement, card, settings, cardUrl, cover);
      return;
    }
    CardPicker.element('card-picker-title').textContent = 'Edit frame';
    CardPicker.element('card-picker-pocket').textContent = 'Not in the binder';
    CardPicker.element('pocket-tabs').hidden = true;
    CoverEditor.load({ cover, cardUrl, settings });
    CardPicker.showTab('frame');
    CardPicker.dialog.showModal();
  },

  onPriceVisible(entries) {
    entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
      CardPicker.priceObserver.unobserve(entry.target);
      CardPicker.fillPrice(entry.target, entry.target.dataset.cardId);
    });
  },

  async fillPrice(element, cardId) {
    element.textContent = 'loading price...';
    element.textContent = Tcgdex.formatPrice(await Tcgdex.price(cardId));
  },

  element(id) {
    return document.getElementById(id);
  },

  setStatus(text) {
    CardPicker.element('card-status').textContent = text;
  },

  open(pocket, existing, settings, cardUrl, cover = null) {
    CardPicker.pocket = pocket;
    CardPicker.showPrices = settings.showPrices;
    CardPicker.select(null);
    CardPicker.element('card-picker-title').textContent = cover ? 'Edit frame' : 'Pocket';
    CardPicker.element('frame-tab').textContent = cover ? 'Frame' : 'Add frame';
    CardPicker.element('card-picker-pocket').textContent = CardPicker.pocketText(pocket) +
      (existing ? `. Current card: ${existing.name} (${existing.setName} ${existing.number})` : '');
    CardPicker.element('card-remove').hidden = !existing;
    CardPicker.element('pocket-tabs').hidden = false;
    CardPicker.renderResults();
    CoverEditor.load({ cover, pocket, cardUrl, cardName: existing?.name, settings });
    CardPicker.showTab(cover ? 'frame' : 'card');
    CardPicker.dialog.showModal();
    if (!cover) {
      CardPicker.element('card-query').focus();
    }
  },

  async search() {
    const query = CardPicker.element('card-query').value.trim();
    if (!query) {
      return;
    }
    CardPicker.setStatus('Searching...');
    CardPicker.select(null);
    try {
      CardPicker.results = await Tcgdex.search(query);
      CardPicker.setStatus(`${CardPicker.results.length} card(s) found.`);
    } catch (error) {
      CardPicker.results = [];
      CardPicker.setStatus(`${error.message}. Card search needs an internet connection.`);
    }
    CardPicker.renderResults();
  },

  filteredResults() {
    const filter = CardPicker.element('card-set-filter').value.trim().toLowerCase();
    return CardPicker.results.filter((card) => card.setName.toLowerCase().includes(filter));
  },

  renderResults() {
    CardPicker.priceObserver.disconnect();
    const items = CardPicker.filteredResults().map((card) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card-result';
      button.setAttribute('aria-pressed', String(card === CardPicker.selected));
      const image = document.createElement('img');
      image.loading = 'lazy';
      image.src = Tcgdex.imageUrl(card, 'low');
      image.alt = `${card.name}, ${card.setName} ${card.number}`;
      const caption = document.createElement('span');
      caption.textContent = `${card.setName} ${card.number}`;
      button.append(image, caption);
      if (CardPicker.showPrices) {
        const price = document.createElement('span');
        price.className = 'card-price';
        price.dataset.cardId = card.cardId;
        CardPicker.priceObserver.observe(price);
        button.append(price);
      }
      button.addEventListener('click', () => {
        CardPicker.select(card);
        CardPicker.renderResults();
      });
      item.append(button);
      return item;
    });
    CardPicker.element('card-results').replaceChildren(...items);
  },

  select(card) {
    CardPicker.selected = card;
    const image = CardPicker.element('card-selected-image');
    image.hidden = !card;
    image.src = card ? Tcgdex.imageUrl(card, 'high') : '';
    image.alt = card ? `${card.name}, ${card.setName} ${card.number}` : '';
    CardPicker.element('card-selected-caption').textContent =
      card ? `${card.name}, ${card.setName} ${card.number}` : 'Select a card';
    CardPicker.element('card-confirm').disabled = !card;
    const price = CardPicker.element('card-selected-price');
    price.hidden = !card || !CardPicker.showPrices;
    if (!price.hidden) {
      CardPicker.fillPrice(price, card.cardId);
    }
  },

  async confirm() {
    const button = CardPicker.element('card-confirm');
    button.disabled = true;
    CardPicker.setStatus('Placing card...');
    try {
      const [blob, price] = await Promise.all([
        Tcgdex.imageBlob(CardPicker.selected),
        Tcgdex.price(CardPicker.selected.cardId),
      ]);
      await CardPicker.actions.place(CardPicker.pocket, { ...CardPicker.selected, price }, blob);
      CardPicker.setStatus('');
      CardPicker.dialog.close();
    } catch (error) {
      CardPicker.setStatus(error.message);
      button.disabled = false;
    }
  },

  async remove() {
    await CardPicker.actions.remove(CardPicker.pocket);
    CardPicker.dialog.close();
  },
};
