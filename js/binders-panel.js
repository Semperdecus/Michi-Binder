const BindersPanel = {
  dialog: null,
  select: null,
  actions: null,

  init(actions) {
    BindersPanel.actions = actions;
    BindersPanel.dialog = document.getElementById('binders');
    BindersPanel.select = document.getElementById('binder-select');
    BindersPanel.select.addEventListener('change', () => actions.open(BindersPanel.select.value));
    document.getElementById('open-binders').addEventListener('click', BindersPanel.open);
    document.getElementById('binders-close').addEventListener('click', () => BindersPanel.dialog.close());
    document.getElementById('binder-new').addEventListener('click', () => BindersPanel.run(actions.create));
    document.getElementById('binder-import').addEventListener('change', (event) => {
      const [file] = event.target.files;
      event.target.value = '';
      if (file) {
        BindersPanel.run(() => actions.import(file));
      }
    });
  },

  setStatus(text) {
    document.getElementById('binders-status').textContent = text;
  },

  async run(action) {
    BindersPanel.setStatus('');
    try {
      await action();
      await BindersPanel.renderList();
    } catch (error) {
      BindersPanel.setStatus(error.message);
    }
  },

  async open() {
    BindersPanel.setStatus('');
    await BindersPanel.renderList();
    BindersPanel.dialog.showModal();
  },

  renderSelect(binders, currentId) {
    BindersPanel.select.replaceChildren(...binders.map((binder) => {
      const option = document.createElement('option');
      option.value = binder.id;
      option.textContent = binder.name;
      option.selected = binder.id === currentId;
      return option;
    }));
  },

  button(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.textContent = label;
    button.addEventListener('click', () => BindersPanel.run(onClick));
    return button;
  },

  async renderList() {
    const { binders, currentId } = BindersPanel.actions.current();
    const counts = await Binders.counts();
    const items = binders.map((binder) => {
      const count = counts.get(binder.id) || { artworks: 0, cards: 0, covers: 0 };
      const item = document.createElement('li');
      item.className = `binder-entry${binder.id === currentId ? ' is-current' : ''}`;
      const details = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = binder.id === currentId ? `${binder.name} (open)` : binder.name;
      const meta = document.createElement('span');
      meta.textContent = `${count.artworks} artwork(s), ${count.covers} frame(s), ${count.cards} card(s), created ${Binder.formatDate(binder.createdAt)}`;
      details.append(name, meta);
      const buttons = document.createElement('div');
      buttons.className = 'binder-entry-buttons';
      if (binder.id !== currentId) {
        buttons.append(BindersPanel.button('Open', () => BindersPanel.actions.open(binder.id)));
      }
      buttons.append(
        BindersPanel.button('Rename', () => BindersPanel.actions.rename(binder.id)),
        BindersPanel.button('Export', () => Binders.exportFile(binder)),
        BindersPanel.button('Delete', () => BindersPanel.actions.remove(binder.id)),
      );
      item.append(details, buttons);
      return item;
    });
    document.getElementById('binder-list').replaceChildren(...items);
  },
};
