let isRegistration = false;
const API_BASE = window.API_CONFIG?.BASE_URL || 'http://localhost:5000';

const regBtn = document.querySelector('.reg-btn');
const signupInputs = document.querySelectorAll('input.signupDet');
const signupLabels = document.querySelectorAll('label.signupDet');
const authentication = document.getElementById('authForm');

regBtn.addEventListener('click', () => {
  isRegistration = !isRegistration;

  regBtn.innerText = isRegistration ? 'Sign in' : 'Sign up';
  document.querySelector('.auth > form h2').innerText = isRegistration ? 'Sign Up' : 'Login';
  document.querySelector('.info').innerText = isRegistration ? 'Create a new account!' : 'Login to your account!';
  document.querySelector('.signup-content p').innerText = isRegistration ? 'Already have an account?' : 'Don\'t have an account?';
  document.querySelector('.signup-content button').innerText = isRegistration ? 'Sign in' : 'Sign up';

  // show/hide label elements
  signupLabels.forEach(lbl => {
    lbl.style.display = isRegistration ? 'block' : 'none';
  });

  // show/hide and enable/disable input elements to avoid "invalid form control" when hidden
  signupInputs.forEach(input => {
    input.style.display = isRegistration ? 'block' : 'none';
    input.required = isRegistration;
    input.disabled = !isRegistration;
  });
});

authentication.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = isRegistration ? document.getElementById('inputUsername').value.trim() : '';
  const email = document.getElementById('inputEmail').value.trim();
  const password = document.getElementById('inputPassword').value.trim();
  const confirm = isRegistration ? document.getElementById('confirmPassword').value.trim() : '';
  const error = document.getElementById('loginError');

  // Validation
  if (isRegistration && !username) {
    error.textContent = 'Username is required.';
    return;
  } else if (!validateEmail(email)) {
    error.textContent = 'Invalid email format.';
    return;
  } else if (password.length < 6) {
    error.textContent = 'Password must be at least 6 characters.';
    return;
  } else if (isRegistration && password !== confirm) {
    error.textContent = 'Passwords do not match.';
    return;
  }

  error.textContent = '';
  
  const url = isRegistration ? `${API_BASE}/api/auth/signup` : `${API_BASE}/api/auth/login`;
  const body = isRegistration ? { name: username, email, password } : { email, password };

  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include', // CRITICAL for cookies
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    let data;
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await res.json();
      } else {
        data = { error: await res.text() };
      }
    } catch (e) {
      data = { error: 'Failed to parse response' };
    }

    if (!res.ok) {
      console.error('Auth error', res.status, data);
      error.textContent = data.error || `HTTP ${res.status}`;
      return;
    }

    // Handle signup
    if (isRegistration) {
      if (data.exists) {
        error.textContent = 'An account with that email already exists.';
        return;
      } else if (data.emailError) {
        error.textContent = 'Account created but verification email failed to send. Contact support.';
        return;
      } else {
        // Successful signup
        error.style.color = 'green';
        error.textContent = 'Account created successfully! Switching to login...';
        authentication.reset();
        // Switch to login mode after a brief delay
        setTimeout(() => {
          regBtn.click();
          error.textContent = 'Please login with your new account.';
        }, 1500);
        return;
      }
    }

    // Handle login - check for token
    if (!data.token) {
      error.textContent = 'Login failed: No token received';
      return;
    }

    // Store token
    localStorage.setItem('token', data.token);

    // Determine redirect
    let destination = data.redirect;
    if (!destination) {
      const toDashboard = /@dev\.ng$/i.test(email);
      destination = toDashboard ? 'dashboard.html' : 'index.html';
    } else {
      destination = destination.replace(/^\//, '');
    }

    // Success message before redirect
    error.style.color = 'green';
    error.textContent = 'Login successful! Redirecting...';

    // Small delay to show message, then redirect
    setTimeout(() => {
      window.location.href = destination;
    }, 500);

  } catch (err) {
    console.error('Network error', err);
    error.textContent = 'Network error: ' + (err.message || err);
  }
});

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}