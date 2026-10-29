// Create-exam form behavior.
const adminSession = sessionStorage.getItem("examshieldAdminDemo");

if (adminSession !== "true") {
    window.location.replace("admin-login.html");
}

const examForm = document.getElementById("examForm");
const questionsContainer = document.getElementById("questionsContainer");
const questionCounter = document.getElementById("questionCounter");
const totalQuestionsInput = document.getElementById("totalQuestions");
const addQuestionButton = document.getElementById("addQuestionButton");
const formMessage = document.getElementById("formMessage");

let questionId = 0;

function updateQuestionCounter() {
    const count = questionsContainer.querySelectorAll(".question-card").length;
    questionCounter.textContent = `${count} Question${count === 1 ? "" : "s"}`;
    totalQuestionsInput.value = count;
}

function addQuestion() {
    const count = questionsContainer.querySelectorAll(".question-card").length;

    if (count >= 100) {
        showMessage("Maximum 100 questions allowed.", true);
        return;
    }

    questionId++;

    const card = document.createElement("div");
    card.className = "question-card";
    card.dataset.questionId = questionId;

    card.innerHTML = `
        <div class="question-card-header">
            <strong class="question-title">Question ${count + 1}</strong>
            <button type="button" class="remove-question">Remove</button>
        </div>

        <textarea class="question-text" maxlength="1000"
            placeholder="Enter your question..." required></textarea>

        <div class="options-grid">
            <div class="option-field">
                <label> A </label>
                <input class="option-input" data-option="A"
                    placeholder="Option A" maxlength="300" required>
            </div>
            <div class="option-field">
                <label> B </label>
                <input class="option-input" data-option="B"
                    placeholder="Option B" maxlength="300" required>
            </div>
            <div class="option-field">
                <label> C </label>
                <input class="option-input" data-option="C"
                    placeholder="Option C" maxlength="300" required>
            </div>
            <div class="option-field">
                <label> D </label>
                <input class="option-input" data-option="D"
                    placeholder="Option D" maxlength="300" required>
            </div>
        </div>

        <div class="correct-answer">
            <label>Correct Answer:</label>
            <select class="correct-option" required>
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
            </select>
        </div>
    `;

    questionsContainer.appendChild(card);
    updateQuestionCounter();
    showMessage("");

    card.querySelector(".remove-question").addEventListener("click", () => {
        card.remove();
        renumberQuestions();
        updateQuestionCounter();
    });
}

function renumberQuestions() {
    const cards = questionsContainer.querySelectorAll(".question-card");

    cards.forEach((card, index) => {
        card.querySelector(".question-title").textContent =
            `Question ${index + 1}`;
    });
}

function showMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.classList.toggle("error", isError);
}

addQuestionButton.addEventListener("click", addQuestion);

for (let i = 0; i < 5; i++) {
    addQuestion();
}

examForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showMessage("");

    const title = document.getElementById("examTitle").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const code = document.getElementById("examCode").value.trim();
    const duration = Number(document.getElementById("duration").value);
    const marksPerQuestion = Number(
        document.getElementById("marksPerQuestion").value
    );

    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (!title || !subject || !code) {
        showMessage("Please complete all required exam details.", true);
        return;
    }

    if (!Number.isFinite(duration) || duration < 1 || duration > 300) {
        showMessage("Duration must be between 1 and 300 minutes.", true);
        return;
    }

    if (!Number.isFinite(marksPerQuestion) ||
        marksPerQuestion < 1 || marksPerQuestion > 100) {
        showMessage("Marks per question must be between 1 and 100.", true);
        return;
    }

    if (!startTime || !endTime ||
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        endDate <= startDate) {
        showMessage("Exam end time must be later than its start time.", true);
        return;
    }

    const questionCards = [
        ...questionsContainer.querySelectorAll(".question-card")
    ];

    if (questionCards.length === 0) {
        showMessage("Add at least one question.", true);
        return;
    }

    const questions = [];

    for (let index = 0; index < questionCards.length; index++) {
        const card = questionCards[index];
        const questionText = card.querySelector(".question-text").value.trim();
        const optionInputs = [...card.querySelectorAll(".option-input")];

        const options = {};

        for (const input of optionInputs) {
            options[input.dataset.option] = input.value.trim();
        }

        if (!questionText ||
            Object.values(options).some(option => !option)) {
            showMessage(
                `Please complete the question and all four options for Question ${index + 1}.`,
                true
            );
            return;
        }

        questions.push({
            question: questionText,
            options,
            correctAnswer: card.querySelector(".correct-option").value
        });
    }

    const savedExams = JSON.parse(localStorage.getItem("examshieldExams") || "[]");

    if (savedExams.some(exam => exam.code.toLowerCase() === code.toLowerCase())) {
        showMessage("This exam code already exists. Please use a unique code.", true);
        return;
    }

    const exam = {
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : `exam-${Date.now()}`,
        title,
        subject,
        code,
        duration,
        marksPerQuestion,
        totalQuestions: questions.length,
        totalMarks: questions.length * marksPerQuestion,
        startTime,
        endTime,
        settings: {
            cameraRequired: document.getElementById("cameraRequired").checked,
            fullscreenRequired: document.getElementById("fullscreenRequired").checked,
            tabWarnings: document.getElementById("tabWarnings").checked
        },
        questions,
        createdAt: new Date().toISOString()
    };

    savedExams.push(exam);
    localStorage.setItem("examshieldExams", JSON.stringify(savedExams));

    showMessage(
        `Exam "${title}" saved successfully! Total marks: ${exam.totalMarks}.`
    );

    examForm.reset();
    questionsContainer.innerHTML = "";
    questionId = 0;

    for (let i = 0; i < 5; i++) {
        addQuestion();
    }

    document.getElementById("duration").value = 30;
    document.getElementById("marksPerQuestion").value = 1;
    document.getElementById("cameraRequired").checked = true;
    document.getElementById("fullscreenRequired").checked = true;
    document.getElementById("tabWarnings").checked = true;
});
