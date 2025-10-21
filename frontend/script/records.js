const routes = {
  '#/users': 'view-users',
  '#/plates': 'view-plates',
  '#/logs': 'view-logs',
  '#/admin': 'view-admin',
  '#/flagged': 'view-flagged',
  '#/help': 'view-help'
};

const SETTINGS_KEY = 'plate_scanner_admin_settings_v1';

const defaultSettings = {
  hideNotifications: false,
  autoRefresh: false,
  defaultView: '#/users'
};

function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : { ...defaultSettings };
  } catch (err) {
    console.error('Failed to parse settings', err);
    return { ...defaultSettings };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

const settings = loadSettings();

function showRoute(hash) {
  Object.values(routes).forEach(id => {
    document.getElementById(id).hidden = true;
  });
  document.getElementById(routes[hash] || 'view-users').hidden = false;
}

window.addEventListener('hashchange', () => showRoute(location.hash));
showRoute(location.hash || settings.defaultView);
if ((!location.hash || !routes[location.hash]) && settings.defaultView) {
  location.hash = settings.defaultView;
}

let platesData = [];
let pendingDeleteId = null; // Store ID of plate to delete

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'landing-page.html';
    }
  });
}

const totalUsersCountEl = document.getElementById('totalUsersCount');
const adminCountEl = document.getElementById('adminCount');
const flaggedCountEl = document.getElementById('flaggedCount');
const recordCountEl = document.getElementById('recordCount');
const flaggedRowsEl = document.getElementById('flaggedRows');
const flaggedTotalEl = document.getElementById('flaggedTotal');
const flaggedUpdatedEl = document.getElementById('flaggedUpdated');
const flaggedSearchInput = document.getElementById('flaggedSearch');
const exportFlaggedBtn = document.getElementById('exportFlagged');
const flaggedGoToAdmin = document.getElementById('flaggedGoToAdmin');
const helpFaqEl = document.getElementById('helpFaq');
const helpApiBaseEl = document.getElementById('helpApiBase');
const helpLastSyncEl = document.getElementById('helpLastSync');
const helpCurrentUserEl = document.getElementById('helpCurrentUser');
const helpActionButtons = document.querySelectorAll('[data-help-action]');

const helpFaqData = [
  {
    question: 'How do I add or update a plate?',
    answer: 'Open the Admin Panel, use the form on the right to add a plate, or click the edit button next to an existing entry to update it.'
  },
  {
    question: 'Why are my stats not updating?',
    answer: 'Stats refresh automatically on page load. Use the "Refresh dashboard data" quick action or enable auto-refresh from Settings if you want scheduled updates.'
  },
  {
    question: 'Who can access flagged reports?',
    answer: 'Any authenticated admin can review flagged plates. Use the Flagged Report tab to filter, export, or jump to the Admin panel for remediation.'
  }
];

function renderFaq() {
  if (!helpFaqEl) return;
  helpFaqEl.innerHTML = helpFaqData.map(({ question, answer }, idx) => `
    <article class="faq-item">
      <button type="button" aria-expanded="${idx === 0 ? 'true' : 'false'}">
        <span>${question}</span>
        <span>${idx === 0 ? '-' : '+'}</span>
      </button>
      <p ${idx === 0 ? '' : 'hidden'}>${answer}</p>
    </article>
  `).join('');
}

renderFaq();

if (helpApiBaseEl) helpApiBaseEl.textContent = API_CONFIG.BASE_URL || '--';

const savedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (err) {
    return null;
  }
})();

if (helpCurrentUserEl) {
  const label = savedUser?.email || savedUser?.name || 'Unknown user';
  helpCurrentUserEl.textContent = label;
}

if (helpActionButtons.length) {
  helpActionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.helpAction;
      if (action === 'refresh') {
        loadPlates();
      } else if (action === 'viewLogs') {
        location.hash = '#/logs';
      } else if (action === 'seed') {
        alert('Sample plates are seeded via scripts/seed-plates.js. Run `npm run seed` from the project root to refresh demo data.');
      }
    });
  });
}

if (helpFaqEl) {
  helpFaqEl.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const article = button.closest('.faq-item');
    const answer = article.querySelector('p');
    button.setAttribute('aria-expanded', (!expanded).toString());
  button.lastElementChild.textContent = expanded ? '+' : '-';
    if (expanded) {
      answer.setAttribute('hidden', '');
    } else {
      answer.removeAttribute('hidden');
    }
  });
}

