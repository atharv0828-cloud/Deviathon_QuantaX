// Exam page client-side behavior.
"use strict";

// =====================================================
// EXAMSHIELD AI — EXAM ENGINE
// MCQ + Coding + Camera + Face Detection + Timer
// =====================================================

// ---------------- CONFIG ----------------

const EXAM_CONFIG = {
    durationSeconds: 15 * 60,
    maxWarnings: 2,
    violationCooldownMs: 1800,
    multipleFaceConfirmMs: 1800,
    faceCheckIntervalMs: 1200
};

const examMode =
    sessionStorage.getItem("examshieldExamMode") === "coding"
        ? "coding"
        : "mcq";

// ---------------- QUESTIONS ----------------

const questions = [
    {
        question: "Which component is commonly known as the brain of a computer?",
        options: ["RAM", "CPU", "SSD", "Monitor"],
        answer: 1
    },
    {
        question: "Which language is primarily used to structure a web page?",
        options: ["HTML", "Python", "SQL", "C"],
        answer: 0
    },
    {
        question: "What does CSS stand for?",
        options: [
            "Computer Style System",
            "Creative Styling Software",
            "Cascading Style Sheets",
            "Colourful Sheet Syntax"
        ],
        answer: 2
    },
    {
        question: "Which of the following is an input device?",
        options: ["Monitor", "Printer", "Speaker", "Keyboard"],
        answer: 3
    },
    {
        question: "What is the binary representation of decimal 2?",
        options: ["01", "10", "11", "100"],
        answer: 1
    },
    {
        question: "Which HTML tag creates a hyperlink?",
        options: ["<link>", "<p>", "<a>", "<href>"],
        answer: 2
    },
    {
        question: "Which data structure follows FIFO?",
        options: ["Stack", "Queue", "Tree", "Graph"],
        answer: 1
    },
    {
        question: "Which symbol is commonly used for equality comparison in JavaScript?",
        options: ["=", "==", "+=", "=>"],
        answer: 1
    },
    {
        question: "Which protocol is commonly used to securely load websites?",
        options: ["FTP", "HTTP", "HTTPS", "SMTP"],
        answer: 2
    },
    {
        question: "What does RAM primarily provide?",
        options: [
            "Permanent file storage",
            "Temporary working memory",
            "Internet connectivity",
            "Printed output"
        ],
        answer: 1
    }
];

// ---------------- STATE ----------------

const answers = Array(questions.length).fill(null);
const markedForReview = Array(questions.length).fill(false);

let currentQuestion = 0;
let timeLeft = EXAM_CONFIG.durationSeconds;

let examStarted = false;
let examFinished = false;
let submissionInProgress = false;
let startInProgress = false;

let timerInterval = null;
let faceCheckInterval = null;
let cameraStream = null;

let warningCount = 0;
let lastViolationAt = 0;
let multipleFacesSince = null;
let multipleFaceIncidentActive = false;
let cameraIncidentActive = false;
let faceApiReady = false;
let fullscreenWasEntered = false;

// ---------------- ELEMENTS ----------------

const $ = id => document.getElementById(id);

const examContent = $("examContent");
const startGate = $("startGate");
const startButton = $("startSecureExamButton");
const startError = $("startError");

const questionText = $("questionText");
const optionsContainer = $("optionsContainer");
const previousButton = $("previousButton");
const nextButton = $("nextButton");
const reviewButton = $("reviewButton");
const submitButton = $("submitButton");
const resultModal = $("resultModal");

const student =
    sessionStorage.getItem("examshieldStudent") || "Student";

if ($("studentName")) {
    $("studentName").textContent = student;
}

if ($("studentAvatar")) {
    $("studentAvatar").textContent =
        student.trim().charAt(0).toUpperCase() || "S";
}

// ---------------- STATUS ----------------

function updateSecurityStatus(message) {
    let status = $("examShieldStatus");

    if (!status) {
        status = document.createElement("div");
        status.id = "examShieldStatus";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        document.body.appendChild(status);
    }

    status.textContent = message;
}

function updateLiveStatus(message) {
    const element = $("examLiveStatus");

    if (element) {
        element.textContent = message;
    }
}

// ---------------- VIOLATION LOGS ----------------

