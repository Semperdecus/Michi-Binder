const PAPER_WHITE = '#FFFFFF';
const QUARTER_TURN = Math.PI / 2;
const EDGE_HALFWAY = 0.5;
const FULL_TURN = 2 * Math.PI;
const RIM_WIDTH_MM = 0.4;
const INNER_SHADE = 'rgba(0, 0, 0, 0.15)';
const INNER_SHADE_WIDTH_MM = 0.25;
const SEAM_FILL = '#141416';

const Cutter = {
  defaultJoins(cols, rows) {
    return Array.from({ length: rows }, () => Array(cols - 1).fill(true));
  },

  pieces(artwork) {
    const result = [];
    for (let row = 0; row < artwork.rows; row++) {
      let start = 0;
      for (let col = 1; col <= artwork.cols; col++) {
        if (col === artwork.cols || !artwork.joins[row][col - 1]) {
          result.push({ artworkId: artwork.id, row, colStart: start, span: col - start });
          start = col;
        }
      }
    }
    return result;
  },

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  keepsAllArt(artwork) {
    return artwork.seamMode === 'keep';
  },

  joinedInAnyRow(artwork, seam) {
    return artwork.joins.some((row) => row[seam]);
  },

  keptColumnX(artwork, settings, col) {
    let x = col * settings.cardWidthMm;
    for (let seam = 0; seam < col; seam++) {
      if (Cutter.joinedInAnyRow(artwork, seam)) {
        x += Geometry.gapX(settings);
      }
    }
    return x;
  },

  artSize(artwork, settings) {
    if (Cutter.keepsAllArt(artwork)) {
      return {
        width: Cutter.keptColumnX(artwork, settings, artwork.cols),
        height: artwork.rows * settings.cardHeightMm,
      };
    }
    return Geometry.artSize(settings, artwork.cols, artwork.rows);
  },

  cells(settings, piece) {
    return Array.from({ length: piece.span }, (_, index) => ({
      col: piece.colStart + index,
      row: piece.row,
      x: (piece.colStart + index) * settings.slotPitchXMm,
      y: piece.row * settings.slotPitchYMm,
      width: settings.cardWidthMm,
      height: settings.cardHeightMm,
    }));
  },

  cropSource(artwork, image, settings) {
    const art = Cutter.artSize(artwork, settings);
    const coverScale = Math.min(image.width / art.width, image.height / art.height);
    const scale = coverScale / artwork.crop.zoom;
    const width = art.width * scale;
    const height = art.height * scale;
    const left = Cutter.clamp(artwork.crop.centerX * image.width - width / 2, 0, image.width - width);
    const top = Cutter.clamp(artwork.crop.centerY * image.height - height / 2, 0, image.height - height);
    return { left, top, width, height, scale, art };
  },

  clampCrop(artwork, image, settings) {
    const source = Cutter.cropSource(artwork, image, settings);
    artwork.crop.centerX = (source.left + source.width / 2) / image.width;
    artwork.crop.centerY = (source.top + source.height / 2) / image.height;
  },

  effectiveDpi(artwork, image, settings) {
    return Cutter.cropSource(artwork, image, settings).scale * MM_PER_INCH;
  },

  frameRects(artwork, settings, piece) {
    if (artwork.frameMode === 'piece') {
      return [Geometry.pieceRect(settings, piece)];
    }
    if (artwork.frameMode === 'pocket') {
      return Cutter.cells(settings, piece);
    }
    const art = Geometry.artSize(settings, artwork.cols, artwork.rows);
    return [{ x: 0, y: 0, width: art.width, height: art.height }];
  },

  drawSeamStrips(ctx, settings, piece) {
    ctx.fillStyle = SEAM_FILL;
    Cutter.cells(settings, piece).slice(1).forEach((cell) => {
      ctx.fillRect(cell.x - Geometry.gapX(settings), cell.y, Geometry.gapX(settings), cell.height);
    });
  },

  drawArt(ctx, artwork, image, settings, piece) {
    const source = Cutter.cropSource(artwork, image, settings);
    if (!Cutter.keepsAllArt(artwork)) {
      ctx.drawImage(image, source.left, source.top, source.width, source.height, 0, 0, source.art.width, source.art.height);
      return;
    }
    const rect = Geometry.pieceRect(settings, piece);
    ctx.drawImage(
      image,
      source.left + Cutter.keptColumnX(artwork, settings, piece.colStart) * source.scale,
      source.top + piece.row * settings.cardHeightMm * source.scale,
      rect.width * source.scale,
      rect.height * source.scale,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    );
  },

  isFramed(artwork) {
    return Boolean(FRAME_COLORS[artwork.frame]);
  },

  frameWidth(artwork, settings) {
    return artwork.frameWidthMm ?? settings.frameWidthMm;
  },

  edgeGradient(ctx, rect, colors) {
    const halfWidth = rect.width / 2;
    const halfHeight = rect.height / 2;
    const quadrant = [
      [0, colors.edgeMiddle],
      [Math.atan2(halfHeight * EDGE_HALFWAY, halfWidth), colors.edgeHalfway],
      [Math.atan2(halfHeight, halfWidth), colors.corner],
      [Math.atan2(halfHeight, halfWidth * EDGE_HALFWAY), colors.edgeHalfway],
      [Math.PI / 2, colors.edgeMiddle],
    ];
    const stops = quadrant.flatMap(([angle, color]) => [
      [angle, color],
      [Math.PI - angle, color],
      [Math.PI + angle, color],
      [FULL_TURN - angle, color],
    ]);
    const gradient = ctx.createConicGradient(0, rect.x + halfWidth, rect.y + halfHeight);
    stops
      .sort((a, b) => a[0] - b[0])
      .forEach(([angle, color]) => gradient.addColorStop(angle / FULL_TURN, color));
    return gradient;
  },

  innerRect(rect, inset, radius) {
    return [rect.x + inset, rect.y + inset, rect.width - 2 * inset, rect.height - 2 * inset, Math.max(radius - inset, 0)];
  },

  drawFrameRing(ctx, rect, settings, colors, border) {
    const radius = settings.cornerRadiusMm;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    ctx.roundRect(...Cutter.innerRect(rect, border, radius));
    ctx.fillStyle = Cutter.edgeGradient(ctx, rect, colors);
    ctx.fill('evenodd');
    if (border <= RIM_WIDTH_MM + INNER_SHADE_WIDTH_MM) {
      return;
    }
    ctx.lineWidth = RIM_WIDTH_MM;
    ctx.strokeStyle = colors.rim;
    ctx.beginPath();
    ctx.roundRect(...Cutter.innerRect(rect, RIM_WIDTH_MM / 2, radius));
    ctx.stroke();
    ctx.lineWidth = INNER_SHADE_WIDTH_MM;
    ctx.strokeStyle = INNER_SHADE;
    ctx.beginPath();
    ctx.roundRect(...Cutter.innerRect(rect, border - INNER_SHADE_WIDTH_MM / 2, radius));
    ctx.stroke();
  },

  drawPiece(ctx, artwork, image, settings, piece) {
    const rect = Geometry.pieceRect(settings, piece);
    const frames = Cutter.frameRects(artwork, settings, piece);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    ctx.beginPath();
    const radius = Cutter.isFramed(artwork) ? settings.cornerRadiusMm : 0;
    frames.forEach((frame) => ctx.roundRect(frame.x, frame.y, frame.width, frame.height, radius));
    ctx.clip();
    ctx.fillStyle = PAPER_WHITE;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    Cutter.drawSeamStrips(ctx, settings, piece);
    Cutter.drawArt(ctx, artwork, image, settings, piece);
    if (Cutter.isFramed(artwork)) {
      const border = Cutter.frameWidth(artwork, settings);
      frames.forEach((frame) => Cutter.drawFrameRing(ctx, frame, settings, FRAME_COLORS[artwork.frame], border));
    }
    ctx.restore();
  },

  renderPieceCanvas(artwork, image, settings, piece, pxPerMm, rotated, onPaper = false) {
    const rect = Geometry.pieceRect(settings, piece);
    const width = Math.round(rect.width * pxPerMm);
    const height = Math.round(rect.height * pxPerMm);
    const canvas = document.createElement('canvas');
    canvas.width = rotated ? height : width;
    canvas.height = rotated ? width : height;
    const ctx = canvas.getContext('2d');
    if (onPaper) {
      ctx.fillStyle = PAPER_WHITE;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (rotated) {
      ctx.translate(canvas.width, 0);
      ctx.rotate(QUARTER_TURN);
    }
    ctx.scale(pxPerMm, pxPerMm);
    ctx.translate(-rect.x, -rect.y);
    Cutter.drawPiece(ctx, artwork, image, settings, piece);
    return canvas;
  },
};
