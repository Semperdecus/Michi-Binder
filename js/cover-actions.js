const CoverActions = {
  find(id) {
    return App.state.covers.find((cover) => cover.id === id);
  },

  atPocket(pocket) {
    return App.state.covers.find((cover) => cover.placement && cover.placement.page === pocket.page &&
      cover.placement.col === pocket.col && cover.placement.row === pocket.row) || null;
  },

  async create(id, fields, placement, style) {
    const cover = {
      id,
      binderId: App.state.binder.id,
      createdAt: Date.now(),
      print: true,
      style: 'pokedex',
      ...style,
      fields,
      placement,
    };
    App.state.covers.push(cover);
    await Store.saveCover(cover);
    App.render();
  },

  async update(id, fields, style) {
    const cover = CoverActions.find(id);
    Object.assign(cover, style, { fields });
    await Store.saveCover(cover);
    App.render();
  },

  async place(id, placement) {
    const cover = CoverActions.find(id);
    cover.placement = placement;
    await Store.saveCover(cover);
    App.render();
  },

  printableCovers() {
    return App.state.covers.filter((cover) => !Sleeves.isSleeve(cover));
  },

  async setAllPrint(print) {
    for (const cover of CoverActions.printableCovers()) {
      cover.print = print;
      await Store.saveCover(cover);
    }
    App.render();
  },

  async setPrint(id, print) {
    const cover = CoverActions.find(id);
    cover.print = print;
    await Store.saveCover(cover);
    App.render();
  },

  async remove(id) {
    const cover = CoverActions.find(id);
    const confirmed = await ConfirmDialog.ask({
      title: `Delete "${Covers.title(cover)}"?`,
      message: 'Are you sure you want to delete this frame? This cannot be undone.',
      confirmLabel: 'Delete frame',
    });
    if (!confirmed) {
      return false;
    }
    App.state.covers = App.state.covers.filter((candidate) => candidate.id !== id);
    await Store.deleteCover(id);
    App.render();
    return true;
  },
};
