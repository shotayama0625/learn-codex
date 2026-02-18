const ranks = [
  { threshold: 1, name: "ありさんランク", emoji: "🐜", message: "ちょこちょこ可愛いスタート！" },
  { threshold: 2, name: "カマキリランク", emoji: "🦗", message: "元気にバタバタ、のってきた！" },
  { threshold: 3, name: "ことりランク", emoji: "🐥", message: "ぴよぴよ、軽やかキック！" },
  { threshold: 4, name: "うさぎランク", emoji: "🐰", message: "ぴょんぴょんパワーが急上昇！" },
  { threshold: 5, name: "こねこランク", emoji: "🐱", message: "にゃんとも愛おしい連続キック！" },
  { threshold: 6, name: "こいぬランク", emoji: "🐶", message: "わんぱくエネルギー全開！" },
  { threshold: 7, name: "パンダランク", emoji: "🐼", message: "ころころ最強クラスの可愛さ！" },
  { threshold: 8, name: "コアラランク", emoji: "🐨", message: "すやすや顔でも足は超元気！" },
  { threshold: 9, name: "イルカランク", emoji: "🐬", message: "しなやかキックで大ジャンプ！" },
  { threshold: 10, name: "ユニコーンランク", emoji: "🦄", message: "きらきら伝説級のバタバタ！" }
];

const countEl = document.getElementById("count");
const rankNameEl = document.getElementById("rankName");
const rankMessageEl = document.getElementById("rankMessage");
const animalEmojiEl = document.getElementById("animalEmoji");
const rankListEl = document.getElementById("rankList");

const incrementBtn = document.getElementById("incrementBtn");
const decrementBtn = document.getElementById("decrementBtn");
const resetBtn = document.getElementById("resetBtn");

let count = 0;

function currentRank(value) {
  if (value <= 0) {
    return {
      name: "たまごランク",
      emoji: "🥚",
      message: "はじめの一歩を待ってるよ！"
    };
  }

  for (let i = ranks.length - 1; i >= 0; i -= 1) {
    if (value >= ranks[i].threshold) {
      if (value > ranks[ranks.length - 1].threshold) {
        return {
          ...ranks[ranks.length - 1],
          message: `すごい！${value}回でユニコーンランクをキープ中✨`
        };
      }
      return ranks[i];
    }
  }
}

function render() {
  const rank = currentRank(count);
  countEl.textContent = String(count);
  rankNameEl.textContent = rank.name;
  rankMessageEl.textContent = rank.message;
  animalEmojiEl.textContent = rank.emoji;
}

function renderRankList() {
  rankListEl.innerHTML = "";
  ranks.forEach((rank) => {
    const li = document.createElement("li");
    li.textContent = `${rank.threshold}回: ${rank.name} ${rank.emoji}`;
    rankListEl.appendChild(li);
  });
  const bonus = document.createElement("li");
  bonus.textContent = `11回以上: ${ranks[ranks.length - 1].name} ${ranks[ranks.length - 1].emoji}（伝説キープ）`;
  rankListEl.appendChild(bonus);
}

incrementBtn.addEventListener("click", () => {
  count += 1;
  render();
});

decrementBtn.addEventListener("click", () => {
  count = Math.max(0, count - 1);
  render();
});

resetBtn.addEventListener("click", () => {
  count = 0;
  render();
});

renderRankList();
render();
