document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgotForm');
  const msgEl = document.getElementById('forgotMsg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgEl.textContent = '';
    const email = document.getElementById('email').value.trim();
    if (!email) {
      msgEl.textContent = 'Email required';
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        msgEl.textContent = data.error || 'Request failed';
        return;
      }

      msgEl.style.color = 'green';
      if (data.resetLink) {
        // In dev, show the reset link for convenience
        msgEl.innerHTML = 'Reset link (dev): <a href="' + data.resetLink + '">' + data.resetLink + '</a>';
      } else {
        msgEl.textContent = data.message || 'If an account exists, a reset email was sent.';
      }
    } catch (err) {
      console.error('Forgot network error', err);
      msgEl.textContent = 'Network error';
    }
  });
});