// GENERADO AUTOMÁTICAMENTE por scripts/fetch-works.mjs — no editar a mano.
// Fuente: Art Institute of Chicago, Open Access API (obras de dominio público).
// https://api.artic.edu/docs/
//
// Banco de imágenes del catálogo. Cada entrada se asocia de forma
// determinista a las obras del museo (ver src/lib/images.ts).

export interface SourceWork {
  /** Identificador de la obra en el Art Institute of Chicago. */
  id: number;
  title: string;
  artist: string;
  date: string;
  department: string;
  medium: string;
  origin: string;
  /** ID IIIF para construir la URL de la imagen. */
  imageId: string;
}

export const SOURCE_WORKS: readonly SourceWork[] = [
  {
    "id": 11,
    "title": "Self-Portrait",
    "artist": "Walter Shirlaw (American, 1838–1909)",
    "date": "1878",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "7b7a6f39-1cd8-ea2f-9811-18b0e23edac0"
  },
  {
    "id": 27992,
    "title": "A Sunday on La Grande Jatte — 1884",
    "artist": "Georges Seurat (French, 1859–1891)",
    "date": "1884–86, border added 1888–89",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on canvas",
    "origin": "France",
    "imageId": "2d484387-2509-5e8e-2c43-22f9981972eb"
  },
  {
    "id": 111628,
    "title": "Nighthawks",
    "artist": "Edward Hopper (American, 1882–1967)",
    "date": "1942",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "831a05de-d3f6-f4fa-a460-23008dd58dda"
  },
  {
    "id": 20684,
    "title": "Paris Street; Rainy Day",
    "artist": "Gustave Caillebotte (French, 1848–1894)",
    "date": "1877",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on canvas",
    "origin": "Paris",
    "imageId": "f8fd76e9-c396-5678-36ed-6a348c904d27"
  },
  {
    "id": 82410,
    "title": "Untitled (Painting)",
    "artist": "Mark Rothko (Marcus Rothkowitz)\nAmerican, born Russia (Latvia), 1903–1970",
    "date": "1953/54",
    "department": "",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "df0a03a4-be1c-3f8d-73b1-5941dca57bba"
  },
  {
    "id": 9,
    "title": "Interior of St. Mark's, Venice",
    "artist": "David Dalhoff Neal (American, 1838–1915)",
    "date": "1869",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "Venice",
    "imageId": "b55d836c-ee20-59f8-1f0c-a95e09905361"
  },
  {
    "id": 16568,
    "title": "Water Lilies",
    "artist": "Claude Monet (French, 1840–1926)",
    "date": "1906",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on canvas",
    "origin": "France",
    "imageId": "3c27b499-af56-f0d5-93b5-a7f2f1ad5813"
  },
  {
    "id": 6565,
    "title": "American Gothic",
    "artist": "Grant Wood (American, 1891–1942)",
    "date": "1930",
    "department": "Arts of the Americas",
    "medium": "Oil on Beaver Board",
    "origin": "Cedar Rapids",
    "imageId": "b272df73-a965-ac37-4172-be4e99483637"
  },
  {
    "id": 12626,
    "title": "Sculpture",
    "artist": "Henry Moore\nEnglish, 1898-1986",
    "date": "1935",
    "department": "Contemporary Art",
    "medium": "Marble",
    "origin": "England",
    "imageId": "5731e6b8-25e2-21a0-d079-01c81abfd196"
  },
  {
    "id": 144356,
    "title": "CARVING: A Traditional Sculpture",
    "artist": "Eleanor Antin\nAmerican, born 1935",
    "date": "1972",
    "department": "Contemporary Art",
    "medium": "148 gelatin silver prints and text panel",
    "origin": "United States",
    "imageId": "d42239f2-878e-f15e-e5fc-4a041eb4ab01"
  },
  {
    "id": 186545,
    "title": "Woman in Tub",
    "artist": "Jeff Koons\nAmerican, born 1955",
    "date": "1988",
    "department": "Contemporary Art",
    "medium": "Porcelain",
    "origin": "United States",
    "imageId": "7adbb869-6195-75c8-14da-c06a9ccd3700"
  },
  {
    "id": 152961,
    "title": "\"Untitled\" (Portrait of Ross in L.A.)",
    "artist": "Felix Gonzalez-Torres\nAmerican, born Cuba, 1957–1996",
    "date": "1991",
    "department": "Contemporary Art",
    "medium": "Candies in variously colored wrappers, endless supply",
    "origin": "United States",
    "imageId": "9036870e-9ec4-19ab-3d73-3cbf79c1af8b"
  },
  {
    "id": 11143,
    "title": "The Fear of Love",
    "artist": "Jean Louis Lemoyne (French, 1665–1755)",
    "date": "1742",
    "department": "Painting and Sculpture of Europe",
    "medium": "Terracotta",
    "origin": "France",
    "imageId": "70f69d6a-2cac-0e55-9913-7027ca19f5cb"
  },
  {
    "id": 207124,
    "title": "Living Sculpture",
    "artist": "Marisa Merz\nItalian, 1931-2019",
    "date": "1966",
    "department": "Contemporary Art",
    "medium": "Aluminum and paint",
    "origin": "",
    "imageId": "05b52b44-2735-d7cc-a4e8-e616ce29d469"
  },
  {
    "id": 656,
    "title": "Lion (One of a Pair, South Pedestal)",
    "artist": "Edward Kemeys (American, 1843–1907)\nAmerican Bronze Founding Company (American, founded 1886)\nChicago",
    "date": "1893",
    "department": "Arts of the Americas",
    "medium": "Bronze with green patina",
    "origin": "Chicago",
    "imageId": "6b1edb9c-0f3f-0ee3-47c7-ca25c39ee360"
  },
  {
    "id": 229372,
    "title": "Christ and the Lamb",
    "artist": "Jeff Koons\nAmerican, born 1955",
    "date": "1988",
    "department": "Contemporary Art",
    "medium": "Gilded wood and mirror",
    "origin": "United States",
    "imageId": "cae666d2-7dd8-5877-c8c1-ac767235cf74"
  },
  {
    "id": 23119,
    "title": "Village Among the Trees",
    "artist": "Unknown artist\nFlemish, active in Antwerp, mid-16th century",
    "date": "c. 1560",
    "department": "Prints and Drawings",
    "medium": "Pen and brown ink, heightened with opaque white watercolor and touches of pink and yellow watercolor, over black chalk, on blue tinted laid paper, laid down on laid paper",
    "origin": "Flanders",
    "imageId": "1e452e34-3a2b-0dca-35c3-c7236c612985"
  },
  {
    "id": 145241,
    "title": "A Chemist Lifting with Extreme Precaution the Cuticle of a Grand Piano",
    "artist": "Salvador Dalí\nSpanish, 1904–1989",
    "date": "1936",
    "department": "Modern Art",
    "medium": "Oil on canvas",
    "origin": "Spain",
    "imageId": "b846f704-96d3-3898-aece-13969147c48c"
  },
  {
    "id": 874,
    "title": "Landscape",
    "artist": "Jean Charles Cazin (French, 1841–1901)",
    "date": "c. 1895",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on canvas",
    "origin": "France",
    "imageId": "3a34f988-f779-2e96-1786-8945b6b9c87d"
  },
  {
    "id": 146701,
    "title": "Mountain Brook",
    "artist": "Albert Bierstadt (American, born Solingen, Prussia, now Germany, 1830–1902)",
    "date": "1863",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "d55b0cfc-0716-d6cd-3b38-5742903ce046"
  },
  {
    "id": 90048,
    "title": "Distant View of Niagara Falls",
    "artist": "Thomas Cole (American, born England, 1801–1848)",
    "date": "1830",
    "department": "Arts of the Americas",
    "medium": "Oil on wood panel",
    "origin": "Niagara Falls",
    "imageId": "18092196-50ae-3ff1-9205-1b3110e966c3"
  },
  {
    "id": 118577,
    "title": "Red Hills with Flowers",
    "artist": "Georgia O'Keeffe (American, 1887–1986)",
    "date": "1937",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "18282f4d-5a16-686b-7a37-afecccdb6202"
  },
  {
    "id": 86385,
    "title": "City Landscape",
    "artist": "Joan Mitchell\nAmerican, 1925-1992",
    "date": "1955",
    "department": "Contemporary Art",
    "medium": "Oil on linen",
    "origin": "United States",
    "imageId": "33d04b6a-3ebe-f577-444c-969cb208ad8d"
  },
  {
    "id": 68792,
    "title": "A Marine",
    "artist": "George Inness (American, 1825–1894)",
    "date": "c. 1874–75",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "3d2d0842-312e-8d48-708b-d6adde0777bf"
  },
  {
    "id": 80607,
    "title": "Self-Portrait",
    "artist": "Vincent van Gogh (Dutch, 1853–1890)",
    "date": "1887",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on artist's board, mounted on cradled panel",
    "origin": "Netherlands",
    "imageId": "47c5bcb8-62ef-e5d7-55e7-f5121f409a30"
  },
  {
    "id": 862,
    "title": "Portrait of an Artist",
    "artist": "Follower of Frans Hals (Dutch, 1582–1666)",
    "date": "1644",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on canvas",
    "origin": "Holland",
    "imageId": "c95d58bf-fe9e-e5bb-2c71-ab8bad984759"
  },
  {
    "id": 29230,
    "title": "Julia Jackson",
    "artist": "Julia Margaret Cameron\nEnglish, 1815–1879",
    "date": "1867",
    "department": "Photography and Media",
    "medium": "Albumen print",
    "origin": "England",
    "imageId": "7582416c-67cd-3682-bf97-5f9883bdd972"
  },
  {
    "id": 193664,
    "title": "The Captive Slave (Ira Aldridge)",
    "artist": "John Philip Simpson (English, 1782–1847)",
    "date": "1827",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on canvas",
    "origin": "England",
    "imageId": "5490fd49-dd52-4fd7-7d41-d871dcffae55"
  },
  {
    "id": 24,
    "title": "Portrait of Edouard Molé",
    "artist": "Robert Nanteuil\nFrench, 1623-1678",
    "date": "1653",
    "department": "Prints and Drawings",
    "medium": "Engraving on paper",
    "origin": "France",
    "imageId": "5df51c9d-dac5-d962-4d4b-300339219e54"
  },
  {
    "id": 144817,
    "title": "Irving Penn: In A Cracked Mirror (Self-Portrait) (A), New York",
    "artist": "Irving Penn\nAmerican, 1917–2009",
    "date": "1986, printed October 1990",
    "department": "Photography and Media",
    "medium": "Platinum-palladium print",
    "origin": "United States",
    "imageId": "68310179-3770-a1dc-c961-82189eb5b2ba"
  },
  {
    "id": 87467,
    "title": "Édouard Manet",
    "artist": "Henri Fantin-Latour (French, 1836–1904)",
    "date": "1867",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on canvas",
    "origin": "France",
    "imageId": "dd4f9115-150c-2f1a-0f37-50899553d6b4"
  },
  {
    "id": 66042,
    "title": "Trompe-l'Oeil Still Life with a Flower Garland and a Curtain",
    "artist": "Adriaen van der Spelt (Dutch, 1630–1673)\nFrans van Mieris (Dutch, 1635–1681)",
    "date": "1658",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on panel",
    "origin": "Netherlands",
    "imageId": "4a04138f-43d8-cd9f-5ac4-478cd8828210"
  },
  {
    "id": 111377,
    "title": "For Sunday's Dinner",
    "artist": "William Michael Harnett (American, born Ireland, 1848–1892)",
    "date": "1888",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "3cea045a-92d6-36cf-1508-2c99ea740218"
  },
  {
    "id": 181777,
    "title": "The Irish Question",
    "artist": "De Scott Evans\nAmerican, 1847–1898",
    "date": "1880s",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "6754947f-4ccf-b3ff-41ee-45b738534769"
  },
  {
    "id": 183292,
    "title": "Still Life in Interior",
    "artist": "Preston Dickinson (American, 1889–1930)",
    "date": "1920–22",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "16d2efa0-6896-5c54-b024-de9b152f4195"
  },
  {
    "id": 44892,
    "title": "Fish (Still Life)",
    "artist": "Édouard Manet (French, 1832–1883)",
    "date": "1864",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on canvas",
    "origin": "France",
    "imageId": "0cbe27e8-2fec-3445-bc48-ce40a8f2dc25"
  },
  {
    "id": 21682,
    "title": "Still Life",
    "artist": "Pieter Claesz (Dutch, 1596/97–1660)",
    "date": "c. 1625",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on panel",
    "origin": "Netherlands",
    "imageId": "574695d5-6bf3-fe58-a1d5-e6cbb5e10c77"
  },
  {
    "id": 93812,
    "title": "Poor Room—There Is No Time, No End, No Today, No Yesterday, No Tomorrow, Only the Forever, and Forever, and Forever without End",
    "artist": "Ivan Albright (American, 1897–1983)",
    "date": "1942–43, 1948–55, 1957–63",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "577e1fb9-0542-07c7-ba31-4260e6ebecf4"
  },
  {
    "id": 44065,
    "title": "Just Dessert",
    "artist": "William Michael Harnett (American, born Ireland, 1848–1892)",
    "date": "1891",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "e49ad195-1f62-2fd4-f4df-61f0f0f4951f"
  },
  {
    "id": 150491,
    "title": "Untitled (Experiment 597)",
    "artist": "Anonymous Fermilab Photographer",
    "date": "1980s",
    "department": "Photography and Media",
    "medium": "Gelatin silver print",
    "origin": "Unknown Place",
    "imageId": "dc1cfd7f-48d1-8e44-e832-9e4b95f92e0a"
  },
  {
    "id": 11136,
    "title": "The Photographer Sescau",
    "artist": "Henri de Toulouse-Lautrec\nFrench, 1864-1901",
    "date": "1896",
    "department": "Prints and Drawings",
    "medium": "Color lithograph on ivory laid paper, laid down on linen",
    "origin": "France",
    "imageId": "399da367-1274-484a-1e9e-6874f00190d7"
  },
  {
    "id": 4492,
    "title": "Photograph of Bischof",
    "artist": "Erich Hartmann\nAmerican, born Germany, 1922-1999",
    "date": "1944/54",
    "department": "Photography and Media",
    "medium": "Gelatin silver print",
    "origin": "United States",
    "imageId": "d447305a-6898-0ddc-c191-e99508a5e77e"
  },
  {
    "id": 218576,
    "title": "Photograph of Photograph",
    "artist": "Jiro Takamatsu\nJapanese, 1936-1998",
    "date": "1973",
    "department": "Photography and Media",
    "medium": "Gelatin silver print",
    "origin": "",
    "imageId": "a1fae4dc-62f3-9f1e-8bdc-22cd78a189e5"
  },
  {
    "id": 117412,
    "title": "Chest for Photographs",
    "artist": "Designed by Josef Hoffmann (Austrian, born Moravia [now Czech Republic], 1870-1956)\nMade by W. Müller (Vienna, active early 20th century)",
    "date": "c. 1902",
    "department": "Applied Arts of Europe",
    "medium": "Wood with palisander and maple veneers, nickel silver",
    "origin": "Austria",
    "imageId": "feff821c-c945-710e-2e60-cdcc47495f0f"
  },
  {
    "id": 118608,
    "title": "Untitled",
    "artist": "Unknown FSA Photographer\nAmerican, active 1930\nAttributed to Walker Evans\nAmerican, 1903–1975",
    "date": "1935/38",
    "department": "Photography and Media",
    "medium": "Gelatin silver print",
    "origin": "United States",
    "imageId": "1312a31a-2470-7733-f7ef-57e574f5225f"
  },
  {
    "id": 118719,
    "title": "Untitled (Man and woman in carriage)",
    "artist": "Unknown FSA Photographer\nAmerican, active 1930",
    "date": "1930/39",
    "department": "Photography and Media",
    "medium": "Gelatin silver print",
    "origin": "United States",
    "imageId": "21bb9768-e171-bfef-82f5-7c479370b829"
  },
  {
    "id": 195561,
    "title": "The Human Liberty Bell",
    "artist": "Mole & Thomas\nArthur S. Mole (American, born England, 1889–1983) and John D. Thomas (American, died 1947)",
    "date": "1918",
    "department": "Photography and Media",
    "medium": "Gelatin silver print",
    "origin": "United States",
    "imageId": "384a83f3-7f1c-b8d2-4b80-4080cf1fc65c"
  },
  {
    "id": 64729,
    "title": "Early Morning, Tarpon Springs",
    "artist": "George Inness (American, 1825–1894)",
    "date": "1892",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "ef96e79b-f481-8114-0804-4bd39c101983"
  },
  {
    "id": 71562,
    "title": "Sunlight",
    "artist": "Richard E. Miller (American, 1875–1943)",
    "date": "c. 1913",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "815fb024-96bb-6f38-e6fc-d398d2103c65"
  },
  {
    "id": 138,
    "title": "Flower Girl in Holland",
    "artist": "George Hitchcock\nAmerican, 1850–1913",
    "date": "1887",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "Holland",
    "imageId": "e72305c9-1a1c-8a36-7450-582619366338"
  },
  {
    "id": 70065,
    "title": "Afterglow",
    "artist": "Jonas Lie (American, 1880–1940)",
    "date": "c. 1913",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "2e796bd8-4e0b-f55a-7c69-75a70a3e97d7"
  },
  {
    "id": 90899,
    "title": "Lady in Green and Gray",
    "artist": "Thomas Wilmer Dewing (American, 1851–1938)",
    "date": "1911",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "9604cbbd-722b-8de3-e7cc-4a80be648d79"
  },
  {
    "id": 13763,
    "title": "Snow-Crowned Hills",
    "artist": "Guy Carleton Wiggins (American, 1883–1962)",
    "date": "c. 1920",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "045a1779-36a4-282f-49b8-b8fb007f8254"
  },
  {
    "id": 71573,
    "title": "A Holiday",
    "artist": "Edward Henry Potthast (American, 1857–1927)",
    "date": "c. 1915",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "a67c4473-57a4-9807-a94e-1136d3daf876"
  },
  {
    "id": 70374,
    "title": "Untitled (Dream of Venus) formerly Visions of Eternity",
    "artist": "Salvador Dalí\nSpanish, 1904–1989",
    "date": "1939",
    "department": "Modern Art",
    "medium": "Oil on canvas",
    "origin": "Spain",
    "imageId": "d0802c40-1027-724b-7047-a73ad6d40242"
  },
  {
    "id": 70125,
    "title": "The Key",
    "artist": "Jackson Pollock\nAmerican, 1912-1956",
    "date": "1946",
    "department": "Contemporary Art",
    "medium": "Oil on linen",
    "origin": "United States",
    "imageId": "498b59aa-5cce-b5af-c436-443095df1c1b"
  },
  {
    "id": 77615,
    "title": "Painting (Figures with Stars)",
    "artist": "Joan Miró\nSpanish, 1893–1983",
    "date": "1933",
    "department": "Modern Art",
    "medium": "Oil on canvas",
    "origin": "Spain",
    "imageId": "7bd4542d-3e84-e21a-d259-8d22e20bee0a"
  },
  {
    "id": 62323,
    "title": "Magnetic Mountain",
    "artist": "Kurt Seligmann\nAmerican, born Switzerland, 1900-1962",
    "date": "1948",
    "department": "Modern Art",
    "medium": "Oil on canvas",
    "origin": "Switzerland",
    "imageId": "4212f149-f02a-9deb-3806-8bb2396a2d91"
  },
  {
    "id": 185187,
    "title": "Alphabet de la Tête",
    "artist": "Victor Brauner\nRomanian, 1903-1966",
    "date": "1938",
    "department": "Modern Art",
    "medium": "Oil on canvas",
    "origin": "Romania",
    "imageId": "f45b79b8-5edc-9bef-3100-baea71002604"
  },
  {
    "id": 253,
    "title": "Hydria (Water Jar)",
    "artist": "Greek; possibly Apulia or Campania, Italy",
    "date": "about 300 BCE",
    "department": "Arts of Greece, Rome, and Byzantium",
    "medium": "terracotta, black-glaze",
    "origin": "Nola",
    "imageId": "9af8c354-e223-256b-6aa9-71738010d4d5"
  },
  {
    "id": 23368,
    "title": "Walking Man II",
    "artist": "Alberto Giacometti\nSwiss, 1901–1966",
    "date": "1960",
    "department": "Contemporary Art",
    "medium": "Bronze",
    "origin": "Switzerland",
    "imageId": "2176719e-3cbc-708b-28da-e211d27e6aa4"
  },
  {
    "id": 14487,
    "title": "Abstraction on Concrete",
    "artist": "Howard Dearstyne\nAmerican, 1903–1979",
    "date": "1940/62",
    "department": "Photography and Media",
    "medium": "Chromogenic print",
    "origin": "United States",
    "imageId": "9f670fbc-368f-e785-37fd-726ba765db1e"
  },
  {
    "id": 93798,
    "title": "Picture of Dorian Gray",
    "artist": "Ivan Albright (American, 1897–1983)",
    "date": "1943–44",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "aa2b57e9-3773-03c1-0fb4-0135e7358dc6"
  },
  {
    "id": 24306,
    "title": "Blue and Green Music",
    "artist": "Georgia O'Keeffe (American, 1887–1986)",
    "date": "1919–21",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "3ee54063-9d78-ee86-0103-b477d988a93f"
  },
  {
    "id": 21727,
    "title": "Thanksgiving",
    "artist": "Doris Lee (American, 1904–1983)",
    "date": "c. 1935",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "1bbf95fa-2182-af0d-1e5d-9a3025e53fab"
  },
  {
    "id": 100858,
    "title": "Sky above Clouds IV",
    "artist": "Georgia O'Keeffe (American, 1887–1986)",
    "date": "1965",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "ace9f8d4-eac7-e5f7-50b2-6a77f7029c9b"
  },
  {
    "id": 24687,
    "title": "Yellow Hickory Leaves with Daisy",
    "artist": "Georgia O'Keeffe (American, 1887–1986)",
    "date": "1928",
    "department": "Arts of the Americas",
    "medium": "Oil on canvas",
    "origin": "United States",
    "imageId": "b3688c8c-06f2-2a35-56bb-19de1a05344e"
  },
  {
    "id": 9415,
    "title": "Panel (Furnishing Fabric)",
    "artist": "Printed and Manufactured by Lancaster Prints\nEngland, Lancashire, Lancaster",
    "date": "1856",
    "department": "Textiles",
    "medium": "Cotton, plain weave; engraved roller printed; glazed",
    "origin": "England",
    "imageId": "de0be2c7-f7f3-8994-24bb-8ea946a4f7fa"
  },
  {
    "id": 6655,
    "title": "Panel (Furnishing Fabric)",
    "artist": "Printed at Bannister Hall Print Works (English, active 1799-1840)\nPreston, Lancashire, England",
    "date": "c. 1815",
    "department": "Textiles",
    "medium": "Cotton, plain weave; block printed",
    "origin": "Preston",
    "imageId": "400678f1-1783-6066-098b-8dcb9ce2adc7"
  },
  {
    "id": 6652,
    "title": "Panel (Furnishing Fabric)",
    "artist": "Printed at Bannister Hall Print Works (English, active 1799-1840)\nPreston, Lancashire, England",
    "date": "c. 1815",
    "department": "Textiles",
    "medium": "Cotton, plain weave; block printed",
    "origin": "Preston",
    "imageId": "d7cf5f82-77cc-6412-8bf7-deadfda442ca"
  },
  {
    "id": 6658,
    "title": "Panel",
    "artist": "Printed at Bannister Hall Print Works (English, active 1799-1840)\nPreston, Lancashire, England",
    "date": "c. 1815",
    "department": "Textiles",
    "medium": "Cotton, plain weave; block printed",
    "origin": "Preston",
    "imageId": "80c16b85-0189-a40e-fdc6-19b9e640f8a7"
  },
  {
    "id": 109310,
    "title": "Samuel Slater, The Father of American Manufacturers (Handkerchief)",
    "artist": "Engraved by James Provan & Son's (American, active 1890s) after a portrait by James Sullivan Lincoln (American, 1811–1888)\nManufactured by Cranston Print Works Co. (American, active 1890)\nUnited States, Rhode Island, Cranston",
    "date": "1890",
    "department": "Textiles",
    "medium": "Cotton, plain weave; engraved roller printed",
    "origin": "Rhode Island",
    "imageId": "31dce54f-5f68-c637-1357-4ec3802ff062"
  },
  {
    "id": 77732,
    "title": "Fragment (Furnishing Fabric)",
    "artist": "Manufactured by the American Print Works (American, founded 1876)\nUnited States, Massachusetts, Fall River",
    "date": "c. 1876",
    "department": "Textiles",
    "medium": "Cotton, plain weave; roller printed",
    "origin": "Massachusetts",
    "imageId": "acbbc5a8-ffa4-e22f-46d9-56900858d3e7"
  },
  {
    "id": 68894,
    "title": "Siamese Ballet",
    "artist": "Designed by Edward Daly Brown (American, active c. 1950–1955)\nProduced by Schiffer Prints Division, Mil-Art Company, Inc.\nUnited States, New York, New York",
    "date": "1950/55",
    "department": "Textiles",
    "medium": "Cotton, plain weave; screen printed",
    "origin": "New York City",
    "imageId": "2b90923d-266f-f7d6-d9a9-507afdd5caa7"
  },
  {
    "id": 45327,
    "title": "A5: Massachusetts Drawing Room, 1768",
    "artist": "Designed by Narcissa Niblack Thorne\nAmerican, 1882–1966",
    "date": "c. 1940",
    "department": "Applied Arts of Europe",
    "medium": "Miniature room, mixed media",
    "origin": "United States",
    "imageId": "fb786306-5ca6-9fd3-5c19-c57c82e64a0f"
  },
  {
    "id": 45358,
    "title": "A16: Pennsylvania Drawing Room, 1761",
    "artist": "Designed by Narcissa Niblack Thorne\nAmerican, 1882–1966",
    "date": "c. 1940",
    "department": "Applied Arts of Europe",
    "medium": "Miniature room, mixed media",
    "origin": "United States",
    "imageId": "12d40137-bb2b-ec92-b562-5770d61ec339"
  },
  {
    "id": 45352,
    "title": "A14: Pennsylvania Drawing Room, 1834–36",
    "artist": "Designed by Narcissa Niblack Thorne\nAmerican, 1882–1966",
    "date": "c. 1940",
    "department": "Applied Arts of Europe",
    "medium": "Miniature room, mixed media",
    "origin": "United States",
    "imageId": "f08737c2-7509-5e8e-633c-004657a61b4f"
  },
  {
    "id": 118760,
    "title": "Drawing - Collage",
    "artist": "Joan Miró\nSpanish, 1893-1983",
    "date": "August 30, 1933",
    "department": "Prints and Drawings",
    "medium": "Collage composed of cut-and-pasted, commercially printed papers, postcards, and sandpaper, with graphite and black crayon, on tan wove paper",
    "origin": "Spain",
    "imageId": "671a498f-8ea6-44b2-f74d-56239351f5e4"
  },
  {
    "id": 22938,
    "title": "Drawing Lots for Prizes (Ho biki)",
    "artist": "Kitagawa Utamaro 喜多川 歌麿\nJapanese, c.1753-1806",
    "date": "c. 1798",
    "department": "Arts of Asia",
    "medium": "Color woodblock prints; ōban triptych",
    "origin": "Japan",
    "imageId": "d0ea400e-596d-b78e-8a68-40d15211e1c6"
  },
  {
    "id": 45377,
    "title": "A23: Virginia Drawing Room, 1754",
    "artist": "Designed by Narcissa Niblack Thorne\nAmerican, 1882–1966",
    "date": "c. 1940",
    "department": "Applied Arts of Europe",
    "medium": "Miniature room, mixed media",
    "origin": "United States",
    "imageId": "0655236d-79da-3bfc-ec5c-98faad1d2132"
  },
  {
    "id": 45382,
    "title": "A25: Virginia Drawing Room, 1755",
    "artist": "Designed by Narcissa Niblack Thorne\nAmerican, 1882–1966",
    "date": "c. 1940",
    "department": "Applied Arts of Europe",
    "medium": "Miniature room, mixed media",
    "origin": "United States",
    "imageId": "71a1fd29-022a-d6dd-646f-c931e8a03c0a"
  },
  {
    "id": 43732,
    "title": "E15: English Drawing Room of the Modern Period, 1930s",
    "artist": "Designed by Narcissa Niblack Thorne\nAmerican, 1882–1966",
    "date": "c. 1937",
    "department": "Applied Arts of Europe",
    "medium": "Miniature room, mixed media",
    "origin": "United States",
    "imageId": "bb3a9329-ee0a-00ad-9972-aea8db5c4f46"
  },
  {
    "id": 81557,
    "title": "Seascape",
    "artist": "Pierre-Auguste Renoir (French, 1841–1919)",
    "date": "1879",
    "department": "Painting and Sculpture of Europe",
    "medium": "Oil on canvas",
    "origin": "France",
    "imageId": "caf4fa39-e2e8-344a-542c-2d9a03ec9d4b"
  },
  {
    "id": 38666,
    "title": "The Water Fan",
    "artist": "Winslow Homer\nAmerican, 1836-1910",
    "date": "1898/99",
    "department": "Prints and Drawings",
    "medium": "Watercolor, with blotting and touches of scraping, over graphite, on thick, rough twill-textured, ivory wove paper",
    "origin": "United States",
    "imageId": "1de73bb7-52d6-e099-f4e1-763e201e78fa"
  },
  {
    "id": 102963,
    "title": "The Titanic",
    "artist": "Stanley Tigerman\nAmerican, 1930–2019",
    "date": "1978",
    "department": "Architecture and Design",
    "medium": "Photocollage, gelatin silver print, cardboard",
    "origin": "State Street, 3360 South",
    "imageId": "03cdd6a7-a043-2ac8-3de0-addd99c0ff88"
  },
  {
    "id": 144857,
    "title": "Seascape, Japan",
    "artist": "Irving Penn\nAmerican, 1917–2009",
    "date": "1964, printed 1968",
    "department": "Photography and Media",
    "medium": "Platinum-iridium print",
    "origin": "United States",
    "imageId": "29544f64-4065-5514-9d48-f8c20c5648a0"
  },
  {
    "id": 16791,
    "title": "Flamborough Head, England",
    "artist": "Winslow Homer\nAmerican, 1836-1910",
    "date": "1882",
    "department": "Prints and Drawings",
    "medium": "Graphite and opaque white watercolor on medium thick, slightly textured, tan laid paper with red and blue fibers",
    "origin": "United States",
    "imageId": "680d3efd-2cf9-36f4-6454-806af8b79d98"
  },
  {
    "id": 16776,
    "title": "After the Hurricane, Bahamas",
    "artist": "Winslow Homer\nAmerican, 1836-1910",
    "date": "1899",
    "department": "Prints and Drawings",
    "medium": "Transparent watercolor, with touches of opaque watercolor, rewetting, blotting and scraping, over graphite, on moderately thick, moderately textured (twill texture on verso), ivory wove paper",
    "origin": "United States",
    "imageId": "b34de958-1cbe-065f-4941-c34f64d2b366"
  },
  {
    "id": 16794,
    "title": "The Gulf Stream",
    "artist": "Winslow Homer\nAmerican, 1836-1910",
    "date": "probably 1899, dated by the artist \"1889\"",
    "department": "Prints and Drawings",
    "medium": "Transparent watercolor, with touches of opaque watercolor and traces of blotting, over graphite, on moderately thick, moderately textured, ivory wove paper (lower edge trimmed)",
    "origin": "United States",
    "imageId": "4a076002-dffe-54e9-5256-0691c3a65c3b"
  },
  {
    "id": 24253,
    "title": "Seascape with Boats",
    "artist": "Eugène Louis Boudin\nFrench, 1824-1898",
    "date": "1898",
    "department": "Prints and Drawings",
    "medium": "Etching on ivory laid paper",
    "origin": "France",
    "imageId": "7da4f71b-2c4f-1bc3-dd44-10b2ee7ee30f"
  }
] as const;
