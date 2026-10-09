const COVER_BASE_WIDTH_MM = 63;
const COVER_BASE_HEIGHT_MM = 88;
const COVER_INK = '#26221e';
const COVER_HAND_INK = '#1b1917';
const COVER_SPECKLE = '#5a4a32';
const COVER_SPECKLE_MAX_MM = 0.14;
const COVER_SPECKLE_MAX_ALPHA = 0.14;
const COVER_LINE_MM = 0.22;
const COVER_TEXTURE_LINE_MM = 0.12;
const COVER_JITTER_MM = 0.12;
const COVER_SEGMENT_MM = 3;
const COVER_CUT_NOTE = 'cut out';
const COVER_CUT_NOTE_COLOR = '#b8b2a6';
const COVER_CUT_NOTE_MM = 2;
const COVER_TILT_RADIANS = 0.02;
const COVER_SHRINK_STEP = 0.92;
const COVER_MIN_TEXT_MM = 1.4;
const COVER_LINE_SPACING = 1.45;
const COVER_AGING_SPOTS = 22;
const COVER_AGING_MIN_MM = 4;
const COVER_AGING_RANGE_MM = 14;
const COVER_AGING_MAX_ALPHA = 0.22;
const COVER_FADE_SPOTS = 36;
const COVER_FADE_MIN_MM = 1;
const COVER_FADE_RANGE_MM = 3;
const COVER_FADE_MAX_ALPHA = 0.28;
const COVER_FADE_COLOR = '#faf7ef';
const COVER_AGING_COLORS = ['#f7f2e7', '#cdbf9f', '#e3d3a6', '#d8c9ab'];
const COVER_PAPER_SEED_SUFFIX = ':paper';
const COVER_CHALK_MIN_MM = 0.02;
const COVER_CHALK_RANGE_MM = 0.05;
const COVER_HASH_SEED = 2166136261;
const COVER_HASH_PRIME = 16777619;
const COVER_RANDOM_INCREMENT = 0x6d2b79f5;
const COVER_RANDOM_SHIFT_A = 15;
const COVER_RANDOM_SHIFT_B = 7;
const COVER_RANDOM_SHIFT_C = 14;
const COVER_RANDOM_OR_A = 1;
const COVER_RANDOM_OR_B = 61;
const COVER_RANDOM_RANGE = 4294967296;
const COVER_LABEL_STROKE_MM = 0.07;
const COVER_RANDOM_CENTER = 0.5;
const COVER_TABLE_ROWS = 4;
const COVER_HEIGHT_ROW = 3;
const COVER_PAPER_INNER_RATIO = 0.25;
const COVER_PAPER_OUTER_RATIO = 0.7;

const COVER_LAYOUT = Object.freeze({
  border: 1.6,
  textLeft: 2.8,
  headerBottom: 9.6,
  headerDivider: 21.5,
  window: { x: 5.8, y: 10.6, width: 51.4, height: 30.4 },
  tableTop: 42.2,
  rowHeight: 3.7,
  labelColumn: 20.5,
  weightLabel: 33,
  weightValue: 44.5,
  descriptionLabel: 59.6,
  descriptionTop: 60.6,
  descriptionWidth: 56,
  labelSize: 2.05,
  nameLabelSize: 2.3,
  nameSize: 5.2,
  valueSize: 3.1,
  descriptionSize: 3,
  nameLabelBaseline: 6.4,
  nameBaseline: 8.4,
  nameIndent: 1.2,
  labelBaselineRatio: 0.72,
  valueBaselineInset: 0.5,
  valueIndent: 1,
  weightLabelIndent: 0.8,
  descriptionIndent: 0.4,
  rightInset: 1,
});

const COVER_FIELDS = ['speciesName', 'speciesNumber', 'classification', 'types', 'height', 'weight', 'description'];

