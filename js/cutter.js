const PAPER_WHITE = '#FFFFFF';
const QUARTER_TURN = Math.PI / 2;
const GRADIENT_MIDDLE_STOP = 0.5;

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

  cropSource(artwork, image, settings) {
    const art = Geometry.artSize(settings, artwork.cols, artwork.rows);
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

  frameRect(artwork, settings, piece) {
    if (artwork.frameMode === 'piece') {
      return Geometry.pieceRect(settings, piece);
    }
    const art = Geometry.artSize(settings, artwork.cols, artwork.rows);
    return { x: 0, y: 0, width: art.width, height: art.height };
  },

  drawFrameRing(ctx, rect, settings, colors) {
    const border = settings.frameWidthMm;
    const radius = settings.cornerRadiusMm;
    const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(GRADIENT_MIDDLE_STOP, colors[1]);
    gradient.addColorStop(1, colors[2]);
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    ctx.roundRect(
      rect.x + border,
      rect.y + border,
      rect.width - 2 * border,
      rect.height - 2 * border,
      Math.max(radius - border, 0),
    );
    ctx.fillStyle = gradient;
    ctx.fill('evenodd');
  },

  drawPiece(ctx, artwork, image, settings, piece) {
    const rect = Geometry.pieceRect(settings, piece);
    const frame = Cutter.frameRect(artwork, settings, piece);
    const source = Cutter.cropSource(artwork, image, settings);
    ctx.save();
    ctx.fillStyle = PAPER_WHITE;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    ctx.beginPath();
    ctx.roundRect(frame.x, frame.y, frame.width, frame.height, settings.cornerRadiusMm);
    ctx.clip();
    ctx.drawImage(image, source.left, source.top, source.width, source.height, 0, 0, source.art.width, source.art.height);
    if (FRAME_COLORS[artwork.frame]) {
      Cutter.drawFrameRing(ctx, frame, settings, FRAME_COLORS[artwork.frame]);
    }
    ctx.restore();
  },

  renderPieceCanvas(artwork, image, settings, piece, pxPerMm, rotated) {
    const rect = Geometry.pieceRect(settings, piece);
    const width = Math.round(rect.width * pxPerMm);
    const height = Math.round(rect.height * pxPerMm);
    const canvas = document.createElement('canvas');
    canvas.width = rotated ? height : width;
    canvas.height = rotated ? width : height;
    const ctx = canvas.getContext('2d');
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
