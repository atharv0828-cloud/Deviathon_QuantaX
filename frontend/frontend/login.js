// Login form behavior.
const loginForm = document.getElementById("loginForm");
const studentId = document.getElementById("studentId");
const password = document.getElementById("password");
const loginError = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");
const buttonText = document.getElementById("buttonText");
const buttonArrow = document.getElementById("buttonArrow");
const togglePassword = document.getElementById("togglePassword");

togglePassword.addEventListener("click", () => {
    const isPassword = password.type === "password";

    password.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "Hide" : "Show";
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginError.textContent = "";

    if (!studentId.value.trim() || !password.value) {
        loginError.textContent = "Please enter your ID and password.";
        return;
    }

    loginButton.disabled = true;
    buttonText.textContent = "Signing in...";
    buttonArrow.textContent = "⟳";

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Demo only: this does NOT authenticate a real account.
    // Replace with a backend authentication request later.
    sessionStorage.setItem("examshieldDemoSession", "true");
    sessionStorage.setItem(
        "examshieldStudent",
        studentId.value.trim()
    );

    window.location.href = "dashboard.html";
});
