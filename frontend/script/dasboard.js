const routes = {
    '#/users': 'view-users',
    '#/plates': 'view-plates',
    '#/logs': 'view-logs',
    '#/admin': 'view-admin',
    '#/flagged': 'view-flagged'
  };

  function showRoute(hash) {
    Object.values(routes).forEach( id => {
    document.getElementById(id).hidden = true;
  });
    document.getElementById(routes[hash] || 'view-users').hidden = false;
  }


  window.addEventListener('hashchange', () => showRoute(location.hash));
  showRoute(location.hash || '#/users');

  async function loadPlates() {
    try {
      const res = await fetch("http://localhost:5000/api/plates");
      const plates = await res.json();

      console.log("✅ Plates from backend:", plates); // <--- debug

    let platesHTML = '';

    plates.forEach((plate) => {
      platesHTML += 
          `<div class="row">
              <div class="plate-number">${plate.plateNumber}</div>
              <div class="owner-info">
                <div>${plate.ownerInfo.name}</div>
                <div>${plate.ownerInfo.phoneNo}</div>
              </div>
              <div class="car-info">
                <div>${plate.carInfo.model}</div>
                <div>${plate.carInfo.color}</div>
                <div>${plate.carInfo.category}</div>
                <div>${plate.carInfo.expires}</div>
              </div>
              <div class="status">${plate.status}</div>
              <div class="reg-by">${plate.registeredBy}</div>
          </div>
          `;
    })

    document.getElementById('plateRow').innerHTML = platesHTML;

    // For the count of the record panel in the dashboard.
    document.querySelector('#recordCount').innerHTML = plates.length;

    } catch (err) {
      console.error("Error fetching plates:", err);
  }
}

loadPlates();