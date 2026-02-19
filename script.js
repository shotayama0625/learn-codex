const STORAGE_KEY = "registeredDishes.v1";
const LEGACY_STORAGE_KEY = "registeredDishes";
const AUTO_API_KEY_FILE = "api-key.example.env";

const apiKeyInput = document.getElementById("apiKey");
const ingredientsInput = document.getElementById("ingredients");
const apiKeyFileInput = document.getElementById("apiKeyFile");
const genreSelect = document.getElementById("genre");
const difficultySelect = document.getElementById("difficulty");
const suggestBtn = document.getElementById("suggestBtn");
const registerBtn = document.getElementById("registerBtn");
const cookedDishInput = document.getElementById("cookedDish");
const statusEl = document.getElementById("status");
const suggestionsEl = document.getElementById("suggestions");
const registeredListEl = document.getElementById("registeredList");

let registeredDishes = loadRegisteredDishes();
let cachedAutoApiKey = "";

function loadRegisteredDishes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed?.items)) {
      return parsed.items;
    }

    return [];
  } catch {
    return [];
  }
}

function saveRegisteredDishes() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      items: registeredDishes
    })
  );
}

function setStatus(message) {
  statusEl.textContent = message;
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[\s・･、,。.!！?？\-ー_（）()「」『』\[\]【】]/g, "");
}

