const routes = {
  '#/users': 'view-users',
  '#/plates': 'view-plates',
  '#/logs': 'view-logs',
  '#/admin': 'view-admin',
  '#/flagged': 'view-flagged'
};

function showRoute(hash) {
  Object.values(routes).forEach(id => {
    document.getElementById(id).hidden = true;
  });
  document.getElementById(routes[hash] || 'view-users').hidden = false;
}

window.addEventListener('hashchange', () => showRoute(location.hash));
showRoute(location.hash || '#/users');

let platesData = [];
let pendingDeleteId = null; // Store ID of plate to delete

async function loadPlates() {
  try {
  const res = await fetch('http://localhost:5000/api/plates');
    platesData = await res.json();
    renderPlates(platesData); // Render plates and update count
  } catch (err) {
    console.error("Error fetching plates:", err);
    document.getElementById('plateRow').innerHTML = "<p>Error loading plates</p>";
    document.querySelector('#recordCount').innerHTML = "0";
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

  const res = await fetch(`http://localhost:5000/api/plates?${params.toString()}`);
    const results = await res.json();

    platesSummary(results); // Render filtered results and update count
  } catch (err) {
    console.error("Error fetching filtered plates:", err);
    document.getElementById("panelGrid").innerHTML = "<p>Error loading plates</p>";
    document.querySelector('#recordCount').innerHTML = "0";
  }
});

document.getElementById("resetBtn").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("filterForm").reset();
  document.getElementById("panelGrid").innerHTML = "";
  document.querySelector('#recordCount').innerHTML = "0"; // Reset count
});

async function addPlate(newPlate) {
  try {
  const res = await fetch('http://localhost:5000/api/plates', {
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
  await fetch(`http://localhost:5000/api/plates/${pendingDeleteId}`, { method: "DELETE" });
      await loadPlates();
      document.getElementById("panelGrid").innerHTML = ""; // Clear grid after delete
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
  const res = await fetch(`http://localhost:5000/api/plates/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlate),
      });
      if (!res.ok) throw new Error("Failed to update plate");
      await res.json();
      await loadPlates();
      document.getElementById("panelGrid").innerHTML = "";
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
      document.getElementById("panelGrid").innerHTML = "";
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