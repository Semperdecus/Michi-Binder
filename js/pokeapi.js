const POKEAPI_BASE = 'https://pokeapi.co/api/v2';
const POKEAPI_SPECIES_LIMIT = 2000;
const POKEAPI_LANGUAGE = 'en';
const DECIMETRES_PER_METRE = 10;
const HECTOGRAMS_PER_KILOGRAM = 10;
const SPECIES_NUMBER_DIGITS = 4;
const HTTP_NOT_FOUND = 404;

const GAME_NAMES = Object.freeze({
  firered: 'FireRed',
  leafgreen: 'LeafGreen',
  heartgold: 'HeartGold',
  soulsilver: 'SoulSilver',
  'black-2': 'Black 2',
  'white-2': 'White 2',
  x: 'X',
  y: 'Y',
  'omega-ruby': 'Omega Ruby',
  'alpha-sapphire': 'Alpha Sapphire',
  'lets-go-pikachu': "Let's Go, Pikachu!",
  'lets-go-eevee': "Let's Go, Eevee!",
  'legends-arceus': 'Legends: Arceus',
});

const PokeApi = {
  speciesNames: null,

  async getJson(url) {
    const response = await fetch(url);
    if (response.status === HTTP_NOT_FOUND) {
      throw new Error('No Pokémon found with that name or number.');
    }
    if (!response.ok) {
      throw new Error(`Pokédex lookup failed (${response.status})`);
    }
    return response.json();
  },

  titleCase(slug) {
    return slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  },

  async loadSpeciesNames() {
    if (!PokeApi.speciesNames) {
      const list = await PokeApi.getJson(`${POKEAPI_BASE}/pokemon-species?limit=${POKEAPI_SPECIES_LIMIT}`);
      PokeApi.speciesNames = list.results.map((species) => PokeApi.titleCase(species.name));
    }
    return PokeApi.speciesNames;
  },

  slug(query) {
    return query.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[.'’:]/g, '').replace(/♀/g, '-f').replace(/♂/g, '-m').replace(/\s+/g, '-');
  },

  english(list) {
    return list.filter((entry) => entry.language.name === POKEAPI_LANGUAGE);
  },

  cleanText(text) {
    return text.replace(/­\s*/g, '').replace(/[\n\f\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  },

  gameName(slug) {
    return GAME_NAMES[slug] || PokeApi.titleCase(slug);
  },

  async lookup(query) {
    const species = await PokeApi.getJson(`${POKEAPI_BASE}/pokemon-species/${encodeURIComponent(PokeApi.slug(query))}`);
    const defaultVariety = species.varieties.find((variety) => variety.is_default) || species.varieties[0];
    const pokemon = await PokeApi.getJson(defaultVariety.pokemon.url);
    const name = PokeApi.english(species.names)[0]?.name || PokeApi.titleCase(species.name);
    const entries = PokeApi.english(species.flavor_text_entries).map((entry) => ({
      game: PokeApi.gameName(entry.version.name),
      text: PokeApi.cleanText(entry.flavor_text),
    }));
    return {
      fields: {
        speciesName: name,
        speciesNumber: String(species.id).padStart(SPECIES_NUMBER_DIGITS, '0'),
        classification: PokeApi.english(species.genera)[0]?.genus || '',
        types: pokemon.types.map((entry) => PokeApi.titleCase(entry.type.name)).join(' / '),
        height: `${pokemon.height / DECIMETRES_PER_METRE}m`,
        weight: `${pokemon.weight / HECTOGRAMS_PER_KILOGRAM}kg`,
      },
      entries,
    };
  },
};