const Covers = {
  look: null,
  seed: '',
  margin: { x: 0, y: 0 },
  width: COVER_BASE_WIDTH_MM,
  height: COVER_BASE_HEIGHT_MM,

  emptyFields() {
    return Object.fromEntries(COVER_FIELDS.map((field) => [field, '']));
  },

  title(cover) {
    if (Sleeves.isSleeve(cover)) {
      return Sleeves.title(cover);
    }
    return cover.fields.speciesName.trim() || 'Untitled frame';
  },

  random(seedText) {
    let seed = COVER_HASH_SEED;
    for (const char of seedText) {
      seed = Math.imul(seed ^ char.charCodeAt(0), COVER_HASH_PRIME);
    }
    return () => {
      seed = (seed + COVER_RANDOM_INCREMENT) | 0;
      let value = Math.imul(seed ^ (seed >>> COVER_RANDOM_SHIFT_A), seed | COVER_RANDOM_OR_A);
      value ^= value + Math.imul(value ^ (value >>> COVER_RANDOM_SHIFT_B), value | COVER_RANDOM_OR_B);
      return ((value ^ (value >>> COVER_RANDOM_SHIFT_C)) >>> 0) / COVER_RANDOM_RANGE;
    };
  },

  drawPaper(ctx, rand) {
    const gradient = ctx.createRadialGradient(
      Covers.width / 2, Covers.height / 2, Covers.width * COVER_PAPER_INNER_RATIO,
      Covers.width / 2, Covers.height / 2, Covers.height * COVER_PAPER_OUTER_RATIO,
    );
    gradient.addColorStop(0, Covers.look.paper);
    gradient.addColorStop(1, Covers.look.paperEdge);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, Covers.width, Covers.height);
    Covers.drawAging(ctx);
    ctx.fillStyle = COVER_SPECKLE;
    for (let index = 0; index < Covers.look.speckles; index++) {
      ctx.globalAlpha = rand() * COVER_SPECKLE_MAX_ALPHA;
      ctx.beginPath();
      ctx.arc(rand() * Covers.width, rand() * Covers.height, rand() * COVER_SPECKLE_MAX_MM, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  drawAging(ctx) {
    const rand = Covers.random(`${Covers.seed}${COVER_PAPER_SEED_SUFFIX}`);
    const aging = Covers.look.aging;
    for (let index = 0; index < Math.round(COVER_AGING_SPOTS * aging); index++) {
      const color = COVER_AGING_COLORS[Math.floor(rand() * COVER_AGING_COLORS.length)];
      Covers.softSpot(ctx, rand, color, COVER_AGING_MIN_MM, COVER_AGING_RANGE_MM, COVER_AGING_MAX_ALPHA * aging);
    }
    for (let index = 0; index < Math.round(COVER_FADE_SPOTS * aging); index++) {
      Covers.softSpot(ctx, rand, COVER_FADE_COLOR, COVER_FADE_MIN_MM, COVER_FADE_RANGE_MM, COVER_FADE_MAX_ALPHA * aging);
    }
    ctx.globalAlpha = 1;
  },

  softSpot(ctx, rand, color, minRadius, radiusRange, maxAlpha) {
    const x = rand() * Covers.width;
    const y = rand() * Covers.height;
    const radius = minRadius + rand() * radiusRange;
    const spot = ctx.createRadialGradient(x, y, 0, x, y, radius);
    spot.addColorStop(0, color);
    spot.addColorStop(1, `${color}00`);
    ctx.globalAlpha = rand() * maxAlpha;
    ctx.fillStyle = spot;
    ctx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
  },

  sketchLine(ctx, rand, x1, y1, x2, y2) {
    const steps = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / COVER_SEGMENT_MM));
    const look = Covers.look;
    const passes = [
      [COVER_LINE_MM * look.lineScale, look.inkAlpha],
      [COVER_TEXTURE_LINE_MM * look.lineScale, look.textureAlpha * look.inkAlpha],
    ];
    const jitter = COVER_JITTER_MM * look.jitterScale;
    ctx.strokeStyle = COVER_INK;
    ctx.lineCap = 'round';
    for (const [width, alpha] of passes) {
      ctx.lineWidth = width;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const x = x1 + (x2 - x1) * t + (rand() - COVER_RANDOM_CENTER) * jitter;
        const y = y1 + (y2 - y1) * t + (rand() - COVER_RANDOM_CENTER) * jitter;
        if (step === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  sketchRect(ctx, rand, x, y, width, height) {
    Covers.sketchLine(ctx, rand, x, y, x + width, y);
    Covers.sketchLine(ctx, rand, x + width, y, x + width, y + height);
    Covers.sketchLine(ctx, rand, x + width, y + height, x, y + height);
    Covers.sketchLine(ctx, rand, x, y + height, x, y);
  },

  drawWindow(ctx, rand, mode) {
    const { x, y, width, height } = COVER_LAYOUT.window;
    if (mode === 'print') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, width, height);
      ctx.font = `${COVER_CUT_NOTE_MM}px ${Covers.look.label.family}`;
      ctx.fillStyle = COVER_CUT_NOTE_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(COVER_CUT_NOTE, x + width / 2, y + height / 2);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    } else {
      ctx.clearRect(x, y, width, height);
    }
    Covers.sketchRect(ctx, rand, x, y, width, height);
  },

  drawGrid(ctx, rand) {
    const layout = COVER_LAYOUT;
    const left = layout.border - Covers.margin.x;
    const top = layout.border - Covers.margin.y;
    const right = COVER_BASE_WIDTH_MM - layout.border + Covers.margin.x;
    const bottom = COVER_BASE_HEIGHT_MM - layout.border + Covers.margin.y;
    Covers.sketchRect(ctx, rand, left, top, right - left, bottom - top);
    Covers.sketchLine(ctx, rand, left, layout.headerBottom, right, layout.headerBottom);
    Covers.sketchLine(ctx, rand, layout.headerDivider, top, layout.headerDivider, layout.headerBottom);
    const tableBottom = layout.tableTop + COVER_TABLE_ROWS * layout.rowHeight;
    for (let row = 0; row <= COVER_TABLE_ROWS; row++) {
      const y = layout.tableTop + row * layout.rowHeight;
      Covers.sketchLine(ctx, rand, left, y, right, y);
    }
    Covers.sketchLine(ctx, rand, layout.labelColumn, layout.tableTop, layout.labelColumn, tableBottom);
    const heightRow = layout.tableTop + COVER_HEIGHT_ROW * layout.rowHeight;
    Covers.sketchLine(ctx, rand, layout.weightLabel, heightRow, layout.weightLabel, tableBottom);
    Covers.sketchLine(ctx, rand, layout.weightValue, heightRow, layout.weightValue, tableBottom);
  },

  label(ctx, text, x, baseline, size) {
    const font = Covers.look.label;
    ctx.font = `${font.weight} ${size * font.scale}px ${font.family}`;
    ctx.globalAlpha = Covers.look.inkAlpha;
    ctx.fillStyle = COVER_INK;
    ctx.strokeStyle = COVER_INK;
    ctx.lineWidth = COVER_LABEL_STROKE_MM;
    ctx.fillText(text, x, baseline);
    ctx.strokeText(text, x, baseline);
    ctx.globalAlpha = 1;
  },

  handFont(size) {
    return `${size * Covers.look.hand.scale}px ${Covers.look.hand.family}`;
  },

  fittedSize(ctx, text, size, maxWidth) {
    let fitted = size;
    ctx.font = Covers.handFont(fitted);
    while (ctx.measureText(text).width > maxWidth && fitted > COVER_MIN_TEXT_MM) {
      fitted *= COVER_SHRINK_STEP;
      ctx.font = Covers.handFont(fitted);
    }
    return fitted;
  },

  handwrite(ctx, rand, text, x, baseline, size, maxWidth) {
    if (!text.trim()) {
      return;
    }
    const fitted = Covers.fittedSize(ctx, text.trim(), size, maxWidth);
    ctx.save();
    ctx.translate(x, baseline);
    ctx.rotate((rand() - COVER_RANDOM_CENTER) * COVER_TILT_RADIANS);
    ctx.font = Covers.handFont(fitted);
    ctx.globalAlpha = Covers.look.inkAlpha;
    ctx.fillStyle = COVER_HAND_INK;
    ctx.fillText(text.trim(), 0, 0);
    ctx.restore();
  },

  wrap(ctx, text, maxWidth) {
    const lines = [];
    for (const paragraph of text.trim().split(/\n+/)) {
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) {
        lines.push(line);
      }
    }
    return lines;
  },

  drawDescription(ctx, rand, text) {
    const layout = COVER_LAYOUT;
    if (!text.trim()) {
      return;
    }
    const available = COVER_BASE_HEIGHT_MM + Covers.margin.y - layout.border - layout.descriptionTop;
    let size = layout.descriptionSize;
    let lines = [];
    do {
      ctx.font = Covers.handFont(size);
      lines = Covers.wrap(ctx, text, layout.descriptionWidth);
      if (size + (lines.length - 1) * size * COVER_LINE_SPACING <= available || size <= COVER_MIN_TEXT_MM) {
        break;
      }
      size *= COVER_SHRINK_STEP;
    } while (size > COVER_MIN_TEXT_MM);
    lines.forEach((line, index) => {
      const baseline = layout.descriptionTop + size + index * size * COVER_LINE_SPACING;
      Covers.handwrite(ctx, rand, line, layout.textLeft + layout.descriptionIndent, baseline, size, layout.descriptionWidth);
    });
  },

  drawText(ctx, rand, fields) {
    const layout = COVER_LAYOUT;
    const rowBaseline = (row) => layout.tableTop + row * layout.rowHeight + layout.rowHeight * layout.labelBaselineRatio;
    const valueBaseline = (row) => layout.tableTop + (row + 1) * layout.rowHeight - layout.valueBaselineInset;
    const valueLeft = layout.labelColumn + layout.valueIndent;
    const rightEdge = COVER_BASE_WIDTH_MM + Covers.margin.x - layout.border - layout.rightInset;
    const nameLeft = layout.headerDivider + layout.nameIndent;
    Covers.label(ctx, 'Species Name:', layout.textLeft, layout.nameLabelBaseline, layout.nameLabelSize);
    Covers.handwrite(ctx, rand, fields.speciesName, nameLeft, layout.nameBaseline, layout.nameSize, rightEdge - nameLeft);
    const rows = [
      ['Species Number:', fields.speciesNumber],
      ['Classification:', fields.classification],
      ['Type(s):', fields.types],
    ];
    rows.forEach(([text, value], row) => {
      Covers.label(ctx, text, layout.textLeft, rowBaseline(row), layout.labelSize);
      Covers.handwrite(ctx, rand, value, valueLeft, valueBaseline(row), layout.valueSize, rightEdge - valueLeft);
    });
    Covers.label(ctx, 'Height:', layout.textLeft, rowBaseline(COVER_HEIGHT_ROW), layout.labelSize);
    const weightLeft = layout.weightValue + layout.valueIndent;
    Covers.handwrite(ctx, rand, fields.height, valueLeft, valueBaseline(COVER_HEIGHT_ROW), layout.valueSize, layout.weightLabel - valueLeft - layout.valueBaselineInset);
    Covers.label(ctx, 'Weight:', layout.weightLabel + layout.weightLabelIndent, rowBaseline(COVER_HEIGHT_ROW), layout.labelSize);
    Covers.handwrite(ctx, rand, fields.weight, weightLeft, valueBaseline(COVER_HEIGHT_ROW), layout.valueSize, rightEdge - weightLeft);
    Covers.label(ctx, 'Description:', layout.textLeft, layout.descriptionLabel, layout.labelSize);
    Covers.drawDescription(ctx, rand, fields.description);
  },

  insideWindow(x, y) {
    const { window } = COVER_LAYOUT;
    const left = window.x + Covers.margin.x;
    const top = window.y + Covers.margin.y;
    return x >= left && x <= left + window.width && y >= top && y <= top + window.height;
  },

  drawChalk(ctx, rand, mode) {
    ctx.fillStyle = Covers.look.paper;
    for (let index = 0; index < Covers.look.chalkDots; index++) {
      const x = rand() * Covers.width;
      const y = rand() * Covers.height;
      const radius = COVER_CHALK_MIN_MM + rand() * COVER_CHALK_RANGE_MM;
      ctx.globalAlpha = rand() * Covers.look.chalkAlpha;
      if (mode === 'print' || !Covers.insideWindow(x, y)) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },

  draw(ctx, cover, mode, margin) {
    const rand = Covers.random(cover.id);
    Covers.seed = cover.id;
    Covers.look = CoverStyles.look(cover);
    Covers.margin = margin;
    Covers.width = COVER_BASE_WIDTH_MM + 2 * margin.x;
    Covers.height = COVER_BASE_HEIGHT_MM + 2 * margin.y;
    Covers.drawPaper(ctx, rand);
    ctx.save();
    ctx.translate(margin.x, margin.y);
    Covers.drawWindow(ctx, rand, mode);
    Covers.drawGrid(ctx, rand);
    Covers.drawText(ctx, rand, cover.fields);
    ctx.restore();
    Covers.drawChalk(ctx, rand, mode);
  },

  size(settings) {
    return {
      width: settings.cardWidthMm + settings.coverLeewayMm,
      height: settings.cardHeightMm + settings.coverLeewayMm,
    };
  },

  renderCanvas(cover, settings, pxPerMm, rotated, mode) {
    const size = Covers.size(settings);
    const width = Math.round(size.width * pxPerMm);
    const height = Math.round(size.height * pxPerMm);
    const scaleX = settings.cardWidthMm / COVER_BASE_WIDTH_MM;
    const scaleY = settings.cardHeightMm / COVER_BASE_HEIGHT_MM;
    const margin = { x: settings.coverLeewayMm / 2 / scaleX, y: settings.coverLeewayMm / 2 / scaleY };
    const canvas = document.createElement('canvas');
    canvas.width = rotated ? height : width;
    canvas.height = rotated ? width : height;
    const ctx = canvas.getContext('2d');
    if (rotated) {
      ctx.translate(canvas.width, 0);
      ctx.rotate(QUARTER_TURN);
    }
    ctx.scale(pxPerMm, pxPerMm);
    ctx.scale(scaleX, scaleY);
    Covers.draw(ctx, cover, mode, margin);
    return canvas;
  },

  loadFonts() {
    return Promise.all(CoverStyles.fontsToLoad().map((font) => document.fonts.load(font)));
  },
};