function splitIngredients(text) {
  return text
    .split(/[\s,、，\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderRegisteredDishes() {
  registeredListEl.innerHTML = "";

  if (registeredDishes.length === 0) {
    const li = document.createElement("li");
    li.textContent = "まだ登録された料理はありません。";
    registeredListEl.appendChild(li);
    return;
  }

  registeredDishes.forEach((dish) => {
    const li = document.createElement("li");
    li.textContent = `${dish.name}（食材: ${dish.ingredients.join("、")}）`;
    registeredListEl.appendChild(li);
  });
}

function renderSuggestions(items) {
  suggestionsEl.innerHTML = "";

  if (items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "候補が見つかりませんでした。食材を増やして再実行してください。";
    suggestionsEl.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${item.name}</strong>（${item.genre} / ${item.difficulty}）- ${item.reason}`;

    if (item.isRegistered) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "登録済み優先";
      li.appendChild(badge);
    }

    suggestionsEl.appendChild(li);
  });
}

function extractTextFromResponseData(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    const chunks = [];

    data.output.forEach((item) => {
      if (!Array.isArray(item?.content)) return;

      item.content.forEach((contentItem) => {
        if (typeof contentItem?.text === "string" && contentItem.text.trim()) {
          chunks.push(contentItem.text.trim());
        }
      });
    });

    if (chunks.length > 0) {
      return chunks.join("\n");
    }
  }

  return "";
}

function extractApiKeyFromFileContent(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"));

  if (lines.length === 0) {
    throw new Error("API Key ファイルの内容が空です。");
  }

  const envLine = lines.find((line) => line.startsWith("OPENAI_API_KEY="));
  if (envLine) {
    const value = envLine.slice("OPENAI_API_KEY=".length).trim();
    const unquoted = value.replace(/^(["'])(.*)\1$/, "$2").trim();
    if (!unquoted) {
      throw new Error("OPENAI_API_KEY の値が空です。");
    }
    return unquoted;
  }

  return lines[0];
}

async function readApiKeyFromFile() {
  const file = apiKeyFileInput.files?.[0];
  if (!file) {
    return "";
  }

  const content = await file.text();
  return extractApiKeyFromFileContent(content);
}

async function readApiKeyFromProjectFile() {
  if (cachedAutoApiKey) {
    return cachedAutoApiKey;
  }

  const response = await fetch(AUTO_API_KEY_FILE, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`${AUTO_API_KEY_FILE} の読み込みに失敗しました: ${response.status}`);
  }

  const content = await response.text();
  const apiKey = extractApiKeyFromFileContent(content);
  cachedAutoApiKey = apiKey;
  return apiKey;
}

async function resolveApiKey() {
  const directInput = apiKeyInput.value.trim();
  if (directInput) {
    return directInput;
  }

  const uploadedKey = await readApiKeyFromFile();
  if (uploadedKey) {
    return uploadedKey;
  }

  return readApiKeyFromProjectFile();
}

async function callOpenAI(apiKey, prompt) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API エラー: ${response.status}`);
  }

  const data = await response.json();
  const text = extractTextFromResponseData(data);
  if (!text) {
    throw new Error(
      "OpenAI API の応答テキストが取得できませんでした。JSON schema / APIレスポンスを確認してください。"
    );
  }

  return text;
}

function extractJson(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSON 配列を応答から抽出できませんでした。");
  }

  return JSON.parse(text.slice(start, end + 1));
}

function isRegisteredSuggestion(item, registeredNameSet) {
  const normalizedSuggestion = normalizeName(item.name || "");
  if (!normalizedSuggestion) {
    return false;
  }

  if (registeredNameSet.has(normalizedSuggestion)) {
    return true;
  }

  return [...registeredNameSet].some(
    (normalizedDishName) =>
      normalizedSuggestion.includes(normalizedDishName) ||
      normalizedDishName.includes(normalizedSuggestion)
  );
}

function prioritizeRegistered(suggestions, ingredientText) {
  const registeredNameSet = new Set(registeredDishes.map((dish) => normalizeName(dish.name)));
  const normalizedSuggestionNameSet = new Set(
    suggestions.map((item) => normalizeName(item.name || "")).filter(Boolean)
  );

  const inputIngredients = new Set(splitIngredients(ingredientText).map((item) => normalizeName(item)));

  const registeredMatches = registeredDishes
    .map((dish) => {
      const overlapCount = dish.ingredients.reduce((count, ingredient) => {
        return count + Number(inputIngredients.has(normalizeName(ingredient)));
      }, 0);

      return {
        dish,
        overlapCount
      };
    })
    .filter((item) => item.overlapCount > 0)
    .sort((a, b) => b.overlapCount - a.overlapCount)
    .map((item) => ({
      name: item.dish.name,
      genre: "登録料理",
      difficulty: "登録済み",
      reason: `入力食材と${item.overlapCount}件一致した登録済み料理です。`,
      isRegistered: true,
      score: 1000 + item.overlapCount
    }))
    .filter((item) => !normalizedSuggestionNameSet.has(normalizeName(item.name)));

  const prioritizedSuggestions = suggestions
    .map((item) => ({
      ...item,
      isRegistered: isRegisteredSuggestion(item, registeredNameSet),
      score: isRegisteredSuggestion(item, registeredNameSet) ? 500 : 0
    }))
    .sort((a, b) => b.score - a.score);

  return [...registeredMatches, ...prioritizedSuggestions];
}

suggestBtn.addEventListener("click", async () => {
  const ingredients = ingredientsInput.value.trim();

  if (!ingredients) {
    setStatus("食材は必須です。");
    return;
  }

  let apiKey = "";
  try {
    apiKey = await resolveApiKey();
  } catch (error) {
    setStatus(`APIキー読み込みに失敗しました: ${error.message}`);
    return;
  }

  if (!apiKey) {
    setStatus("APIキーが取得できません。api-key.example.env を確認してください。");
    return;
  }

  const genre = genreSelect.value;
  const difficulty = difficultySelect.value;

  const prompt = `
あなたは料理アシスタントです。
以下の条件で作れる料理候補を5件、JSON配列のみで返してください。
各要素は {"name":"料理名","genre":"和食/洋食/中華","difficulty":"かんたん/ふつう/むずかしい","reason":"短い理由"} にしてください。
食材: ${ingredients}
ジャンル指定: ${genre}
難易度指定: ${difficulty}
指定が"all"なら制約なし。
`;

  setStatus("提案を取得中...");

  try {
    const text = await callOpenAI(apiKey, prompt);
    const parsed = extractJson(text);
    const prioritized = prioritizeRegistered(parsed, ingredients);
    renderSuggestions(prioritized);
    setStatus("提案を更新しました。");
  } catch (error) {
    setStatus(`提案に失敗しました: ${error.message}`);
  }
});

registerBtn.addEventListener("click", async () => {
  const dishName = cookedDishInput.value.trim();

  let apiKey = "";
  try {
    apiKey = await resolveApiKey();
  } catch (error) {
    setStatus(`APIキー読み込みに失敗しました: ${error.message}`);
    return;
  }

  if (!apiKey || !dishName) {
    setStatus("登録には APIキー（api-key.example.env または入力値）と料理名が必要です。");
    return;
  }

  const prompt = `
料理名「${dishName}」で一般的に使う食材を5〜10個、JSON配列のみで返してください。
例: ["鶏肉","玉ねぎ","卵"]
`;

  setStatus("料理登録のため食材を推定中...");

  try {
    const text = await callOpenAI(apiKey, prompt);
    const ingredients = extractJson(text);

    if (!Array.isArray(ingredients)) {
      throw new Error("食材配列として解釈できませんでした。");
    }

    const existingIndex = registeredDishes.findIndex(
      (dish) => normalizeName(dish.name) === normalizeName(dishName)
    );

    const record = {
      name: dishName,
      ingredients: ingredients.map((item) => String(item))
    };

    if (existingIndex >= 0) {
      registeredDishes[existingIndex] = record;
    } else {
      registeredDishes.push(record);
    }

    saveRegisteredDishes();
    renderRegisteredDishes();
    cookedDishInput.value = "";
    setStatus(`「${dishName}」を登録しました。`);
  } catch (error) {
    setStatus(`登録に失敗しました: ${error.message}`);
  }
});

renderRegisteredDishes();
