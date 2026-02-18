const timerElement = document.getElementById("timer");
const phaseLabelElement = document.getElementById("phaseLabel");
const startPauseButton = document.getElementById("startPauseBtn");
const resetButton = document.getElementById("resetBtn");
const workInput = document.getElementById("workInput");
const breakInput = document.getElementById("breakInput");

let isRunning = false;
let isWorkPhase = true;
let remainingSeconds = Number(workInput.value) * 60;
let intervalId;

const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

const updateDisplay = () => {
  timerElement.textContent = formatTime(remainingSeconds);
  phaseLabelElement.textContent = isWorkPhase ? "作業時間" : "休憩時間";
  document.title = `${timerElement.textContent} | ${phaseLabelElement.textContent}`;
};

const stopTimer = () => {
  isRunning = false;
  clearInterval(intervalId);
  startPauseButton.textContent = "開始";
};

const switchPhase = () => {
  isWorkPhase = !isWorkPhase;
  const nextMinutes = isWorkPhase ? Number(workInput.value) : Number(breakInput.value);
  remainingSeconds = Math.max(1, nextMinutes) * 60;
  updateDisplay();

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(isWorkPhase ? "作業に戻る時間です" : "休憩の時間です");
  }
};

const tick = () => {
  if (remainingSeconds > 0) {
    remainingSeconds -= 1;
    updateDisplay();
    return;
  }

  switchPhase();
};

const startTimer = () => {
  if (isRunning) return;
  isRunning = true;
  startPauseButton.textContent = "一時停止";

  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  intervalId = setInterval(tick, 1000);
};

startPauseButton.addEventListener("click", () => {
  if (isRunning) {
    stopTimer();
  } else {
    startTimer();
  }
});

resetButton.addEventListener("click", () => {
  stopTimer();
  isWorkPhase = true;
  remainingSeconds = Math.max(1, Number(workInput.value)) * 60;
  updateDisplay();
});

const updateDurationInputs = () => {
  if (isRunning) return;
  remainingSeconds = Math.max(1, Number(isWorkPhase ? workInput.value : breakInput.value)) * 60;
  updateDisplay();
};

workInput.addEventListener("change", updateDurationInputs);
breakInput.addEventListener("change", updateDurationInputs);

updateDisplay();
