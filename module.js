const PPI = 360;
const CARD_HEIGHT_IN = 3.5;
const CARD_WIDTH_IN = 2.5;
const DECK_DEPTH_IN = 0.5;

const PAGE_WIDTH_IN = 8.5;
const PAGE_HEIGHT_IN = 11;
const PAGE_MARGIN_IN = 0.25;

const IMAGE_HEIGHT = PPI * (CARD_HEIGHT_IN + DECK_DEPTH_IN);
const IMAGE_WIDTH = PPI * CARD_WIDTH_IN;

const IMAGE_MARGIN = 25;
const HEADER_HEIGHT = PPI * DECK_DEPTH_IN;
const BODY_NAME_AREA = PPI * 0.3;
const CARD_AREA_TOP = HEADER_HEIGHT + BODY_NAME_AREA + IMAGE_MARGIN * 2;

function loadImage(src) {
  const im = new Image();
  im.src = src;
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  im.onload = () => {
    resolve(im);
  };
  return promise;
}
export const expansion_order = [
  "CALL_OF_THE_ARCHONS",
  "AGE_OF_ASCENSION",
  "WORLDS_COLLIDE",
  "MASS_MUTATION",
  "DARK_TIDINGS",
  "WINDS_OF_EXCHANGE",
  "UNCHAINED_2022",
  "VAULT_MASTERS_2023",
  "GRIM_REMINDERS",
  "MENAGERIE_2024",
  "VAULT_MASTERS_2024",
  // "AEMBER_SKIES",
];
const expansions = await Promise.all(
  expansion_order.map(async (expansion) => [
    expansion,
    await loadImage(`./assets/${expansion.replace(/_\d+$/, "")}.png`),
  ])
).then(Object.fromEntries);
const houses = await Promise.all(
  [
    "Brobnar",
    "Dis",
    "Ekwidon",
    "Geistoid",
    "Logos",
    "Mars",
    "Sanctum",
    "Saurian",
    "Shadows",
    "StarAlliance",
    "Unfathomable",
    "Untamed",
  ].map(async (house) => [house, await loadImage(`./assets/${house}.png`)])
).then(Object.fromEntries);

function make_trigram(house_list) {
  const canvas = document.createElement("canvas");
  canvas.width = HEADER_HEIGHT - IMAGE_MARGIN * 2;
  canvas.height = HEADER_HEIGHT - IMAGE_MARGIN * 2;
  const ctx = canvas.getContext("2d");

  const HOUSE_HEIGHT = Math.ceil(canvas.height / 2.5);
  const HOUSE_RADIUS = Math.ceil(HOUSE_HEIGHT / 2);
  const ROTATION_RADIUS = HOUSE_RADIUS + 10;

  function coords(angle) {
    const center_x = Math.ceil(Math.cos(angle) * ROTATION_RADIUS);
    const center_y = Math.ceil(Math.sin(angle) * ROTATION_RADIUS);
    return [
      center_x - HOUSE_RADIUS + Math.ceil(canvas.width / 2),
      center_y - HOUSE_RADIUS + Math.ceil(canvas.height / 2),
      HOUSE_HEIGHT,
      HOUSE_HEIGHT,
    ];
  }

  ctx.drawImage(houses[house_list[0]], ...coords((Math.PI * 4) / 3));
  ctx.drawImage(houses[house_list[1]], ...coords(0));
  ctx.drawImage(houses[house_list[2]], ...coords((Math.PI * 2) / 3));

  return canvas;
}

/**
 *
 * @param {string[]} lines
 * @param {[int, int]} pos
 * @param {CanvasRenderingContext2D} ctx
 */
function draw_multiline_text(lines, pos, ctx) {
  const lineHeight = ctx.measureText("M").fontBoundingBoxAscent + 5;
  let [x, y] = pos;
  for (let i = 0; i < lines.length; i++) {
    ctx.strokeText(lines[i], x, y + i * lineHeight);
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
}

function break_text(text, font, max_width) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = font;

  const words = text.split(" ");

  let lines = [words[0]];
  let currentLine = 0;

  for (let i = 1; i < words.length; i++) {
    if (
      ctx.measureText(lines[currentLine] + " " + words[i]).width <= max_width
    ) {
      lines[currentLine] += " " + words[i];
    } else {
      lines.push(words[i]);
      currentLine++;
    }
  }

  return lines;
}

