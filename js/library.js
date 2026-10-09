const THUMBNAIL_PX_PER_MM = 2.4;

const Library = {
  list: null,
  coverList: null,
  actions: null,
  tab: 'artwork',

  init(list, actions) {
    Library.list = list;
    Library.coverList = document.getElementById('cover-library');
    Library.actions = actions;
    document.querySelectorAll('[data-library-tab]').forEach((tab) => {
      tab.addEventListener('click', () => Library.showTab(tab.dataset.libraryTab));
    });
    document.getElementById('artwork-print-all').addEventListener('click', (event) =>
      Library.actions.setAllPrint(event.currentTarget.dataset.next === 'true'));
    document.getElementById('covers-print-all').addEventListener('click', (event) =>
      Library.actions.setAllCoverPrint(event.currentTarget.dataset.next === 'true'));
    Library.showTab(Library.tab);
  },

  showTab(name) {
    Library.tab = name;
    document.querySelectorAll('[data-library-tab]').forEach((tab) => {
      tab.setAttribute('aria-selected', String(tab.dataset.libraryTab === name));
    });
    document.getElementById('library-artwork-panel').hidden = name !== 'artwork';
    document.getElementById('library-covers-panel').hidden = name !== 'covers';
  },

  empty(text) {
    const item = document.createElement('li');
    item.className = 'library-empty';
    item.textContent = text;
    return item;
  },

  updatePrintAll(button, items) {
    button.hidden = items.length === 0;
    const allSelected = items.every((item) => item.print !== false);
    button.dataset.next = String(!allSelected);
    button.textContent = allSelected ? 'Deselect all for printing' : 'Select all for printing';
  },

  render(state) {
    Library.updatePrintAll(document.getElementById('artwork-print-all'), state.artworks);
    Library.updatePrintAll(document.getElementById('covers-print-all'),
      state.covers.filter((cover) => !Sleeves.isSleeve(cover)));
    Library.list.replaceChildren(...(state.artworks.length === 0
      ? [Library.empty('Upload an image to start.')]
      : state.artworks.map((artwork) => Library.renderArtwork(state, artwork))));
    Library.coverList.replaceChildren(...(state.covers.length === 0
      ? [Library.empty('No frames yet.')]
      : state.covers.map((cover) => Library.renderCover(state, cover))));
  },

  makeThumbnail(canvas, onEdit, dragItem) {
    canvas.className = 'library-thumb';
    canvas.title = 'Click to edit, drag onto a binder pocket';
    canvas.addEventListener('click', () => {
      if (!Binder.suppressClick) {
        onEdit();
      }
    });
    canvas.addEventListener('pointerdown', (event) => Binder.startDrag(dragItem, { col: 0, row: 0 }, event));
    return canvas;
  },

  artworkThumbnail(state, artwork) {
    const settings = state.settings;
    const image = state.images.get(artwork.id);
    const art = Geometry.artSize(settings, artwork.cols, artwork.rows);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(art.width * THUMBNAIL_PX_PER_MM);
    canvas.height = Math.round(art.height * THUMBNAIL_PX_PER_MM);
    const ctx = canvas.getContext('2d');
    ctx.scale(THUMBNAIL_PX_PER_MM, THUMBNAIL_PX_PER_MM);
    Cutter.pieces(artwork).forEach((piece) => Cutter.drawPiece(ctx, artwork, image, settings, piece));
    return Library.makeThumbnail(canvas, () => Library.actions.edit(artwork.id), Binder.artworkDragItem(artwork));
  },

  button(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  },

  where(placement) {
    return placement ? `page ${placement.page + 1}` : 'not in binder';
  },

  renderTile({ thumbnail, title, meta, printing, printable = true, placed, onPrint, onEdit, onUnplace, onDelete }) {
    const item = document.createElement('li');
    item.className = printing ? 'library-item' : 'library-item is-not-printed';
    const details = document.createElement('div');
    details.className = 'library-details';
    const name = document.createElement('strong');
    name.textContent = title;
    const info = document.createElement('span');
    info.textContent = meta;
    const printToggle = Library.button(printing ? '✓ Print' : 'Print', onPrint);
    printToggle.className = 'library-print';
    printToggle.setAttribute('aria-pressed', String(printing));
    printToggle.title = printing ? 'Included in the PDF. Click to leave it out.' : 'Left out of the PDF. Click to include it.';
    const buttons = document.createElement('div');
    buttons.className = 'library-buttons';
    if (printable) {
      buttons.append(printToggle);
    }
    buttons.append(Library.button('Edit', onEdit));
    if (placed) {
      buttons.append(Library.button('Unplace', onUnplace));
    }
    const remove = Library.button('Delete', onDelete);
    remove.className = 'library-delete';
    buttons.append(remove);
    details.append(name, info);
    item.append(thumbnail, details, buttons);
    return item;
  },

  renderArtwork(state, artwork) {
    const printing = artwork.print !== false;
    const frame = artwork.frame === 'none' ? 'no frame' : `${artwork.frame} frame`;
    return Library.renderTile({
      thumbnail: Library.artworkThumbnail(state, artwork),
      title: artwork.name,
      meta: `${artwork.cols}x${artwork.rows}, ${Cutter.pieces(artwork).length} piece(s), ${frame}, ${Library.where(artwork.placement)}`,
      printing,
      placed: Boolean(artwork.placement),
      onPrint: () => Library.actions.setPrint(artwork.id, !printing),
      onEdit: () => Library.actions.edit(artwork.id),
      onUnplace: () => Library.actions.place(artwork.id, null),
      onDelete: () => Library.actions.remove(artwork.id),
    });
  },

  renderCover(state, cover) {
    const sleeve = Sleeves.isSleeve(cover);
    const printing = sleeve || cover.print !== false;
    const canvas = sleeve
      ? Sleeves.thumbnail(cover, state.settings)
      : Covers.renderCanvas(cover, state.settings, THUMBNAIL_PX_PER_MM, false, 'preview');
    return Library.renderTile({
      thumbnail: Library.makeThumbnail(canvas, () => Library.actions.editCover(cover.id), Binder.coverDragItem(cover)),
      title: Covers.title(cover),
      meta: `${sleeve ? 'Colored sleeve (not printed)' : 'Dex entry frame'}, ${Library.where(cover.placement)}`,
      printing,
      printable: !sleeve,
      placed: Boolean(cover.placement),
      onPrint: () => Library.actions.setCoverPrint(cover.id, !printing),
      onEdit: () => Library.actions.editCover(cover.id),
      onUnplace: () => Library.actions.placeCover(cover.id, null),
      onDelete: () => Library.actions.removeCover(cover.id),
    });
  },
};
