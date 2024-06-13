import { generate_deck_divider, expansion_order } from "./module.js";

const apiKey = document.getElementById("api-key");
const select = document.getElementById("select-decks");
const sort = document.getElementById("deck-sort-controls");
const decks = new Map();
window.decks = decks;

function updateDeckList() {
  const matchingDecks = Array.from(decks.values())
    .filter(
      (deck) =>
        !sort.elements["search"] ||
        deck.name.includes(sort.elements["search"].value)
    )
    .sort((a, b) =>
      a.name.replace(/^[“”]/, "").localeCompare(b.name.replace(/^[“”]/, ""))
    )
    .sort((a, b) => {
      let result = 0;
      switch (sort.elements["sort-by"].value) {
        case "name":
          break;
        case "expansion":
          result =
            expansion_order.indexOf(a.expansion) -
            expansion_order.indexOf(b.expansion);
          break;
        case "date":
          result = new Date(a.dateAdded) - new Date(b.dateAdded);
          break;
      }
      if (sort.elements["sort-order"].value === "desc") {
        result *= -1;
      }
      return result;
    })
    .map((deck) => {
      const opt = document.createElement("option");
      opt.value = deck.name;
      opt.label = `${deck.name} - ${deck.expansion} - ${deck.dateAdded}`;
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
  updateDeckList();
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
sort.addEventListener("input", updateDeckList);