function setCountValue(element, value, fallback = '0') {
  if (!element) return;
  if (typeof value === 'number' && Number.isFinite(value)) {
    element.textContent = value.toString();
  } else {
    element.textContent = fallback;
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/api/stats/overview`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();
    setCountValue(totalUsersCountEl, data.totalActiveUsers);
    setCountValue(adminCountEl, data.adminCount);
    setCountValue(flaggedCountEl, data.flaggedCount);
    setCountValue(recordCountEl, data.totalRegisteredPlates);
  } catch (err) {
    console.error('Error fetching stats:', err);
    setCountValue(totalUsersCountEl, null, '--');
    setCountValue(adminCountEl, null, '--');
    const flaggedLocal = platesData.filter(
      p => (p.status || '').toLowerCase() === 'flagged'
    ).length;
    setCountValue(flaggedCountEl, flaggedLocal, '0');
    setCountValue(recordCountEl, platesData.length, '0');
  }
}

async function loadPlates() {
  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/api/plates`);
    platesData = await res.json();
  renderPlates(platesData); // Render plates and update count
  platesSummary(platesData);
  const searchTerm = flaggedSearchInput?.value || '';
  renderFlagged(platesData, searchTerm);
    await loadStats();
    updateLastSync();
  } catch (err) {
    console.error("Error fetching plates:", err);
    document.getElementById('plateRow').innerHTML = "<p>Error loading plates</p>";
    document.querySelector('#recordCount').innerHTML = "0";
  renderFlagged([], flaggedSearchInput?.value || '');
    await loadStats();
  }
}

function renderPlates(data) {
  let platesHTML = '';

  data.forEach((plate) => {
    platesHTML += 
      `<div class="row">
          <div class="plate-number">${plate.plateNumber}</div>
          <div class="owner-info">
            <div>${plate.ownerInfo?.name || '-'}</div>
            <div>${plate.ownerInfo?.phoneNo || '-'}</div>
          </div>
          <div class="car-info">
            <div>${plate.carInfo?.model || '-'}</div>
            <div>${plate.carInfo?.color || '-'}</div>
            <div>${plate.carInfo?.category || '-'}</div>
            <div>${plate.carInfo?.expires?.slice(0, 10) || '-'}</div>
          </div>
          <div class="status">${plate.status}</div>
          <div class="reg-by">${plate.registeredBy}</div>
      </div>`;
  });

  document.getElementById('plateRow').innerHTML = platesHTML || "<p>No plates found</p>";
  document.querySelector('#recordCount').innerHTML = data.length; // Update count
}

function renderFlagged(source, query = '') {
  if (!flaggedRowsEl || !flaggedTotalEl || !flaggedUpdatedEl) return;
  const lower = query.trim().toLowerCase();
  const allFlagged = (source || []).filter((item) => (item.status || '').toLowerCase() === 'flagged');
  const flagged = allFlagged.filter(item => {
    if (!lower) return true;
    const owner = item.ownerInfo?.name || '';
    return item.plateNumber?.toLowerCase().includes(lower) || owner.toLowerCase().includes(lower);
  });

  flaggedTotalEl.textContent = allFlagged.length.toString();

  if (!flagged.length) {
    flaggedRowsEl.innerHTML = '<div class="flagged-empty">No flagged plates found.</div>';
    return;
  }

  flaggedRowsEl.innerHTML = flagged.map(item => {
  const expires = item.carInfo?.expires ? new Date(item.carInfo.expires).toLocaleDateString() : '--';
  const note = item.carInfo?.category ? `Category: ${item.carInfo.category}` : '--';
  const updated = item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '--';
  const model = item.carInfo?.model || '--';
  const color = item.carInfo?.color ? ` - ${item.carInfo.color}` : '';
    return `
      <div class="flagged-row">
  <div><strong>${item.plateNumber || '--'}</strong></div>
  <div>${item.ownerInfo?.name || '--'}<br><span class="muted-text">${item.ownerInfo?.phoneNo || ''}</span></div>
        <div>${model}${color}</div>
        <div>${note}<br><span class="muted-text">Expires: ${expires}</span></div>
        <div>${updated}</div>
      </div>
    `;
  }).join('');
}

