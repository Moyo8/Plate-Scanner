(function(){
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const email = params.get('email');
  const emailInput = document.getElementById('email');
  const tokenInput = document.getElementById('token');
  const form = document.getElementById('resetForm');
  const error = document.getElementById('resetError');

  if (!token || !email) {
    document.getElementById('msg').textContent = 'Invalid or missing reset link.';
    form.style.display = 'none';
  } else {
    emailInput.value = email;
    tokenInput.value = token;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.textContent = '';
    const password = document.getElementById('newPassword').value.trim();
    if (password.length < 6) {
      error.textContent = 'Password must be at least 6 characters.';
      return;
    }

    try {
      const res = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:5000'}/api/auth/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password })
      });
      const data = await res.json();
      if (!res.ok) {
        error.textContent = data.error || 'Reset failed';
        return;
      }
      document.getElementById('msg').textContent = 'Password reset successful. You may now login.';
      form.style.display = 'none';
    } catch (err) {
      console.error('Reset network error', err);
      error.textContent = 'Network error: ' + (err.message || err);
    }
  });
})();