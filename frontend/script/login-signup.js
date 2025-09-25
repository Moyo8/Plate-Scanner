let isRegistration = false;

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

authentication.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = isRegistration ? document.getElementById('inputUsername').value.trim() : '';
  const email = document.getElementById('inputEmail').value.trim();
  const password = document.getElementById('inputPassword').value.trim();
  const confirm = isRegistration ? document.getElementById('confirmPassword').value.trim() : '';
  const error = document.getElementById('loginError');

  if (isRegistration && !username) {
    error.textContent = 'Username is required.';
  } else if (!validateEmail(email)) {
    error.textContent = 'Invalid email format.';
  } else if (password.length < 6) {
    error.textContent = 'Password must be at least 6 characters.';
  } else if (isRegistration && password !== confirm) {
    error.textContent = 'Passwords do not match.';
  } else {
    error.textContent = '';
    // send request to backend
  const url = isRegistration ? 'http://localhost:5000/api/auth/signup' : 'http://localhost:5000/api/auth/login';
    const body = isRegistration ? { name: username, email, password } : { email, password };
    fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(async res => {
      let data;
      try {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) data = await res.json();
        else data = { error: await res.text() };
      } catch (e) {
        data = { error: 'Failed to parse response' };
      }

      if (!res.ok) {
        console.error('Auth error', res.status, data);
        error.textContent = data.error || `HTTP ${res.status}`;
        return;
      }
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Prefer server-provided redirect; otherwise decide by email domain.
      // Use relative paths (no leading slash) so the browser uses the current origin.
      let destination = data.redirect;
      if (!destination) {
        const toDashboard = /@dev\.ng$/i.test(email);
        destination = toDashboard ? 'dashboard.html' : 'index.html';
      } else {
        // Normalize server redirect: strip leading slash so it's relative
        destination = destination.replace(/^\//, '');
      }

      // handle signup responses
      if (isRegistration) {
        if (data.exists) {
          error.textContent = 'An account with that email already exists.';
        } else if (data.emailError) {
          error.textContent = 'Account created but verification email failed to send. Contact support.';
        } else {
          // successful signup — redirect
          window.location.href = destination;
        }
      } else {
  // login — redirect
  window.location.href = destination;
      }
      authentication.reset();
    }).catch(err => {
      console.error('Network error', err);
      error.textContent = 'Network error: ' + (err.message || err);
    });
  }
});

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}