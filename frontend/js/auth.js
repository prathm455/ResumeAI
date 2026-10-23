// frontend/js/auth.js
// -------------------------------------------------------
// Form validation and authentication handlers
// -------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Password Visibility Toggle
  const toggleButtons = document.querySelectorAll('.toggle-password');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
      } else {
        input.type = 'password';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });
  });

  // Password Strength Checker (for registration)
  const regPassword = document.getElementById('reg-password');
  const strengthContainer = document.querySelector('.password-strength');
  const strengthFill = document.querySelector('.strength-fill');
  const strengthText = document.querySelector('.strength-text');

  if (regPassword && strengthContainer && strengthFill && strengthText) {
    regPassword.addEventListener('input', () => {
      const val = regPassword.value;
      if (!val) {
        strengthContainer.style.display = 'none';
        return;
      }
      strengthContainer.style.display = 'flex';
      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      if (score <= 1) {
        strengthFill.style.width = '25%';
        strengthFill.style.backgroundColor = '#DC2626';
        strengthText.textContent = 'Weak (Needs 8+ chars, numbers, symbols)';
      } else if (score === 2) {
        strengthFill.style.width = '50%';
        strengthFill.style.backgroundColor = '#D97706';
        strengthText.textContent = 'Fair';
      } else if (score === 3) {
        strengthFill.style.width = '75%';
        strengthFill.style.backgroundColor = '#0D9488';
        strengthText.textContent = 'Good';
      } else {
        strengthFill.style.width = '100%';
        strengthFill.style.backgroundColor = '#16A34A';
        strengthText.textContent = 'Strong password!';
      }
    });
  }

  // Handle Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('login-btn');
      const spinner = submitBtn.querySelector('.spinner');
      const btnText = submitBtn.querySelector('.btn-text');

      if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
      }

      try {
        submitBtn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
        if (btnText) btnText.style.opacity = '0.5';

        const result = await API.login(email, password);

        if (result.success) {
          showToast('Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/pages/dashboard.html';
          }, 800);
        } else {
          showToast(result.message || 'Invalid email or password.', 'error');
          submitBtn.disabled = false;
          if (spinner) spinner.style.display = 'none';
          if (btnText) btnText.style.opacity = '1';
        }
      } catch (err) {
        console.error('Login error:', err);
        showToast('Connection error. Is the server running?', 'error');
        submitBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (btnText) btnText.style.opacity = '1';
      }
    });
  }

  // Handle Registration Form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm').value;
      const submitBtn = document.getElementById('reg-btn');
      const spinner = submitBtn.querySelector('.spinner');
      const btnText = submitBtn.querySelector('.btn-text');

      if (!fullName || !email || !password) {
        showToast('All fields are required.', 'error');
        return;
      }

      if (fullName.length < 2) {
        showToast('Full name must be at least 2 characters.', 'error');
        return;
      }

      if (password.length < 8) {
        showToast('Password must be at least 8 characters.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
      }

      try {
        submitBtn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
        if (btnText) btnText.style.opacity = '0.5';

        const result = await API.register(fullName, email, password);

        if (result.success) {
          showToast('Account created successfully! Welcome aboard.', 'success');
          setTimeout(() => {
            window.location.href = '/pages/dashboard.html';
          }, 900);
        } else {
          showToast(result.message || 'Registration failed.', 'error');
          submitBtn.disabled = false;
          if (spinner) spinner.style.display = 'none';
          if (btnText) btnText.style.opacity = '1';
        }
      } catch (err) {
        console.error('Register error:', err);
        showToast('Connection error. Please try again.', 'error');
        submitBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (btnText) btnText.style.opacity = '1';
      }
    });
  }
});
