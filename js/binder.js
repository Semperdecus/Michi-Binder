const PREVIEW_PX_PER_MM = 4;
const PAGES_PER_SPREAD = 2;
const SPREAD_GAP_PX = 24;
const BINDER_PADDING_PX = 48;
const MIN_PX_PER_MM = 0.8;
const MAX_PX_PER_MM = 2.4;
const DRAG_THRESHOLD_PX = 4;

const Binder = {
  container: null,
  state: null,
  onPlace: null,
  onPocketClick: null,
  onMoveCard: null,
  onEditArtwork: null,
  onAddPage: null,
  onRemovePage: null,
  onEditCover: null,
  onPlaceCover: null,
  suppressClick: false,
  pxPerMm: 1,
  drag: null,

  init(container, { onPlace, onPocketClick, onMoveCard, onEditArtwork, onAddPage, onRemovePage, onEditCover, onPlaceCover }) {
    Binder.container = container;
    Binder.onPlace = onPlace;
    Binder.onPocketClick = onPocketClick;
    Binder.onMoveCard = onMoveCard;
    Binder.onEditArtwork = onEditArtwork;
    Binder.onAddPage = onAddPage;
    Binder.onRemovePage = onRemovePage;
    Binder.onEditCover = onEditCover;
    Binder.onPlaceCover = onPlaceCover;
    window.addEventListener('resize', () => Binder.state && Binder.render(Binder.state));
  },

  pageSize(settings) {
    return { width: BINDER_COLUMNS * settings.slotPitchXMm, height: BINDER_ROWS * settings.slotPitchYMm };
  },

  mm(value) {
    return `${value * Binder.pxPerMm}px`;
  },

  render(state) {
    Binder.state = state;
    const page = Binder.pageSize(state.settings);
    const available = Binder.container.clientWidth - BINDER_PADDING_PX - SPREAD_GAP_PX;
    Binder.pxPerMm = Cutter.clamp(available / (PAGES_PER_SPREAD * page.width), MIN_PX_PER_MM, MAX_PX_PER_MM);
    const spreads = [];
    for (let first = 0; first < state.pageCount; first += PAGES_PER_SPREAD) {
      const spread = document.createElement('div');
      spread.className = 'spread';
      for (let index = first; index < Math.min(first + PAGES_PER_SPREAD, state.pageCount); index++) {
        spread.append(Binder.renderPage(state, index, page));
      }
      spreads.push(spread);
    }
    const addPage = document.createElement('button');
    addPage.type = 'button';
    addPage.className = 'page-add';
    addPage.title = 'Add page';
    addPage.setAttribute('aria-label', 'Add page');
    addPage.addEventListener('click', () => Binder.onAddPage());
    Binder.container.replaceChildren(...spreads, addPage);
  },

  renderRemovePage(index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'page-remove';
    button.title = `Remove page ${index + 1}`;
    button.setAttribute('aria-label', `Remove page ${index + 1}`);
    button.addEventListener('click', () => Binder.onRemovePage(index));
    return button;
  },

  renderPage(state, index, page) {
    const settings = state.settings;
    const wrapper = document.createElement('figure');
    wrapper.className = 'binder-page-wrapper';
    const element = document.createElement('div');
    element.className = 'binder-page';
    element.dataset.page = String(index);
    element.style.width = Binder.mm(page.width);
    element.style.height = Binder.mm(page.height);
    const onPage = state.covers.filter((cover) => cover.placement && cover.placement.page === index);
    onPage.filter(Sleeves.isSleeve).forEach((cover) => element.append(Binder.renderSleeve(state, cover)));
    for (let row = 0; row < BINDER_ROWS; row++) {
      for (let col = 0; col < BINDER_COLUMNS; col++) {
        element.append(Binder.renderPocket(state, index, col, row));
      }
    }
    state.artworks
      .filter((artwork) => artwork.placement && artwork.placement.page === index)
      .forEach((artwork) => element.append(Binder.renderPlaced(state, artwork)));
    onPage
      .filter((cover) => !Sleeves.isSleeve(cover))
      .forEach((cover) => element.append(Binder.renderCover(state, cover)));
    if (state.pageCount > 1) {
      element.append(Binder.renderRemovePage(index));
    }
    const caption = document.createElement('figcaption');
    caption.textContent = `Page ${index + 1}`;
    wrapper.append(element, caption);
    return wrapper;
  },

  cardAt(state, page, col, row) {
    return state.cards.find((card) => card.page === page && card.col === col && card.row === row) || null;
  },

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${date.getFullYear()}`;
  },

  renderPriceBadge(card) {
    const badge = document.createElement('span');
    badge.className = 'pocket-price';
    badge.textContent = Tcgdex.formatPrice(card.price);
    if (card.priceDate) {
      badge.title = `Cardmarket trend on ${Binder.formatDate(card.priceDate)}`;
    }
    return badge;
  },

  renderPocket(state, page, col, row) {
    const settings = state.settings;
    const card = Binder.cardAt(state, page, col, row);
    const pocket = document.createElement('button');
    pocket.type = 'button';
    pocket.className = card ? 'pocket pocket--filled' : `pocket pocket--${settings.placeholder}`;
    const sleeved = state.covers.some((cover) => Sleeves.isSleeve(cover) && cover.placement &&
      cover.placement.page === page && cover.placement.col === col && cover.placement.row === row);
    pocket.classList.toggle('pocket--sleeved', sleeved);
    if (card) {
      pocket.style.backgroundImage = `url("${state.cardUrls.get(card.id)}")`;
      pocket.title = `${card.name}, ${card.setName} ${card.number}. Drag to move, click to change.`;
      pocket.addEventListener('pointerdown', (event) => Binder.startDrag(Binder.cardDragItem(card), { col: 0, row: 0 }, event));
      if (settings.showPrices) {
        pocket.append(Binder.renderPriceBadge(card));
      }
    } else {
      pocket.title = 'Click to add a card';
    }
    pocket.setAttribute('aria-label', card
      ? `${card.name} on page ${page + 1}, row ${row + 1}, column ${col + 1}. Change card`
      : `Add card to page ${page + 1}, row ${row + 1}, column ${col + 1}`);
    pocket.addEventListener('click', () => {
      if (!Binder.suppressClick) {
        Binder.onPocketClick({ page, col, row }, card);
      }
    });
    pocket.dataset.page = String(page);
    pocket.dataset.col = String(col);
    pocket.dataset.row = String(row);
    pocket.style.left = Binder.mm(col * settings.slotPitchXMm + Geometry.gapX(settings) / 2);
    pocket.style.top = Binder.mm(row * settings.slotPitchYMm + Geometry.gapY(settings) / 2);
    pocket.style.width = Binder.mm(settings.cardWidthMm);
    pocket.style.height = Binder.mm(settings.cardHeightMm);
    return pocket;
  },

  renderPlaced(state, artwork) {
    const settings = state.settings;
    const image = state.images.get(artwork.id);
    const art = Geometry.artSize(settings, artwork.cols, artwork.rows);
    const placed = document.createElement('div');
    placed.className = 'placed-art';
    placed.title = `${artwork.name}: click to edit, drag to move`;
    placed.tabIndex = 0;
    placed.setAttribute('role', 'button');
    placed.setAttribute('aria-label', `Edit ${artwork.name}`);
    placed.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        Binder.onEditArtwork(artwork.id);
      }
    });
    placed.addEventListener('click', () => {
      if (!Binder.suppressClick) {
        Binder.onEditArtwork(artwork.id);
      }
    });
    placed.style.left = Binder.mm(artwork.placement.col * settings.slotPitchXMm + Geometry.gapX(settings) / 2);
    placed.style.top = Binder.mm(artwork.placement.row * settings.slotPitchYMm + Geometry.gapY(settings) / 2);
    placed.style.width = Binder.mm(art.width);
    placed.style.height = Binder.mm(art.height);
    for (const piece of Cutter.pieces(artwork)) {
      const rect = Geometry.pieceRect(settings, piece);
      const canvas = Cutter.renderPieceCanvas(artwork, image, settings, piece, PREVIEW_PX_PER_MM, false);
      canvas.className = Cutter.isFramed(artwork) ? 'placed-piece is-framed' : 'placed-piece';
      canvas.style.left = Binder.mm(rect.x);
      canvas.style.top = Binder.mm(rect.y);
      canvas.style.width = Binder.mm(rect.width);
      canvas.style.height = Binder.mm(rect.height);
      placed.append(canvas);
    }
    placed.addEventListener('pointerdown', (event) => {
      const bounds = placed.getBoundingClientRect();
      const xMm = (event.clientX - bounds.left) / Binder.pxPerMm + Geometry.gapX(settings) / 2;
      const yMm = (event.clientY - bounds.top) / Binder.pxPerMm + Geometry.gapY(settings) / 2;
      const grab = {
        col: Cutter.clamp(Math.floor(xMm / settings.slotPitchXMm), 0, artwork.cols - 1),
        row: Cutter.clamp(Math.floor(yMm / settings.slotPitchYMm), 0, artwork.rows - 1),
      };
      Binder.startDrag(Binder.artworkDragItem(artwork), grab, event);
    });
    return placed;
  },

  renderSleeve(state, cover) {
    const settings = state.settings;
    const size = Covers.size(settings);
    const overhang = settings.coverLeewayMm / 2;
    const sleeve = document.createElement('div');
    sleeve.className = 'placed-sleeve';
    sleeve.title = Sleeves.title(cover);
    sleeve.style.background = Sleeves.color(cover.sleeveColor).hex;
    sleeve.style.left = Binder.mm(cover.placement.col * settings.slotPitchXMm + Geometry.gapX(settings) / 2 - overhang);
    sleeve.style.top = Binder.mm(cover.placement.row * settings.slotPitchYMm + Geometry.gapY(settings) / 2 - overhang);
    sleeve.style.width = Binder.mm(size.width);
    sleeve.style.height = Binder.mm(size.height);
    return sleeve;
  },

  renderCover(state, cover) {
    const settings = state.settings;
    const canvas = Covers.renderCanvas(cover, settings, PREVIEW_PX_PER_MM, false, 'preview');
    canvas.className = 'placed-cover';
    canvas.title = `${Covers.title(cover)} frame: click to edit, drag to move`;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'button');
    canvas.setAttribute('aria-label', `Edit frame ${Covers.title(cover)}`);
    const size = Covers.size(settings);
    const overhang = settings.coverLeewayMm / 2;
    canvas.style.left = Binder.mm(cover.placement.col * settings.slotPitchXMm + Geometry.gapX(settings) / 2 - overhang);
    canvas.style.top = Binder.mm(cover.placement.row * settings.slotPitchYMm + Geometry.gapY(settings) / 2 - overhang);
    canvas.style.width = Binder.mm(size.width);
    canvas.style.height = Binder.mm(size.height);
    canvas.addEventListener('pointerdown', (event) => Binder.startDrag(Binder.coverDragItem(cover), { col: 0, row: 0 }, event));
    canvas.addEventListener('click', () => {
      if (!Binder.suppressClick) {
        Binder.onEditCover(cover.id);
      }
    });
    canvas.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        Binder.onEditCover(cover.id);
      }
    });
    return canvas;
  },

  coverDragItem(cover) {
    return {
      label: `${Covers.title(cover)} frame`,
      cols: 1,
      rows: 1,
      canPlace: (placement) => Binder.canPlaceCover(cover, placement),
      drop: (placement) => Binder.onPlaceCover(cover.id, placement),
    };
  },

  coverAt(placement, ignoreId) {
    return Binder.state.covers.some((cover) =>
      cover.id !== ignoreId && cover.placement && cover.placement.page === placement.page &&
      cover.placement.col === placement.col && cover.placement.row === placement.row);
  },

  canPlaceCover(cover, placement) {
    return Binder.canPlaceCard(placement) && !Binder.coverAt(placement, cover.id);
  },

  artworkDragItem(artwork) {
    return {
      label: `${artwork.name} (${artwork.cols}x${artwork.rows})`,
      cols: artwork.cols,
      rows: artwork.rows,
      canPlace: (placement) => Binder.canPlace(artwork, placement),
      drop: (placement) => Binder.onPlace(artwork.id, placement),
    };
  },

  cardDragItem(card) {
    return {
      label: `${card.name} (${card.setName} ${card.number})`,
      cols: 1,
      rows: 1,
      canPlace: (placement) => Binder.canPlaceCard(placement),
      drop: (placement) => Binder.onMoveCard(card, placement),
    };
  },

  cellsOf(artwork, placement) {
    const cells = [];
    for (let row = 0; row < artwork.rows; row++) {
      for (let col = 0; col < artwork.cols; col++) {
        cells.push({ col: placement.col + col, row: placement.row + row });
      }
    }
    return cells;
  },

  canPlace(artwork, placement) {
    const inside = placement.col >= 0 && placement.row >= 0 &&
      placement.col + artwork.cols <= BINDER_COLUMNS && placement.row + artwork.rows <= BINDER_ROWS &&
      placement.page < Binder.state.pageCount;
    if (!inside) {
      return false;
    }
    const wanted = new Set(Binder.cellsOf(artwork, placement).map((cell) => `${cell.col},${cell.row}`));
    const blockedByCard = Binder.state.cards.some((card) =>
      card.page === placement.page && wanted.has(`${card.col},${card.row}`));
    const blockedByCover = Binder.state.covers.some((cover) =>
      cover.placement && cover.placement.page === placement.page &&
      wanted.has(`${cover.placement.col},${cover.placement.row}`));
    return !blockedByCard && !blockedByCover && !Binder.state.artworks.some((other) =>
      other.id !== artwork.id && other.placement && other.placement.page === placement.page &&
      Binder.cellsOf(other, other.placement).some((cell) => wanted.has(`${cell.col},${cell.row}`)));
  },

  canPlaceCard(placement) {
    const inside = placement.col >= 0 && placement.row >= 0 &&
      placement.col < BINDER_COLUMNS && placement.row < BINDER_ROWS && placement.page < Binder.state.pageCount;
    return inside && !Binder.state.artworks.some((artwork) =>
      artwork.placement && artwork.placement.page === placement.page &&
      Binder.cellsOf(artwork, artwork.placement).some((cell) => cell.col === placement.col && cell.row === placement.row));
  },

  startDrag(item, grab, event) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    Binder.drag = { item, grab, startX: event.clientX, startY: event.clientY, ghost: null, target: null };
    document.addEventListener('pointermove', Binder.onDragMove);
    document.addEventListener('pointerup', Binder.onDragEnd, { once: true });
  },

  onDragMove(event) {
    const drag = Binder.drag;
    if (!drag.ghost) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD_PX) {
        return;
      }
      drag.ghost = document.createElement('div');
      drag.ghost.className = 'drag-ghost';
      drag.ghost.textContent = drag.item.label;
      document.body.append(drag.ghost);
      document.body.classList.add('is-dragging');
    }
    drag.ghost.style.left = `${event.clientX}px`;
    drag.ghost.style.top = `${event.clientY}px`;
    drag.target = Binder.targetAt(event.clientX, event.clientY);
    Binder.highlight(drag.target);
  },

  targetAt(clientX, clientY) {
    const pageElement = document.elementFromPoint(clientX, clientY)?.closest('.binder-page');
    if (!pageElement) {
      return null;
    }
    const settings = Binder.state.settings;
    const bounds = pageElement.getBoundingClientRect();
    const col = Math.floor((clientX - bounds.left) / Binder.pxPerMm / settings.slotPitchXMm);
    const row = Math.floor((clientY - bounds.top) / Binder.pxPerMm / settings.slotPitchYMm);
    const placement = {
      page: Number(pageElement.dataset.page),
      col: col - Binder.drag.grab.col,
      row: row - Binder.drag.grab.row,
    };
    return { placement, valid: Binder.drag.item.canPlace(placement) };
  },

  highlight(target) {
    Binder.container.querySelectorAll('.is-target-ok, .is-target-bad').forEach((element) =>
      element.classList.remove('is-target-ok', 'is-target-bad'));
    if (!target) {
      return;
    }
    const className = target.valid ? 'is-target-ok' : 'is-target-bad';
    for (const cell of Binder.cellsOf(Binder.drag.item, target.placement)) {
      const pocket = Binder.container.querySelector(
        `.pocket[data-page="${target.placement.page}"][data-col="${cell.col}"][data-row="${cell.row}"]`);
      pocket?.classList.add(className);
    }
  },

  onDragEnd() {
    const drag = Binder.drag;
    document.removeEventListener('pointermove', Binder.onDragMove);
    document.body.classList.remove('is-dragging');
    drag.ghost?.remove();
    Binder.highlight(null);
    Binder.drag = null;
    if (drag.ghost) {
      Binder.suppressClick = true;
      setTimeout(() => {
        Binder.suppressClick = false;
      });
    }
    if (drag.ghost && drag.target?.valid) {
      drag.item.drop(drag.target.placement);
    }
  },
};