function exportFlaggedCsv() {
  const flagged = platesData.filter(item => (item.status || '').toLowerCase() === 'flagged');
  if (!flagged.length) {
    alert('No flagged plates to export');
    return;
  }
  const header = ['plateNumber', 'ownerName', 'ownerPhone', 'model', 'color', 'category', 'expires', 'updatedAt'];
  const rows = flagged.map(item => [
    item.plateNumber || '',
    item.ownerInfo?.name || '',
    item.ownerInfo?.phoneNo || '',
    item.carInfo?.model || '',
    item.carInfo?.color || '',
    item.carInfo?.category || '',
    item.carInfo?.expires || '',
    item.updatedAt || ''
  ]);
  const data = [header, ...rows]
    .map(cols => cols.map(col => `"${String(col ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'flagged-plates.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

if (flaggedSearchInput) {
  flaggedSearchInput.addEventListener('input', (event) => {
    renderFlagged(platesData, event.target.value || '');
  });
}

if (exportFlaggedBtn) {
  exportFlaggedBtn.addEventListener('click', exportFlaggedCsv);
}

if (flaggedGoToAdmin) {
  flaggedGoToAdmin.addEventListener('click', () => {
    location.hash = '#/admin';
  });
}

function searchPlates(query) {
  query = query.toLowerCase().trim();

  if (query === "") {
    renderPlates(platesData);
    return;
  }

  const matches = platesData.filter(
    (p) =>
      p.plateNumber.toLowerCase().includes(query) ||
      p.ownerInfo.name.toLowerCase().includes(query)
  );
  renderPlates(matches);
}

document.getElementById("plateSearch").addEventListener("keyup", (e) => {
  searchPlates(e.target.value);
});

loadPlates();

function platesSummary(data) {
  if (!data.length) {
    document.getElementById("panelGrid").innerHTML = "<p>No matching records</p>";
    return;
  }

  let platesHTML = data.map(plate => `
    <div class="panel-grid">
      <div>
        <input type="checkbox">
      </div>
      <div>${plate.plateNumber}</div>
      <div>${plate.ownerInfo?.name || '-'}</div>
      <div class="status">${plate.status}</div>
      <div class="reg-by">${plate.registeredBy}</div>
      <div class="edit-delete-btn">
        <button class="edit-btn" data-id="${plate._id}">
          <img src="images/icons/edit-icon.png">
        </button>
        <button class="delete-btn" data-id="${plate._id}">
          <img src="images/icons/delete-icon.png">
        </button>
      </div>
    </div>
  `).join("");

  document.getElementById("panelGrid").innerHTML = platesHTML;
  document.querySelector('#recordCount').innerHTML = data.length; // Update count in admin panel
}

// Page B - Filter/Search
document.getElementById("filterForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(e.target);
  const query = fd.get("query") || "";
  const status = fd.get("status") || "";
  const admin = fd.get("registeredBy") || "";

  try {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (status) params.append("status", status);
    if (admin) params.append("registeredBy", admin);

    const res = await fetch(`${API_CONFIG.BASE_URL}/api/plates?${params.toString()}`);
    const results = await res.json();

    platesSummary(results); // Render filtered results and update count
    await loadStats();
  } catch (err) {
    console.error("Error fetching filtered plates:", err);
    document.getElementById("panelGrid").innerHTML = "<p>Error loading plates</p>";
    document.querySelector('#recordCount').innerHTML = "0";
    await loadStats();
  }
});

document.getElementById("resetBtn").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("filterForm").reset();
  document.getElementById("panelGrid").innerHTML = "";
  document.querySelector('#recordCount').innerHTML = "0"; // Reset count
  loadStats();
});

async function addPlate(newPlate) {
  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/api/plates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPlate),
    });
    if (!res.ok) throw new Error("Failed to add plate");
    const saved = await res.json();
    await loadPlates();
    return saved;
  } catch (err) {
    console.error("Error adding plate:", err);
    throw err;
  }
}

let editId = null;
const addPlateH2 = document.querySelector("#view-admin > div:last-of-type > h2");

document.addEventListener("click", async (e) => {
  if (e.target.closest(".edit-btn")) {
    const id = e.target.closest(".edit-btn").dataset.id;
    const plate = platesData.find(p => p._id === id);

    if (!plate) return;

    document.getElementById("plateNumber").value = plate.plateNumber || "";
    document.getElementById("ownerName").value = plate.ownerInfo?.name || "";
    document.getElementById("ownerPhoneNo").value = plate.ownerInfo?.phoneNo || "";
    document.getElementById("carModel").value = plate.carInfo?.model || "";
    document.getElementById("carColor").value = plate.carInfo?.color || "";
    document.getElementById("carCategory").value = plate.carInfo?.category || "Private";
    document.getElementById("expires").value = plate.carInfo?.expires?.slice(0, 10) || "";
    document.getElementById("status").value = plate.status || "Valid";
    document.getElementById("registeredBy").value = plate.registeredBy || "";

    editId = id;
    document.getElementById("submitBtn").textContent = "Update Plate";
    document.getElementById("cancelBtn").style.display = "inline-block";
    addPlateH2.textContent = "Edit Plate";
  } else if (e.target.closest(".delete-btn")) {
    pendingDeleteId = e.target.closest(".delete-btn").dataset.id;
    document.getElementById("deleteConfirmPopup").style.display = "block";
  }
});

// Handle delete confirmation
document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
  if (pendingDeleteId) {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/api/plates/${pendingDeleteId}`, { method: "DELETE" });
      await loadPlates();
  platesSummary(platesData);
  document.querySelector('#recordCount').innerHTML = platesData.length; // Update count
      showPopup("Plate deleted successfully ✅");
    } catch (err) {
      console.error("Error deleting plate:", err);
      showPopup("Error deleting plate ❌");
    }
    pendingDeleteId = null;
    document.getElementById("deleteConfirmPopup").style.display = "none";
  }
});

