const CARDS_URL = "data/cards.json";
const DECKS_STORAGE_KEY = "ptp_decks_v1";

let allCards = [];
let decks = {}; // { [deckId]: { id, name, cards: { [cardId]: count } } }
let currentDeckId = null;

// ---------- Storage helpers ----------
function loadDecks() {
  try {
    const raw = localStorage.getItem(DECKS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load decks from localStorage", e);
  }
  return {};
}

function saveDecks() {
  try {
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks));
  } catch (e) {
    console.error("Failed to save decks to localStorage", e);
  }
}

// ---------- Deck helpers ----------
function createDeck(name) {
  const id = "deck-" + Date.now();
  decks[id] = {
    id,
    name,
    cards: {}
  };
  currentDeckId = id;
  saveDecks();
}

function deleteDeck(deckId) {
  if (!decks[deckId]) return;
  delete decks[deckId];
  if (currentDeckId === deckId) {
    const remainingIds = Object.keys(decks);
    currentDeckId = remainingIds.length ? remainingIds[0] : null;
  }
  saveDecks();
}

function getCurrentDeck() {
  if (!currentDeckId || !decks[currentDeckId]) return null;
  return decks[currentDeckId];
}

function addCardToDeck(cardId) {
  const deck = getCurrentDeck();
  if (!deck) return;

  const currentCount = deck.cards[cardId] || 0;

  // Simple rules: max 4 copies of any card, max 60 cards in deck
  const totalCards = Object.values(deck.cards).reduce((a, b) => a + b, 0);
  if (totalCards >= 60) {
    alert("Deck is at 60 cards (simple limit).");
    return;
  }
  if (currentCount >= 4) {
    alert("Max 4 copies of a card (simple rule).");
    return;
  }

  deck.cards[cardId] = currentCount + 1;
  saveDecks();
}

function removeCardFromDeck(cardId) {
  const deck = getCurrentDeck();
  if (!deck) return;

  const currentCount = deck.cards[cardId] || 0;
  const newCount = currentCount - 1;

  if (newCount <= 0) {
    delete deck.cards[cardId];
  } else {
    deck.cards[cardId] = newCount;
  }
  saveDecks();
}

function computeDeckSummary(deck) {
  if (!deck) return { total: 0, byType: {}, byRarity: {} };

  const byType = {};
  const byRarity = {};
  let total = 0;

  for (const [cardId, count] of Object.entries(deck.cards)) {
    const card = allCards.find((c) => c.id === cardId);
    if (!card) continue;
    total += count;
    (card.types || []).forEach((type) => {
      byType[type] = (byType[type] || 0) + count;
    });
    const rarity = card.rarity || "Unknown";
    byRarity[rarity] = (byRarity[rarity] || 0) + count;
  }

  return { total, byType, byRarity };
}

