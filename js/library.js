const THUMBNAIL_PX_PER_MM = 0.6;

const Library = {
  list: null,
  actions: null,

  init(list, actions) {
    Library.list = list;
    Library.actions = actions;
  },

  render(state) {
    if (state.artworks.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'library-empty';
      empty.textContent = 'Upload an image to start.';
      Library.list.replaceChildren(empty);
      return;
    }
    Library.list.replaceChildren(...state.artworks.map((artwork) => Library.renderItem(state, artwork)));
  },

  renderThumbnail(state, artwork) {
    const settings = state.settings;
    const image = state.images.get(artwork.id);
    const art = Geometry.artSize(settings, artwork.cols, artwork.rows);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(art.width * THUMBNAIL_PX_PER_MM);
    canvas.height = Math.round(art.height * THUMBNAIL_PX_PER_MM);
    const ctx = canvas.getContext('2d');
    ctx.scale(THUMBNAIL_PX_PER_MM, THUMBNAIL_PX_PER_MM);
    Cutter.pieces(artwork).forEach((piece) => Cutter.drawPiece(ctx, artwork, image, settings, piece));
    canvas.className = 'library-thumb';
    canvas.title = 'Drag onto a binder pocket';
    canvas.addEventListener('pointerdown', (event) => Binder.startDrag(Binder.artworkDragItem(artwork), { col: 0, row: 0 }, event));
    return canvas;
  },

  button(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  },

  renderItem(state, artwork) {
    const item = document.createElement('li');
    item.className = 'library-item';
    const pieces = Cutter.pieces(artwork);
    const details = document.createElement('div');
    details.className = 'library-details';
    const name = document.createElement('strong');
    name.textContent = artwork.name;
    const meta = document.createElement('span');
    const frame = artwork.frame === 'none' ? 'no frame' : `${artwork.frame} frame`;
    const where = artwork.placement ? `page ${artwork.placement.page + 1}` : 'not in binder';
    meta.textContent = `${artwork.cols}x${artwork.rows}, ${pieces.length} piece(s), ${frame}, ${where}`;
    const buttons = document.createElement('div');
    buttons.className = 'library-buttons';
    buttons.append(Library.button('Edit', () => Library.actions.edit(artwork.id)));
    if (artwork.placement) {
      buttons.append(Library.button('Unplace', () => Library.actions.place(artwork.id, null)));
    }
    buttons.append(Library.button('Delete', () => Library.actions.remove(artwork.id)));
    details.append(name, meta, buttons);
    item.append(Library.renderThumbnail(state, artwork), details);
    return item;
  },
};
