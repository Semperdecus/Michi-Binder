const MM_PER_INCH = 25.4;
const POINTS_PER_INCH = 72;
const BINDER_COLUMNS = 3;
const BINDER_ROWS = 3;
const TARGET_DPI = 300;
const MINIMUM_DPI = 150;
const SIZE_TOLERANCE_MM = 0.1;
const SETTINGS_STORAGE_KEY = 'settings';

const PAPER_SIZES_MM = Object.freeze({
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
});

const FRAME_COLORS = Object.freeze({
  gold: { edgeMiddle: '#FFE877', edgeHalfway: '#F5D04A', corner: '#DDAE2A', rim: '#FFF6A8' },
  silver: { edgeMiddle: '#DCDDDE', edgeHalfway: '#BCBEC0', corner: '#979A9C', rim: '#F4F5F5' },
});

const DEFAULT_SETTINGS = Object.freeze({
  cardWidthMm: 63,
  cardHeightMm: 88,
  slotPitchXMm: 70,
  slotPitchYMm: 95,
  pieceSpacingMm: 1,
  sheetMarginMm: 5,
  paper: 'A4',
  frameWidthMm: 3,
  cornerRadiusMm: 3,
  placeholder: 'outline',
  showPrices: false,
});

const Geometry = {
  gapX(settings) {
    return settings.slotPitchXMm - settings.cardWidthMm;
  },

  gapY(settings) {
    return settings.slotPitchYMm - settings.cardHeightMm;
  },

  pieceWidth(settings, span) {
    return span * settings.cardWidthMm + (span - 1) * Geometry.gapX(settings);
  },

  artSize(settings, cols, rows) {
    return {
      width: Geometry.pieceWidth(settings, cols),
      height: rows * settings.cardHeightMm + (rows - 1) * Geometry.gapY(settings),
    };
  },

  pieceRect(settings, piece) {
    return {
      x: piece.colStart * settings.slotPitchXMm,
      y: piece.row * settings.slotPitchYMm,
      width: Geometry.pieceWidth(settings, piece.span),
      height: settings.cardHeightMm,
    };
  },

  mmToPx(mm, dpi) {
    return (mm / MM_PER_INCH) * dpi;
  },

  mmToPoints(mm) {
    return (mm / MM_PER_INCH) * POINTS_PER_INCH;
  },

  paper(settings) {
    return PAPER_SIZES_MM[settings.paper] || PAPER_SIZES_MM.A4;
  },
};
