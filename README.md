# Mochi Binder

A small local web page to turn your own artwork into printable inserts for a Pokemon card binder, using the [Michi method](https://woahpoke.com/michi-method/#michi-method-templates). Upload an image, choose how many pockets it spans, choose where it is cut, add a gold or silver card frame, preview it in the binder and export a print-ready PDF at exact card dimensions.

Plain HTML, CSS and JavaScript. No build step, no server, works offline (only the real card search needs internet).

## Getting started

1. Open `index.html` in Chrome, Edge or Firefox (double click works, `file://` is fine).
2. Click **Upload image** and pick one or more images.
3. In the **Crop and cut** dialog choose the span, pan/zoom the image, choose the cuts and the frame, then **Save**.
4. Drag artwork around in the **Binder preview**, check the **Print sheets** tab.
5. Fix anything red in **Checks**, then click **Export PDF**.
6. Print at **100% / Actual size** on ~300 gsm matte paper. Measure the 50 mm ruler on the sheet before cutting.

## Features

### Upload
- Upload one or more images (any format the browser can read).
- Artwork and settings are saved in the browser (IndexedDB) and survive a reload.

### Span and cuts
- Span: 1 to 3 pockets wide and 1 to 3 pockets tall (W x H notation, same as the woahpoke size guide), for a 3x3 9-pocket binder.
- The artwork is treated as one window over the binder: the strips hidden behind pocket seams are cut away, so lines in the art stay aligned across pockets.
- Side-loading binder: one piece can span pockets left to right across the seam. Rows are always cut, because pockets are stitched between rows.
- Click a seam toggle (`joined` / `cut`) per row to choose the pieces. Example: a 2x2 artwork becomes 2 pieces of 2x1, or 4 pieces of 1x1, or a mix.
- Pan by dragging, zoom with the slider or scroll wheel. Dimmed areas in the editor are not printed.

### Frame
- None, gold (classic yellow card border) or silver (illustration rare border). Colours sampled from real cards:
  - Gold: `#FFF684` to `#FFCF3F` to `#DDAD22`
  - Silver: `#F4F4F4` to `#E7E7E7` to `#B0B0B0`
- Frame around the whole artwork (default, the michi look) or around every piece.
- Default frame width 3 mm, rounded outer corners 3 mm (match a corner punch).

### Binder preview
- Two-page spreads of a 3x3 binder on a dark background.
- Drag artwork from the list onto a pocket, or drag placed artwork to move it. Green/red highlight shows if it fits.
- New artwork is auto-placed in the first free spot.
- Empty pockets show a dotted outline (default) or a card back (`assets/placeholder.png`), toggle in Settings.
- Add or remove spreads.

### Real cards in pockets
- Click an empty pocket, search a Pokemon name, filter by set, pick the exact card (thumbnail grid plus a large preview), then **Place card**.
- Click a pocket that holds a card to change or remove it. Drag a card to move it to another pocket (also on another page); dropping it on another card swaps the two.
- Card data and images come from the free [TCGdex API](https://tcgdex.dev) (no key needed). Cardmarket has no public API and blocks scraping, so it cannot be used from a local page.
- Only physical cards are listed (TCG Pocket digital sets are filtered out).
- The chosen card image is saved in the browser, so the binder preview keeps working offline.
- Optional Cardmarket prices (trend, EUR) in search results and on placed cards: toggle **Show Cardmarket prices** in Settings. The price on a placed card is the one from the day it was placed.
- Real cards are preview only: they are never printed, and artwork cannot be placed over a pocket that holds a card.

### Print sheets (paper saving)
- All pieces of all artworks are packed together on as few sheets as possible.
- Portrait or landscape is chosen per sheet (3x1 strips go on landscape A4).
- Pieces are rotated 90 degrees only when that saves a sheet.
- 1 mm space between pieces, 5 mm paper margin, thin grey cut line around each piece.
- A4 by default, Letter available.

### Verification
1. **Before export** (Checks panel, export is blocked on red):
   - every piece matches michi dimensions (1x1 = 63 x 88 mm, 2x1 = 133 x 88 mm, 3x1 = 203 x 88 mm with default settings)
   - every piece fits inside the printable margin, no overlaps, nothing too large for the paper
   - resolution per artwork: warning under 300 DPI, error under 150 DPI
   - warning for artwork not placed in the binder preview
2. **After export**: the generated PDF is read back and page sizes and every placed piece size are compared with the plan (0.1 mm tolerance). The file is only saved when this passes.
3. **On paper**: a 50 mm calibration ruler is printed in free space on each sheet. If it does not measure 50 mm, the printer is scaling.

## Default dimensions

From the woahpoke Michi method size guide (each slot is 7 x 9.5 cm including the gaps):

| Setting | Default | Meaning |
|---|---|---|
| Card width x height | 63 x 88 mm | Standard Pokemon card |
| Slot pitch horizontal | 70 mm | Left edge of one card to left edge of the next |
| Slot pitch vertical | 95 mm | Top edge of one card to top edge of the next |
| Seam gap | 7 mm / 7 mm | Pitch minus card size, hidden art strip |
| Frame width | 3 mm | Card border thickness |
| Corner radius | 3 mm | Rounded card corners |
| Paper margin | 5 mm | Home printer safe area |
| Space between pieces | 1 mm | Cutting room |

All of these can be changed in **Settings** after measuring your own binder. All settings are saved in the browser and survive a refresh.

Piece width = `span x card width + (span - 1) x seam gap`. Piece height is always one card height.

## Folder structure

```
mochibinder/
  index.html              Page layout, dialogs, script tags
  README.md
  css/
    base.css              Colours, layout, panels, buttons, artwork list, checks
    binder.css            Binder pages, pockets, drag and drop, print sheets
    dialogs.css           Crop and cut, settings and card search dialogs
  js/
    settings.js           Constants, default settings, geometry formulas
    store.js              IndexedDB persistence (artwork, cards, settings, page count)
    cutter.js             Crop math, piece list from seam cuts, drawing pieces and frames
    packer.js             Sheet packing (MaxRects, portrait/landscape, rotation)
    verifier.js           Pre-export checks and PDF read-back checks
    exporter.js           PDF export with jsPDF, cut lines, calibration ruler
    editor.js             Crop and cut dialog
    binder.js             Binder preview and drag to place
    library.js            Artwork list in the sidebar
    sheets.js             Print sheet preview
    settings-panel.js     Settings dialog
    tcgdex.js             TCGdex API client (card search, set names, card images)
    card-picker.js        Card search and select dialog for a pocket
    app.js                App state and wiring
  vendor/
    jspdf.umd.min.js      jsPDF 2.5.2 (local copy so it works offline)
  assets/
    placeholder.png       Card back for empty pockets
  context-docs/           Requirements and reference images
```

## Possible next steps

- Artwork spanning across two facing pages of a spread.
- 12-pocket (4 wide) binders.
- Duplicate an artwork or print multiple copies.
- Bleed option for more forgiving cutting.
