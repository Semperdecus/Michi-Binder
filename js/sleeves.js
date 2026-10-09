const COVER_KIND_DEX = 'dex';
const COVER_KIND_SLEEVE = 'sleeve';
const DEFAULT_SLEEVE_COLOR = 'blood-red';
const SLEEVE_THUMB_PX_PER_MM = 2.4;
const SLEEVE_CARD_FILL = 'rgba(255, 255, 255, 0.18)';

const SLEEVE_COLORS = Object.freeze([
  { key: 'black', name: 'Black', hex: '#1c1c1f' },
  { key: 'white', name: 'White', hex: '#f2f1ec' },
  { key: 'clear', name: 'Clear', hex: 'rgba(225, 232, 240, 0.55)' },
  { key: 'blood-red', name: 'Blood Red', hex: '#9e1b20' },
  { key: 'apple-red', name: 'Apple Red', hex: '#d7262e' },
  { key: 'hot-pink', name: 'Hot Pink', hex: '#e8448f' },
  { key: 'pink', name: 'Pink', hex: '#f3a6c4' },
  { key: 'magenta', name: 'Magenta', hex: '#b5257f' },
  { key: 'royal-purple', name: 'Royal Purple', hex: '#5b2d8e' },
  { key: 'lilac', name: 'Lilac', hex: '#b9a3d6' },
  { key: 'midnight-blue', name: 'Midnight Blue', hex: '#1d2a5c' },
  { key: 'royal-blue', name: 'Royal Blue', hex: '#2453b8' },
  { key: 'sky-blue', name: 'Sky Blue', hex: '#62b5e5' },
  { key: 'petrol', name: 'Petrol', hex: '#14606b' },
  { key: 'forest-green', name: 'Forest Green', hex: '#1f5a35' },
  { key: 'apple-green', name: 'Apple Green', hex: '#6cbf3b' },
  { key: 'yellow', name: 'Yellow', hex: '#f4cf2a' },
  { key: 'tangerine', name: 'Tangerine', hex: '#f08a24' },
  { key: 'copper', name: 'Copper', hex: '#a8643a' },
  { key: 'gold', name: 'Gold', hex: '#c9a447' },
  { key: 'silver', name: 'Silver', hex: '#a9adb3' },
  { key: 'slate', name: 'Slate', hex: '#5e6670' },
]);

const Sleeves = {
  kind(cover) {
    return cover.kind === COVER_KIND_SLEEVE ? COVER_KIND_SLEEVE : COVER_KIND_DEX;
  },

  isSleeve(cover) {
    return Sleeves.kind(cover) === COVER_KIND_SLEEVE;
  },

  color(key) {
    return SLEEVE_COLORS.find((color) => color.key === key) || SLEEVE_COLORS.find((color) => color.key === DEFAULT_SLEEVE_COLOR);
  },

  title(cover) {
    return `${Sleeves.color(cover.sleeveColor).name} sleeve`;
  },

  thumbnail(cover, settings) {
    const size = Covers.size(settings);
    const inset = settings.coverLeewayMm / 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(size.width * SLEEVE_THUMB_PX_PER_MM);
    canvas.height = Math.round(size.height * SLEEVE_THUMB_PX_PER_MM);
    const ctx = canvas.getContext('2d');
    ctx.scale(SLEEVE_THUMB_PX_PER_MM, SLEEVE_THUMB_PX_PER_MM);
    ctx.fillStyle = Sleeves.color(cover.sleeveColor).hex;
    ctx.beginPath();
    ctx.roundRect(0, 0, size.width, size.height, settings.cornerRadiusMm);
    ctx.fill();
    ctx.fillStyle = SLEEVE_CARD_FILL;
    ctx.beginPath();
    ctx.roundRect(inset, inset, settings.cardWidthMm, settings.cardHeightMm, settings.cornerRadiusMm);
    ctx.fill();
    return canvas;
  },
};
