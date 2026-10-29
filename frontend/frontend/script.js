// Landing-page client-side behavior.
const splashScreen = document.getElementById("splashScreen");
const loadingScreen = document.getElementById("loadingScreen");

const splashProgress = document.getElementById("splashProgress");
const splashStatus = document.getElementById("splashStatus");

const mainProgress = document.getElementById("mainProgress");
const progressLabel = document.getElementById("progressLabel");
const progressPercent = document.getElementById("progressPercent");
const checkCount = document.getElementById("checkCount");

const completionMessage = document.getElementById("completionMessage");
const errorMessage = document.getElementById("errorMessage");
const retryButton = document.getElementById("retryButton");

const checks = [
    {
        id: "check-app",
        name: "Application services",
        description: "Preparing the application environment"
    },
    {
        id: "check-exam",
        name: "Exam configuration",
        description: "Loading examination settings"
    },
    {
        id: "check-backend",
        name: "Backend connection",
        description: "Checking the server connection"
    },
    {
        id: "check-ai",
        name: "AI proctoring service",
        description: "Preparing the monitoring service"
    }
];

const wait = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

function updateSplashProgress() {
    const messages = [
        "Initializing secure environment...",
        "Preparing ExamShield AI...",
        "Loading application resources...",
        "Almost ready..."
    ];

    let progress = 0;

    const timer = setInterval(() => {
        progress += 2;

        if (progress > 100) {
            progress = 100;
        }

        splashProgress.style.width = `${progress}%`;

        const messageIndex = Math.min(
            Math.floor(progress / 26),
            messages.length - 1
        );

        splashStatus.textContent = messages[messageIndex];

        if (progress >= 100) {
            clearInterval(timer);

            setTimeout(() => {
                splashScreen.classList.add("hidden");
                loadingScreen.classList.remove("hidden");
                runInitialization();
            }, 300);
        }
    }, 45);
}

function setCheckState(check, state, message) {
    const element = document.getElementById(check.id);
    const icon = element.querySelector(".check-icon");
    const status = element.querySelector(".check-status");
    const description = element.querySelector(".check-info p");

    element.classList.remove("checking", "complete", "failed");
    element.classList.add(state);

    if (state === "checking") {
        icon.textContent = "↻";
        status.textContent = "Checking...";
    } else if (state === "complete") {
        icon.textContent = "✓";
        status.textContent = "Demo complete";
    } else if (state === "failed") {
        icon.textContent = "!";
        status.textContent = "Unavailable";
    }

    if (message) {
        description.textContent = message;
    }
}

function updateOverallProgress(completed) {
    const percent = Math.round(
        (completed / checks.length) * 100
    );

    mainProgress.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
    checkCount.textContent = `${completed} / ${checks.length}`;

    progressLabel.textContent =
        completed === checks.length
            ? "Initialization finished"
            : "Initializing services...";
}

async function runInitialization() {
    retryButton.disabled = true;
    retryButton.textContent = "Checking...";

    completionMessage.classList.add("hidden");
    errorMessage.classList.add("hidden");

    mainProgress.style.width = "0%";
    progressPercent.textContent = "0%";
    checkCount.textContent = "0 / 4";
    progressLabel.textContent = "Starting initialization...";

    checks.forEach(check => {
        const element = document.getElementById(check.id);

        element.classList.remove("checking", "complete", "failed");
        element.querySelector(".check-icon").textContent =
            checks.indexOf(check) + 1;

        element.querySelector(".check-status").textContent = "Waiting";
        element.querySelector(".check-info p").textContent =
            check.description;
    });

    let completed = 0;

    try {
        for (const check of checks) {
            setCheckState(check, "checking");
            progressLabel.textContent = `Checking ${check.name.toLowerCase()}...`;

            // Demo simulation only. Replace with real service checks later.
            await wait(850);

            setCheckState(check, "complete");
            completed++;

            updateOverallProgress(completed);
        }

        completionMessage.classList.remove("hidden");
        progressLabel.textContent = "Demo initialization complete";
        await wait(1200);
        window.location.href = "role-selection.html";

    } catch (error) {
        console.error("Initialization error:", error);
        errorMessage.classList.remove("hidden");
        progressLabel.textContent = "Initialization interrupted";
    } finally {
        retryButton.disabled = false;
        retryButton.textContent = "Retry checks";
    }
}

retryButton.addEventListener("click", runInitialization);

updateSplashProgress();
