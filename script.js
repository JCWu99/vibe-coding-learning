// Shared DOM / Constants
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
const noteEmpty = document.querySelector("#note-empty");
const noteList = document.querySelector("#note-list");
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
const reviewSaveButton = document.querySelector("#review-save");
const reviewClearButton = document.querySelector("#review-clear");
const reviewStatus = document.querySelector("#review-status");
const reviewRatingButtons = document.querySelectorAll(".review-rating-button");
const reviewWentWellInput = document.querySelector("#review-went-well");
const reviewAttentionInput = document.querySelector("#review-attention");
const reviewTomorrowInput = document.querySelector("#review-tomorrow");

const NOTE_STORAGE_KEY = "daymark-note";
const RHYTHM_STORAGE_KEY = "daymark-rhythm";
const REVIEW_STORAGE_KEY = "daymark-review";

const FOCUS_DURATION_SECONDS = 25 * 60;
let focusRemainingSeconds = FOCUS_DURATION_SECONDS;
let focusTimerId = null;
let focusTimerEndAt = null;
let focusStatus = "idle";
let notes = [];
let rhythmItems = [];
let editingRhythmId = null;
let rhythmTimeTouched = false;
let reviewRating = null;

// Page Clock
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

// Focus Mode
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

// Quick Capture
function createNoteId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidNote(note) {
  return note && typeof note.id === "string" && note.id.trim() !== "" &&
    typeof note.text === "string" && note.text.trim() !== "" &&
    typeof note.savedAt === "string" && !Number.isNaN(Date.parse(note.savedAt));
}

function renderNote() {
  noteInput.value = "";
  noteEmpty.hidden = notes.length > 0;
  noteList.replaceChildren();
  noteSaveStatus.textContent = notes.length > 0 ? `${notes.length} 筆筆記` : "尚未儲存筆記";

  notes.forEach((note) => {
    const noteElement = document.createElement("article");
    noteElement.className = "note-item";
    noteElement.dataset.noteId = note.id;

    const textElement = document.createElement("p");
    textElement.className = "note-item-text";
    textElement.textContent = note.text;

    const metaElement = document.createElement("div");
    metaElement.className = "note-item-meta";

    const savedAtElement = document.createElement("time");
    savedAtElement.className = "note-item-saved-at";
    savedAtElement.dateTime = note.savedAt;
    savedAtElement.textContent = noteDateFormatter.format(new Date(note.savedAt));

    const deleteButton = document.createElement("button");
    deleteButton.className = "note-item-delete";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.textContent = "Delete";

    metaElement.append(savedAtElement, deleteButton);
    noteElement.append(textElement, metaElement);
    noteList.append(noteElement);
  });
}

function loadNote() {
  try {
    const storedNote = localStorage.getItem(NOTE_STORAGE_KEY);
    if (!storedNote) {
      notes = [];
      renderNote();
      return;
    }

    const parsedNotes = JSON.parse(storedNote);
    if (Array.isArray(parsedNotes)) {
      notes = parsedNotes.filter(isValidNote);
      renderNote();
      return;
    }

    const migratedNote = parsedNotes && { ...parsedNotes, id: createNoteId() };
    if (isValidNote(migratedNote)) {
      notes = [migratedNote];
      localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
    } else {
      notes = [];
    }

    renderNote();
  } catch (error) {
    notes = [];
    renderNote();
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
    id: createNoteId(),
    text,
    savedAt: new Date().toISOString()
  };

  try {
    notes = [note, ...notes];
    localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
    renderNote();
    noteSaveStatus.textContent = "筆記已儲存";
    interactionNote.textContent = "靈感已留下來，之後可以繼續補充。";
  } catch (error) {
    noteSaveStatus.textContent = "無法儲存筆記";
  }
}

function clearNote() {
  try {
    notes = [];
    localStorage.removeItem(NOTE_STORAGE_KEY);
  } catch (error) {
    noteSaveStatus.textContent = "無法清除筆記";
    return;
  }

  renderNote();
  noteSaveStatus.textContent = "筆記已清除";
  interactionNote.textContent = "靈感筆記已清空，可以重新開始。";
}

function deleteNote(id) {
  notes = notes.filter((note) => note.id !== id);
  localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
  renderNote();
  interactionNote.textContent = "筆記已刪除。";
}

