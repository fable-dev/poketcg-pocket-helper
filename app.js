const CARDS_URL = "data/cards.json";
const COLLECTION_STORAGE_KEY = "ptp_collection_v1";

// In-memory state
let allCards = [];
let collection = {}; // { [cardId]: "owned" | "wanted" | "none" }

// Helpers to load/save from localStorage
function loadCollection() {
  try {
    const raw = localStorage.getItem(COLLECTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load collection from localStorage", e);
  }
  return {};
}

function saveCollection() {
  try {
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collection));
  } catch (e) {
    console.error("Failed to save collection to localStorage", e);
  }
}

function getFilteredCards() {
  const searchValue = document
    .getElementById("search-input")
    .value.trim()
    .toLowerCase();

  const setValue = document.getElementById("set-filter").value;
  const rarityValue = document.getElementById("rarity-filter").value;
  const typeValue = document.getElementById("type-filter").value;
  const weaknessValue = document.getElementById("weakness-filter").value;
  const packValue = document.getElementById("pack-filter").value;

  const hpMin = parseInt(document.getElementById("hp-min").value) || 0;
  const hpMax = parseInt(document.getElementById("hp-max").value) || 9999;

  return allCards.filter((card) => {
    const matchesSearch =
      !searchValue ||
      card.name.toLowerCase().includes(searchValue);

    const matchesSet = !setValue || card.set === setValue;
    const matchesRarity = !rarityValue || card.rarity === rarityValue;
    const matchesType = !typeValue || (card.types || []).includes(typeValue);
    const matchesWeakness =
      !weaknessValue ||
      (card.weaknesses || []).includes(weaknessValue);
    const matchesHP = card.hp >= hpMin && card.hp <= hpMax;

    // Booster pack logic:
    // - packValue ""  => ignore booster packs
    // - packValue "Any" => show only cards with no restriction (boosterPacks empty or missing)
    // - otherwise => card.boosterPacks must include that pack
    const packs = card.boosterPacks || [];
    let matchesPack = true;

    if (packValue === "Any") {
      matchesPack = packs.length === 0;
    } else if (packValue) {
      matchesPack = packs.includes(packValue);
    }

    return (
      matchesSearch &&
      matchesSet &&
      matchesRarity &&
      matchesType &&
      matchesWeakness &&
      matchesHP &&
      matchesPack
    );
  });
}

function renderFilters() {
  const setSelect = document.getElementById("set-filter");
  const raritySelect = document.getElementById("rarity-filter");
  const typeSelect = document.getElementById("type-filter");
  const weaknessSelect = document.getElementById("weakness-filter");

  const sets = Array.from(new Set(allCards.map((c) => c.set))).sort();
  const rarities = Array.from(new Set(allCards.map((c) => c.rarity))).sort();

  const allTypes = new Set();
  const allWeaknesses = new Set();

  allCards.forEach((card) => {
    (card.types || []).forEach((t) => allTypes.add(t));
    (card.weaknesses || []).forEach((w) => allWeaknesses.add(w));
  });

  // Clear existing options except the first
  [setSelect, raritySelect, typeSelect, weaknessSelect].forEach((select) => {
    const firstOption = select.querySelector("option");
    select.innerHTML = "";
    select.appendChild(firstOption);
  });

  for (const setName of sets) {
    const opt = document.createElement("option");
    opt.value = setName;
    opt.textContent = setName;
    setSelect.appendChild(opt);
  }

  for (const rarity of rarities) {
    const opt = document.createElement("option");
    opt.value = rarity;
    opt.textContent = rarity;
    raritySelect.appendChild(opt);
  }

  for (const type of Array.from(allTypes).sort()) {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    typeSelect.appendChild(opt);
  }

  for (const weak of Array.from(allWeaknesses).sort()) {
    const opt = document.createElement("option");
    opt.value = weak;
    opt.textContent = weak;
    weaknessSelect.appendChild(opt);
  }
}

function renderCards() {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML = "";

  const cards = getFilteredCards();
  if (!cards.length) {
    const empty = document.createElement("p");
    empty.textContent = "No cards match your filters.";
    cardsGrid.appendChild(empty);
    return;
  }

  cards.forEach((card) => {
    const cardEl = document.createElement("article");
    cardEl.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";

    const nameEl = document.createElement("div");
    nameEl.className = "card-name";
    nameEl.textContent = card.name;

    const tagEl = document.createElement("div");
    tagEl.className = "card-tag";
    tagEl.textContent = `${card.set} • ${card.rarity}`;

    header.appendChild(nameEl);
    header.appendChild(tagEl);

    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.textContent = `${card.types.join(", ")} • HP ${card.hp} • Retreat ${card.retreatCost}`;

    const collectionDiv = document.createElement("div");
    collectionDiv.className = "card-collection";

    const ownedBtn = document.createElement("button");
    ownedBtn.textContent = "Owned";

    const wantedBtn = document.createElement("button");
    wantedBtn.textContent = "Wanted";

    const noneBtn = document.createElement("button");
    noneBtn.textContent = "None";

    const status = collection[card.id] || "none";

    // Apply active styles
    if (status === "owned") {
      ownedBtn.classList.add("active-owned");
    } else if (status === "wanted") {
      wantedBtn.classList.add("active-wanted");
    } else {
      noneBtn.classList.add("active-none");
    }

    ownedBtn.addEventListener("click", () => {
      collection[card.id] = "owned";
      saveCollection();
      renderCards();
    });

    wantedBtn.addEventListener("click", () => {
      collection[card.id] = "wanted";
      saveCollection();
      renderCards();
    });

    noneBtn.addEventListener("click", () => {
      collection[card.id] = "none";
      saveCollection();
      renderCards();
    });

    collectionDiv.appendChild(ownedBtn);
    collectionDiv.appendChild(wantedBtn);
    collectionDiv.appendChild(noneBtn);

    cardEl.appendChild(header);
    cardEl.appendChild(meta);
    cardEl.appendChild(collectionDiv);

    cardsGrid.appendChild(cardEl);
  });
}

// Initialization
async function init() {
  collection = loadCollection();

  try {
    const res = await fetch(CARDS_URL);
    if (!res.ok) throw new Error("Failed to fetch cards.json");
    allCards = await res.json();
  } catch (e) {
    console.error(e);
    const cardsGrid = document.getElementById("cards-grid");
    cardsGrid.innerHTML = "<p>Could not load card data.</p>";
    return;
  }

  renderFilters();
  renderCards();

  document
    .getElementById("search-input")
    .addEventListener("input", () => renderCards());
  document
    .getElementById("set-filter")
    .addEventListener("change", () => renderCards());
  document
    .getElementById("rarity-filter")
    .addEventListener("change", () => renderCards());
  document.getElementById("type-filter").addEventListener("change", renderCards);
document.getElementById("weakness-filter").addEventListener("change", renderCards);
document.getElementById("hp-min").addEventListener("input", renderCards);
document.getElementById("hp-max").addEventListener("input", renderCards);
}

document.addEventListener("DOMContentLoaded", init);


