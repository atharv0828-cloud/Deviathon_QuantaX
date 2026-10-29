// Reports page client-side behavior.
(() => {
  if (sessionStorage.getItem("examshieldAdminDemo") !== "true") {
    window.location.href = "admin-login.html";
    return;
  }

  // Illustrative data until real exam submissions are connected.
  const demoResults = [
    { name: "Aarav Sharma", id: "ES-1001", exam: "JavaScript Fundamentals", score: 86, duration: "12 min", events: 0, status: "Completed" },
    { name: "Diya Verma", id: "ES-1002", exam: "JavaScript Fundamentals", score: 72, duration: "14 min", events: 2, status: "Flagged" },
    { name: "Kabir Singh", id: "ES-1003", exam: "Python Basics", score: 91, duration: "10 min", events: 0, status: "Completed" },
    { name: "Ananya Gupta", id: "ES-1004", exam: "Python Basics", score: 55, duration: "15 min", events: 1, status: "Flagged" }
  ];

  const rows = document.getElementById("resultsRows");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");

  function getFilteredResults() {
    const term = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;

    return demoResults.filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) ||
        item.exam.toLowerCase().includes(term);

      const matchesStatus = status === "all" || item.status === status;
      return matchesSearch && matchesStatus;
    });
  }

  function render() {
    const filtered = getFilteredResults();

    rows.innerHTML = filtered.length ? filtered.map(item => {
      const scoreClass = item.score >= 80 ? "score-high" :
        item.score >= 60 ? "score-mid" : "score-low";

      const statusClass = item.status === "Completed" ? "ok" : "review";

      return `
        <tr>
          <td>
            <strong>${item.name}</strong>
            <span class="candidate-id">${item.id}</span>
          </td>
          <td>${item.exam}</td>
          <td><span class="score ${scoreClass}">${item.score}%</span></td>
          <td>${item.duration}</td>
          <td>${item.events}</td>
          <td><span class="status ${statusClass}">${item.status}</span></td>
        </tr>
      `;
    }).join("") : `
      <tr><td colspan="6" class="empty">No matching records found.</td></tr>
    `;

    const total = filtered.length;
    const average = total
      ? Math.round(filtered.reduce((sum, item) => sum + item.score, 0) / total)
      : 0;
    const flagged = filtered.filter(item => item.status === "Flagged").length;
    const passed = filtered.filter(item => item.score >= 60).length;

    document.getElementById("totalCount").textContent = String(total).padStart(2, "0");
    document.getElementById("averageScore").textContent = average + "%";
    document.getElementById("flaggedCount").textContent = String(flagged).padStart(2, "0");

    document.getElementById("summary").innerHTML = `
      <div class="summary-item">
        <span>Displayed candidates</span>
        <strong>${total}</strong>
      </div>
      <div class="summary-item">
        <span>Scored at least 60%</span>
        <strong>${passed}</strong>
      </div>
      <div class="summary-item">
        <span>Pending manual review</span>
        <strong>${flagged}</strong>
      </div>
    `;
  }

  function csvCell(value) {
    return '"' + String(value).replace(/"/g, '""') + '"';
  }

  document.getElementById("exportBtn").addEventListener("click", () => {
    const filtered = getFilteredResults();

    if (!filtered.length) {
      alert("No results available to export.");
      return;
    }

    const headers = [
      "Candidate", "Candidate ID", "Exam",
      "Score Percent", "Duration", "Security Events", "Status"
    ];

    const lines = [
      headers,
      ...filtered.map(item => [
        item.name, item.id, item.exam,
        item.score, item.duration, item.events, item.status
      ])
    ];

    const csv = "\uFEFF" + lines
      .map(row => row.map(csvCell).join(","))
      .join("\r\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "examshield-demo-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  });

  searchInput.addEventListener("input", render);
  statusFilter.addEventListener("change", render);

  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("examshieldAdminDemo");
    sessionStorage.removeItem("examshieldAdmin");
    window.location.href = "admin-login.html";
  });

  render();
})();
