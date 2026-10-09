const NUMBER_FIELDS = [
  'cardWidthMm',
  'cardHeightMm',
  'slotPitchXMm',
  'slotPitchYMm',
  'pieceSpacingMm',
  'sheetMarginMm',
  'frameWidthMm',
  'cornerRadiusMm',
  'coverLeewayMm',
];
const CHOICE_FIELDS = ['paper', 'placeholder'];
const CHECKBOX_FIELDS = ['showPrices'];

const SettingsPanel = {
  dialog: null,
  onSave: null,

  init(onSave) {
    SettingsPanel.onSave = onSave;
    SettingsPanel.dialog = document.getElementById('settings');
    SettingsPanel.dialog.querySelector('#settings-save').addEventListener('click', SettingsPanel.save);
    SettingsPanel.dialog.querySelector('#settings-cancel').addEventListener('click', () => SettingsPanel.dialog.close());
    SettingsPanel.dialog.querySelector('#settings-reset').addEventListener('click', () => SettingsPanel.fill(DEFAULT_SETTINGS));
    SettingsPanel.dialog.addEventListener('input', SettingsPanel.updateGaps);
  },

  field(name) {
    return SettingsPanel.dialog.querySelector(`[name="${name}"]`);
  },

  fill(settings) {
    NUMBER_FIELDS.forEach((name) => {
      SettingsPanel.field(name).value = String(settings[name]);
    });
    CHOICE_FIELDS.forEach((name) => {
      SettingsPanel.field(name).value = settings[name];
    });
    CHECKBOX_FIELDS.forEach((name) => {
      SettingsPanel.field(name).checked = Boolean(settings[name]);
    });
    SettingsPanel.field('theme').value = Theme.get();
    SettingsPanel.updateGaps();
  },

  read() {
    const settings = {};
    NUMBER_FIELDS.forEach((name) => {
      settings[name] = Number(SettingsPanel.field(name).value);
    });
    CHOICE_FIELDS.forEach((name) => {
      settings[name] = SettingsPanel.field(name).value;
    });
    CHECKBOX_FIELDS.forEach((name) => {
      settings[name] = SettingsPanel.field(name).checked;
    });
    return settings;
  },

  updateGaps() {
    const settings = SettingsPanel.read();
    SettingsPanel.dialog.querySelector('#settings-gaps').textContent =
      `Seam gap between columns: ${Geometry.gapX(settings).toFixed(1)} mm. Gap between rows: ${Geometry.gapY(settings).toFixed(1)} mm.`;
  },

  open(settings) {
    SettingsPanel.fill(settings);
    SettingsPanel.dialog.showModal();
  },

  save() {
    if (!SettingsPanel.dialog.querySelector('form').reportValidity()) {
      return;
    }
    SettingsPanel.dialog.close();
    Theme.set(SettingsPanel.field('theme').value);
    SettingsPanel.onSave(SettingsPanel.read());
  },
};
