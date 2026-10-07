const SHEET_PREVIEW_PX_PER_MM = 1.6;
const SHEET_PIECE_PX_PER_MM = 2;

const Sheets = {
  container: null,

  init(container) {
    Sheets.container = container;
  },

  mm(value) {
    return `${value * SHEET_PREVIEW_PX_PER_MM}px`;
  },

  render(state, plan) {
    if (plan.sheets.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'sheets-empty';
      empty.textContent = 'Nothing to print yet.';
      Sheets.container.replaceChildren(empty);
      return;
    }
    Sheets.container.replaceChildren(...plan.sheets.map((sheet, index) => Sheets.renderSheet(state, sheet, index)));
  },

  renderSheet(state, sheet, index) {
    const wrapper = document.createElement('figure');
    wrapper.className = 'sheet-wrapper';
    const paper = document.createElement('div');
    paper.className = 'sheet';
    paper.style.width = Sheets.mm(sheet.width);
    paper.style.height = Sheets.mm(sheet.height);
    const margin = document.createElement('div');
    margin.className = 'sheet-margin';
    const marginMm = state.settings.sheetMarginMm;
    margin.style.inset = Sheets.mm(marginMm);
    paper.append(margin);
    for (const placement of sheet.placements) {
      const { artwork, piece } = placement.item;
      const image = state.images.get(artwork.id);
      const canvas = Cutter.renderPieceCanvas(artwork, image, state.settings, piece, SHEET_PIECE_PX_PER_MM, placement.rotated);
      canvas.className = 'sheet-piece';
      canvas.title = `${placement.item.label}: ${placement.width.toFixed(1)} x ${placement.height.toFixed(1)} mm${placement.rotated ? ' (rotated)' : ''}`;
      canvas.style.left = Sheets.mm(placement.x);
      canvas.style.top = Sheets.mm(placement.y);
      canvas.style.width = Sheets.mm(placement.width);
      canvas.style.height = Sheets.mm(placement.height);
      paper.append(canvas);
    }
    const spot = Exporter.calibrationSpot(sheet, state.settings);
    if (spot) {
      const ruler = document.createElement('div');
      ruler.className = 'sheet-ruler';
      ruler.style.left = Sheets.mm(spot.x);
      ruler.style.top = Sheets.mm(spot.y);
      ruler.style.width = Sheets.mm(CALIBRATION_LENGTH_MM);
      paper.append(ruler);
    }
    const caption = document.createElement('figcaption');
    caption.textContent = `Sheet ${index + 1}: ${state.settings.paper} ${sheet.orientation}, ${sheet.placements.length} piece(s)${spot ? ', 50 mm ruler' : ''}`;
    wrapper.append(paper, caption);
    return wrapper;
  },
};
