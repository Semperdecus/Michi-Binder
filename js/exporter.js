const JPEG_QUALITY = 0.92;
const CUT_LINE_WIDTH_MM = 0.1;
const CUT_LINE_GREY = 170;
const CALIBRATION_LENGTH_MM = 50;
const CALIBRATION_TICK_STEP_MM = 10;
const CALIBRATION_TICK_MM = 2;
const CALIBRATION_WIDTH_MM = 70;
const CALIBRATION_HEIGHT_MM = 8;
const CALIBRATION_TEXT_OFFSET_MM = 6;
const CALIBRATION_FONT_PT = 6;
const CALIBRATION_LINE_WIDTH_MM = 0.2;

const Exporter = {
  buildItems(state) {
    return state.artworks.flatMap((artwork) =>
      Cutter.pieces(artwork).map((piece) => ({
        artwork,
        piece,
        label: `${artwork.name} row ${piece.row + 1} col ${piece.colStart + 1}`,
        width: Geometry.pieceWidth(state.settings, piece.span),
        height: state.settings.cardHeightMm,
      })),
    );
  },

  plan(state) {
    return Packer.pack(Exporter.buildItems(state), state.settings);
  },

  calibrationSpot(sheet, settings) {
    return Packer.findFreeSpot(sheet, CALIBRATION_WIDTH_MM, CALIBRATION_HEIGHT_MM, settings);
  },

  drawCalibration(doc, spot) {
    const x = spot.x;
    const y = spot.y + CALIBRATION_TICK_MM;
    doc.setDrawColor(0);
    doc.setLineWidth(CALIBRATION_LINE_WIDTH_MM);
    doc.line(x, y, x + CALIBRATION_LENGTH_MM, y);
    for (let tick = 0; tick <= CALIBRATION_LENGTH_MM; tick += CALIBRATION_TICK_STEP_MM) {
      doc.line(x + tick, y - CALIBRATION_TICK_MM, x + tick, y);
    }
    doc.setFontSize(CALIBRATION_FONT_PT);
    doc.setTextColor(0);
    doc.text('Must measure 50 mm. If not, print at 100% / Actual size.', x, y + CALIBRATION_TEXT_OFFSET_MM - CALIBRATION_TICK_MM);
  },

  fileName() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `michibinder-${day}-${month}-${now.getFullYear()}.pdf`;
  },

  async export(state) {
    const plan = Exporter.plan(state);
    const pxPerMm = Geometry.mmToPx(1, TARGET_DPI);
    const { jsPDF } = window.jspdf;
    const paper = Geometry.paper(state.settings);
    let doc = null;
    for (const sheet of plan.sheets) {
      if (doc) {
        doc.addPage([paper.width, paper.height], sheet.orientation);
      } else {
        doc = new jsPDF({ unit: 'mm', format: [paper.width, paper.height], orientation: sheet.orientation });
      }
      for (const placement of sheet.placements) {
        const { artwork, piece } = placement.item;
        const image = state.images.get(artwork.id);
        const canvas = Cutter.renderPieceCanvas(artwork, image, state.settings, piece, pxPerMm, placement.rotated);
        doc.addImage(canvas.toDataURL('image/jpeg', JPEG_QUALITY), 'JPEG', placement.x, placement.y, placement.width, placement.height);
        doc.setDrawColor(CUT_LINE_GREY);
        doc.setLineWidth(CUT_LINE_WIDTH_MM);
        doc.rect(placement.x, placement.y, placement.width, placement.height);
      }
      const spot = Exporter.calibrationSpot(sheet, state.settings);
      if (spot) {
        Exporter.drawCalibration(doc, spot);
      }
    }
    const buffer = doc.output('arraybuffer');
    const checks = Verifier.postExport(buffer, plan);
    if (!Verifier.hasErrors(checks)) {
      doc.save(Exporter.fileName());
    }
    return checks;
  },
};
