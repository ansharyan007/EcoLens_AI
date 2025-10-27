// Profile Page JavaScript
// Handles user profile data, badges, activity, and settings

let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ Profile page loaded');
    
    // Get Firebase references
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('✅ User authenticated:', user.uid);
            currentUser = user;
            await loadUserProfile(user.uid, db);
        } else {
            console.log('❌ No user authenticated, redirecting to login...');
            window.location.href = 'index.html';
        }
    });
});

// Load user profile data
async function loadUserProfile(userId, db) {
    try {
        console.log('🔄 Loading user profile for:', userId);
        
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log('✅ User data loaded:', userData);
            
            // Display profile info
            displayProfileInfo(userData, currentUser);
            displayStats(userData);
            displayBadges(userData);
            displayActivity(userData);
            displayReports(userId, db);
            displaySettings(userData);
        } else {
            console.log('⚠️ User document not found, creating default profile...');
            
            // Create default user document
            const now = new Date();
            const defaultUserData = {
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email.split('@')[0],
                photoURL: currentUser.photoURL || null,
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
                completionPercentage: 20
            };
            
            await userRef.set(defaultUserData);
            
            // Create leaderboard entry
            await db.collection('leaderboard').doc(userId).set({
                userId: userId,
                displayName: defaultUserData.displayName,
                photoURL: defaultUserData.photoURL,
                points: 0,
                rank: null,
                totalReports: 0,
                badgesEarned: 0,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Default profile created');
            
            // Display the default data
            displayProfileInfo(defaultUserData, currentUser);
            displayStats(defaultUserData);
            displayBadges(defaultUserData);
            displayActivity(defaultUserData);
            displayReports(userId, db);
            displaySettings(defaultUserData);
        }
        
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        console.error('Error details:', error.message);
        alert('Failed to load profile data. Error: ' + error.message);
    }
}

// Display profile information
function displayProfileInfo(userData, user) {
    // Profile header
    document.getElementById('profileName').textContent = userData.displayName || user.displayName || 'User';
    document.getElementById('profileBio').textContent = userData.bio || 'No bio yet';
    
    // Member since
    if (userData.memberSince) {
        try {
            const date = userData.memberSince.toDate ? userData.memberSince.toDate() : new Date(userData.memberSince);
            document.getElementById('memberSince').textContent = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            document.getElementById('memberSince').textContent = 'Recently';
        }
    } else {
        document.getElementById('memberSince').textContent = 'Recently';
    }
    
    // Avatar
    const photoURL = userData.photoURL || user.photoURL;
    const displayName = userData.displayName || user.displayName || 'User';
    
    const avatarElements = document.querySelectorAll('#profileAvatar, #sidebarAvatar');
    avatarElements.forEach(elem => {
        if (photoURL) {
            elem.innerHTML = `<img src="${photoURL}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            elem.innerHTML = `<i class="fas fa-user"></i>`;
        }
    });
    
    // Sidebar info
    document.getElementById('sidebarName').textContent = displayName;
    document.getElementById('sidebarPoints').textContent = `${userData.points || 0} points`;
}

// Display stats
function displayStats(userData) {
    document.getElementById('totalPoints').textContent = userData.points || 0;
    document.getElementById('globalRank').textContent = userData.rank ? `#${userData.rank}` : 'Unranked';
    document.getElementById('totalReports').textContent = userData.totalReports || 0;
    document.getElementById('badgesEarned').textContent = `${userData.badgesEarned || 0}/${userData.totalBadges || 12}`;
}

// Display badges
function displayBadges(userData) {
    const badgesGrid = document.getElementById('badgesGrid');
    
    const allBadges = [
        { id: 'first-report', name: 'First Steps', icon: 'flag', description: 'Submit your first report', earned: false },
        { id: 'carbon-detective', name: 'Carbon Detective', icon: 'search', description: 'Report 10 sites', earned: false },
        { id: 'eco-warrior', name: 'Eco Warrior', icon: 'leaf', description: 'Report 50 sites', earned: false },
        { id: 'rising-star', name: 'Rising Star', icon: 'star', description: 'Earn 500 points', earned: false },
        { id: 'top-contributor', name: 'Top Contributor', icon: 'crown', description: 'Earn 1000 points', earned: false },
        { id: 'week-streak', name: 'Week Streak', icon: 'fire', description: '7 day streak', earned: false },
        { id: 'month-streak', name: 'Month Streak', icon: 'gem', description: '30 day streak', earned: false },
        { id: 'team-player', name: 'Team Player', icon: 'users', description: 'Verify 10 reports', earned: false }
    ];
    
    // Mark earned badges
    const earnedBadges = userData.badges || [];
    allBadges.forEach(badge => {
        badge.earned = earnedBadges.includes(badge.id);
    });
    
    badgesGrid.innerHTML = allBadges.map(badge => `
        <div class="badge-card ${badge.earned ? 'earned' : 'locked'}">
            <div class="badge-icon">
                <i class="fas fa-${badge.icon}"></i>
            </div>
            <h4>${badge.name}</h4>
            <p>${badge.description}</p>
            ${badge.earned ? '<span class="badge-status earned">✓ Earned</span>' : '<span class="badge-status locked">🔒 Locked</span>'}
        </div>
    `).join('');
}

// Display activity
function displayActivity(userData) {
    const activityFeed = document.getElementById('activityFeed');
    const activities = userData.recentActivity || [];
    
    if (activities.length === 0) {
        activityFeed.innerHTML = '<p class="empty-state">No recent activity</p>';
        return;
    }
    
    activityFeed.innerHTML = activities.slice(0, 10).map(activity => {
        let date;
        try {
            date = activity.timestamp instanceof Date ? activity.timestamp : new Date(activity.timestamp);
        } catch (e) {
            date = new Date();
        }
        const timeAgo = getTimeAgo(date);
        
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.message}</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
                ${activity.points > 0 ? `<span class="activity-points">+${activity.points}</span>` : ''}
            </div>
        `;
    }).join('');
}

// Display user reports
async function displayReports(userId, db) {
    const reportsList = document.getElementById('reportsList');
    
    try {
        const reportsSnapshot = await db.collection('reports')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (reportsSnapshot.empty) {
            reportsList.innerHTML = '<p class="empty-state">No reports yet. <a href="map.html">Start contributing!</a></p>';
            return;
        }
        
        reportsList.innerHTML = reportsSnapshot.docs.map(doc => {
            const report = doc.data();
            const statusClass = report.status === 'verified' ? 'success' : report.status === 'rejected' ? 'danger' : 'warning';
            
            return `
                <div class="report-item">
                    <div class="report-icon">
                        <i class="fas fa-industry"></i>
                    </div>
                    <div class="report-content">
                        <h4>${report.siteName || 'Unnamed Site'}</h4>
                        <p>${report.facilityType || 'Unknown type'}</p>
                        <span class="badge ${statusClass}">${report.status || 'pending'}</span>
                    </div>
                    <span class="report-carbon">${report.carbonEstimate || 0} tons</span>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading reports:', error);
        reportsList.innerHTML = '<p class="empty-state">No reports yet. <a href="map.html">Start contributing!</a></p>';
    }
}

// Display settings
function displaySettings(userData) {
    const settings = userData.settings || {};
    document.getElementById('emailNotifications').checked = settings.emailNotifications !== false;
    document.getElementById('publicProfile').checked = settings.publicProfile !== false;
}

// Open edit modal
function openEditModal() {
    const modal = document.getElementById('editProfileModal');
    
    document.getElementById('editName').value = document.getElementById('profileName').textContent;
    document.getElementById('editBio').value = document.getElementById('profileBio').textContent;
    document.getElementById('editAvatar').value = currentUser.photoURL || '';
    
    modal.style.display = 'flex';
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editProfileModal').style.display = 'none';
}

// Save profile
async function saveProfile() {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const user = auth.currentUser;
    
    if (!user) {
        alert('❌ Please log in first');
        return;
    }
    
    const newName = document.getElementById('editName').value.trim();
    const newBio = document.getElementById('editBio').value.trim();
    const newAvatar = document.getElementById('editAvatar').value.trim();
    
    if (!newName) {
        alert('❌ Please enter your name');
        return;
    }
    
    try {
        // Update Auth profile
        await user.updateProfile({
            displayName: newName,
            photoURL: newAvatar || null
        });
        
        // Update Firestore document
        await db.collection('users').doc(user.uid).update({
            displayName: newName,
            bio: newBio,
            photoURL: newAvatar || null,
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Profile updated');
        alert('✅ Profile updated successfully!');
        
        closeEditModal();
        location.reload();
        
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        alert('❌ Failed to update profile: ' + error.message);
    }
}

// Save settings
async function saveSettings() {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const user = auth.currentUser;
    
    if (!user) {
        alert('❌ Please log in first');
        return;
    }
    
    const emailNotifications = document.getElementById('emailNotifications').checked;
    const publicProfile = document.getElementById('publicProfile').checked;
    
    try {
        await db.collection('users').doc(user.uid).update({
            'settings.emailNotifications': emailNotifications,
            'settings.publicProfile': publicProfile,
            'settings.showOnLeaderboard': publicProfile,
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Settings saved');
        alert('✅ Settings saved successfully!');
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        alert('❌ Failed to save settings: ' + error.message);
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        firebase.auth().signOut().then(() => {
            console.log('✅ User logged out');
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('❌ Logout error:', error);
            alert('❌ Failed to logout: ' + error.message);
        });
    }
}

// Helper functions
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
