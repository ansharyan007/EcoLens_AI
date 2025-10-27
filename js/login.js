// Login Page JavaScript
// Handles user authentication and login with Firebase

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Login page loaded');
    
    // Load remembered email if exists
    loadRememberedEmail();
    
    // Check if already logged in (optional - uncomment if needed)
    // checkIfLoggedIn();
});

// Handle login form submission
async function handleLogin(event) {
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
    
    // ✅ GET FIREBASE REFERENCES
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Show loading
    showLoading(true);
    
    try {
        console.log('🔄 Signing in user...');
        
        // ✅ SIGN IN WITH FIREBASE
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ User signed in:', user.uid);
        
        // ✅ CHECK IF USER DOCUMENT EXISTS FIRST
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            // ✅ DOCUMENT EXISTS - UPDATE IT
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Login timestamp updated');
        } else {
            // ✅ DOCUMENT DOESN'T EXIST - CREATE IT
            console.log('⚠️ User document not found, creating...');
            
            const now = new Date();
            
            await userRef.set({
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                bio: "Member of EcoLens AI community",
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
                        type: "login",
                        message: "First login",
                        timestamp: now,
                        points: 0,
                        icon: "sign-in-alt"
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
                completionPercentage: 20
            });
            
            // ✅ CREATE LEADERBOARD ENTRY
            await db.collection('leaderboard').doc(user.uid).set({
                userId: user.uid,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                points: 0,
                rank: null,
                totalReports: 0,
                badgesEarned: 0,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ User document created');
        }
        
        // Store remember me preference
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('userEmail', email);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('userEmail');
        }
        
        showLoading(false);
        showSuccess('Login successful!');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        showLoading(false);
        console.error('❌ Login error:', error);
        handleAuthError(error);
    }
}

// Handle Google login
async function handleGoogleLogin() {
    // ✅ GET FIREBASE REFERENCES
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    showLoading(true);
    
    try {
        console.log('🔄 Starting Google Sign-In...');
        
        // ✅ GOOGLE AUTH PROVIDER
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        console.log('✅ Google sign-in successful:', user.uid);
        
        // ✅ CHECK IF USER DOCUMENT EXISTS
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        
        const now = new Date();
        
        if (!userDoc.exists) {
            // ✅ CREATE NEW USER DOCUMENT (FIRST-TIME GOOGLE USER)
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
            
            // ✅ CREATE LEADERBOARD ENTRY
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
            
            console.log('✅ New user document created');
            
        } else {
            // ✅ UPDATE EXISTING USER LOGIN
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Existing user login updated');
        }
        
        showLoading(false);
        showSuccess(`Welcome ${userDoc.exists ? 'back' : ''}, ${user.displayName}!`);
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        showLoading(false);
        console.error('❌ Google login error:', error);
        
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
            handleAuthError(error);
        }
    }
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
async function handleForgotPassword() {
    const email = document.getElementById('email').value.trim();
    
    if (!email || !isValidEmail(email)) {
        showError('Please enter your email address first');
        return;
    }
    
    // ✅ GET FIREBASE AUTH
    const auth = firebase.auth();
    
    showLoading(true);
    
    try {
        console.log('🔄 Sending password reset email...');
        
        // ✅ SEND PASSWORD RESET EMAIL
        await auth.sendPasswordResetEmail(email);
        
        console.log('✅ Password reset email sent');
        
        showLoading(false);
        alert(`✅ Password Reset\n\nA password reset link has been sent to:\n${email}\n\nCheck your inbox and spam folder.`);
        
    } catch (error) {
        showLoading(false);
        console.error('❌ Password reset error:', error);
        handleAuthError(error);
    }
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
    
    // ✅ CHECK FIREBASE AUTH STATE
    const auth = firebase.auth();
    
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('✅ User already logged in, redirecting...');
            window.location.href = 'dashboard.html';
        }
    });
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
        case 'auth/invalid-credential':
            message = 'Invalid email or password. Please check your credentials.';
            break;
        default:
            message = error.message || 'Login failed. Please try again.';
    }
    
    showError(message);
}

// Load remembered email on page load
function loadRememberedEmail() {
    const rememberMe = localStorage.getItem('rememberMe');
    const savedEmail = localStorage.getItem('userEmail');
    
    if (rememberMe === 'true' && savedEmail) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('rememberMe').checked = true;
        console.log('✅ Email auto-filled from previous session');
    }
}
