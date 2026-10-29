// Saved-exams page client-side behavior.
(() => {
  if (sessionStorage.getItem("examshieldAdminDemo") !== "true") {
    window.location.replace("admin-login.html");
    return;
  }

  const STORAGE_KEY = "examshieldExams";
  const $ = id => document.getElementById(id);

  const rows = $("examRows");
  const dialog = $("editDialog");
  const form = $("editForm");
  const search = $("searchInput");

  let exams = [];
  let editingId = null;

  function readExams() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      exams = Array.isArray(value) ? value : [];
    } catch {
      exams = [];
      showMessage("Saved exam data could not be read. Please check browser storage.", true);
    }
  }

  function writeExams() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(exams));
      return true;
    } catch {
      showMessage("Unable to save changes in browser storage.", true);
      return false;
    }
  }

  function examId(exam) {
    return String(exam.id ?? exam.code ?? exam.examCode ?? "");
  }

  function examTitle(exam) {
    return String(exam.title ?? exam.examTitle ?? exam.name ?? "Untitled Exam");
  }

  function examSubject(exam) {
    return String(exam.subject ?? "General");
  }

  function examCode(exam) {
    return String(exam.code ?? exam.examCode ?? "");
  }

  function duration(exam) {
    return Number(exam.duration ?? exam.durationMinutes ?? 0) || 0;
  }

  function questions(exam) {
    return Array.isArray(exam.questions) ? exam.questions : [];
  }

  function showMessage(text, error = false) {
    const box = $("message");
    box.textContent = text;
    box.style.color = error ? "#b42332" : "#167747";
  }

  function render() {
    const term = search.value.trim().toLowerCase();

    const filtered = exams.filter(exam =>
      [examTitle(exam), examSubject(exam), examCode(exam)]
        .some(value => value.toLowerCase().includes(term))
    );

    rows.replaceChildren();

    if (!filtered.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.className = "empty";
      td.textContent = exams.length
        ? "No exams match your search."
        : "No saved exams yet. Select Create Exam to add your first exam.";
      tr.appendChild(td);
      rows.appendChild(tr);
    } else {
      filtered.forEach(exam => {
        const tr = document.createElement("tr");

        const titleCell = document.createElement("td");
        const title = document.createElement("span");
        title.className = "exam-title";
        title.textContent = examTitle(exam);

        const subject = document.createElement("span");
        subject.className = "exam-subject";
        subject.textContent = examSubject(exam);

        titleCell.append(title, subject);

        const codeCell = document.createElement("td");
        codeCell.textContent = examCode(exam) || "—";

        const questionCell = document.createElement("td");
        questionCell.textContent = String(questions(exam).length);

        const durationCell = document.createElement("td");
        durationCell.textContent = `${duration(exam)} min`;

        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "actions";

        const edit = document.createElement("button");
        edit.className = "edit-btn";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => openEdit(exam));

        const remove = document.createElement("button");
        remove.className = "delete-btn";
        remove.textContent = "Delete";
        remove.addEventListener("click", () => deleteExam(exam));

        actions.append(edit, remove);
        actionCell.appendChild(actions);

        tr.append(titleCell, codeCell, questionCell, durationCell, actionCell);
        rows.appendChild(tr);
      });
    }

    $("totalCount").textContent = exams.length;
    $("questionCount").textContent = exams.reduce(
      (sum, exam) => sum + questions(exam).length, 0
    );
    $("durationCount").textContent =
      exams.reduce((sum, exam) => sum + duration(exam), 0) + " min";
  }

  function openEdit(exam) {
    editingId = examId(exam);

    $("editTitle").value = examTitle(exam);
    $("editSubject").value = examSubject(exam);
    $("editCode").value = examCode(exam);
    $("editDuration").value = duration(exam) || 30;
    $("editMarks").value = Number(exam.marksPerQuestion ?? exam.marks ?? 1);
    $("editStart").value = toDateTimeInput(exam.startTime ?? exam.startDate);
    $("editEnd").value = toDateTimeInput(exam.endTime ?? exam.endDate);
    $("formError").textContent = "";

    dialog.showModal();
  }

  function toDateTimeInput(value) {
    if (!value) return "";

    // Keep a valid datetime-local string unchanged.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value))) {
      return value;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const pad = number => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function setExistingField(updated, original, possibleKeys, value, fallbackKey) {
    const key = possibleKeys.find(k =>
      Object.prototype.hasOwnProperty.call(original, k)
    ) || fallbackKey;

    updated[key] = value;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const title = $("editTitle").value.trim();
    const subject = $("editSubject").value.trim();
    const code = $("editCode").value.trim();
    const minutes = Number($("editDuration").value);
    const marks = Number($("editMarks").value);
    const start = $("editStart").value;
    const end = $("editEnd").value;

    const fail = message => {
      $("formError").textContent = message;
    };

    $("formError").textContent = "";

    if (!title || !subject || !code) {
      fail("Please fill in the title, subject and exam code.");
      return;
    }

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) {
      fail("Duration must be between 1 and 600 minutes.");
      return;
    }

    if (!Number.isInteger(marks) || marks < 1 || marks > 100) {
      fail("Marks per question must be between 1 and 100.");
      return;
    }

    if (start && end && new Date(end) <= new Date(start)) {
      fail("End time must be later than start time.");
      return;
    }

    const duplicate = exams.some(exam =>
      examId(exam) !== editingId &&
      examCode(exam).toLowerCase() === code.toLowerCase()
    );

    if (duplicate) {
      fail("This exam code is already used by another exam.");
      return;
    }

    const index = exams.findIndex(exam => examId(exam) === editingId);
    if (index < 0) {
      fail("This exam could not be found. Refresh the page and try again.");
      return;
    }

    const original = exams[index];
    const updated = { ...original };

    setExistingField(updated, original, ["title", "examTitle", "name"], title, "title");
    setExistingField(updated, original, ["subject"], subject, "subject");
    setExistingField(updated, original, ["code", "examCode"], code, "code");
    setExistingField(updated, original, ["duration", "durationMinutes"], minutes, "duration");
    setExistingField(updated, original, ["marksPerQuestion", "marks"], marks, "marksPerQuestion");

    if (start || "startTime" in original || "startDate" in original) {
      setExistingField(updated, original, ["startTime", "startDate"], start, "startTime");
    }

    if (end || "endTime" in original || "endDate" in original) {
      setExistingField(updated, original, ["endTime", "endDate"], end, "endTime");
    }

    exams[index] = updated;

    if (!writeExams()) {
      exams[index] = original;
      return;
    }

    dialog.close();
    showMessage("Exam updated successfully.");
    render();
  });

  function deleteExam(exam) {
    const confirmed = window.confirm(
      `Delete "${examTitle(exam)}" (${examCode(exam)})?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    const index = exams.findIndex(item => examId(item) === examId(exam));
    if (index < 0) return;

    const removed = exams.splice(index, 1)[0];

    if (!writeExams()) {
      exams.splice(index, 0, removed);
      return;
    }

    showMessage(`"${examTitle(removed)}" was deleted.`);
    render();
  }

  $("closeDialog").addEventListener("click", () => dialog.close());
  $("cancelEdit").addEventListener("click", () => dialog.close());
  search.addEventListener("input", render);

  $("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("examshieldAdminDemo");
    sessionStorage.removeItem("examshieldAdmin");
    window.location.href = "admin-login.html";
  });

  readExams();
  render();
})();
