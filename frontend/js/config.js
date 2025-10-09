const API_CONFIG = {
  BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:5000'
    : 'https://plate-scanner-api.onrender.com'
};

window.API_CONFIG = API_CONFIG;