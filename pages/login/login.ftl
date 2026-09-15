<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Puffbase Registration</title>
  <link rel="stylesheet" href="style.css" />
  <!-- Font Awesome for form field icons -->
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
  />
</head>
<body>
  <div class="card-container">
    <!-- Header with Logo & Title -->
    <div class="card-header">
      <div class="logo">
        <img src="logo.png" alt="Puffbase Logo" />
      </div>
      <h2>Create Your Puffbase Account</h2>
      <p class="subtitle">Join the ecosystem and build the future.</p>
    </div>

    <!-- Registration Form -->
    <form class="register-form">
      <!-- Full Name -->
      <div class="input-group">
        <i class="fa-solid fa-user icon"></i>
        <input type="text" placeholder="FULL NAME" required />
      </div>

      <!-- Username -->
      <div class="input-group">
        <i class="fa-solid fa-at icon"></i>
        <input type="text" placeholder="USERNAME" required />
      </div>

      <!-- Email Address -->
      <div class="input-group">
        <i class="fa-solid fa-envelope icon"></i>
        <input type="email" placeholder="EMAIL ADDRESS" required />
      </div>

      <!-- Password -->
      <div class="input-group">
        <i class="fa-solid fa-lock icon"></i>
        <input type="password" placeholder="PASSWORD" required />
        <i class="fa-solid fa-eye-slash toggle-password"></i>
      </div>

      <!-- Confirm Password -->
      <div class="input-group">
        <i class="fa-solid fa-lock icon"></i>
        <input type="password" placeholder="CONFIRM PASSWORD" required />
      </div>

      <!-- Terms Checkbox -->
      <div class="terms-group">
        <input type="checkbox" id="terms" required />
        <label for="terms">
          I agree to the <a href="#">Terms of Service</a> & <a href="#">Privacy Policy</a>
        </label>
      </div>

      <!-- Submit Button -->
      <button type="submit" class="btn-submit">
        <span>START YOUR JOURNEY</span>
        <i class="fa-solid fa-arrow-right"></i>
      </button>
    </form>

    <!-- Footer Link -->
    <div class="card-footer">
      <span>Already have an account?</span>
      <a href="#">Log In</a>
    </div>
  </div>
</body>
</html>

/* Base Reset */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

body {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #0b0712;
}

/* Outer Card Container */
.card-container {
  width: 100%;
  max-width: 440px;
  background: rgba(18, 10, 28, 0.9);
  border: 2px solid #a855f7;
  border-radius: 12px;
  padding: 30px 25px;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.4), inset 0 0 15px rgba(168, 85, 247, 0.2);
  color: #ffffff;
  text-align: center;
}

/* Header */
.card-header .logo img {
  width: 180px;
  height: auto;
  margin-bottom: 12px;
}

.card-header h2 {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.card-header .subtitle {
  font-size: 0.82rem;
  color: #a3a3a3;
  margin-bottom: 22px;
}

/* Form Styling */
.register-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Input Fields with Custom Angled Cut Corners */
.input-group {
  position: relative;
  display: flex;
  align-items: center;
  background: #190f28;
  border: 1px solid #7e22ce;
  /* Angled cut top-right & bottom-left */
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  padding: 0 14px;
}

.input-group .icon {
  color: #a855f7;
  font-size: 0.95rem;
  margin-right: 12px;
}

.input-group input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  padding: 12px 0;
  font-size: 0.8rem;
  letter-spacing: 0.5px;
}

.input-group input::placeholder {
  color: #71717a;
  font-weight: 600;
}

.input-group .toggle-password {
  color: #71717a;
  cursor: pointer;
  font-size: 0.9rem;
}

/* Terms Checkbox */
.terms-group {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  font-size: 0.75rem;
  color: #a3a3a3;
  margin: 4px 0;
}

.terms-group input[type="checkbox"] {
  accent-color: #a855f7;
  cursor: pointer;
}

.terms-group a {
  color: #a855f7;
  text-decoration: none;
}

.terms-group a:hover {
  text-decoration: underline;
}

/* Angled Action Button */
.btn-submit {
  width: 100%;
  background: linear-gradient(90deg, #9333ea, #c084fc);
  border: none;
  color: #ffffff;
  padding: 12px 20px;
  font-weight: 700;
  font-size: 0.88rem;
  letter-spacing: 0.8px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  /* Cut corners effect matching the design */
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
  transition: opacity 0.2s ease, transform 0.1s ease;
}

.btn-submit:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

/* Card Footer */
.card-footer {
  margin-top: 18px;
  font-size: 0.8rem;
  color: #a3a3a3;
}

.card-footer a {
  color: #a855f7;
  font-weight: 600;
  text-decoration: none;
  margin-left: 4px;
}

.card-footer a:hover {
  text-decoration: underline;
}
