const clockElement = document.querySelector("#clock");
const dateElement = document.querySelector("#date");
const cards = document.querySelectorAll(".dashboard-card");
const interactionNote = document.querySelector("#interaction-note span:last-child");

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long"
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
  card.addEventListener("click", () => activateCard(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateCard(card);
    }
  });
});

updateDateTime();
setInterval(updateDateTime, 1000);