// Register Page JavaScript
// Handles user registration, validation, and password strength with Firebase

let passwordStrengthScore = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Page loaded, initializing...');
    
    const form = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');

    if (form) form.addEventListener('submit', handleRegister);
    if (passwordInput) passwordInput.addEventListener('input', checkPasswordStrength);

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.closest('.password-input').querySelector('input');
            if (input) togglePassword(input.id);
        });
    });
});

// ==================== REGISTER HANDLER ====================
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

    // -------- VALIDATION --------
    if (!name) return showError('Please enter your full name.');
    if (!email || !isValidEmail(email)) return showError('Please enter a valid email address.');
    if (password.length < 8) return showError('Password must be at least 8 characters long.');
    if (password !== confirmPassword) return showError('Passwords do not match.');
    if (!agreeTerms) return showError('Please agree to the Terms & Conditions.');

    // ✅ GET FIREBASE REFERENCES HERE (inside the function)
    const auth = firebase.auth();
    const db = firebase.firestore();

    // -------- FIREBASE REGISTRATION --------
    showLoading(true);

    try {
        console.log('🔄 Creating user account...');
        
        // ✅ CREATE USER
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('✅ User created:', user.uid);

        // ✅ UPDATE PROFILE
        await user.updateProfile({ displayName: name });
        console.log('✅ Display name updated');

        const now = new Date();

        // ✅ CREATE USER DOCUMENT IN FIRESTORE
        console.log('🔄 Writing to Firestore...');
        
        await db.collection('users').doc(user.uid).set({
            email: email,
            displayName: name,
            photoURL: null,
            bio: "New member of EcoLens AI community",
            points: 0,
            rank: null,
            totalReports: 0,
            verifiedReports: 0,
            rejectedReports: 0,
            pendingReports: 0,
            badges: [],
            badgesEarned: 0,
            totalBadges: 12,
            recentActivity: [
                {
                    type: "join",
                    message: "Joined EcoLens AI",
                    timestamp: now,
                    points: 0,
                    icon: "user-plus"
                }
            ],
            settings: {
                emailNotifications: true,
                publicProfile: true,
                showOnLeaderboard: true,
                language: "en",
                theme: "dark"
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            memberSince: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            country: null,
            city: null,
            currentStreak: 0,
            longestStreak: 0,
            lastReportDate: null,
            achievementProgress: {
                "report-10": 0,
                "report-50": 0,
                "report-100": 0,
                "points-500": 0,
                "points-1000": 0,
                "points-5000": 0,
                "streak-7": 0,
                "streak-30": 0,
                "violations-5": 0,
                "violations-20": 0
            },
            profileComplete: false,
            completionPercentage: 30
        });

        console.log('✅ User document created in Firestore');

        // ✅ CREATE LEADERBOARD ENTRY
        await db.collection('leaderboard').doc(user.uid).set({
            userId: user.uid,
            displayName: name,
            photoURL: null,
            points: 0,
            rank: null,
            totalReports: 0,
            badgesEarned: 0,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Leaderboard entry created');

        showLoading(false);
        alert(`✅ Welcome to EcoLens AI, ${name}!\n\nAccount created successfully.`);

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        showLoading(false);
        console.error('❌ Registration Error:', error);
        handleAuthError(error);
    }
}

// ==================== GOOGLE SIGNUP ====================
async function handleGoogleSignup() {
    // ✅ GET FIREBASE REFERENCES HERE
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    showLoading(true);

    try {
        console.log('🔄 Starting Google Sign-In...');
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');

        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        console.log('✅ Google sign-in successful:', user.uid);

        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        const now = new Date();

        if (!doc.exists) {
            console.log('🔄 Creating new user document...');
            
            await userRef.set({
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                bio: "New member of EcoLens AI community",
                points: 0,
                rank: null,
                totalReports: 0,
                verifiedReports: 0,
                rejectedReports: 0,
                pendingReports: 0,
                badges: [],
                badgesEarned: 0,
                totalBadges: 12,
                recentActivity: [
                    { 
                        type: "join", 
                        message: "Joined via Google", 
                        timestamp: now, 
                        points: 0, 
                        icon: "google" 
                    }
                ],
                settings: {
                    emailNotifications: true,
                    publicProfile: true,
                    showOnLeaderboard: true,
                    language: "en",
                    theme: "dark"
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                memberSince: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                country: null,
                city: null,
                currentStreak: 0,
                longestStreak: 0,
                lastReportDate: null,
                achievementProgress: {
                    "report-10": 0,
                    "report-50": 0,
                    "report-100": 0,
                    "points-500": 0,
                    "points-1000": 0,
                    "points-5000": 0,
                    "streak-7": 0,
                    "streak-30": 0,
                    "violations-5": 0,
                    "violations-20": 0
                },
                profileComplete: false,
                completionPercentage: 50
            });

            await db.collection('leaderboard').doc(user.uid).set({
                userId: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
                points: 0,
                rank: null,
                totalReports: 0,
                badgesEarned: 0,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            
        } else {
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        showLoading(false);
        alert(`✅ Welcome ${doc.exists ? 'back' : ''}, ${user.displayName}!`);
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        showLoading(false);
        console.error('❌ Google Signup Error:', error);
        
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
            handleAuthError(error);
        }
    }
}

// ==================== PASSWORD STRENGTH ====================
function checkPasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    if (!password) {
        strengthFill.className = 'strength-fill';
        strengthFill.style.width = '0%';
        strengthText.textContent = 'Enter password';
        passwordStrengthScore = 0;
        return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    passwordStrengthScore = score;

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

// ==================== TOGGLE PASSWORD ====================
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password i');
    
    if (!input || !button) return;

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

// ==================== UTILITIES ====================
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(message) {
    alert('❌ Error\n\n' + message);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    const btn = document.getElementById('registerBtn');
    
    if (show) {
        overlay.classList.add('active');
        btn.disabled = true;
    } else {
        overlay.classList.remove('active');
        btn.disabled = false;
    }
}

function handleAuthError(error) {
    let message = 'Something went wrong. Please try again.';
    
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
            message = 'Network issue. Please check your internet connection.';
            break;
        case 'auth/operation-not-allowed':
            message = 'Email/password accounts are not enabled in Firebase.';
            break;
        default:
            message = error.message || 'Registration failed. Please try again.';
    }
    
    showError(message);
}
