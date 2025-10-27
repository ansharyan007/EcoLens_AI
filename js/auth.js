// Authentication Helper Functions

// Check if user is logged in
function checkAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(user => {
            if (user) {
                resolve(user);
            } else {
                reject('Not authenticated');
            }
        });
    });
}

// Login with email and password
async function loginWithEmail(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Login with Google
async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);

        // Check if user profile exists, create if not
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        if (!userDoc.exists()) {
            await createUserProfile(result.user);
        }

        return result.user;
    } catch (error) {
        console.error('Google login error:', error);
        throw error;
    }
}

// Signup with email and password
async function signupWithEmail(name, email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);

        // Update display name
        await userCredential.user.updateProfile({
            displayName: name
        });

        // Create user profile in Firestore
        await createUserProfile(userCredential.user, name);

        return userCredential.user;
    } catch (error) {
        console.error('Signup error:', error);
        throw error;
    }
}

// Create user profile in Firestore
async function createUserProfile(user, displayName = null) {
    try {
        const userData = {
            email: user.email,
            displayName: displayName || user.displayName || 'User',
            photoURL: user.photoURL || null,
            points: 0,
            rank: 0,
            badges: [],
            totalReports: 0,
            verifiedReports: 0,
            joinedDate: firebase.firestore.FieldValue.serverTimestamp(),
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
            settings: {
                emailNotifications: true,
                publicProfile: true,
                showOnLeaderboard: true
            }
        };

        await db.collection('users').doc(user.uid).set(userData);

        // Also create leaderboard entry
        await db.collection('leaderboard').doc(user.uid).set({
            displayName: userData.displayName,
            points: 0,
            rank: 0,
            badges: [],
            totalReports: 0,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('User profile created');
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
}

// Logout
async function logout() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

// Get current user
function getCurrentUser() {
    return auth.currentUser;
}

// Check auth state and redirect if not logged in
function requireAuth() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html';
        }
    });
}

console.log('Auth helpers loaded');
