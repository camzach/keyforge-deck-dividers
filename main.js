import { generate_deck_divider, expansion_order } from "./module.js";

const apiKey = document.getElementById("api-key");
const select = document.getElementById("select-decks");
const search = document.getElementById("deck-search");
const decks = new Map();

function filterDeckList(filter) {
  const matchingDecks = Array.from(decks.entries())
    .filter(([deck]) => filter === undefined || deck.includes(filter))
    .sort(([a], [b]) =>
      a.replace(/^[“”]/, "").localeCompare(b.replace(/^[“”]/, ""))
    )
    .sort(
      ([_, a], [__, b]) =>
        expansion_order.indexOf(a.expansion) -
        expansion_order.indexOf(b.expansion)
    )
    .map(([deck]) => {
      const opt = document.createElement("option");
      opt.value = deck;
      opt.label = deck;
      return opt;
    });

  select.replaceChildren(...matchingDecks);
}

let part1Loading = false;
async function go() {
  if (part1Loading) return;
  part1Loading = true;
  document.getElementById("stage-1-loading").hidden = false;
  for (const { deck } of await fetch(
    "https://decksofkeyforge.com/public-api/v1/my-decks",
    { headers: { "Api-Key": apiKey.value } }
  ).then((res) => res.json())) {
    decks.set(deck.name, deck);
  }
  filterDeckList();
  document.getElementById("stage-1").hidden = true;
  document.getElementById("stage-2").hidden = false;
}

async function go2() {
  const images = Array.from(select.selectedOptions, (option) => {
    const deck = decks.get(option.value);
    let canvas = generate_deck_divider(deck);
    let im = document.createElement("img");
    im.height = "500";
    im.src = canvas.toDataURL();
    return im;
  });
  document.getElementById("result").replaceChildren(...images);
  document.getElementById("result").hidden = false;
}

document.getElementById("go").addEventListener("click", go);
document.getElementById("go-2").addEventListener("click", go2);
search.addEventListener("change", (e) => {
  filterDeckList(e.target.value);
});