// ---------- Render functions ----------
function renderDeckSelect() {
  const select = document.getElementById("deck-select");
  select.innerHTML = "";

  const ids = Object.keys(decks);
  if (!ids.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No decks yet";
    select.appendChild(opt);
    select.disabled = true;
    return;
  }

  select.disabled = false;

  ids.forEach((id) => {
    const deck = decks[id];
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = deck.name;
    if (id === currentDeckId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function renderDeckSummary() {
  const summaryEl = document.getElementById("deck-summary");
  const deck = getCurrentDeck();

  if (!deck) {
    summaryEl.textContent = "Create a deck to get started.";
    return;
  }

  const { total, byType, byRarity } = computeDeckSummary(deck);

  const typeText = Object.entries(byType)
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");
  const rarityText = Object.entries(byRarity)
    .map(([rarity, count]) => `${rarity}: ${count}`)
    .join(", ");

  summaryEl.innerHTML = `
    <div><strong>Deck name:</strong> ${deck.name}</div>
    <div><strong>Total cards:</strong> ${total}</div>
    <div><strong>By type:</strong> ${typeText || "—"}</div>
    <div><strong>By rarity:</strong> ${rarityText || "—"}</div>
  `;
}

function renderDeckCards() {
  const container = document.getElementById("deck-cards");
  container.innerHTML = "";

  const deck = getCurrentDeck();
  if (!deck) {
    const msg = document.createElement("p");
    msg.textContent = "No deck selected.";
    container.appendChild(msg);
    return;
  }

  if (!Object.keys(deck.cards).length) {
    const msg = document.createElement("p");
    msg.textContent = "This deck is empty. Search for cards and add them.";
    container.appendChild(msg);
    return;
  }

  for (const [cardId, count] of Object.entries(deck.cards)) {
    const card = allCards.find((c) => c.id === cardId);
    if (!card) continue;

    const item = document.createElement("div");
    item.className = "deck-card-item";

    const main = document.createElement("div");
    main.className = "deck-card-main";

    const title = document.createElement("div");
    title.textContent = card.name;

    const meta = document.createElement("div");
    meta.className = "deck-card-meta";
    meta.textContent = `${card.types.join(", ")} • ${card.set} • ${card.rarity}`;

    main.appendChild(title);
    main.appendChild(meta);

    const controls = document.createElement("div");
    controls.className = "deck-card-controls";

    const minusBtn = document.createElement("button");
    minusBtn.textContent = "-";

    const countSpan = document.createElement("span");
    countSpan.textContent = count.toString();

    const plusBtn = document.createElement("button");
    plusBtn.textContent = "+";

    minusBtn.addEventListener("click", () => {
      removeCardFromDeck(card.id);
      renderDeckCards();
      renderDeckSummary();
    });

    plusBtn.addEventListener("click", () => {
      addCardToDeck(card.id);
      renderDeckCards();
      renderDeckSummary();
    });

    controls.appendChild(minusBtn);
    controls.appendChild(countSpan);
    controls.appendChild(plusBtn);

    item.appendChild(main);
    item.appendChild(controls);

    container.appendChild(item);
  }
}

function getDeckSearchResults() {
  const value = document
    .getElementById("deck-search-input")
    .value.trim()
    .toLowerCase();

  if (!value) return allCards.slice(0, 20); // show first 20 as a default
  return allCards.filter((card) =>
    card.name.toLowerCase().includes(value)
  ).slice(0, 50);
}

function renderDeckSearchResults() {
  const container = document.getElementById("deck-search-results");
  container.innerHTML = "";

  const deck = getCurrentDeck();
  const results = getDeckSearchResults();

  if (!results.length) {
    const msg = document.createElement("p");
    msg.textContent = "No cards match your search.";
    container.appendChild(msg);
    return;
  }

  results.forEach((card) => {
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
    meta.textContent = `${card.types.join(", ")} • HP ${card.hp}`;

    const addBtn = document.createElement("button");
    addBtn.textContent = "Add to deck";
    addBtn.style.marginTop = "0.5rem";
    addBtn.style.width = "100%";
    addBtn.style.borderRadius = "999px";
    addBtn.style.border = "1px solid rgba(148, 163, 184, 0.7)";
    addBtn.style.background = "#020617";
    addBtn.style.color = "#e5e7eb";
    addBtn.style.cursor = "pointer";
    addBtn.style.fontSize = "0.8rem";
    addBtn.style.padding = "0.35rem 0.6rem";

    addBtn.addEventListener("click", () => {
      if (!deck) {
        alert("Create or select a deck first.");
        return;
      }
      addCardToDeck(card.id);
      renderDeckCards();
      renderDeckSummary();
    });

    cardEl.appendChild(header);
    cardEl.appendChild(meta);
    cardEl.appendChild(addBtn);

    container.appendChild(cardEl);
  });
}

// ---------- Initialization ----------
async function initDeckBuilder() {
  decks = loadDecks();
  const deckIds = Object.keys(decks);
  if (!currentDeckId && deckIds.length) {
    currentDeckId = deckIds[0];
  }

  try {
    const res = await fetch(CARDS_URL);
    if (!res.ok) throw new Error("Failed to fetch cards.json");
    allCards = await res.json();
  } catch (e) {
    console.error(e);
    const container = document.getElementById("deck-search-results");
    container.innerHTML = "<p>Could not load card data.</p>";
    return;
  }

  renderDeckSelect();
  renderDeckSummary();
  renderDeckCards();
  renderDeckSearchResults();

  document
    .getElementById("deck-select")
    .addEventListener("change", (e) => {
      currentDeckId = e.target.value || null;
      renderDeckSummary();
      renderDeckCards();
      renderDeckSearchResults();
    });

  document
    .getElementById("create-deck-btn")
    .addEventListener("click", () => {
      const input = document.getElementById("new-deck-name");
      const name = input.value.trim() || "Untitled deck";
      createDeck(name);
      input.value = "";
      renderDeckSelect();
      renderDeckSummary();
      renderDeckCards();
      renderDeckSearchResults();
    });

  document
    .getElementById("delete-deck-btn")
    .addEventListener("click", () => {
      if (!currentDeckId) return;
      const deck = getCurrentDeck();
      const ok = confirm(`Delete deck "${deck.name}"?`);
      if (!ok) return;
      deleteDeck(currentDeckId);
      renderDeckSelect();
      renderDeckSummary();
      renderDeckCards();
      renderDeckSearchResults();
    });

  document
    .getElementById("deck-search-input")
    .addEventListener("input", () => {
      renderDeckSearchResults();
    });
}

document.addEventListener("DOMContentLoaded", initDeckBuilder);