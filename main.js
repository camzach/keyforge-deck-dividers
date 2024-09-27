const apiKey = document.getElementById("api-key");
const select = document.getElementById("select-decks");
const sort = document.getElementById("deck-sort-controls");
const decks = new Map();

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
  localStorage.setItem("apiKey", apiKey.value);
  updateDeckList();
  document.getElementById("stage-1").hidden = true;
  document.getElementById("stage-2").hidden = false;
}

async function go2() {
  const { results, dims } = await generate_batch(
    Array.from(select.selectedOptions, (opt) => decks.get(opt.value)),
    [8.5, 11]
  );

  const format = "letter";
  const orientation = dims[0] > dims[1] ? "landscape" : "portrait";
  const doc = new jspdf.jsPDF({
    format,
    orientation,
    unit: "in",
  });

  const firstPage = results.shift();
  doc.addImage(
    firstPage,
    "PNG",
    (doc.getPageWidth() - dims[0]) / 2,
    (doc.getPageHeight() - dims[1]) / 2,
    ...dims
  );
  for (const page of results) {
    doc.addPage(format, orientation);
    doc.addImage(
      page,
      "PNG",
      (doc.getPageWidth() - dims[0]) / 2,
      (doc.getPageHeight() - dims[1]) / 2,
      ...dims
    );
  }
  doc.save("dividers.pdf");
}

document.getElementById("go").addEventListener("click", go);
document.getElementById("go-2").addEventListener("click", go2);
sort.addEventListener("input", updateDeckList);
document.getElementById("select-all").addEventListener("click", () => {
  for (const opt of select.options) {
    opt.selected = true;
  }
});

apiKey.value = localStorage.getItem("apiKey");
