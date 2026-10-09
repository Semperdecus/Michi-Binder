# Michi Binder

Turn your own artwork into printable inserts for a Pokemon card binder using the [Michi method](https://woahpoke.com/michi-method/#michi-method-templates).

![Michi Binder binder preview](assets/demo.png)

## Getting started

Open `index.html` in your browser, no install or server needed.

## Features

- Crop artwork to span 1 to 3 pockets wide and tall, either hiding art behind pocket gaps or keeping all of it
- Choose where each artwork is cut, with pieces spanning pockets left to right
- Gold or silver card frames around the whole artwork, each piece or each pocket
- Binder preview with drag and drop placement
- Colored sleeve preview for real cards, with 22 common sleeve colors
- Multiple binders saved in the browser, with export and import as a JSON file
- Real cards in empty pockets via [TCGdex](https://tcgdex.dev) search, with optional Cardmarket prices
- Printable Pokédex frames to slide over a real card, with your own handwritten-style species details, a cut-out window for the card art, 8 handwriting fonts, 3 label fonts and 10 subtle paper variations; auto-fill species details and a chosen game's Pokédex entry from [PokéAPI](https://pokeapi.co)
- Paper-saving A4 layout with exact michi dimensions (63 x 88 mm per card)
- Verified print-ready PDF export with a 50 mm calibration ruler

Fonts from Google Fonts, bundled in `vendor/fonts`: Special Elite, Courier Prime and Cutive Mono for labels; La Belle Aurore, Homemade Apple, Mrs Saint Delafield, Herr Von Muellerhoff, Monsieur La Doulaise, Mr De Haviland, Allura and Meddon for handwriting (SIL Open Font License or Apache 2.0).

Optional personal-use handwriting fonts (Autography, Brother Signature, Amsterdam, Always Classy) are not included in this repository because their licenses do not allow redistribution. Download them from their designers and place them in `vendor/fonts/personal` (see the README there); without them those options fall back to a generic script font.
