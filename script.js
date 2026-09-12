const clockElement = document.querySelector("#clock");
const dateElement = document.querySelector("#date");
const cards = document.querySelectorAll(".dashboard-card");
const interactionNote = document.querySelector("#interaction-note span:last-child");
const focusCard = document.querySelector('[data-card="focus"]');
const focusTimeElement = document.querySelector("#focus-time");
const focusStatusElement = document.querySelector("#focus-status");
const focusStartButton = document.querySelector("#focus-start");
const focusPauseButton = document.querySelector("#focus-pause");
const focusResetButton = document.querySelector("#focus-reset");
const noteCard = document.querySelector('[data-card="notes"]');
const noteInput = document.querySelector("#note-input");
const noteSaveButton = document.querySelector("#note-save");
const noteClearButton = document.querySelector("#note-clear");
const noteSaveStatus = document.querySelector("#note-save-status");
const noteSavedAt = document.querySelector("#note-saved-at");
const noteEmpty = document.querySelector("#note-empty");
const noteContent = document.querySelector("#note-content");

const NOTE_STORAGE_KEY = "daymark-note";

const FOCUS_DURATION_SECONDS = 25 * 60;
let focusRemainingSeconds = FOCUS_DURATION_SECONDS;
let focusTimerId = null;
let focusTimerEndAt = null;
let focusStatus = "idle";

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long"
});

const noteDateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function updateDateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  clockElement.textContent = timeString;
  clockElement.dateTime = now.toISOString();
  dateElement.textContent = dateFormatter.format(now);
  dateElement.dateTime = now.toISOString().slice(0, 10);
}

function formatFocusTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function renderFocusTimer() {
  const statusLabels = {
    idle: "準備開始",
    running: "專注中",
    paused: "已暫停",
    completed: "專注完成"
  };

  focusTimeElement.textContent = formatFocusTime(focusRemainingSeconds);
  focusTimeElement.dateTime = `PT${Math.floor(focusRemainingSeconds / 60)}M${focusRemainingSeconds % 60}S`;
  focusStatusElement.textContent = statusLabels[focusStatus];
  focusCard.dataset.focusStatus = focusStatus;
  focusStartButton.textContent = focusStatus === "paused" ? "繼續" : "開始";
  focusStartButton.disabled = focusStatus === "running" || focusStatus === "completed";
  focusPauseButton.disabled = focusStatus !== "running";
  focusResetButton.disabled = focusStatus === "idle";
}

function clearFocusTimer() {
  if (focusTimerId !== null) {
    clearInterval(focusTimerId);
    focusTimerId = null;
  }
}

function completeFocusTimer() {
  clearFocusTimer();
  focusTimerEndAt = null;
  focusRemainingSeconds = 0;
  focusStatus = "completed";
  renderFocusTimer();
  interactionNote.textContent = "專注時段完成，做得很好。";
}

function updateFocusTimer() {
  if (focusStatus !== "running" || focusTimerEndAt === null) {
    return;
  }

  focusRemainingSeconds = Math.max(0, Math.ceil((focusTimerEndAt - Date.now()) / 1000));

  if (focusRemainingSeconds === 0) {
    completeFocusTimer();
    return;
  }

  renderFocusTimer();
}

function startFocusTimer() {
  if (focusStatus === "running" || focusRemainingSeconds === 0) {
    return;
  }

  clearFocusTimer();
  focusTimerEndAt = Date.now() + focusRemainingSeconds * 1000;
  focusStatus = "running";
  focusTimerId = setInterval(updateFocusTimer, 250);
  renderFocusTimer();
  interactionNote.textContent = "專注模式進行中，先把注意力留在眼前。";
}

function pauseFocusTimer() {
  if (focusStatus !== "running") {
    return;
  }

  updateFocusTimer();
  if (focusStatus === "completed") {
    return;
  }

  clearFocusTimer();
  focusTimerEndAt = null;
  focusStatus = "paused";
  renderFocusTimer();
  interactionNote.textContent = "專注模式已暫停，準備好時再繼續。";
}

function resetFocusTimer() {
  clearFocusTimer();
  focusTimerEndAt = null;
  focusRemainingSeconds = FOCUS_DURATION_SECONDS;
  focusStatus = "idle";
  renderFocusTimer();
  interactionNote.textContent = "選一張卡片，讓今天往前一步。";
}

function renderNote(note) {
  const hasNote = Boolean(note && note.text);

  noteInput.value = hasNote ? note.text : "";
  noteContent.textContent = hasNote ? note.text : "";
  noteEmpty.hidden = hasNote;
  noteContent.hidden = !hasNote;
  noteSavedAt.textContent = hasNote ? `最後儲存 ${noteDateFormatter.format(new Date(note.savedAt))}` : "";
  noteSavedAt.dateTime = hasNote ? new Date(note.savedAt).toISOString() : "";
  noteSaveStatus.textContent = hasNote ? "已儲存" : "尚未儲存筆記";
}

function loadNote() {
  try {
    const storedNote = localStorage.getItem(NOTE_STORAGE_KEY);
    if (!storedNote) {
      renderNote(null);
      return;
    }

    const note = JSON.parse(storedNote);
    if (typeof note.text !== "string" || typeof note.savedAt !== "string" || Number.isNaN(Date.parse(note.savedAt))) {
      renderNote(null);
      return;
    }

    renderNote(note);
  } catch (error) {
    renderNote(null);
  }
}

function saveNote() {
  const text = noteInput.value.trim();

  if (!text) {
    noteSaveStatus.textContent = "請先寫下一點內容";
    noteInput.focus();
    return;
  }

  const note = {
    text,
    savedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(note));
    renderNote(note);
    noteSaveStatus.textContent = "筆記已儲存";
    interactionNote.textContent = "靈感已留下來，之後可以繼續補充。";
  } catch (error) {
    noteSaveStatus.textContent = "無法儲存筆記";
  }
}

function clearNote() {
  try {
    localStorage.removeItem(NOTE_STORAGE_KEY);
  } catch (error) {
    noteSaveStatus.textContent = "無法清除筆記";
    return;
  }

  renderNote(null);
  noteSaveStatus.textContent = "筆記已清除";
  interactionNote.textContent = "靈感筆記已清空，可以重新開始。";
}

function activateCard(card) {
  const isActive = card.classList.toggle("is-active");
  card.setAttribute("aria-pressed", String(isActive));
  cards.forEach((otherCard) => {
    if (otherCard !== card) {
      otherCard.classList.remove("is-active");
      otherCard.setAttribute("aria-pressed", "false");
    }
  });

  interactionNote.textContent = isActive
    ? card.dataset.message
    : "選一張卡片，讓今天往前一步。";
}

cards.forEach((card) => {
  card.addEventListener("click", (event) => {
    if (event.target.closest(".focus-timer, .note-mode")) {
      return;
    }

    activateCard(card);
  });
  card.addEventListener("keydown", (event) => {
    if (event.target.closest(".focus-timer, .note-mode")) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateCard(card);
    }
  });
});

[focusStartButton, focusPauseButton, focusResetButton].forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
  });
});

[noteSaveButton, noteClearButton].forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
  });
});

focusStartButton.addEventListener("click", startFocusTimer);
focusPauseButton.addEventListener("click", pauseFocusTimer);
focusResetButton.addEventListener("click", resetFocusTimer);
noteSaveButton.addEventListener("click", saveNote);
noteClearButton.addEventListener("click", clearNote);

updateDateTime();
renderFocusTimer();
loadNote();
setInterval(updateDateTime, 1000);