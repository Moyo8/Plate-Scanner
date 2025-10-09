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

  signupLabels.forEach(lbl => {
    lbl.style.display = isRegistration ? 'block' : 'none';
  });

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

  // Clear previous errors
  error.textContent = '';

  // Validation
  if (isRegistration && !username) {
    error.textContent = 'Username is required.';
    return;
  }
  
  if (!validateEmail(email)) {
    error.textContent = 'Invalid email format.';
    return;
  }
  
  if (password.length < 6) {
    error.textContent = 'Password must be at least 6 characters.';
    return;
  }
  
  if (isRegistration && password !== confirm) {
    error.textContent = 'Passwords do not match.';
    return;
  }

  // Prepare request
  const url = isRegistration ? `${API_BASE}/api/auth/signup` : `${API_BASE}/api/auth/login`;
  const body = isRegistration ? { name: username, email, password } : { email, password };

  console.log('Attempting auth:', { url, isRegistration, email });

  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    let data;
    try {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: text || `HTTP ${res.status}` };
      }
    } catch (parseErr) {
      console.error('Failed to parse response:', parseErr);
      data = { error: 'Failed to parse server response' };
    }

    console.log('Auth response:', { status: res.status, data });

    if (!res.ok) {
      error.textContent = data.error || data.message || `Error: ${res.status}`;
      return;
    }

    // Store token if provided
    if (data.token) {
      localStorage.setItem('token', data.token);
      console.log('Token stored');
    }

    // Store user info
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('User info stored:', data.user);
    }

    // Handle signup success
    if (isRegistration) {
      if (data.exists) {
        error.textContent = 'An account with that email already exists.';
        return;
      }
      if (data.emailError) {
        error.textContent = 'Account created but verification email failed. You can still log in.';
      }
    }

    // Determine redirect destination
    let destination = data.redirect;
    if (!destination) {
      // Check if admin email
      const isAdmin = /@dev\.ng$/i.test(email);
      destination = isAdmin ? 'dashboard.html' : 'index.html';
    } else {
      // Remove leading slash if present
      destination = destination.replace(/^\//, '');
    }

    console.log('Redirecting to:', destination);

    // Clear form and redirect
    authentication.reset();
    
    // Use setTimeout to ensure storage completes before redirect
    setTimeout(() => {
      window.location.href = destination;
    }, 100);

  } catch (err) {
    console.error('Network error:', err);
    error.textContent = 'Network error: Unable to connect to server. Please check your connection.';
  }
});

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}