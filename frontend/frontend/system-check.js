// System-check page client-side behavior.
const runChecksButton = document.getElementById("runChecksButton");
const startExamButton = document.getElementById("startExamButton");
const overallMessage = document.getElementById("overallMessage");

const cameraPreview = document.getElementById("cameraPreview");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");

let cameraStream = null;
let checksRunning = false;
let cameraReady = false;
let micReady = false;
let internetReady = navigator.onLine;
let browserReady = false;

function setStatus(name, state, message) {
    document.getElementById(name + "Status").textContent = {
        checking: "Checking...",
        complete: "Ready",
        failed: "Failed",
        pending: "Pending"
    }[state];

    document.getElementById(name + "Status").className =
        "status " + state;

    document.getElementById(name + "Message").textContent = message;
}

function updateSummary() {
    const results = [
        cameraReady,
        micReady,
        internetReady,
        browserReady
    ];

    const passed = results.filter(Boolean).length;

    document.getElementById("checkCount").textContent =
        `${passed} / 4 READY`;

    startExamButton.disabled = passed !== 4;

    if (passed === 4) {
        overallMessage.textContent =
            "All checks passed! Your device is ready for the next step.";
    } else {
        overallMessage.textContent =
            `${passed} of 4 checks passed. Resolve the remaining checks to continue.`;
    }
}

async function checkCamera() {
    setStatus("camera", "checking", "Requesting camera permission...");

    if (!navigator.mediaDevices?.getUserMedia) {
        cameraReady = false;
        setStatus(
            "camera",
            "failed",
            "Camera access is unavailable. Use a supported browser and localhost or HTTPS."
        );
        return;
    }

    try {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }

        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true
        });

        cameraPreview.srcObject = cameraStream;
        cameraPreview.style.display = "block";
        cameraPlaceholder.style.display = "none";

        cameraReady = true;
        setStatus("camera", "complete", "Camera permission granted.");
    } catch (error) {
        cameraReady = false;
        setStatus(
            "camera",
            "failed",
            error.name === "NotAllowedError"
                ? "Camera permission denied. Allow camera access in your browser."
                : "Camera unavailable. Check that it is connected and not in use."
        );
    }
}

async function checkMicrophone() {
    setStatus("mic", "checking", "Requesting microphone permission...");

    if (!navigator.mediaDevices?.getUserMedia) {
        micReady = false;
        setStatus("mic", "failed", "Microphone access is unavailable.");
        return;
    }

    let micStream;

    try {
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        micReady = true;
        setStatus("mic", "complete", "Microphone permission granted.");
    } catch (error) {
        micReady = false;
        setStatus(
            "mic",
            "failed",
            error.name === "NotAllowedError"
                ? "Microphone permission denied. Allow access in your browser."
                : "Microphone unavailable. Check your device settings."
        );
    } finally {
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
        }
    }
}

function checkInternet() {
    internetReady = navigator.onLine;

    if (internetReady) {
        setStatus(
            "internet",
            "complete",
            "Browser reports an active network connection."
        );
    } else {
        setStatus(
            "internet",
            "failed",
            "No network connection detected."
        );
    }
}

function checkBrowser() {
    browserReady = Boolean(
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        window.Promise &&
        window.sessionStorage
    );

    if (browserReady) {
        setStatus(
            "browser",
            "complete",
            "Required browser features are supported."
        );
    } else {
        setStatus(
            "browser",
            "failed",
            "Some required features are unavailable. Try an updated browser."
        );
    }
}

async function runSystemChecks() {
    if (checksRunning) return;

    checksRunning = true;
    runChecksButton.disabled = true;
    runChecksButton.textContent = "Running Checks...";
    startExamButton.disabled = true;

    cameraReady = false;
    micReady = false;
    internetReady = navigator.onLine;
    browserReady = false;

    overallMessage.textContent =
        "Follow the browser permission prompts to complete the checks.";

    try {
        await checkCamera();
        await checkMicrophone();

        checkInternet();
        checkBrowser();

        updateSummary();
    } finally {
        checksRunning = false;
        runChecksButton.disabled = false;
        runChecksButton.textContent = "Run System Checks Again";
    }
}

runChecksButton.addEventListener("click", runSystemChecks);

window.addEventListener("online", () => {
    checkInternet();
    updateSummary();
});

window.addEventListener("offline", () => {
    checkInternet();
    updateSummary();
});

startExamButton.addEventListener("click", () => {
    if (
        cameraReady &&
        micReady &&
        internetReady &&
        browserReady
    ) {
        window.location.href = "exam.html";
    }
});

setStatus("camera", "pending", "Camera permission required");
setStatus("mic", "pending", "Microphone permission required");
setStatus("internet", "pending", "Run the checks to verify connection");
setStatus("browser", "pending", "Run the checks to verify compatibility");

updateSummary();