function generate_deck_divider(deck) {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  canvas.height = IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");

  ctx.rect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
  ctx.stroke();

  const trigram = make_trigram(deck.housesAndCards.map((house) => house.house));

  ctx.drawImage(
    trigram,
    IMAGE_WIDTH - trigram.width - IMAGE_MARGIN,
    IMAGE_MARGIN
  );

  const expansion = expansions[deck.expansion];
  const expansion_ratio = expansion.height / expansion.width;
  const expansion_size = [
    Math.floor((1 / 3) * HEADER_HEIGHT),
    Math.floor((1 / 3) * HEADER_HEIGHT * expansion_ratio),
  ];
  ctx.drawImage(
    expansion,
    IMAGE_MARGIN,
    Math.floor((HEADER_HEIGHT - expansion_size[1]) / 2),
    ...expansion_size
  );

  const name_font_size = HEADER_HEIGHT / 3;
  const name_font = `${name_font_size}px Righteous`;
  ctx.font = name_font;
  const name_line_height = ctx.measureText("M").fontBoundingBoxAscent;
  const header_name_lines = break_text(
    deck.name,
    name_font,
    IMAGE_WIDTH - trigram.width - expansion_size[0] - IMAGE_MARGIN * 4
  );

  const header_name_y =
    HEADER_HEIGHT / 2 +
    name_line_height / 2 -
    Math.max(0, header_name_lines.length - 1) * (name_line_height / 2);

  draw_multiline_text(
    header_name_lines,
    [expansion_size[0] + IMAGE_MARGIN * 2, header_name_y],
    ctx
  );

  ctx.beginPath();
  ctx.moveTo(0, HEADER_HEIGHT);
  ctx.lineTo(IMAGE_WIDTH, HEADER_HEIGHT);
  ctx.stroke();

  const body_name_font_size = BODY_NAME_AREA / 3;
  const body_name_font = `${body_name_font_size}px Righteous`;
  const body_name_lines = break_text(
    deck.name,
    body_name_font,
    IMAGE_WIDTH - IMAGE_MARGIN * 2
  );
  ctx.font = body_name_font;
  const body_name_line_height = ctx.measureText("M").fontBoundingBoxAscent;

  const body_name_y =
    HEADER_HEIGHT +
    IMAGE_MARGIN +
    BODY_NAME_AREA / 2 +
    body_name_line_height / 2 -
    Math.max(0, body_name_lines.length - 1) * (body_name_line_height / 2);

  draw_multiline_text(body_name_lines, [IMAGE_MARGIN, body_name_y], ctx);

  const card_name_font = "25px sans-serif";
  ctx.font = card_name_font;

  const COL_WIDTH = (IMAGE_WIDTH - IMAGE_MARGIN * 2) / 3;
  const HOUSE_HEIGHT = COL_WIDTH / 3;
  for (let i = 0; i < deck.housesAndCards.length; i++) {
    const house_and_cards = deck.housesAndCards[i];

    const house_image = houses[house_and_cards.house];
    ctx.drawImage(
      house_image,
      Math.floor(
        IMAGE_MARGIN + COL_WIDTH * i + COL_WIDTH / 2 - IMAGE_MARGIN * 2
      ),
      CARD_AREA_TOP,
      HOUSE_HEIGHT,
      HOUSE_HEIGHT
    );

    let last_bottom = CARD_AREA_TOP + HOUSE_HEIGHT + IMAGE_MARGIN;

    for (let j = 0; j < house_and_cards.cards.length; j++) {
      const card = house_and_cards.cards[j];

      const lines = break_text(
        card.cardTitle,
        card_name_font,
        COL_WIDTH - IMAGE_MARGIN * 2
      );
      const pos = [
        IMAGE_MARGIN + COL_WIDTH * i + (i > 0 ? IMAGE_MARGIN : 0),
        last_bottom + IMAGE_MARGIN,
      ];
      if (card.enhanced) {
        ctx.fillStyle = "#00f";
      } else {
        ctx.fillStyle = "#000";
      }
      draw_multiline_text(lines, pos, ctx);
      last_bottom = pos[1];
      for (const line in lines) {
        last_bottom += ctx.measureText(line).fontBoundingBoxAscent;
      }
    }
  }

  ctx.beginPath();
  ctx.moveTo(IMAGE_MARGIN + COL_WIDTH, CARD_AREA_TOP);
  ctx.lineTo(IMAGE_MARGIN + COL_WIDTH, IMAGE_HEIGHT - 275);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(IMAGE_MARGIN + COL_WIDTH * 2, CARD_AREA_TOP);
  ctx.lineTo(IMAGE_MARGIN + COL_WIDTH * 2, IMAGE_HEIGHT - 275);
  ctx.stroke();

  return canvas;
}

function get_batch_size() {
  const printable_height = (PAGE_HEIGHT_IN - PAGE_MARGIN_IN * 2) * PPI;
  const printable_width = (PAGE_WIDTH_IN - PAGE_MARGIN_IN * 2) * PPI;

  const height_portrait = Math.floor(printable_height / IMAGE_HEIGHT);
  const width_portrait = Math.floor(printable_width / IMAGE_WIDTH);

  const width_landscape = Math.floor(printable_height / IMAGE_WIDTH);
  const height_landscape = Math.floor(printable_width / IMAGE_HEIGHT);

  if (width_landscape * height_landscape > width_portrait * height_portrait) {
    return [width_landscape, height_landscape];
  } else {
    return [width_portrait, height_portrait];
  }
}

const fontlink = document.createElement("link");
fontlink.rel = "stylesheet";
fontlink.href =
  "https://fonts.googleapis.com/css2?family=Righteous&display=swap";
let fontResolve;
const fontPromise = new Promise((resolve) => {
  fontResolve = resolve;
});
fontlink.onload = () => {
  document.fonts.load("1em Righteous").then(() => {
    fontResolve();
  });
};
document.head.appendChild(fontlink);
await fontPromise;

let [BATCH_WIDTH, BATCH_HEIGHT] = get_batch_size();

let pages = [];

export { generate_deck_divider };
