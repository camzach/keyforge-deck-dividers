import { jsPDF } from "https://esm.sh/jspdf@3.0.1";

import { generate_batch, expansion_order } from "./module.js";
import { loadDecks, saveDecks } from "./database.js";

const apiKey = document.getElementById("api-key");
const search = document.getElementById("search");
const table = document.getElementById("select-decks");
const selectAll = document.getElementById("select-all");
const nameSort = document.getElementById("name-sort");
const setSort = document.getElementById("set-sort");
const dateSort = document.getElementById("date-sort");
const decks = new Map();
const selectedDecks = new Map();

const stopwords = new Set([
  "of",
  "the",
  "and",
  "in",
  "to",
  "for",
  "a",
  "on",
  "by",
  "with",
  "is",
  "at",
]);
function titleCase(str) {
  return str
    .toLowerCase()
    .split("_")
    .map((word) =>
      stopwords.has(word.toLowerCase())
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function updateDeckList() {
  const matchingDecks = Array.from(decks.values())
    .filter(
      (deck) =>
        search.value === "" ||
        deck.name.toLowerCase().includes(search.value.toLowerCase()),
    )
    .sort((a, b) => {
      if (nameSort.getAttribute("sort-order") === "asc") {
        return a.name
          .replace(/^[“”]/, "")
          .localeCompare(b.name.replace(/^[“”]/, ""));
      } else if (nameSort.getAttribute("sort-order") === "desc") {
        return b.name
          .replace(/^[“”]/, "")
          .localeCompare(a.name.replace(/^[“”]/, ""));
      }

      if (setSort.getAttribute("sort-order") === "asc") {
        return (
          expansion_order.indexOf(a.expansion) -
          expansion_order.indexOf(b.expansion)
        );
      } else if (setSort.getAttribute("sort-order") === "desc") {
        return (
          expansion_order.indexOf(b.expansion) -
          expansion_order.indexOf(a.expansion)
        );
      }

      if (dateSort.getAttribute("sort-order") === "asc") {
        return a.dateAdded.localeCompare(b.dateAdded);
      } else if (dateSort.getAttribute("sort-order") === "desc") {
        return b.dateAdded.localeCompare(a.dateAdded);
      }

      return 0;
    })
    .map((deck) => {
      const opt = document.createElement("tr");
      opt.innerHTML = `
        <td>
          <input type="checkbox" value="${deck.name}" ${
            !expansion_order.includes(deck.expansion) ? 'disabled="true"' : ""
          }></input>
        </td>
        <td>${deck.name}</td>
        <td style="isolation: isolate; z-index: -1"><img src="./assets/sets/${deck.expansion.replace(
          /_\d+$/,
          "",
        )}.png"></img>${titleCase(deck.expansion)}</td>
        <td>${deck.dateAdded}</td>
      `;
      opt.querySelector("input").checked = selectedDecks.get(deck.name);
      opt.querySelector("input").addEventListener("change", (e) => {
        selectedDecks.set(deck.name, e.target.checked);
        updateSelectAll();
        updatePDFButton();
      });
      return opt;
    });

  table.querySelector("tbody").replaceChildren(...matchingDecks);
  updateSelectAll();
  updatePDFButton();
}

function updatePDFButton() {
  if (Array.from(selectedDecks.values()).every((v) => !v)) {
    document.getElementById("create-pdf").disabled = true;
  } else {
    document.getElementById("create-pdf").disabled = false;
  }
}

function updateSelectAll() {
  const allValues = Array.from(selectedDecks.values());
  if (allValues.every((v) => v)) {
    selectAll.indeterminate = false;
    selectAll.checked = true;
  } else if (allValues.every((v) => !v)) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  } else {
    selectAll.indeterminate = true;
  }
}

let fetchingDecks = false;
async function fetchDecks() {
  if (fetchingDecks) return;
  fetchingDecks = true;
  document.getElementById("fetch-decks").ariaBusy = true;
  const fetchedDecks = await fetch(
    "https://decksofkeyforge.com/public-api/v1/my-decks",
    { headers: { "Api-Key": apiKey.value } },
  ).then((res) => res.json());
  console.log(fetchedDecks);
  decks.clear();
  selectedDecks.clear();
  for (const { deck } of fetchedDecks) {
    decks.set(deck.name, deck);
    selectedDecks.set(deck.name, false);
  }
  localStorage.setItem("apiKey", apiKey.value);
  await saveDecks([...decks.values()]);
  updateDeckList();
  fetchingDecks = false;
  document.getElementById("fetch-decks").ariaBusy = false;
}

async function generatePDF() {
  const selectedDeckData = Array.from(selectedDecks.entries()).flatMap(
    ([name, selected]) =>
      decks.has(name) && selected ? [decks.get(name)] : [],
  );

  const { results, dims } = generate_batch(selectedDeckData, [8.5, 11]);
  const format = "letter";
  const orientation = dims[0] > dims[1] ? "landscape" : "portrait";
  const doc = new jsPDF({
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
    ...dims,
  );
  for (const page of results) {
    doc.addPage(format, orientation);
    doc.addImage(
      page,
      "PNG",
      (doc.getPageWidth() - dims[0]) / 2,
      (doc.getPageHeight() - dims[1]) / 2,
      ...dims,
    );
  }
  doc.save("dividers.pdf");
}

document.getElementById("fetch-decks").addEventListener("click", fetchDecks);
document.getElementById("create-pdf").addEventListener("click", generatePDF);
search.addEventListener("input", updateDeckList);
selectAll.addEventListener("change", (e) => {
  selectedDecks.forEach((_, name) => selectedDecks.set(name, e.target.checked));
  updateDeckList();
});

loadDecks()
  .then((storedDecks) => {
    if (storedDecks) {
      for (const deck of storedDecks) {
        decks.set(deck.name, deck);
        selectedDecks.set(deck.name, false);
      }
      updateDeckList();
    }
  })
  .catch(console.error);

apiKey.value = localStorage.getItem("apiKey");
nameSort.addEventListener("click", () => {
  setSort.removeAttribute("sort-order");
  dateSort.removeAttribute("sort-order");
  updateDeckList();
});
setSort.addEventListener("click", () => {
  nameSort.removeAttribute("sort-order");
  dateSort.removeAttribute("sort-order");
  updateDeckList();
});
dateSort.addEventListener("click", () => {
  nameSort.removeAttribute("sort-order");
  setSort.removeAttribute("sort-order");
  updateDeckList();
});

class SortButton extends HTMLElement {
  static observedAttributes = ["sort-order"];

  static upIcon =
    '<svg height="1em" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 -0.03 478 512.33"><path fill-rule="nonzero" fill="currentColor" d="M161.37 115.54H129.6V505.7c0 3.34-3.25 6.59-6.58 6.59H52.94c-3.41 0-6.63-2.94-6.63-6.59V115.54H14.58c-3.37 0-6.82-1.15-9.56-3.57-6.1-5.27-6.7-14.51-1.46-20.58L78.84 4.96c5.99-6.62 16.46-6.7 22.25.28l71.07 85.87c2.38 2.62 3.81 6.11 3.81 9.84 0 8.13-6.51 14.59-14.6 14.59zm50.02 396.75c-3.33 0-6.59-3.25-6.59-6.59v-56.59c0-3.38 2.94-6.63 6.59-6.63h260.03c3.65 0 6.58 3.25 6.58 6.63v56.59c0 3.34-3.25 6.59-6.58 6.59H211.39zm0-142.11c-3.17 0-6.59-3.38-6.59-6.59v-56.6c0-3.25 2.98-6.62 6.59-6.62h192.84c3.61 0 6.58 3.25 6.58 6.62v56.6c0 3.33-3.33 6.59-6.58 6.59H211.39zm0-142.11c-3.17 0-6.59-3.34-6.59-6.59v-56.6c0-3.29 2.94-6.62 6.59-6.62h125.65c3.65 0 6.58 3.25 6.58 6.62v56.6c0 3.33-3.33 6.59-6.58 6.59H211.39z"></path></svg>';
  static downIcon =
    '<svg height="1em" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 478 512.3"><path fill-rule="nonzero" fill="currentColor" d="M161.37 396.74H129.6V6.58c0-3.33-3.25-6.58-6.58-6.58H52.94c-3.41 0-6.63 2.93-6.63 6.58v390.16H14.58c-3.37 0-6.82 1.15-9.56 3.57-6.1 5.28-6.7 14.52-1.46 20.59l75.28 86.42c5.99 6.63 16.46 6.71 22.25-.27l71.07-85.87c2.38-2.62 3.81-6.11 3.81-9.84 0-8.13-6.51-14.6-14.6-14.6zM211.39 0c-3.33 0-6.59 3.25-6.59 6.58v56.6c0 3.37 2.94 6.63 6.59 6.63h260.03c3.65 0 6.58-3.26 6.58-6.63V6.58c0-3.33-3.25-6.58-6.58-6.58H211.39zm0 142.11c-3.17 0-6.59 3.37-6.59 6.59v56.59c0 3.26 2.98 6.63 6.59 6.63h192.84c3.61 0 6.58-3.26 6.58-6.63V148.7c0-3.34-3.33-6.59-6.58-6.59H211.39zm0 142.11c-3.17 0-6.59 3.33-6.59 6.59v56.59c0 3.3 2.94 6.63 6.59 6.63h125.65c3.65 0 6.58-3.25 6.58-6.63v-56.59c0-3.34-3.33-6.59-6.58-6.59H211.39z"></path></svg>';
  static neutralIcon =
    '<svg height="1em" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" enable-background="new 0 0 85.208 122.882" xml:space="preserve" viewBox="0 0 85.23 122.88"><g><path fill-rule="evenodd" fill="currentColor" clip-rule="evenodd" d="M57.121,122.882l28.087-29.215L67.13,93.665V67.004v-0.506V41.932H47.111V66.5 l0,0v27.165l-18.081,0.002L57.121,122.882L57.121,122.882z M28.09,0l28.086,29.215l-18.078,0.002v26.661v0.505V80.95H18.08V56.382 l0,0V29.217L0,29.215L28.09,0L28.09,0z"></path></g></svg>';

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        button {
          background: none;
          border: none;
          cursor: pointer;
          color: currentColor;
        }
      </style>
      <button>
        ${
          {
            asc: SortButton.upIcon,
            desc: SortButton.downIcon,
            [null]: SortButton.neutralIcon,
          }[this.getAttribute("sort-order")]
        }
      </button>
    `;
    this.shadowRoot
      .querySelector("button")
      .addEventListener("click", () => this.toggle());
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name !== "sort-order") return;
    if (newValue === "asc") {
      this.shadowRoot.querySelector("button").innerHTML = SortButton.upIcon;
    } else if (newValue === "desc") {
      this.shadowRoot.querySelector("button").innerHTML = SortButton.downIcon;
    } else {
      this.shadowRoot.querySelector("button").innerHTML =
        SortButton.neutralIcon;
    }
  }
  toggle() {
    if (this.getAttribute("sort-order") === "asc") {
      this.setAttribute("sort-order", "desc");
    } else if (this.getAttribute("sort-order") === "desc") {
      this.removeAttribute("sort-order", undefined);
    } else {
      this.setAttribute("sort-order", "asc");
    }
  }
}
customElements.define("sort-button", SortButton);