document.getElementById("cancelDeleteBtn").addEventListener("click", () => {
  pendingDeleteId = null;
  document.getElementById("deleteConfirmPopup").style.display = "none";
});

document.getElementById("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(e.target);
  
  const newPlate = {
    plateNumber: fd.get("plateNumber"),
    ownerInfo: {
      name: fd.get("ownerName"),
      phoneNo: fd.get("ownerPhoneNo")
    },
    carInfo: {
      model: fd.get("carModel"),
      color: fd.get("carColor"),
      category: fd.get("carCategory"),
      expires: fd.get("expires"),
    },
    status: fd.get("status"),
    registeredBy: fd.get("registeredBy"),
  };

  if (editId) {
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/plates/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlate),
      });
      if (!res.ok) throw new Error("Failed to update plate");
      await res.json();
      await loadPlates();
      platesSummary(platesData);
      document.querySelector('#recordCount').innerHTML = platesData.length; // Update count
      resetForm();
      showPopup("Plate updated successfully ✅");
    } catch (err) {
      console.error("Error updating plate:", err);
      showPopup("Error updating plate ❌");
    }
  } else {
    try {
      await addPlate(newPlate);
      platesSummary(platesData);
      document.querySelector('#recordCount').innerHTML = platesData.length; // Update count
      resetForm();
      showPopup("Plate added successfully ✅");
    } catch (err) {
      showPopup("Error adding plate ❌");
    }
  }
});

function showPopup(message) {
  const popup = document.getElementById("popupMessage");
  popup.textContent = message;
  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}

document.getElementById("cancelBtn").addEventListener("click", resetForm);

function resetForm() {
  document.getElementById("addForm").reset();
  editId = null;
  document.getElementById("submitBtn").textContent = "Add Plate";
  document.getElementById("cancelBtn").style.display = "none";
  addPlateH2.textContent = "Add New Plate";
}

const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const settingsForm = document.getElementById('settingsForm');
const resetSettingsBtn = document.getElementById('resetSettings');
const hideNotificationsToggle = document.getElementById('hideNotifications');
const autoRefreshToggle = document.getElementById('autoRefresh');
const defaultViewSelect = document.getElementById('defaultView');
const notificationBadge = document.querySelector('.notification-count');

function applyNotificationPref(pref) {
  if (!notificationBadge) return;
  notificationBadge.style.display = pref ? 'none' : '';
}

applyNotificationPref(settings.hideNotifications);

if (hideNotificationsToggle) hideNotificationsToggle.checked = settings.hideNotifications;
if (autoRefreshToggle) autoRefreshToggle.checked = settings.autoRefresh;
if (defaultViewSelect) defaultViewSelect.value = settings.defaultView;

function openSettings() {
  if (settingsPanel) settingsPanel.hidden = false;
}

function closeSettingsPanel() {
  if (settingsPanel) settingsPanel.hidden = true;
}

if (settingsBtn) {
  settingsBtn.addEventListener('click', openSettings);
  settingsBtn.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openSettings();
    }
  });
}

if (closeSettings) closeSettings.addEventListener('click', closeSettingsPanel);

if (settingsPanel) {
  settingsPanel.addEventListener('click', (event) => {
    if (event.target === settingsPanel) closeSettingsPanel();
  });
}

if (settingsForm) {
  settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const updated = {
      hideNotifications: Boolean(hideNotificationsToggle?.checked),
      autoRefresh: Boolean(autoRefreshToggle?.checked),
      defaultView: defaultViewSelect?.value || '#/users'
    };
    saveSettings(updated);
    applyNotificationPref(updated.hideNotifications);
    closeSettingsPanel();
    if (updated.defaultView) {
      location.hash = updated.defaultView;
    }
    if (updated.autoRefresh !== settings.autoRefresh) {
      toggleAutoRefresh(updated.autoRefresh);
    }
    Object.assign(settings, updated);
  });
}

if (resetSettingsBtn) {
  resetSettingsBtn.addEventListener('click', (event) => {
    event.preventDefault();
    hideNotificationsToggle.checked = defaultSettings.hideNotifications;
    autoRefreshToggle.checked = defaultSettings.autoRefresh;
    defaultViewSelect.value = defaultSettings.defaultView;
  });
}

let refreshTimer = null;

function toggleAutoRefresh(enable) {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (enable) {
    refreshTimer = setInterval(() => {
      loadPlates();
    }, 60000);
  }
}

toggleAutoRefresh(settings.autoRefresh);

function updateLastSync() {
  if (helpLastSyncEl) {
    helpLastSyncEl.textContent = new Date().toLocaleString();
  }
  if (flaggedUpdatedEl) {
    flaggedUpdatedEl.textContent = new Date().toLocaleString();
  }
}