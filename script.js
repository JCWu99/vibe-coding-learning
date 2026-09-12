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
const rhythmCard = document.querySelector('[data-card="rhythm"]');
const rhythmForm = document.querySelector("#rhythm-form");
const rhythmTimeInput = document.querySelector("#rhythm-time");
const rhythmTimeError = document.querySelector("#rhythm-time-error");
const rhythmTitleInput = document.querySelector("#rhythm-title");
const rhythmSubmitButton = document.querySelector("#rhythm-submit");
const rhythmDateElement = document.querySelector("#rhythm-date");
const rhythmList = document.querySelector("#rhythm-list");
const rhythmEmpty = document.querySelector("#rhythm-empty");
const rhythmStatus = document.querySelector("#rhythm-status");
const rhythmClearButton = document.querySelector("#rhythm-clear");

const NOTE_STORAGE_KEY = "daymark-note";
const RHYTHM_STORAGE_KEY = "daymark-rhythm";

const FOCUS_DURATION_SECONDS = 25 * 60;
let focusRemainingSeconds = FOCUS_DURATION_SECONDS;
let focusTimerId = null;
let focusTimerEndAt = null;
let focusStatus = "idle";
let rhythmItems = [];
let editingRhythmId = null;
let rhythmTimeTouched = false;

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

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createRhythmId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `rhythm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sortRhythmItems(items) {
  return [...items].sort((firstItem, secondItem) => firstItem.time.localeCompare(secondItem.time));
}

function saveRhythm() {
  try {
    localStorage.setItem(RHYTHM_STORAGE_KEY, JSON.stringify({
      date: getLocalDateKey(),
      items: sortRhythmItems(rhythmItems)
    }));
  } catch (error) {
    rhythmStatus.textContent = "無法儲存今日行程。";
  }
}

function renderRhythm() {
  const sortedItems = sortRhythmItems(rhythmItems);
  rhythmItems = sortedItems;
  rhythmList.replaceChildren();
  rhythmEmpty.hidden = sortedItems.length > 0;
  rhythmClearButton.hidden = sortedItems.length === 0;
  rhythmStatus.textContent = sortedItems.length > 0
    ? `${sortedItems.length} ${sortedItems.length === 1 ? "plan" : "plans"} today.`
    : "今天還沒有安排。";

  sortedItems.forEach((item) => {
    const itemElement = document.createElement("div");
    itemElement.className = "rhythm-item";
    itemElement.dataset.rhythmId = item.id;

    const timeElement = document.createElement("time");
    timeElement.className = "rhythm-item-time";
    timeElement.dateTime = item.time;
    timeElement.textContent = item.time;

    const titleElement = document.createElement("span");
    titleElement.className = "rhythm-item-title";
    titleElement.textContent = item.title;

    const actions = document.createElement("div");
    actions.className = "rhythm-item-actions";

    const editButton = document.createElement("button");
    editButton.className = "rhythm-item-control rhythm-edit";
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.className = "rhythm-item-control rhythm-delete";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.textContent = "Delete";

    actions.append(editButton, deleteButton);
    itemElement.append(timeElement, titleElement, actions);
    rhythmList.append(itemElement);
  });
}

function loadRhythm() {
  rhythmDateElement.textContent = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(new Date());
  rhythmDateElement.dateTime = getLocalDateKey();

  try {
    const storedRhythm = localStorage.getItem(RHYTHM_STORAGE_KEY);
    if (!storedRhythm) {
      renderRhythm();
      return;
    }

    const rhythm = JSON.parse(storedRhythm);
    const validItems = Array.isArray(rhythm.items) && rhythm.items.every((item) => (
      item && typeof item.id === "string" && typeof item.time === "string" &&
      /^\d{2}:\d{2}$/.test(item.time) && typeof item.title === "string"
    ));

    rhythmItems = rhythm.date === getLocalDateKey() && validItems ? rhythm.items : [];
    renderRhythm();
  } catch (error) {
    rhythmItems = [];
    renderRhythm();
  }
}

function isValidRhythmTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  return Number(match[1]) >= 0 && Number(match[1]) <= 23 && Number(match[2]) >= 0 && Number(match[2]) <= 59;
}

function setRhythmTimeError(showError) {
  rhythmTimeInput.setAttribute("aria-invalid", String(showError));
  rhythmTimeError.hidden = !showError;
}

function validateRhythmTime(showEmptyError = false) {
  const isInvalid = !isValidRhythmTime(rhythmTimeInput.value);
  const shouldShowError = isInvalid && (showEmptyError || rhythmTimeTouched);
  setRhythmTimeError(shouldShowError);
  return !isInvalid;
}

function submitRhythmItem(event) {
  event.preventDefault();
  rhythmTimeTouched = true;
  const time = rhythmTimeInput.value;
  const title = rhythmTitleInput.value.trim();

  if (!validateRhythmTime(true) || !title) {
    rhythmStatus.textContent = "請填寫時間與行程名稱。";
    return;
  }

  if (editingRhythmId) {
    rhythmItems = rhythmItems.map((item) => (
      item.id === editingRhythmId ? { ...item, time, title } : item
    ));
    editingRhythmId = null;
    rhythmSubmitButton.textContent = "新增";
    rhythmStatus.textContent = "行程已更新。";
  } else {
    rhythmItems.push({ id: createRhythmId(), time, title });
    rhythmStatus.textContent = "行程已新增。";
  }

  saveRhythm();
  renderRhythm();
  rhythmForm.reset();
  rhythmTimeTouched = false;
  setRhythmTimeError(false);
  rhythmTimeInput.focus();
}

function editRhythmItem(id) {
  const item = rhythmItems.find((rhythmItem) => rhythmItem.id === id);
  if (!item) {
    return;
  }

  editingRhythmId = id;
  rhythmTimeInput.value = item.time;
  rhythmTitleInput.value = item.title;
  rhythmTimeTouched = false;
  setRhythmTimeError(false);
  rhythmSubmitButton.textContent = "儲存";
  rhythmStatus.textContent = "正在編輯行程。";
  rhythmTimeInput.focus();
}

function deleteRhythmItem(id) {
  rhythmItems = rhythmItems.filter((item) => item.id !== id);
  if (editingRhythmId === id) {
    editingRhythmId = null;
    rhythmForm.reset();
    rhythmTimeTouched = false;
    setRhythmTimeError(false);
    rhythmSubmitButton.textContent = "新增";
  }

  saveRhythm();
  renderRhythm();
  rhythmStatus.textContent = "行程已刪除。";
}

function clearRhythm() {
  rhythmItems = [];
  editingRhythmId = null;
  rhythmForm.reset();
  rhythmTimeTouched = false;
  setRhythmTimeError(false);
  rhythmSubmitButton.textContent = "新增";
  saveRhythm();
  renderRhythm();
  rhythmStatus.textContent = "今日行程已清除。";
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
    if (event.target.closest(".focus-timer, .note-mode, .rhythm-mode")) {
      return;
    }

    activateCard(card);
  });
  card.addEventListener("keydown", (event) => {
    if (event.target.closest(".focus-timer, .note-mode, .rhythm-mode")) {
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

[rhythmSubmitButton, rhythmClearButton].forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
  });
});

rhythmList.addEventListener("click", (event) => {
  event.stopPropagation();
  const button = event.target.closest("button[data-action]");
  const itemElement = event.target.closest(".rhythm-item");
  if (!button || !itemElement) {
    return;
  }

  const itemId = itemElement.dataset.rhythmId;
  if (button.dataset.action === "edit") {
    editRhythmItem(itemId);
  } else if (button.dataset.action === "delete") {
    deleteRhythmItem(itemId);
  }
});

focusStartButton.addEventListener("click", startFocusTimer);
focusPauseButton.addEventListener("click", pauseFocusTimer);
focusResetButton.addEventListener("click", resetFocusTimer);
noteSaveButton.addEventListener("click", saveNote);
noteClearButton.addEventListener("click", clearNote);
rhythmForm.addEventListener("submit", submitRhythmItem);
rhythmClearButton.addEventListener("click", clearRhythm);
rhythmTimeInput.addEventListener("input", () => {
  rhythmTimeTouched = true;
  validateRhythmTime();
});
rhythmTimeInput.addEventListener("blur", () => {
  rhythmTimeTouched = true;
  validateRhythmTime(true);
});

updateDateTime();
renderFocusTimer();
loadNote();
loadRhythm();
setInterval(updateDateTime, 1000);