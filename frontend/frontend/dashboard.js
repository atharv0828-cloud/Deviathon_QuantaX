// Student dashboard client-side behavior.
const studentName = document.getElementById("studentName");
const startExamButton = document.getElementById("startExamButton");
const logoutButton = document.getElementById("logoutButton");

// This is a prototype-only session check.
if (sessionStorage.getItem("examshieldDemoSession") !== "true") {
    window.location.replace("login.html");
} else {
    const student = sessionStorage.getItem("examshieldStudent") || "Student";

    studentName.textContent = student;
    document.querySelector(".profile-avatar").textContent =
        student.charAt(0).toUpperCase();
}

startExamButton.addEventListener("click", () => {
    window.location.href = "system-check.html";
});

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("examshieldDemoSession");
    sessionStorage.removeItem("examshieldStudent");

    window.location.href = "login.html";
});
