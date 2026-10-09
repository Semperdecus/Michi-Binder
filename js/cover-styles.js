const DEFAULT_HAND_FONT = 'la-belle-aurore';
const DEFAULT_LABEL_FONT = 'special-elite';
const RANDOM_VARIANT = 'random';
const VARIANT_SEED_SUFFIX = ':variant';

const COVER_HAND_FONTS = Object.freeze({
  'la-belle-aurore': { name: 'La Belle Aurore', family: '"La Belle Aurore", cursive', scale: 1 },
  'homemade-apple': { name: 'Homemade Apple', family: '"Homemade Apple", cursive', scale: 0.72 },
  'mrs-saint-delafield': { name: 'Mrs Saint Delafield', family: '"Mrs Saint Delafield", cursive', scale: 1 },
  'herr-von-muellerhoff': { name: 'Herr Von Muellerhoff', family: '"Herr Von Muellerhoff", cursive', scale: 1.05 },
  'monsieur-la-doulaise': { name: 'Monsieur La Doulaise', family: '"Monsieur La Doulaise", cursive', scale: 0.95 },
  'mr-de-haviland': { name: 'Mr De Haviland', family: '"Mr De Haviland", cursive', scale: 1 },
  allura: { name: 'Allura', family: '"Allura", cursive', scale: 1.05 },
  meddon: { name: 'Meddon', family: '"Meddon", cursive', scale: 0.72 },
  autography: { name: 'Autography', family: '"Autography", cursive', scale: 1.3 },
  'brother-signature': { name: 'Brother Signature', family: '"Brother Signature", cursive', scale: 1.4 },
  amsterdam: { name: 'Amsterdam (letters only, no numbers)', family: '"Amsterdam", cursive', scale: 0.68 },
  'always-classy': { name: 'Always Classy', family: '"Always Classy", cursive', scale: 0.75 },
});

const COVER_LABEL_FONTS = Object.freeze({
  'special-elite': { name: 'Special Elite', family: '"Special Elite", "Courier New", monospace', weight: 400, scale: 1 },
  'courier-prime-bold': { name: 'Courier Prime', family: '"Courier Prime", "Courier New", monospace', weight: 700, scale: 0.88 },
  'cutive-mono': { name: 'Cutive Mono', family: '"Cutive Mono", "Courier New", monospace', weight: 400, scale: 0.85 },
});

const COVER_VARIANTS = Object.freeze([
  { inkAlpha: 1, lineScale: 1, jitterScale: 1, textureAlpha: 0.35, paper: '#ece6d8', paperEdge: '#d9cfba', speckles: 520, chalkDots: 0, chalkAlpha: 0, aging: 1 },
  { inkAlpha: 0.93, lineScale: 0.95, jitterScale: 1.1, textureAlpha: 0.3, paper: '#ede7da', paperEdge: '#dbd2be', speckles: 560, chalkDots: 900, chalkAlpha: 0.35, aging: 1.1 },
  { inkAlpha: 0.9, lineScale: 1.05, jitterScale: 1.25, textureAlpha: 0.42, paper: '#ebe4d5', paperEdge: '#d7ccb5', speckles: 600, chalkDots: 1400, chalkAlpha: 0.4, aging: 1.3 },
  { inkAlpha: 0.96, lineScale: 1.1, jitterScale: 0.9, textureAlpha: 0.32, paper: '#eee9de', paperEdge: '#ddd5c2', speckles: 480, chalkDots: 500, chalkAlpha: 0.3, aging: 0.85 },
  { inkAlpha: 0.88, lineScale: 0.92, jitterScale: 1.35, textureAlpha: 0.45, paper: '#eae3d3', paperEdge: '#d5c9b0', speckles: 650, chalkDots: 1800, chalkAlpha: 0.45, aging: 1.4 },
  { inkAlpha: 0.94, lineScale: 1, jitterScale: 1.15, textureAlpha: 0.38, paper: '#ece5d6', paperEdge: '#d8cdb7', speckles: 700, chalkDots: 1100, chalkAlpha: 0.35, aging: 1.15 },
  { inkAlpha: 0.91, lineScale: 1.08, jitterScale: 1.05, textureAlpha: 0.4, paper: '#efe9dc', paperEdge: '#dcd3bf', speckles: 540, chalkDots: 1300, chalkAlpha: 0.38, aging: 1.2 },
  { inkAlpha: 0.97, lineScale: 0.97, jitterScale: 1.2, textureAlpha: 0.3, paper: '#ebe5d7', paperEdge: '#d9d0bb', speckles: 620, chalkDots: 700, chalkAlpha: 0.3, aging: 0.95 },
  { inkAlpha: 0.89, lineScale: 1.02, jitterScale: 1.3, textureAlpha: 0.44, paper: '#e9e2d1', paperEdge: '#d4c8ae', speckles: 680, chalkDots: 1600, chalkAlpha: 0.42, aging: 1.35 },
  { inkAlpha: 0.95, lineScale: 1.12, jitterScale: 0.95, textureAlpha: 0.36, paper: '#ede7d9', paperEdge: '#dad1bc', speckles: 500, chalkDots: 1000, chalkAlpha: 0.33, aging: 1.05 },
]);

const CoverStyles = {
  handFont(cover) {
    return COVER_HAND_FONTS[cover.handFont] || COVER_HAND_FONTS[DEFAULT_HAND_FONT];
  },

  labelFont(cover) {
    return COVER_LABEL_FONTS[cover.labelFont] || COVER_LABEL_FONTS[DEFAULT_LABEL_FONT];
  },

  variantNumber(cover) {
    const chosen = Number(cover.variant);
    if (chosen >= 1 && chosen <= COVER_VARIANTS.length) {
      return chosen;
    }
    return Math.floor(Covers.random(`${cover.id}${VARIANT_SEED_SUFFIX}`)() * COVER_VARIANTS.length) + 1;
  },

  look(cover) {
    return {
      ...COVER_VARIANTS[CoverStyles.variantNumber(cover) - 1],
      hand: CoverStyles.handFont(cover),
      label: CoverStyles.labelFont(cover),
    };
  },

  fontsToLoad() {
    const hands = Object.values(COVER_HAND_FONTS).map((font) => `10px ${font.family}`);
    const labels = Object.values(COVER_LABEL_FONTS).map((font) => `${font.weight} 10px ${font.family}`);
    return [...hands, ...labels];
  },
};
