// Live-monitor client-side behavior.
(() => {
  // Demo-only admin guard. This is not real authentication.
  if (sessionStorage.getItem("examshieldAdminDemo") !== "true") {
    window.location.href = "admin-login.html";
    return;
  }

  const candidates = [
    { id: "ES-1001", name: "Aarav Sharma", exam: "JavaScript Fundamentals", progress: 68, status: "Verified", events: 0 },
    { id: "ES-1002", name: "Diya Verma", exam: "JavaScript Fundamentals", progress: 42, status: "Review Needed", events: 2 },
    { id: "ES-1003", name: "Kabir Singh", exam: "Python Basics", progress: 85, status: "Verified", events: 0 },
    { id: "ES-1004", name: "Ananya Gupta", exam: "Python Basics", progress: 27, status: "Warning", events: 1 }
  ];

  let eventId = 4;
  let events = [
    { id: 1, candidate: "Diya Verma", candidateId: "ES-1002", type: "Multiple tab-switch signals", time: "10:42 AM", severity: "Review", reviewed: false },
    { id: 2, candidate: "Diya Verma", candidateId: "ES-1002", type: "Face not detected in sample frame", time: "10:39 AM", severity: "Warning", reviewed: false },
    { id: 3, candidate: "Ananya Gupta", candidateId: "ES-1004", type: "Fullscreen exit signal", time: "10:35 AM", severity: "Warning", reviewed: false }
  ];

  const rows = document.getElementById("candidateRows");
  const eventList = document.getElementById("eventList");
  const searchInput = document.getElementById("searchInput");

  function statusClass(status) {
    if (status === "Verified") return "ok";
    if (status === "Warning") return "warn";
    return "review";
  }

  function renderCandidates() {
    const term = searchInput.value.trim().toLowerCase();
    const filtered = candidates.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term) ||
      c.exam.toLowerCase().includes(term)
    );

    rows.innerHTML = filtered.length ? filtered.map(c => `
      <tr>
        <td>
          <span class="candidate-name">${c.name}</span>
          <span class="candidate-id">${c.id}</span>
        </td>
        <td>${c.exam}</td>
        <td>${c.progress}%</td>
        <td><span class="status ${statusClass(c.status)}">${c.status}</span></td>
        <td>${c.events}</td>
        <td><button class="view-btn" data-candidate="${c.id}">View details</button></td>
      </tr>
    `).join("") : `<tr><td colspan="6" class="empty">No matching candidates found.</td></tr>`;
  }

  function renderEvents() {
    const pending = events.filter(e => !e.reviewed);

    eventList.innerHTML = events.length ? events.map(e => `
      <article class="event">
        <div>
          <div class="event-title">${e.type}</div>
          <div class="event-meta">
            ${e.candidate} (${e.candidateId}) · ${e.time}<br>
            Severity: ${e.severity} · ${e.reviewed ? "Reviewed" : "Pending review"}
          </div>
        </div>
        <div class="event-actions">
          <span class="status ${e.reviewed ? "ok" : e.severity === "Review" ? "review" : "warn"}">
            ${e.reviewed ? "Reviewed" : "Pending"}
          </span>
          ${e.reviewed ? "" : `<button class="ack-btn" data-event="${e.id}">Mark reviewed</button>`}
        </div>
      </article>
    `).join("") : `<p class="empty">No events recorded in this demo.</p>`;

    document.getElementById("reviewCount").textContent = String(pending.length).padStart(2, "0");
    document.getElementById("verifiedCount").textContent =
      String(candidates.filter(c => c.status === "Verified").length).padStart(2, "0");
  }

  function renderAll() {
    document.getElementById("activeCount").textContent =
      String(candidates.length).padStart(2, "0");
    renderCandidates();
    renderEvents();
  }

  rows.addEventListener("click", event => {
    const button = event.target.closest("[data-candidate]");
    if (!button) return;

    const candidate = candidates.find(c => c.id === button.dataset.candidate);
    if (!candidate) return;

    alert(
      `Candidate: ${candidate.name}\n` +
      `ID: ${candidate.id}\n` +
      `Exam: ${candidate.exam}\n` +
      `Progress: ${candidate.progress}%\n` +
      `Status: ${candidate.status}\n\n` +
      `Demo preview only. No real webcam feed or AI analysis is connected.`
    );
  });

  eventList.addEventListener("click", event => {
    const button = event.target.closest("[data-event]");
    if (!button) return;

    const item = events.find(e => e.id === Number(button.dataset.event));
    if (!item) return;

    item.reviewed = true;
    renderEvents();
  });

  searchInput.addEventListener("input", renderCandidates);

  document.getElementById("refreshBtn").addEventListener("click", () => {
    renderAll();
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("examshieldAdminDemo");
    sessionStorage.removeItem("examshieldAdmin");
    window.location.href = "admin-login.html";
  });

  renderAll();
})();
