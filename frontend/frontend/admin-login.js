// Admin login form behavior.
const adminLoginForm = document.getElementById("adminLoginForm");
const adminId = document.getElementById("adminId");
const adminPassword = document.getElementById("adminPassword");
const loginError = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");

adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginError.textContent = "";

    if (!adminId.value.trim() || !adminPassword.value) {
        loginError.textContent = "Please enter your admin ID and password.";
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    // Prototype only: this does not authenticate a real administrator.
    await new Promise(resolve => setTimeout(resolve, 800));

    sessionStorage.setItem("examshieldAdminDemo", "true");
    sessionStorage.setItem("examshieldAdmin", adminId.value.trim());

    window.location.href = "admin-dashboard.html";
});
