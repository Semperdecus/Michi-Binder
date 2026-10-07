const EDITOR_MAX_WIDTH_PX = 640;
const EDITOR_MAX_HEIGHT_PX = 520;
const EDITOR_BACKGROUND = '#1b1b1f';
const DEAD_ZONE_ALPHA = 0.3;
const SEAM_DASH_MM = 2;
const SEAM_LINE_COLOR = 'rgba(255, 255, 255, 0.8)';
const SEAM_LINE_WIDTH_PX = 1;
const ZOOM_MIN = 1;
const ZOOM_WHEEL_STEP = 1.1;
const ZOOM_MAX = 6;

const Editor = {
  dialog: null,
  canvas: null,
  draft: null,
  image: null,
  pxPerMm: 1,
  drag: null,
  onSave: null,

  init(onSave) {
    Editor.onSave = onSave;
    Editor.dialog = document.getElementById('editor');
    Editor.canvas = document.getElementById('editor-canvas');
    Editor.dialog.querySelector('#editor-cols').addEventListener('change', Editor.onSpanChange);
    Editor.dialog.querySelector('#editor-rows').addEventListener('change', Editor.onSpanChange);
    Editor.dialog.querySelector('#editor-zoom').addEventListener('input', (event) => {
      Editor.draft.crop.zoom = Number(event.target.value);
      Editor.redraw();
    });
    Editor.dialog.querySelector('#editor-frame').addEventListener('change', (event) => {
      Editor.draft.frame = event.target.value;
      Editor.redraw();
    });
    Editor.dialog.querySelector('#editor-frame-mode').addEventListener('change', (event) => {
      Editor.draft.frameMode = event.target.value;
      Editor.redraw();
    });
    Editor.dialog.querySelector('#editor-name').addEventListener('input', (event) => {
      Editor.draft.name = event.target.value;
    });
    Editor.dialog.querySelector('#editor-save').addEventListener('click', Editor.save);
    Editor.dialog.querySelector('#editor-cancel').addEventListener('click', () => Editor.dialog.close());
    Editor.canvas.addEventListener('pointerdown', Editor.onPointerDown);
    Editor.canvas.addEventListener('pointermove', Editor.onPointerMove);
    Editor.canvas.addEventListener('lostpointercapture', () => {
      Editor.drag = null;
    });
    Editor.canvas.addEventListener('wheel', Editor.onWheel, { passive: false });
  },

  open(artwork, image, settings) {
    Editor.draft = structuredClone(artwork);
    Editor.image = image;
    Editor.settings = settings;
    Editor.dialog.querySelector('#editor-name').value = Editor.draft.name;
    Editor.dialog.querySelector('#editor-cols').value = String(Editor.draft.cols);
    Editor.dialog.querySelector('#editor-rows').value = String(Editor.draft.rows);
    Editor.dialog.querySelector('#editor-frame').value = Editor.draft.frame;
    Editor.dialog.querySelector('#editor-frame-mode').value = Editor.draft.frameMode;
    Editor.syncZoomInput();
    Editor.redraw();
    Editor.dialog.showModal();
  },

  syncZoomInput() {
    const input = Editor.dialog.querySelector('#editor-zoom');
    input.min = String(ZOOM_MIN);
    input.max = String(ZOOM_MAX);
    input.value = String(Editor.draft.crop.zoom);
  },

  onSpanChange() {
    Editor.draft.cols = Number(Editor.dialog.querySelector('#editor-cols').value);
    Editor.draft.rows = Number(Editor.dialog.querySelector('#editor-rows').value);
    Editor.draft.joins = Cutter.defaultJoins(Editor.draft.cols, Editor.draft.rows);
    Editor.redraw();
  },

  onPointerDown(event) {
    if (event.button !== 0) {
      return;
    }
    Editor.canvas.setPointerCapture(event.pointerId);
    Editor.drag = { x: event.clientX, y: event.clientY };
  },

  onPointerMove(event) {
    if (!Editor.drag) {
      return;
    }
    const source = Cutter.cropSource(Editor.draft, Editor.image, Editor.settings);
    const imagePxPerScreenPx = source.scale / Editor.pxPerMm;
    Editor.draft.crop.centerX -= ((event.clientX - Editor.drag.x) * imagePxPerScreenPx) / Editor.image.width;
    Editor.draft.crop.centerY -= ((event.clientY - Editor.drag.y) * imagePxPerScreenPx) / Editor.image.height;
    Editor.drag = { x: event.clientX, y: event.clientY };
    Editor.redraw();
  },

  onWheel(event) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? ZOOM_WHEEL_STEP : 1 / ZOOM_WHEEL_STEP;
    Editor.draft.crop.zoom = Cutter.clamp(Editor.draft.crop.zoom * factor, ZOOM_MIN, ZOOM_MAX);
    Editor.syncZoomInput();
    Editor.redraw();
  },

  redraw() {
    const { draft, image, settings } = Editor;
    Cutter.clampCrop(draft, image, settings);
    const art = Geometry.artSize(settings, draft.cols, draft.rows);
    Editor.pxPerMm = Math.min(EDITOR_MAX_WIDTH_PX / art.width, EDITOR_MAX_HEIGHT_PX / art.height);
    const ratio = window.devicePixelRatio || 1;
    Editor.canvas.style.width = `${art.width * Editor.pxPerMm}px`;
    Editor.canvas.style.height = `${art.height * Editor.pxPerMm}px`;
    Editor.canvas.width = Math.round(art.width * Editor.pxPerMm * ratio);
    Editor.canvas.height = Math.round(art.height * Editor.pxPerMm * ratio);
    const ctx = Editor.canvas.getContext('2d');
    ctx.setTransform(Editor.pxPerMm * ratio, 0, 0, Editor.pxPerMm * ratio, 0, 0);
    ctx.fillStyle = EDITOR_BACKGROUND;
    ctx.fillRect(0, 0, art.width, art.height);
    const source = Cutter.cropSource(draft, image, settings);
    ctx.globalAlpha = DEAD_ZONE_ALPHA;
    ctx.drawImage(image, source.left, source.top, source.width, source.height, 0, 0, art.width, art.height);
    ctx.globalAlpha = 1;
    const pieces = Cutter.pieces(draft);
    pieces.forEach((piece) => Cutter.drawPiece(ctx, draft, image, settings, piece));
    Editor.drawJoinedSeams(ctx);
    Editor.renderSeamButtons();
    Editor.renderInfo(pieces);
  },

  drawJoinedSeams(ctx) {
    const { draft, settings } = Editor;
    ctx.save();
    ctx.strokeStyle = SEAM_LINE_COLOR;
    ctx.lineWidth = SEAM_LINE_WIDTH_PX / Editor.pxPerMm;
    ctx.setLineDash([SEAM_DASH_MM, SEAM_DASH_MM]);
    for (let row = 0; row < draft.rows; row++) {
      for (let col = 0; col < draft.cols - 1; col++) {
        if (!draft.joins[row][col]) {
          continue;
        }
        const left = col * settings.slotPitchXMm + settings.cardWidthMm;
        const top = row * settings.slotPitchYMm;
        ctx.strokeRect(left, top, Geometry.gapX(settings), settings.cardHeightMm);
      }
    }
    ctx.restore();
  },

  renderSeamButtons() {
    const { draft, settings } = Editor;
    const layer = Editor.dialog.querySelector('#editor-seams');
    layer.replaceChildren();
    for (let row = 0; row < draft.rows; row++) {
      for (let col = 0; col < draft.cols - 1; col++) {
        const joined = draft.joins[row][col];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `seam-toggle ${joined ? 'is-joined' : 'is-cut'}`;
        button.textContent = joined ? 'joined' : 'cut';
        button.title = joined ? 'One piece spans this seam. Click to cut here.' : 'Cut here. Click to join.';
        const centerX = (col * settings.slotPitchXMm + settings.cardWidthMm + Geometry.gapX(settings) / 2) * Editor.pxPerMm;
        const centerY = (row * settings.slotPitchYMm + settings.cardHeightMm / 2) * Editor.pxPerMm;
        button.style.left = `${centerX}px`;
        button.style.top = `${centerY}px`;
        button.addEventListener('click', () => {
          draft.joins[row][col] = !joined;
          Editor.redraw();
        });
        layer.append(button);
      }
    }
  },

  renderInfo(pieces) {
    const { draft, image, settings } = Editor;
    const dpi = Math.round(Cutter.effectiveDpi(draft, image, settings));
    const sizes = pieces.map((piece) => `${piece.span}x1`).join(', ');
    const quality = dpi >= TARGET_DPI ? 'good' : dpi >= MINIMUM_DPI ? 'soft' : 'too low';
    const info = Editor.dialog.querySelector('#editor-info');
    info.textContent = `${pieces.length} piece(s): ${sizes}. Resolution ${dpi} DPI (${quality}). Drag to pan, scroll to zoom. Dimmed areas are hidden behind pocket seams and not printed.`;
    info.dataset.quality = quality === 'good' ? CHECK_OK : quality === 'soft' ? CHECK_WARN : CHECK_ERROR;
  },

  save() {
    Editor.dialog.close();
    Editor.onSave(Editor.draft);
  },
};
