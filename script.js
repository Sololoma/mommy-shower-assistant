// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCddivg3tyzqrAOU_PSJ7SKQM5M0r7SsD8",
  authDomain: "showersync-2ab00.firebaseapp.com",
  databaseURL: "https://showersync-2ab00-default-rtdb.firebaseio.com",
  projectId: "showersync-2ab00",
  storageBucket: "showersync-2ab00.appspot.com",
  messagingSenderId: "46334713190",
  appId: "1:46334713190:web:fbda060891acfac11a7ca7",
  measurementId: "G-4FG87VD60B",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global variables
let timer;
let baseTime = 15; // Base shower time in minutes
let currentTime = baseTime * 60; // Convert to seconds
let isRunning = false;
let penaltyAmount = 0;
let totalTributes = 0;
let sessionId;
let updateSessionFn;

// DOM Elements
const timerDisplay = document.getElementById("timer");
const startButton = document.getElementById("startTimer");
const pauseButton = document.getElementById("pauseTimer");
const resetButton = document.getElementById("resetTimer");
const penaltyAmountDisplay = document.getElementById("penaltyAmount");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const totalTributesDisplay = document.getElementById("totalTributes");
const sessionIdDisplay = document.getElementById("sessionIdDisplay");
const joinModal = document.getElementById("join-modal");
const sessionIdInput = document.getElementById("session-id-input");
const joinBtn = document.getElementById("join-btn");
const closeModal = document.getElementById("close-modal");
const showJoinModal = document.getElementById("show-join-modal");

// Ritual checkboxes
const ritualCheckboxes = document.querySelectorAll(".ritual-item input");

// Tribute buttons
const tributeButtons = document.querySelectorAll(".tribute-btn");

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize session
  sessionId = getSessionId();
  sessionIdDisplay.textContent = `Session ID: ${sessionId}`;

  // Setup real-time updates
  const { updateSession } = setupRealtimeUpdates(sessionId);
  updateSessionFn = updateSession;

  // If we created a new session, initialize it
  if (!window.location.search.includes("session")) {
    initializeSession(sessionId);
  }

  // Initialize UI
  updateTimerDisplay();
});

// Event Listeners
startButton.addEventListener("click", startTimer);
pauseButton.addEventListener("click", pauseTimer);
resetButton.addEventListener("click", resetTimer);

ritualCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", updateRituals);
});

tributeButtons.forEach((button) => {
  button.addEventListener("click", submitTribute);
});

showJoinModal.addEventListener("click", () => {
  joinModal.style.display = "flex";
});

closeModal.addEventListener("click", () => {
  joinModal.style.display = "none";
});

joinBtn.addEventListener("click", joinSession);

// Session Management
function getSessionId() {
  const urlParams = new URLSearchParams(window.location.search);
  let sessionId = urlParams.get("session");

  if (!sessionId) {
    sessionId = "session-" + Math.random().toString(36).substr(2, 9);
    window.history.pushState({}, "", `?session=${sessionId}`);
  }

  return sessionId;
}

function initializeSession(sessionId) {
  database.ref(`sessions/${sessionId}`).set({
    currentTime: baseTime * 60,
    baseTime: baseTime,
    penaltyAmount: 0,
    totalTributes: 0,
    isRunning: false,
    rituals: {
      mask: false,
      balm: false,
      shaving: false,
      relax: false,
    },
  });
}

function setupRealtimeUpdates(sessionId) {
  const sessionRef = database.ref(`sessions/${sessionId}`);

  // Listen for changes
  sessionRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Update timer
      currentTime = data.currentTime;
      baseTime = data.baseTime;
      updateTimerDisplay();

      // Update penalty
      penaltyAmount = data.penaltyAmount || 0;
      penaltyAmountDisplay.textContent = penaltyAmount;

      // Update tributes
      totalTributes = data.totalTributes || 0;
      totalTributesDisplay.textContent = totalTributes;

      // Update checkboxes
      ritualCheckboxes.forEach((checkbox) => {
        checkbox.checked = data.rituals[checkbox.id];
      });

      // Update running state
      isRunning = data.isRunning || false;

      // Update progress
      updateProgress();
    }
  });

  // Function to send updates
  function updateSession(updates) {
    sessionRef.update(updates);
  }

  return { updateSession };
}

function joinSession() {
  const sessionId = sessionIdInput.value.trim();
  if (sessionId) {
    window.location.href = `${window.location.pathname}?session=${sessionId}`;
  }
}

// Timer Functions
function startTimer() {
  if (!isRunning) {
    isRunning = true;
    updateSessionFn({
      isRunning: true,
      status: "running",
    });

    timer = setInterval(() => {
      currentTime--;
      updateSessionFn({ currentTime });
      updateTimerDisplay();

      if (currentTime <= 0) {
        clearInterval(timer);
        applyPenalty();
      }
    }, 1000);
  }
}

function pauseTimer() {
  clearInterval(timer);
  isRunning = false;
  updateSessionFn({ isRunning: false });
}

function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  currentTime = baseTime * 60;
  penaltyAmount = 0;
  updateSessionFn({
    currentTime,
    penaltyAmount,
    isRunning: false,
  });
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const minutes = Math.floor(currentTime / 60);
  const seconds = currentTime % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  if (minutes < 1) {
    timerDisplay.style.color = "#ff4757";
  } else {
    timerDisplay.style.color = "#d23669";
  }
}

function applyPenalty() {
  penaltyAmount += 20;
  updateSessionFn({
    penaltyAmount,
    status: "overtime",
  });
  penaltyAmountDisplay.textContent = penaltyAmount;

  // Continue counting overtime
  currentTime--;
  updateTimerDisplay();
  timer = setInterval(() => {
    currentTime--;
    if (currentTime % 60 === 0) {
      penaltyAmount += 20;
      updateSessionFn({ penaltyAmount });
      penaltyAmountDisplay.textContent = penaltyAmount;
    }
    updateTimerDisplay();
  }, 1000);
}

// Ritual Functions
function updateRituals() {
  baseTime = 15;
  const rituals = {};

  ritualCheckboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      baseTime += parseInt(checkbox.dataset.time);
    }
    rituals[checkbox.id] = checkbox.checked;
  });

  currentTime = baseTime * 60;
  updateSessionFn({
    baseTime,
    currentTime,
    rituals,
  });
  updateTimerDisplay();
  updateProgress();
}

// Progress Functions
function updateProgress() {
  const totalSteps = ritualCheckboxes.length;
  const checkedSteps = document.querySelectorAll(
    ".ritual-item input:checked"
  ).length;
  const progress = (checkedSteps / totalSteps) * 100;

  progressBar.style.width = `${progress}%`;
  progressText.textContent = `${Math.round(progress)}% completed`;
}

// Tribute Functions
function submitTribute() {
  const tributeOption = this.closest(".tribute-option");
  const amount = parseInt(tributeOption.dataset.amount);

  totalTributes += amount;
  updateSessionFn({ totalTributes });
  totalTributesDisplay.textContent = totalTributes;

  // Visual feedback
  tributeOption.style.backgroundColor = "#ffebee";
  setTimeout(() => {
    tributeOption.style.backgroundColor = "#f8f8f8";
  }, 300);
}