// Daily Rhythm
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
    const today = getLocalDateKey();
    const isValidDate = typeof rhythm.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rhythm.date);
    const validItems = Array.isArray(rhythm.items)
      ? rhythm.items.filter((item) => (
        item && typeof item.id === "string" && item.id.trim() !== "" &&
        typeof item.time === "string" && isValidRhythmTime(item.time) &&
        typeof item.title === "string" && item.title.trim() !== ""
      ))
      : [];

    rhythmItems = isValidDate && rhythm.date === today ? validItems : [];
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

// Daily Review
function isValidReviewDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidReviewRating(value) {
  return value === null || (Number.isInteger(value) && value >= 1 && value <= 5);
}

function renderReview(review) {
  reviewRating = review ? review.rating : null;
  reviewRatingButtons.forEach((button) => {
    const isSelected = Number(button.dataset.rating) === reviewRating;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
  reviewWentWellInput.value = review ? review.wentWell : "";
  reviewAttentionInput.value = review ? review.attention : "";
  reviewTomorrowInput.value = review ? review.tomorrow : "";
  reviewStatus.textContent = review ? "已儲存回顧" : "尚未儲存回顧";
}

function loadReview() {
  try {
    const storedReview = localStorage.getItem(REVIEW_STORAGE_KEY);
    if (!storedReview) {
      renderReview(null);
      return;
    }

    const review = JSON.parse(storedReview);
    const isValid = review &&
      isValidReviewDate(review.date) &&
      review.date === getLocalDateKey() &&
      isValidReviewRating(review.rating) &&
      typeof review.wentWell === "string" &&
      typeof review.attention === "string" &&
      typeof review.tomorrow === "string" &&
      (review.savedAt === undefined || (typeof review.savedAt === "string" && !Number.isNaN(Date.parse(review.savedAt))));

    renderReview(isValid ? review : null);
  } catch (error) {
    renderReview(null);
  }
}

function setReviewRating(rating) {
  reviewRating = rating;
  reviewRatingButtons.forEach((button) => {
    const isSelected = Number(button.dataset.rating) === reviewRating;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function saveReview() {
  const review = {
    date: getLocalDateKey(),
    rating: reviewRating,
    wentWell: reviewWentWellInput.value,
    attention: reviewAttentionInput.value,
    tomorrow: reviewTomorrowInput.value,
    savedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(review));
    reviewStatus.textContent = "Review saved.";
    interactionNote.textContent = "今天的回顧已留下來。";
  } catch (error) {
    reviewStatus.textContent = "Unable to save review.";
  }
}

function clearReview() {
  try {
    localStorage.removeItem(REVIEW_STORAGE_KEY);
    renderReview(null);
    reviewStatus.textContent = "Review cleared.";
    interactionNote.textContent = "今日回顧已清除。";
  } catch (error) {
    reviewStatus.textContent = "Unable to clear review.";
  }
}

// Shared Card Interaction
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

// Event Listeners
cards.forEach((card) => {
  card.addEventListener("click", (event) => {
    if (event.target.closest(".focus-timer, .note-mode, .rhythm-mode, .review-mode")) {
      return;
    }

    activateCard(card);
  });
  card.addEventListener("keydown", (event) => {
    if (event.target.closest(".focus-timer, .note-mode, .rhythm-mode, .review-mode")) {
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

noteList.addEventListener("click", (event) => {
  event.stopPropagation();
  const button = event.target.closest('button[data-action="delete"]');
  const noteElement = event.target.closest(".note-item");
  if (button && noteElement) {
    deleteNote(noteElement.dataset.noteId);
  }
});

[rhythmSubmitButton, rhythmClearButton].forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
  });
});

reviewRatingButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setReviewRating(Number(button.dataset.rating));
  });
});

[reviewSaveButton, reviewClearButton].forEach((button) => {
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
reviewSaveButton.addEventListener("click", saveReview);
reviewClearButton.addEventListener("click", clearReview);
rhythmTimeInput.addEventListener("input", () => {
  rhythmTimeTouched = true;
  validateRhythmTime();
});
rhythmTimeInput.addEventListener("blur", () => {
  rhythmTimeTouched = true;
  validateRhythmTime(true);
});

// Initialization
updateDateTime();
renderFocusTimer();
loadNote();
loadRhythm();
loadReview();
setInterval(updateDateTime, 1000);