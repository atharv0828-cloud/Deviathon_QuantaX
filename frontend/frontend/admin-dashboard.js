// Admin dashboard client-side behavior.
const adminSession = sessionStorage.getItem("examshieldAdminDemo");

if (adminSession !== "true") {
    window.location.replace("admin-login.html");
} else {
    const adminId = sessionStorage.getItem("examshieldAdmin") || "Administrator";

    document.getElementById("adminName").textContent = adminId;

    document.querySelector(".top-avatar").textContent =
        adminId.trim().charAt(0).toUpperCase() || "A";

    document.querySelector(".avatar").textContent =
        adminId.trim().charAt(0).toUpperCase() || "A";
}

document.getElementById("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("examshieldAdminDemo");
    sessionStorage.removeItem("examshieldAdmin");

    window.location.href = "admin-login.html";
});
