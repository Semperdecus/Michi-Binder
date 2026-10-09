const COVER_PREVIEW_PX_PER_MM = 5;
const COVER_STYLE_FIELDS = ['variant', 'handFont', 'labelFont'];

const CoverEditor = {
  form: null,
  kind: COVER_KIND_DEX,
  sleeveColor: DEFAULT_SLEEVE_COLOR,
  dexEntries: [],
  context: null,
  actions: null,
  settings: null,

  init(actions) {
    CoverEditor.actions = actions;
    CoverEditor.form = document.getElementById('cover-form');
    CoverEditor.fillOptions();
    CoverEditor.form.addEventListener('input', CoverEditor.renderPreview);
    CoverEditor.form.addEventListener('change', CoverEditor.renderPreview);
    document.getElementById('cover-save').addEventListener('click', CoverEditor.save);
    document.getElementById('cover-delete').addEventListener('click', CoverEditor.remove);
    document.getElementById('cover-cancel').addEventListener('click', () => CardPicker.dialog.close());
    document.getElementById('dex-fill').addEventListener('click', CoverEditor.fillFromDex);
    document.getElementById('dex-query').addEventListener('focus', CoverEditor.loadDexNames, { once: true });
    document.getElementById('dex-query').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        CoverEditor.fillFromDex();
      }
    });
    document.getElementById('dex-entry').addEventListener('change', CoverEditor.chooseEntry);
    document.querySelectorAll('[data-frame-kind]').forEach((button) => {
      button.addEventListener('click', () => CoverEditor.setKind(button.dataset.frameKind));
    });
    CoverEditor.renderSwatches();
  },

  renderSwatches() {
    const swatches = SLEEVE_COLORS.map((color) => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'sleeve-swatch';
      swatch.setAttribute('role', 'radio');
      swatch.dataset.color = color.key;
      swatch.title = color.name;
      swatch.setAttribute('aria-label', color.name);
      swatch.style.background = color.hex;
      swatch.addEventListener('click', () => CoverEditor.setSleeveColor(color.key));
      return swatch;
    });
    document.getElementById('sleeve-colors').replaceChildren(...swatches);
  },

  setKind(kind) {
    CoverEditor.kind = kind;
    const sleeve = kind === COVER_KIND_SLEEVE;
    document.querySelectorAll('[data-frame-kind]').forEach((button) => {
      button.setAttribute('aria-checked', String(button.dataset.frameKind === kind));
    });
    CoverEditor.form.hidden = sleeve;
    document.getElementById('sleeve-picker').hidden = !sleeve;
    document.getElementById('cover-preview-hint').hidden = sleeve;
    CoverEditor.renderPreview();
  },

  setSleeveColor(key) {
    CoverEditor.sleeveColor = key;
    document.querySelectorAll('.sleeve-swatch').forEach((swatch) => {
      swatch.setAttribute('aria-checked', String(swatch.dataset.color === key));
    });
    document.getElementById('sleeve-color-name').textContent = Sleeves.color(key).name;
    CoverEditor.renderPreview();
  },

  setDexStatus(text) {
    document.getElementById('dex-status').textContent = text;
  },

  async loadDexNames() {
    try {
      const names = await PokeApi.loadSpeciesNames();
      document.getElementById('dex-names').replaceChildren(...names.map((name) => CoverEditor.option(name, name)));
    } catch {
      CoverEditor.setDexStatus('Name suggestions need an internet connection.');
    }
  },

  resetDex(query) {
    document.getElementById('dex-query').value = query || '';
    const entry = document.getElementById('dex-entry');
    entry.replaceChildren(CoverEditor.option('', 'Fill first'));
    entry.disabled = true;
    CoverEditor.dexEntries = [];
    CoverEditor.setDexStatus('');
  },

  async fillFromDex() {
    const query = document.getElementById('dex-query').value.trim();
    if (!query) {
      CoverEditor.setDexStatus('Type a Pokémon name or number first.');
      return;
    }
    CoverEditor.setDexStatus('Looking up...');
    try {
      const result = await PokeApi.lookup(query);
      Object.entries(result.fields).forEach(([name, value]) => {
        CoverEditor.form.elements[name].value = value;
      });
      CoverEditor.dexEntries = result.entries;
      const entry = document.getElementById('dex-entry');
      entry.replaceChildren(...result.entries.map((item, index) => CoverEditor.option(index, item.game)));
      entry.disabled = result.entries.length === 0;
      CoverEditor.chooseEntry();
      CoverEditor.setDexStatus(`Filled from the Pokédex: ${result.fields.speciesName}, ${result.entries.length} entries.`);
    } catch (error) {
      CoverEditor.setDexStatus(error instanceof TypeError ? 'Pokédex lookup needs an internet connection.' : error.message);
    }
  },

  chooseEntry() {
    const chosen = CoverEditor.dexEntries[Number(document.getElementById('dex-entry').value)];
    if (chosen) {
      CoverEditor.form.elements.description.value = chosen.text;
    }
    CoverEditor.renderPreview();
  },

  option(value, text) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = text;
    return option;
  },

  fillOptions() {
    const variants = COVER_VARIANTS.map((_, index) => CoverEditor.option(index + 1, `Variation ${index + 1}`));
    document.getElementById('cover-variant').replaceChildren(CoverEditor.option(RANDOM_VARIANT, 'Random'), ...variants);
    document.getElementById('cover-hand-font').replaceChildren(
      ...Object.entries(COVER_HAND_FONTS).map(([key, font]) => CoverEditor.option(key, font.name)));
    document.getElementById('cover-label-font').replaceChildren(
      ...Object.entries(COVER_LABEL_FONTS).map(([key, font]) => CoverEditor.option(key, font.name)));
  },

  styleOf(cover) {
    return {
      variant: String(cover?.variant ?? RANDOM_VARIANT),
      handFont: cover?.handFont || DEFAULT_HAND_FONT,
      labelFont: cover?.labelFont || DEFAULT_LABEL_FONT,
    };
  },

  readStyle() {
    return {
      variant: CoverEditor.form.elements.variant.value === RANDOM_VARIANT
        ? RANDOM_VARIANT
        : Number(CoverEditor.form.elements.variant.value),
      handFont: CoverEditor.form.elements.handFont.value,
      labelFont: CoverEditor.form.elements.labelFont.value,
    };
  },

  load({ cover, pocket, cardUrl, cardName, settings }) {
    CoverEditor.settings = settings;
    CoverEditor.context = { id: cover ? cover.id : App.newId(), cover, pocket };
    const fields = cover ? cover.fields : Covers.emptyFields();
    COVER_FIELDS.forEach((name) => {
      CoverEditor.form.elements[name].value = fields[name] || '';
    });
    CoverEditor.resetDex(cardName);
    const style = CoverEditor.styleOf(cover);
    COVER_STYLE_FIELDS.forEach((name) => {
      CoverEditor.form.elements[name].value = style[name];
    });
    const card = document.getElementById('cover-preview-card');
    card.hidden = !cardUrl;
    card.src = cardUrl || '';
    const size = Covers.size(settings);
    const inset = settings.coverLeewayMm / 2;
    const percent = (part, whole) => `${(part / whole) * 100}%`;
    card.parentElement.style.aspectRatio = `${size.width} / ${size.height}`;
    card.style.left = percent(inset, size.width);
    card.style.top = percent(inset, size.height);
    card.style.width = percent(settings.cardWidthMm, size.width);
    card.style.height = percent(settings.cardHeightMm, size.height);
    document.getElementById('cover-save').textContent = cover ? 'Save frame' : 'Place frame';
    document.getElementById('cover-delete').hidden = !cover;
    CoverEditor.sleeveColor = cover?.sleeveColor || DEFAULT_SLEEVE_COLOR;
    CoverEditor.setSleeveColor(CoverEditor.sleeveColor);
    CoverEditor.setKind(cover ? Sleeves.kind(cover) : COVER_KIND_DEX);
  },

  read() {
    return Object.fromEntries(COVER_FIELDS.map((name) => [name, CoverEditor.form.elements[name].value]));
  },

  renderPreview() {
    if (!CoverEditor.context) {
      return;
    }
    const preview = document.getElementById('cover-preview-canvas');
    if (CoverEditor.kind === COVER_KIND_SLEEVE) {
      preview.parentElement.style.background = Sleeves.color(CoverEditor.sleeveColor).hex;
      preview.replaceChildren();
      return;
    }
    preview.parentElement.style.background = '';
    const cover = { id: CoverEditor.context.id, fields: CoverEditor.read(), ...CoverEditor.readStyle() };
    preview.replaceChildren(Covers.renderCanvas(cover, CoverEditor.settings, COVER_PREVIEW_PX_PER_MM, false, 'preview'));
  },

  readKind() {
    if (CoverEditor.kind === COVER_KIND_SLEEVE) {
      return { kind: COVER_KIND_SLEEVE, sleeveColor: CoverEditor.sleeveColor };
    }
    return { kind: COVER_KIND_DEX, ...CoverEditor.readStyle() };
  },

  async save() {
    const { id, cover, pocket } = CoverEditor.context;
    if (cover) {
      await CoverEditor.actions.update(id, CoverEditor.read(), CoverEditor.readKind());
    } else {
      await CoverEditor.actions.create(id, CoverEditor.read(), pocket, CoverEditor.readKind());
    }
    CardPicker.dialog.close();
  },

  async remove() {
    CardPicker.dialog.close();
    await CoverEditor.actions.remove(CoverEditor.context.id);
  },
};
