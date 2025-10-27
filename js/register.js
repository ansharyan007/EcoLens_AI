// Register Page JavaScript
// Handles user registration, validation, and password strength

let passwordStrengthScore = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add password strength checker
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
});

// Handle registration form submission
function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Validation
    if (!name) {
        showError('Please enter your full name');
        return;
    }
    
    if (!email || !isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    if (password.length < 8) {
        showError('Password must be at least 8 characters long');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    if (!agreeTerms) {
        showError('Please agree to the Terms & Conditions');
        return;
    }
    
    // Show loading
    showLoading(true);
    
    // Simulate registration (replace with actual Firebase code)
    setTimeout(() => {
        showLoading(false);
        alert(`Welcome to EcoLens AI, ${name}!\n\nAccount created successfully.\n\nEmail: ${email}\n\nRedirecting to dashboard...`);
        // window.location.href = 'dashboard.html';
    }, 2000);
    
    /* FIREBASE CODE - COMMENTED FOR TESTING
    auth.createUserWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            
            // Update display name
            await user.updateProfile({
                displayName: name
            });
            
            // Create user document in Firestore
            await db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                points: 0,
                rank: null,
                totalReports: 0,
                badgesEarned: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                settings: {
                    emailNotifications: true,
                    publicProfile: true
                }
            });
            
            showLoading(false);
            showSuccess('Account created successfully!');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        })
        .catch((error) => {
            showLoading(false);
            handleAuthError(error);
        });
    */
}

// Handle Google signup
function handleGoogleSignup() {
    showLoading(true);
    
    // Simulate Google signup
    setTimeout(() => {
        showLoading(false);
        alert('Google Sign-Up coming soon!\n\nThis feature will be available when Firebase is configured.');
    }, 1000);
    
    /* FIREBASE CODE - COMMENTED FOR TESTING
    const provider = new firebase.auth.GoogleAuthProvider();
    
    auth.signInWithPopup(provider)
        .then(async (result) => {
            const user = result.user;
            
            // Check if user document exists
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Create new user document
                await db.collection('users').doc(user.uid).set({
                    name: user.displayName,
                    email: user.email,
                    avatar: user.photoURL,
                    points: 0,
                    rank: null,
                    totalReports: 0,
                    badgesEarned: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    settings: {
                        emailNotifications: true,
                        publicProfile: true
                    }
                });
            }
            
            showLoading(false);
            showSuccess('Signed in with Google successfully!');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        })
        .catch((error) => {
            showLoading(false);
            handleAuthError(error);
        });
    */
}

// Check password strength
function checkPasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (password.length === 0) {
        strengthFill.className = 'strength-fill';
        strengthFill.style.width = '0%';
        strengthText.textContent = 'Enter password';
        passwordStrengthScore = 0;
        return;
    }
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Complexity checks
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++; // Mixed case
    if (/\d/.test(password)) score++; // Numbers
    if (/[^a-zA-Z0-9]/.test(password)) score++; // Special characters
    
    passwordStrengthScore = score;
    
    // Update UI
    if (score <= 2) {
        strengthFill.className = 'strength-fill weak';
        strengthText.textContent = 'Weak password';
        strengthText.style.color = '#ef4444';
    } else if (score <= 4) {
        strengthFill.className = 'strength-fill medium';
        strengthText.textContent = 'Medium strength';
        strengthText.style.color = '#eab308';
    } else {
        strengthFill.className = 'strength-fill strong';
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#22c55e';
    }
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.classList.remove('fa-eye');
        button.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        button.classList.remove('fa-eye-slash');
        button.classList.add('fa-eye');
    }
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show/hide loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    const registerBtn = document.getElementById('registerBtn');
    
    if (show) {
        overlay.classList.add('active');
        registerBtn.disabled = true;
    } else {
        overlay.classList.remove('active');
        registerBtn.disabled = false;
    }
}

// Show error message
function showError(message) {
    alert('❌ Error\n\n' + message);
}

// Show success message
function showSuccess(message) {
    alert('✅ Success\n\n' + message);
}

// Handle Firebase auth errors
function handleAuthError(error) {
    let message = 'An error occurred. Please try again.';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'This email is already registered. Please sign in instead.';
            break;
        case 'auth/invalid-email':
            message = 'Invalid email address format.';
            break;
        case 'auth/weak-password':
            message = 'Password is too weak. Use at least 8 characters.';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Please check your connection.';
            break;
        default:
            message = error.message;
    }
    
    showError(message);
}
