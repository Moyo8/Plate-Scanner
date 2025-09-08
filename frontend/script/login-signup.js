let isRegistration = false;

  const regBtn = document.querySelector('.reg-btn');
  const signupDetail = document.querySelectorAll('.signupDet');
  const registerBtn = document.querySelector('.reg-btn');

  const authentication = document.getElementById('authentication')


  regBtn.addEventListener('click', () => {
    isRegistration = !isRegistration

    registerBtn.innerText = isRegistration ? 'Sign in' : 'Sign up'
    document.querySelector('.auth > div h2').innerText = isRegistration ? 'Sign Up' : 'Login'
    document.querySelector('.info').innerText = isRegistration ? 'Create a new account!' : 'Login to your account!'
    document.querySelector('.signup-content p').innerText = isRegistration ? 'Already have an account?' : 'Don\'t have an account?'
    document.querySelector('.signup-content button').innerText = isRegistration ? 'Sign in' : 'Sign up'

    signupDetail.forEach(input => {
      input.style.display = isRegistration ? "block" : "none";
    });
  })


  authentication.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("inputEmail").value.trim();
    const password = document.getElementById("inputPassword").value.trim();
    const confirm = document.getElementById("confirmPassword").value.trim();
    const error = document.getElementById("loginError");
    
    if (!validateEmail(email)) {
      error.textContent = "Invalid emailformat.";
    } else if (password.length < 6) {
      error.textContent = "Password must be at least 6 characters.";
    } else if (password !== confirm) {
      error.textContent = "Passwords do not match.";
    } else {
      error.textContent = "";
      alert("Signup successful");
      authentication.reset();
    }
  });
  
  function validateEmail(email) {
  return /\S+@\s+\.\S+/.test(email);
  }