function saveViolationLog(reason, type) {
    let logs = [];

    try {
        logs = JSON.parse(
            sessionStorage.getItem("examshieldViolationLogs") || "[]"
        );
    } catch {
        logs = [];
    }

    logs.push({
        reason,
        type,
        mode: examMode,
        timestamp: new Date().toISOString(),
        warningNumber: warningCount
    });

    try {
        sessionStorage.setItem(
            "examshieldViolationLogs",
            JSON.stringify(logs)
        );
    } catch (error) {
        console.warn("Could not save violation log.", error);
    }
}

// ---------------- WARNING MODAL ----------------

function showWarning(message) {
    let modal = $("examShieldWarning");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "examShieldWarning";
        modal.setAttribute("role", "alertdialog");
        modal.setAttribute("aria-modal", "true");

        modal.innerHTML = `
            <div class="warning-card">
                <h2 id="examShieldWarningTitle"></h2>
                <p id="examShieldWarningMessage"></p>
                <button id="examShieldWarningOk" type="button">
                    I Understand
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        $("examShieldWarningOk").addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    $("examShieldWarningTitle").textContent =
        `Warning ${warningCount} of ${EXAM_CONFIG.maxWarnings}`;

    $("examShieldWarningMessage").textContent = message;

    modal.style.display = "flex";
    $("examShieldWarningOk").focus();
}

// ---------------- VIOLATION HANDLER ----------------

function recordViolation(reason) {
    // No violations can affect an exam that has not started.
    if (!examStarted || examFinished || submissionInProgress) {
        return;
    }

    const now = Date.now();

    // Ignore duplicate events triggered by the same incident.
    if (now - lastViolationAt < EXAM_CONFIG.violationCooldownMs) {
        return;
    }

    lastViolationAt = now;

    if (warningCount < EXAM_CONFIG.maxWarnings) {
        warningCount++;

        saveViolationLog(reason, "warning");

        updateSecurityStatus(
            `Security warnings: ${warningCount}/${EXAM_CONFIG.maxWarnings}`
        );

        showWarning(
            `${reason}. Warning ${warningCount} of ` +
            `${EXAM_CONFIG.maxWarnings}. The next confirmed violation ` +
            `will submit your exam automatically.`
        );

        return;
    }

    saveViolationLog(reason, "auto-submit");
    finishExam(true, reason);
}

// ---------------- CLEANUP ----------------

function stopExamResources() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (faceCheckInterval !== null) {
        clearInterval(faceCheckInterval);
        faceCheckInterval = null;
    }

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    const preview = $("examCameraPreview");

    if (preview) {
        preview.srcObject = null;
        preview.remove();
    }
}

// ---------------- SUBMIT ----------------

function finishExam(autoSubmitted = false, reason = "") {
    // CRITICAL: prevent submission before Start Secure Exam.
    if (!examStarted || examFinished || submissionInProgress) {
        return;
    }

    if (!autoSubmitted) {
        const unanswered = examMode === "mcq"
            ? answers.filter(answer => answer === null).length
            : ($("codingAnswer")?.value.trim() ? 0 : 1);

        const confirmed = window.confirm(
            `Submit your examination?\n\nUnanswered: ${unanswered}`
        );

        if (!confirmed) return;
    }

    submissionInProgress = true;
    examFinished = true;

    stopExamResources();

    const answeredCount = examMode === "mcq"
        ? answers.filter(answer => answer !== null).length
        : ($("codingAnswer")?.value.trim() ? 1 : 0);

    const unansweredCount = examMode === "mcq"
        ? questions.length - answeredCount
        : (answeredCount === 0 ? 1 : 0);

    const score = examMode === "mcq"
        ? answers.reduce((total, answer, index) => {
            return total +
                (answer === questions[index].answer ? 1 : 0);
        }, 0)
        : null;

    const result = {
        student,
        mode: examMode,
        score,
        answered: answeredCount,
        unanswered: unansweredCount,
        autoSubmitted,
        reason,
        warnings: warningCount,
        answers: examMode === "mcq" ? [...answers] : undefined,
        codingAnswer: examMode === "coding"
            ? ($("codingAnswer")?.value || "")
            : undefined,
        submittedAt: new Date().toISOString()
    };

    // Demo storage only. Production results must be validated server-side.
    try {
        sessionStorage.setItem(
            "examshieldLastResult",
            JSON.stringify(result)
        );
    } catch (error) {
        console.warn("Could not save result.", error);
    }

    if ($("resultHeading")) {
        $("resultHeading").textContent = autoSubmitted
            ? "Exam Automatically Submitted"
            : "Exam Submitted Successfully";
    }

    if ($("resultMessage")) {
        $("resultMessage").textContent = autoSubmitted
            ? `Reason: ${reason}. Your exam has been locked.`
            : "Your answers have been submitted.";
    }

    if ($("scoreValue")) {
        $("scoreValue").textContent = examMode === "mcq"
            ? `${score} / ${questions.length}`
            : "Pending Review";
    }

    if ($("resultAnswered")) {
        $("resultAnswered").textContent = answeredCount;
    }

    if ($("resultUnanswered")) {
        $("resultUnanswered").textContent = unansweredCount;
    }

    if (resultModal) {
        resultModal.classList.remove("hidden");
    }

    [
        submitButton,
        nextButton,
        previousButton,
        reviewButton
    ].forEach(button => {
        if (button) button.disabled = true;
    });

    if ($("codingAnswer")) {
        $("codingAnswer").disabled = true;
    }

    updateLiveStatus("Exam submitted");
    updateSecurityStatus(
        autoSubmitted ? "Exam submitted and locked." : "Exam submitted."
    );

    submissionInProgress = false;
}

// External integrations cannot submit before the exam starts.
window.examShieldForceSubmit = reason => {
    if (!examStarted || examFinished) return;
    finishExam(true, reason || "Security violation");
};

// ---------------- MCQ ----------------

function renderQuestion() {
    if (examMode !== "mcq" || !questionText || !optionsContainer) {
        return;
    }

    const question = questions[currentQuestion];

    if ($("questionCount")) {
        $("questionCount").textContent =
            `Question ${currentQuestion + 1} of ${questions.length}`;
    }

    if ($("questionNumber")) {
        $("questionNumber").textContent =
            `QUESTION ${String(currentQuestion + 1).padStart(2, "0")}`;
    }

    if ($("examProgress")) {
        $("examProgress").style.width =
            `${((currentQuestion + 1) / questions.length) * 100}%`;
    }

    questionText.textContent = question.question;
    optionsContainer.replaceChildren();

    question.options.forEach((optionText, index) => {
        const label = document.createElement("label");
        label.className = "option";

        if (answers[currentQuestion] === index) {
            label.classList.add("selected");
        }

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "answer";
        radio.value = index;
        radio.checked = answers[currentQuestion] === index;

        const text = document.createElement("span");
        text.textContent =
            `${String.fromCharCode(65 + index)}. ${optionText}`;

        radio.addEventListener("change", () => {
            if (!examStarted || examFinished) return;

            answers[currentQuestion] = index;

            if ($("savedStatus")) {
                $("savedStatus").textContent = "Answer saved in this session";
            }

            renderQuestion();
        });

        label.append(radio, text);
        optionsContainer.appendChild(label);
    });

    if (previousButton) {
        previousButton.disabled = !examStarted || currentQuestion === 0;
    }

    if (nextButton) {
        nextButton.disabled = !examStarted;
        nextButton.textContent =
            currentQuestion === questions.length - 1
                ? "Go to First Question ↺"
                : "Next Question →";
    }

    if (reviewButton) {
        reviewButton.disabled = !examStarted;
        reviewButton.classList.toggle(
            "marked",
            markedForReview[currentQuestion]
        );

        reviewButton.textContent = markedForReview[currentQuestion]
            ? "★ Marked for Review"
            : "☆ Mark for Review";
    }

    renderPalette();
    updateStats();
}

function renderPalette() {
    const palette = $("questionPalette");

    if (!palette || examMode !== "mcq") return;

    palette.replaceChildren();

    questions.forEach((_, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "palette-btn";
        button.textContent = index + 1;
        button.disabled = !examStarted;
        button.setAttribute("aria-label", `Go to question ${index + 1}`);

        if (answers[index] !== null) button.classList.add("answered");
        if (markedForReview[index]) button.classList.add("review");
        if (index === currentQuestion) button.classList.add("current");

        button.addEventListener("click", () => {
            if (!examStarted || examFinished) return;

            currentQuestion = index;
            renderQuestion();
        });

        palette.appendChild(button);
    });
}

function updateStats() {
    const answered = answers.filter(answer => answer !== null).length;
    const review = markedForReview.filter(Boolean).length;

    if ($("answeredCount")) $("answeredCount").textContent = answered;

    if ($("unansweredCount")) {
        $("unansweredCount").textContent = questions.length - answered;
    }

    if ($("reviewCount")) $("reviewCount").textContent = review;
}

// ---------------- MCQ BUTTON EVENTS ----------------

previousButton?.addEventListener("click", () => {
    if (!examStarted || examFinished) return;

    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
    }
});

nextButton?.addEventListener("click", () => {
    if (!examStarted || examFinished) return;

    currentQuestion =
        currentQuestion === questions.length - 1
            ? 0
            : currentQuestion + 1;

    renderQuestion();
});

reviewButton?.addEventListener("click", () => {
    if (!examStarted || examFinished) return;

    markedForReview[currentQuestion] =
        !markedForReview[currentQuestion];

    renderQuestion();
});

submitButton?.addEventListener("click", () => {
    if (!examStarted || examFinished) return;
    finishExam(false);
});

$("finishButton")?.addEventListener("click", () => {
    window.location.href = "dashboard.html";
});

// ---------------- TIMER ----------------

function formatTime(seconds) {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return (
        `${String(minutes).padStart(2, "0")}:` +
        `${String(remainingSeconds).padStart(2, "0")}`
    );
}

function updateTimer() {
    if (!examStarted || examFinished) return;

    const timer = $("timer");
    const timerBox = document.querySelector(".timer-box");

    if (timer) {
        timer.textContent = formatTime(timeLeft);
    }

    if (timeLeft <= 60 && timerBox) {
        timerBox.classList.add("warning");
    }

    if (timeLeft <= 0) {
        if (timer) timer.textContent = "00:00";
        finishExam(true, "Time limit reached");
        return;
    }

    timeLeft--;
}

function startTimer() {
    // Avoid duplicate intervals.
    if (timerInterval !== null || examFinished || !examStarted) {
        return;
    }

    if ($("timer")) {
        $("timer").textContent = formatTime(timeLeft);
    }

    // Start immediately, then update once per second.
    updateTimer();

    if (!examFinished) {
        timerInterval = setInterval(updateTimer, 1000);
    }
}

// ---------------- CODING MODE ----------------

function setupCodingMode() {
    if (examMode !== "coding") return;

    if ($("examTitle")) {
        $("examTitle").textContent = "Coding Examination";
    }

    [
        "questionText",
        "optionsContainer",
        "questionCount",
        "questionNumber",
        "questionPalette",
        "examProgress",
        "previousButton",
        "nextButton",
        "reviewButton",
        "answeredCount",
        "unansweredCount",
        "reviewCount"
    ].forEach(id => {
        const element = $(id);
        if (element) element.style.display = "none";
    });

    let panel = $("codingExamPanel");

    if (!panel) {
        panel = document.createElement("section");
        panel.id = "codingExamPanel";
        panel.style.cssText = `
            max-width:1000px;
            margin:24px auto;
            padding:20px;
            background:#111827;
            color:white;
            border-radius:14px;
        `;

        const heading = document.createElement("h2");
        heading.textContent = "Coding Test";

        const prompt = document.createElement("p");
        prompt.textContent =
            sessionStorage.getItem("examshieldCodingQuestion") ||
            "Write a function to solve the given problem.";

        const editor = document.createElement("textarea");
        editor.id = "codingAnswer";
        editor.placeholder = "// Write your code here...";
        editor.spellcheck = false;
        editor.autocomplete = "off";
        editor.autocapitalize = "off";
        editor.disabled = true;

        editor.style.cssText = `
            box-sizing:border-box;
            display:block;
            width:100%;
            min-height:360px;
            padding:16px;
            background:#030712;
            color:#e5e7eb;
            border:1px solid #4b5563;
            border-radius:8px;
            font:14px/1.6 monospace;
            resize:vertical;
        `;

        const note = document.createElement("p");
        note.textContent =
            "Clipboard shortcuts are restricted inside this editor. " +
            "Browser restrictions cannot prevent every form of cheating.";
        note.style.color = "#cbd5e1";

        panel.append(heading, prompt, editor, note);

        const main = document.querySelector("main");

        if (main) {
            main.appendChild(panel);
        } else {
            document.body.appendChild(panel);
        }

        editor.addEventListener("keydown", event => {
            const key = event.key.toLowerCase();
            const command = event.ctrlKey || event.metaKey;

            if (
                (command && ["c", "v", "x"].includes(key)) ||
                (event.shiftKey && key === "insert")
            ) {
                event.preventDefault();
            }
        });

        ["copy", "cut", "paste"].forEach(eventName => {
            editor.addEventListener(eventName, event => {
                event.preventDefault();
            });
        });

        editor.addEventListener("contextmenu", event => {
            event.preventDefault();
        });

        editor.addEventListener("input", () => {
            try {
                sessionStorage.setItem(
                    "examshieldCodingAnswer",
                    editor.value
                );
            } catch (error) {
                console.warn("Could not save coding draft.", error);
            }
        });

        editor.value =
            sessionStorage.getItem("examshieldCodingAnswer") || "";
    }
}

// ---------------- CAMERA ----------------

function setupCameraPreview() {
    let video = $("examCameraPreview");

    if (!video) {
        video = document.createElement("video");
        video.id = "examCameraPreview";
        document.body.appendChild(video);
    }

    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    return video;
}

async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
        updateSecurityStatus(
            "Camera unavailable. Use localhost or HTTPS in a supported browser."
        );
        return false;
    }

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });

        const video = setupCameraPreview();
        video.srcObject = cameraStream;

        await video.play();

        const track = cameraStream.getVideoTracks()[0];

        track.addEventListener("ended", () => {
            if (examStarted && !examFinished && !cameraIncidentActive) {
                cameraIncidentActive = true;
                recordViolation("Camera disconnected or stopped");
            }
        });

        track.addEventListener("mute", () => {
            if (examStarted && !examFinished && !cameraIncidentActive) {
                cameraIncidentActive = true;
                recordViolation("Camera feed interrupted");
            }
        });

        track.addEventListener("unmute", () => {
            cameraIncidentActive = false;
        });

        updateSecurityStatus("Camera active. Loading face detection...");
        return true;

    } catch (error) {
        console.error("Camera permission failed:", error);

        stopCameraOnly();

        if (startError) {
            startError.textContent =
                "Camera access is required. Allow camera permission and try again.";
        }

        updateSecurityStatus("Camera not started. Exam remains locked.");
        return false;
    }
}

function stopCameraOnly() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    const video = $("examCameraPreview");

    if (video) {
        video.srcObject = null;
        video.remove();
    }
}

// ---------------- FACE DETECTION ----------------

async function loadFaceDetection() {
    try {
        if (!window.faceapi) {
            await new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src =
                    "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";

                script.onload = resolve;
                script.onerror = () => reject(
                    new Error("Could not load face-api.js")
                );

                document.head.appendChild(script);
            });
        }

        const modelURL =
            "https://justadudewhohacks.github.io/face-api.js/models";

        await faceapi.nets.tinyFaceDetector.loadFromUri(modelURL);

        faceApiReady = true;
        updateSecurityStatus("Camera active. Face detection ready.");
        return true;

    } catch (error) {
        faceApiReady = false;

        console.error("Face detection model failed to load:", error);

        updateSecurityStatus(
            "Camera active, but face detection could not load. " +
            "Check internet access and the browser console."
        );

        // Allow the exam to proceed with camera monitoring.
        // Do not claim that face detection is working.
        return false;
    }
}


let faceDetectionInProgress = false;

async function checkFaceCount() {
    if (
        !examStarted ||
        examFinished ||
        !faceApiReady ||
        !cameraStream ||
        faceDetectionInProgress
    ) {
        return;
    }

    const video = document.getElementById("examCameraPreview");

    if (
        !video ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
    ) {
        return;
    }

    // Don't run overlapping asynchronous detections.
    faceDetectionInProgress = true;

    try {
        const detections = await window.faceapi.detectAllFaces(
            video,
            new window.faceapi.TinyFaceDetectorOptions({
                inputSize: 512,
                scoreThreshold: 0.35
            })
        );

        console.log(
            "[ExamShield] Faces detected:",
            detections.length
        );

        if (detections.length > 1) {
            if (multipleFacesSince === null) {
                multipleFacesSince = Date.now();
            }

            const confirmedFor = Date.now() - multipleFacesSince;

            if (
                confirmedFor >= EXAM_CONFIG.multipleFaceConfirmMs &&
                !multipleFaceIncidentActive
            ) {
                multipleFaceIncidentActive = true;
                recordViolation("Multiple faces detected");
            }
        } else {
            multipleFacesSince = null;
            multipleFaceIncidentActive = false;
        }
    } catch (error) {
        console.error(
            "[ExamShield] Face detection error:",
            error
        );
    } finally {
        faceDetectionInProgress = false;
    }
}

    // Check the first frame without waiting for the interval.
    checkFaceCount();

    // ---------------- FACE MONITORING ----------------

function startFaceMonitoring() {
    // Prevent duplicate monitoring intervals.
    if (faceCheckInterval !== null || !faceApiReady || !cameraStream) {
        return;
    }

    // Check immediately, then continue at the configured interval.
    checkFaceCount();

    faceCheckInterval = setInterval(() => {
        checkFaceCount();
    }, EXAM_CONFIG.faceCheckIntervalMs);
}

// ---------------- FULLSCREEN ----------------

async function requestExamFullscreen() {
    if (document.fullscreenElement) {
        fullscreenWasEntered = true;
        return true;
    }

    if (!document.documentElement.requestFullscreen) {
        return false;
    }

    try {
        await document.documentElement.requestFullscreen();
        fullscreenWasEntered = Boolean(document.fullscreenElement);
        return fullscreenWasEntered;
    } catch (error) {
        console.warn("Fullscreen could not be enabled:", error);
        return false;
    }
}

document.addEventListener("fullscreenchange", () => {
    if (!examStarted || examFinished) return;

    if (document.fullscreenElement) {
        fullscreenWasEntered = true;
        return;
    }

    if (fullscreenWasEntered) {
        recordViolation("Exited fullscreen mode");
    }
});

// ---------------- TAB / WINDOW MONITORING ----------------

document.addEventListener("visibilitychange", () => {
    if (!examStarted || examFinished) return;

    if (document.hidden) {
        recordViolation("Exam tab changed or browser was hidden");
    }
});

window.addEventListener("blur", () => {
    if (!examStarted || examFinished) return;

    recordViolation("Exam window lost focus or was minimized");
});

// ---------------- START EXAM ----------------

async function startSecureExam() {
    if (examStarted || examFinished || startInProgress) return;

    startInProgress = true;
    startButton.disabled = true;
    startButton.textContent = "Requesting Camera...";
    startError.textContent = "";

    try {
        // Request fullscreen immediately from the button gesture.
        // Some browsers may deny it; camera permission is still required.
        const fullscreenPromise = requestExamFullscreen();

        // Camera must work before the exam can start.
        const cameraReady = await startCamera();

        if (!cameraReady) {
            await fullscreenPromise.catch(() => false);
            return;
        }

        // Face detection is attempted before the timer starts.
        // If the model cannot load, the status will clearly say so.
        await loadFaceDetection();

        if (examFinished) return;

        await fullscreenPromise;

        // This is the ONLY place the exam is marked as started.
        examStarted = true;

        if (examContent) {
            examContent.inert = false;
        }

        if (startGate) {
            startGate.hidden = true;
        }

        if ($("codingAnswer")) {
            $("codingAnswer").disabled = false;
        }

        if (submitButton) {
            submitButton.disabled = false;
        }

        updateLiveStatus("Exam in progress");

        renderQuestion();

        if (faceApiReady) {
            startFaceMonitoring();
        }

        updateSecurityStatus(
            faceApiReady
                ? "Exam active. Camera and face detection are running."
                : "Exam active. Camera is running; face detection is unavailable."
        );

        startTimer();

    } catch (error) {
        console.error("Could not start the exam:", error);

        stopCameraOnly();

        if (startError) {
            startError.textContent =
                "Could not start the exam. Check camera permission and try again.";
        }

        updateSecurityStatus("Exam has not started. Please retry.");

    } finally {
        startInProgress = false;

        if (!examStarted && !examFinished) {
            startButton.disabled = false;
            startButton.textContent = "Start Secure Exam";
        }
    }
}

// ---------------- INITIALIZATION ----------------

// These operations prepare the UI only.
// They do NOT start the timer, camera, or proctoring.
if (examMode === "coding") {
    setupCodingMode();
} else {
    renderQuestion();
}

if (examContent) {
    examContent.inert = true;
}

if (startGate) {
    startGate.hidden = false;
}

if ($("timer")) {
    $("timer").textContent = formatTime(EXAM_CONFIG.durationSeconds);
}

if (submitButton) {
    submitButton.disabled = true;
}

startButton?.addEventListener("click", startSecureExam);

updateLiveStatus("Waiting to start");
updateSecurityStatus("Ready. Click Start Secure Exam to begin.");
