// Login Page JavaScript
// Handles user authentication and login

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in (skip for demo mode)
    // checkIfLoggedIn();
    
    // Auto-fill demo credentials (for testing)
    // Uncomment these lines to pre-fill the form
    // document.getElementById('email').value = 'demo@ecolens.ai';
    // document.getElementById('password').value = 'demo123456';
});

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Validation
    if (!email || !isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    if (!password) {
        showError('Please enter your password');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    // Show loading
    showLoading(true);
    
    // Simulate login (replace with actual Firebase code)
    setTimeout(() => {
        showLoading(false);
        
        // Store remember me preference
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('userEmail', email);
        }
        
        showSuccess('Login successful!');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }, 1500);
    
    /* FIREBASE CODE - COMMENTED FOR TESTING
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Store remember me preference
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('userEmail', email);
            }
            
            showLoading(false);
            showSuccess('Login successful!');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        })
        .catch((error) => {
            showLoading(false);
            handleAuthError(error);
        });
    */
}

// Handle Google login
function handleGoogleLogin() {
    showLoading(true);
    
    // Simulate Google login
    setTimeout(() => {
        showLoading(false);
        alert('Google Sign-In coming soon!\n\nThis feature will be available when Firebase is configured.');
    }, 1000);
    
    /* FIREBASE CODE - COMMENTED FOR TESTING
    const provider = new firebase.auth.GoogleAuthProvider();
    
    auth.signInWithPopup(provider)
        .then(async (result) => {
            const user = result.user;
            
            // Check if user document exists
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Create new user document for first-time Google users
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
            }, 1000);
        })
        .catch((error) => {
            showLoading(false);
            handleAuthError(error);
        });
    */
}

// Handle demo mode login
function handleDemoLogin() {
    showLoading(true);
    
    setTimeout(() => {
        showLoading(false);
        showSuccess('Entering Demo Mode!\n\nExplore EcoLens AI with full features.');
        
        // Set demo mode flag
        localStorage.setItem('demoMode', 'true');
        localStorage.setItem('demoUser', JSON.stringify({
            name: 'Demo User',
            email: 'demo@ecolens.ai',
            points: 1250,
            rank: 23
        }));
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }, 1500);
}

// Handle forgot password
function handleForgotPassword() {
    const email = document.getElementById('email').value.trim();
    
    if (!email || !isValidEmail(email)) {
        showError('Please enter your email address first');
        return;
    }
    
    showLoading(true);
    
    // Simulate password reset
    setTimeout(() => {
        showLoading(false);
        alert(`Password Reset\n\nA password reset link has been sent to:\n${email}\n\n(Demo mode - no actual email sent)`);
    }, 1500);
    
    /* FIREBASE CODE - COMMENTED FOR TESTING
    auth.sendPasswordResetEmail(email)
        .then(() => {
            showLoading(false);
            showSuccess('Password reset email sent! Check your inbox.');
        })
        .catch((error) => {
            showLoading(false);
            handleAuthError(error);
        });
    */
}

// Toggle password visibility
function togglePassword() {
    const input = document.getElementById('password');
    const button = document.querySelector('.toggle-password i');
    
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

// Check if already logged in
function checkIfLoggedIn() {
    // Skip for demo mode
    const demoMode = localStorage.getItem('demoMode');
    if (demoMode === 'true') {
        window.location.href = 'dashboard.html';
        return;
    }
    
    /* FIREBASE CODE - COMMENTED FOR TESTING
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is already logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
        }
    });
    */
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show/hide loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    const loginBtn = document.getElementById('loginBtn');
    
    if (show) {
        overlay.classList.add('active');
        loginBtn.disabled = true;
    } else {
        overlay.classList.remove('active');
        loginBtn.disabled = false;
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
        case 'auth/user-not-found':
            message = 'No account found with this email. Please sign up first.';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password. Please try again.';
            break;
        case 'auth/invalid-email':
            message = 'Invalid email address format.';
            break;
        case 'auth/user-disabled':
            message = 'This account has been disabled. Contact support.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many failed attempts. Please try again later.';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Please check your connection.';
            break;
        default:
            message = error.message;
    }
    
    showError(message);
}

// Load remembered email on page load
window.addEventListener('load', function() {
    const rememberMe = localStorage.getItem('rememberMe');
    const savedEmail = localStorage.getItem('userEmail');
    
    if (rememberMe === 'true' && savedEmail) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('rememberMe').checked = true;
    }
});
