const ORIENTATIONS = ['portrait', 'landscape'];

const Packer = {
  pack(items, settings) {
    const upright = Packer.packAll(items, settings, false);
    const rotating = Packer.packAll(items, settings, true);
    return rotating.sheets.length < upright.sheets.length ? rotating : upright;
  },

  packAll(items, settings, allowRotation) {
    let remaining = [...items].sort((a, b) => b.width * b.height - a.width * a.height || b.width - a.width);
    const sheets = [];
    while (remaining.length > 0) {
      const candidates = ORIENTATIONS.map((orientation) =>
        Packer.fillSheet(remaining, orientation, settings, allowRotation),
      );
      const best = candidates.reduce((a, b) => (b.placedArea > a.placedArea ? b : a));
      if (best.placements.length === 0) {
        break;
      }
      sheets.push(best);
      const placed = new Set(best.placements.map((placement) => placement.item));
      remaining = remaining.filter((item) => !placed.has(item));
    }
    return { sheets, unplaced: remaining };
  },

  orientedPaper(settings, orientation) {
    const paper = Geometry.paper(settings);
    const shortSide = Math.min(paper.width, paper.height);
    const longSide = Math.max(paper.width, paper.height);
    return orientation === 'portrait'
      ? { width: shortSide, height: longSide }
      : { width: longSide, height: shortSide };
  },

  fillSheet(items, orientation, settings, allowRotation) {
    const paper = Packer.orientedPaper(settings, orientation);
    const margin = settings.sheetMarginMm;
    const spacing = settings.pieceSpacingMm;
    let free = [{ x: 0, y: 0, width: paper.width - 2 * margin + spacing, height: paper.height - 2 * margin + spacing }];
    const placements = [];
    let placedArea = 0;
    for (const item of items) {
      const fit = Packer.findBestFit(free, item.width + spacing, item.height + spacing, allowRotation);
      if (!fit) {
        continue;
      }
      placements.push({
        item,
        x: margin + fit.x,
        y: margin + fit.y,
        width: fit.rotated ? item.height : item.width,
        height: fit.rotated ? item.width : item.height,
        rotated: fit.rotated,
      });
      placedArea += item.width * item.height;
      free = Packer.splitFree(free, fit);
    }
    const freeRects = free.map((rect) => ({ ...rect, x: rect.x + margin, y: rect.y + margin }));
    return { orientation, width: paper.width, height: paper.height, placements, placedArea, freeRects };
  },

  findBestFit(free, width, height, allowRotation) {
    let best = null;
    const options = allowRotation ? [[width, height, false], [height, width, true]] : [[width, height, false]];
    for (const rect of free) {
      for (const [w, h, rotated] of options) {
        if (w > rect.width || h > rect.height) {
          continue;
        }
        const shortFit = Math.min(rect.width - w, rect.height - h);
        const longFit = Math.max(rect.width - w, rect.height - h);
        if (!best || shortFit < best.shortFit || (shortFit === best.shortFit && longFit < best.longFit)) {
          best = { x: rect.x, y: rect.y, width: w, height: h, rotated, shortFit, longFit };
        }
      }
    }
    return best;
  },

  intersects(a, b) {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  },

  contains(outer, inner) {
    return (
      inner.x >= outer.x &&
      inner.y >= outer.y &&
      inner.x + inner.width <= outer.x + outer.width &&
      inner.y + inner.height <= outer.y + outer.height
    );
  },

  splitFree(free, used) {
    const next = [];
    for (const rect of free) {
      if (!Packer.intersects(rect, used)) {
        next.push(rect);
        continue;
      }
      if (used.x > rect.x) {
        next.push({ x: rect.x, y: rect.y, width: used.x - rect.x, height: rect.height });
      }
      if (used.x + used.width < rect.x + rect.width) {
        const x = used.x + used.width;
        next.push({ x, y: rect.y, width: rect.x + rect.width - x, height: rect.height });
      }
      if (used.y > rect.y) {
        next.push({ x: rect.x, y: rect.y, width: rect.width, height: used.y - rect.y });
      }
      if (used.y + used.height < rect.y + rect.height) {
        const y = used.y + used.height;
        next.push({ x: rect.x, y, width: rect.width, height: rect.y + rect.height - y });
      }
    }
    return next.filter((rect, index) =>
      !next.some((other, otherIndex) => otherIndex !== index && Packer.contains(other, rect) &&
        (!Packer.contains(rect, other) || otherIndex < index)),
    );
  },

  findFreeSpot(sheet, width, height, settings) {
    const spacing = settings.pieceSpacingMm;
    return sheet.freeRects.find((rect) => rect.width >= width + spacing && rect.height >= height + spacing) || null;
  },
};
