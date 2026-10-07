const CHECK_OK = 'ok';
const CHECK_WARN = 'warn';
const CHECK_ERROR = 'error';
const POINTS_TOLERANCE = Geometry.mmToPoints(SIZE_TOLERANCE_MM);
const DECIMALS_MM = 1;

const Verifier = {
  formatMm(value) {
    return value.toFixed(DECIMALS_MM);
  },

  preExport(state, plan) {
    const checks = [];
    const settings = state.settings;
    if (Geometry.gapX(settings) < 0 || Geometry.gapY(settings) < 0) {
      checks.push({ level: CHECK_ERROR, text: 'Slot pitch is smaller than the card size. Fix it in Settings.' });
    }
    if (state.artworks.length === 0) {
      checks.push({ level: CHECK_WARN, text: 'No artwork uploaded yet.' });
      return checks;
    }
    checks.push(...Verifier.resolutionChecks(state));
    checks.push(...Verifier.pieceSizeChecks(plan, settings));
    checks.push(...Verifier.sheetChecks(plan, settings));
    const unplacedInBinder = state.artworks.filter((artwork) => !artwork.placement);
    if (unplacedInBinder.length > 0) {
      checks.push({
        level: CHECK_WARN,
        text: `Not placed in binder preview: ${unplacedInBinder.map((artwork) => artwork.name).join(', ')}`,
      });
    }
    return checks;
  },

  resolutionChecks(state) {
    return state.artworks.map((artwork) => {
      const image = state.images.get(artwork.id);
      const dpi = Math.round(Cutter.effectiveDpi(artwork, image, state.settings));
      if (dpi < MINIMUM_DPI) {
        return { level: CHECK_ERROR, text: `${artwork.name}: ${dpi} DPI, too low to print (min ${MINIMUM_DPI}).` };
      }
      if (dpi < TARGET_DPI) {
        return { level: CHECK_WARN, text: `${artwork.name}: ${dpi} DPI, may look soft (aim for ${TARGET_DPI}).` };
      }
      return { level: CHECK_OK, text: `${artwork.name}: ${dpi} DPI.` };
    });
  },

  pieceSizeChecks(plan, settings) {
    const checks = [];
    const wrongSize = [];
    for (const sheet of plan.sheets) {
      for (const placement of sheet.placements) {
        const { piece } = placement.item;
        const expectedWidth = Geometry.pieceWidth(settings, piece.span);
        const width = placement.rotated ? placement.height : placement.width;
        const height = placement.rotated ? placement.width : placement.height;
        const widthOk = Math.abs(width - expectedWidth) <= SIZE_TOLERANCE_MM;
        const heightOk = Math.abs(height - settings.cardHeightMm) <= SIZE_TOLERANCE_MM;
        if (!widthOk || !heightOk || piece.span > BINDER_COLUMNS) {
          wrongSize.push(placement.item.label);
        }
      }
    }
    if (wrongSize.length > 0) {
      checks.push({ level: CHECK_ERROR, text: `Wrong piece size: ${wrongSize.join(', ')}` });
    } else {
      const spans = [...new Set(plan.sheets.flatMap((sheet) => sheet.placements.map((p) => p.item.piece.span)))].sort();
      const sizes = spans.map((span) =>
        `${span}x1 = ${Verifier.formatMm(Geometry.pieceWidth(settings, span))} x ${Verifier.formatMm(settings.cardHeightMm)} mm`);
      checks.push({ level: CHECK_OK, text: `All piece sizes match michi dimensions (${sizes.join('; ')}).` });
    }
    if (plan.unplaced.length > 0) {
      checks.push({
        level: CHECK_ERROR,
        text: `Does not fit on paper: ${plan.unplaced.map((item) => item.label).join(', ')}`,
      });
    }
    return checks;
  },

  sheetChecks(plan, settings) {
    const margin = settings.sheetMarginMm;
    const problems = [];
    plan.sheets.forEach((sheet, index) => {
      const outside = sheet.placements.some((p) =>
        p.x < margin - SIZE_TOLERANCE_MM ||
        p.y < margin - SIZE_TOLERANCE_MM ||
        p.x + p.width > sheet.width - margin + SIZE_TOLERANCE_MM ||
        p.y + p.height > sheet.height - margin + SIZE_TOLERANCE_MM);
      const overlapping = sheet.placements.some((a, i) =>
        sheet.placements.some((b, j) => i < j && Packer.intersects(a, b)));
      if (outside) {
        problems.push(`sheet ${index + 1} has pieces outside the printable margin`);
      }
      if (overlapping) {
        problems.push(`sheet ${index + 1} has overlapping pieces`);
      }
    });
    if (problems.length > 0) {
      return [{ level: CHECK_ERROR, text: problems.join('; ') }];
    }
    const pieceCount = plan.sheets.reduce((sum, sheet) => sum + sheet.placements.length, 0);
    return [{
      level: CHECK_OK,
      text: `${pieceCount} pieces on ${plan.sheets.length} ${settings.paper} sheet(s), inside ${margin} mm margin, no overlaps.`,
    }];
  },

  hasErrors(checks) {
    return checks.some((check) => check.level === CHECK_ERROR);
  },

  readPdfNumbers(buffer) {
    const text = new TextDecoder('latin1').decode(buffer);
    const pages = [...text.matchAll(/\/MediaBox \[([-\d.\s]+)\]/g)].map((match) => {
      const values = match[1].trim().split(/\s+/).map(Number);
      return { width: values[2] - values[0], height: values[3] - values[1] };
    });
    const images = [...text.matchAll(/([-\d.]+) 0 0 ([-\d.]+) ([-\d.]+) ([-\d.]+) cm\s+\/I\d+ Do/g)].map((match) => ({
      width: Number(match[1]),
      height: Number(match[2]),
    }));
    return { pages, images };
  },

  sameSizes(expected, actual) {
    if (expected.length !== actual.length) {
      return false;
    }
    const sortKey = (a, b) => a.width - b.width || a.height - b.height;
    const sortedExpected = [...expected].sort(sortKey);
    const sortedActual = [...actual].sort(sortKey);
    return sortedExpected.every((size, index) =>
      Math.abs(size.width - sortedActual[index].width) <= POINTS_TOLERANCE &&
      Math.abs(size.height - sortedActual[index].height) <= POINTS_TOLERANCE);
  },

  postExport(buffer, plan) {
    const found = Verifier.readPdfNumbers(buffer);
    const expectedPages = plan.sheets.map((sheet) => ({
      width: Geometry.mmToPoints(sheet.width),
      height: Geometry.mmToPoints(sheet.height),
    }));
    const expectedImages = plan.sheets.flatMap((sheet) => sheet.placements.map((p) => ({
      width: Geometry.mmToPoints(p.width),
      height: Geometry.mmToPoints(p.height),
    })));
    const pagesOk = Verifier.sameSizes(expectedPages, found.pages);
    const imagesOk = Verifier.sameSizes(expectedImages, found.images);
    return [
      pagesOk
        ? { level: CHECK_OK, text: `PDF read back: ${found.pages.length} page(s) with exact paper size.` }
        : { level: CHECK_ERROR, text: 'PDF read back: page sizes do not match the plan.' },
      imagesOk
        ? { level: CHECK_OK, text: `PDF read back: ${found.images.length} piece(s) at exact mm size.` }
        : { level: CHECK_ERROR, text: 'PDF read back: piece sizes in the PDF do not match michi dimensions.' },
    ];
  },
};
