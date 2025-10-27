// Profile Page JavaScript - WITH AUTHENTICATION
// Handles user profile data, badges, activity, and settings

let currentUser = null;
let currentUserData = null;
let unsubscribeUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Profile page initializing...');
    
    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('✅ User authenticated:', user.email);
            currentUser = user;
            await loadUserProfile(user.uid);
        } else {
            console.log('❌ No user authenticated, redirecting to login...');
            window.location.href = 'login.html';
        }
    });
});

// ==================== LOAD USER PROFILE ====================

async function loadUserProfile(userId) {
    try {
        console.log('🔄 Loading user profile for:', userId);
        
        // Set up real-time listener for user data
        unsubscribeUser = db.collection('users').doc(userId)
            .onSnapshot(async (userDoc) => {
                if (userDoc.exists) {
                    currentUserData = { id: userDoc.id, ...userDoc.data() };
                    console.log('✅ User data loaded:', currentUserData.displayName);
                    console.log('📊 User stats:', {
                        points: currentUserData.points,
                        totalReports: currentUserData.totalReports,
                        verifiedReports: currentUserData.verifiedReports,
                        badgesEarned: currentUserData.badgesEarned,
                        currentStreak: currentUserData.currentStreak
                    });
                    
                    // Update sidebar FIRST
                    updateSidebarUI();
                    
                    // Display all profile sections
                    displayProfileInfo(currentUserData);
                    displayStats(currentUserData);
                    displayBadges(currentUserData);
                    displayActivity(currentUserData);
                    await displayReports(userId);
                    displaySettings(currentUserData);
                } else {
                    console.log('⚠️ User document not found, creating default profile...');
                    await createDefaultProfile(userId);
                }
            }, (error) => {
                console.error('❌ Error loading profile:', error);
                showError('Failed to load profile: ' + error.message);
            });
        
    } catch (error) {
        console.error('❌ Error setting up profile listener:', error);
        showError('Failed to initialize profile: ' + error.message);
    }
}

// ==================== UPDATE SIDEBAR UI ====================

function updateSidebarUI() {
    if (!currentUserData) {
        console.warn('⚠️ No user data available for sidebar');
        return;
    }
    
    const displayName = currentUserData.displayName || 'User';
    const points = currentUserData.points || 0;
    const photoURL = currentUserData.photoURL;
    
    console.log('🎨 Updating sidebar for:', displayName, 'with', points, 'points');
    
    // Update sidebar display name
    const displayNameEl = document.getElementById('displayName');
    if (displayNameEl) {
        displayNameEl.textContent = displayName;
        console.log('✅ Updated sidebar displayName');
    } else {
        console.warn('⚠️ displayName element not found');
    }
    
    // Update sidebar points
    const userPointsEl = document.getElementById('userPoints');
    if (userPointsEl) {
        userPointsEl.textContent = `${points.toLocaleString()} points`;
        console.log('✅ Updated sidebar userPoints');
    } else {
        console.warn('⚠️ userPoints element not found');
    }
    
    // Update sidebar avatar
    const userAvatarEl = document.getElementById('userAvatar');
    if (userAvatarEl) {
        if (photoURL) {
            userAvatarEl.innerHTML = `<img src="${photoURL}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            userAvatarEl.innerHTML = getInitials(displayName);
        }
        console.log('✅ Updated sidebar userAvatar');
    } else {
        console.warn('⚠️ userAvatar element not found');
    }
}

// ==================== CREATE DEFAULT PROFILE ====================

async function createDefaultProfile(userId) {
    try {
        console.log('📝 Creating default profile for:', userId);
        
        const now = new Date();
        const defaultUserData = {
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email.split('@')[0],
            photoURL: currentUser.photoURL || null,
            bio: "Environmental advocate on EcoLens AI",
            points: 0,
            rank: null,
            totalReports: 0,
            verifiedReports: 0,
            rejectedReports: 0,
            pendingReports: 0,
            badges: [],
            badgesEarned: 0,
            totalBadges: 12,
            currentStreak: 0,
            longestStreak: 0,
            recentActivity: [
                {
                    type: "join",
                    message: "Joined EcoLens AI",
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    points: 0,
                    icon: "user-plus"
                }
            ],
            challengeProgress: {},
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
        
        await db.collection('users').doc(userId).set(defaultUserData);
        
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
        
        console.log('✅ Default profile created successfully');
        
    } catch (error) {
        console.error('❌ Error creating default profile:', error);
        showError('Failed to create profile: ' + error.message);
    }
}

// ==================== DISPLAY FUNCTIONS ====================

// Display profile information
function displayProfileInfo(userData) {
    console.log('🎨 Updating profile UI');
    
    // Profile header
    document.getElementById('profileName').textContent = userData.displayName || 'User';
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
    
    // Profile Avatar (main page avatar, not sidebar)
    const photoURL = userData.photoURL;
    const displayName = userData.displayName || 'User';
    
    const profileAvatarEl = document.getElementById('profileAvatar');
    if (profileAvatarEl) {
        if (photoURL) {
            profileAvatarEl.innerHTML = `<img src="${photoURL}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            profileAvatarEl.innerHTML = getInitials(displayName);
        }
    }
}

// Display stats
function displayStats(userData) {
    console.log('📊 Updating stats');
    
    document.getElementById('totalPoints').textContent = (userData.points || 0).toLocaleString();
    document.getElementById('globalRank').textContent = userData.rank ? `#${userData.rank}` : 'Unranked';
    document.getElementById('totalReports').textContent = userData.totalReports || 0;
    document.getElementById('badgesEarned').textContent = `${userData.badgesEarned || 0}/${userData.totalBadges || 12}`;
}

// Display badges with progress tracking
function displayBadges(userData) {
    console.log('🏅 Updating badges');
    
    const badgesGrid = document.getElementById('badgesGrid');
    
    // Define all badges with their unlock conditions
    const allBadges = [
        { 
            id: 'first-report', 
            name: 'First Steps', 
            icon: 'flag', 
            description: 'Submit your first report',
            condition: userData.totalReports >= 1
        },
        { 
            id: 'report-10', 
            name: 'Carbon Detective', 
            icon: 'search', 
            description: 'Report 10 sites',
            condition: userData.totalReports >= 10,
            progress: userData.totalReports,
            total: 10
        },
        { 
            id: 'report-50', 
            name: 'Eco Warrior', 
            icon: 'leaf', 
            description: 'Report 50 sites',
            condition: userData.totalReports >= 50,
            progress: userData.totalReports,
            total: 50
        },
        { 
            id: 'report-100', 
            name: 'Environmental Hero', 
            icon: 'shield-alt', 
            description: 'Report 100 sites',
            condition: userData.totalReports >= 100,
            progress: userData.totalReports,
            total: 100
        },
        { 
            id: 'points-500', 
            name: 'Rising Star', 
            icon: 'star', 
            description: 'Earn 500 points',
            condition: userData.points >= 500,
            progress: userData.points,
            total: 500
        },
        { 
            id: 'points-1000', 
            name: 'Top Contributor', 
            icon: 'crown', 
            description: 'Earn 1000 points',
            condition: userData.points >= 1000,
            progress: userData.points,
            total: 1000
        },
        { 
            id: 'points-5000', 
            name: 'Legend', 
            icon: 'trophy', 
            description: 'Earn 5000 points',
            condition: userData.points >= 5000,
            progress: userData.points,
            total: 5000
        },
        { 
            id: 'streak-7', 
            name: 'Week Streak', 
            icon: 'fire', 
            description: '7 day streak',
            condition: userData.longestStreak >= 7,
            progress: userData.currentStreak || 0,
            total: 7
        },
        { 
            id: 'streak-30', 
            name: 'Month Streak', 
            icon: 'gem', 
            description: '30 day streak',
            condition: userData.longestStreak >= 30,
            progress: userData.currentStreak || 0,
            total: 30
        },
        { 
            id: 'violations-5', 
            name: 'Watchdog', 
            icon: 'eye', 
            description: '5 verified violations',
            condition: userData.verifiedReports >= 5,
            progress: userData.verifiedReports || 0,
            total: 5
        },
        { 
            id: 'violations-20', 
            name: 'Guardian', 
            icon: 'shield', 
            description: '20 verified violations',
            condition: userData.verifiedReports >= 20,
            progress: userData.verifiedReports || 0,
            total: 20
        },
        { 
            id: 'team-player', 
            name: 'Team Player', 
            icon: 'users', 
            description: 'Help verify 10 reports',
            condition: (userData.verificationsMade || 0) >= 10,
            progress: userData.verificationsMade || 0,
            total: 10
        }
    ];
    
    // Check which badges are earned
    const earnedBadges = userData.badges || [];
    
    badgesGrid.innerHTML = allBadges.map(badge => {
        const earned = badge.condition || earnedBadges.includes(badge.id);
        const progress = badge.progress !== undefined ? badge.progress : 0;
        const total = badge.total || 0;
        const percentage = total > 0 ? Math.min((progress / total * 100), 100).toFixed(0) : 0;
        
        return `
            <div class="badge-card ${earned ? 'earned' : 'locked'}">
                <div class="badge-icon">
                    <i class="fas fa-${badge.icon}"></i>
                </div>
                <h4>${badge.name}</h4>
                <p>${badge.description}</p>
                ${earned 
                    ? '<span class="badge-status earned">✓ Earned</span>' 
                    : total > 0 
                        ? `<div class="badge-progress">
                             <div class="badge-progress-bar">
                                 <div class="badge-progress-fill" style="width: ${percentage}%"></div>
                             </div>
                             <span class="badge-progress-text">${progress}/${total}</span>
                           </div>`
                        : '<span class="badge-status locked">🔒 Locked</span>'
                }
            </div>
        `;
    }).join('');
}

// Display activity feed
function displayActivity(userData) {
    console.log('📋 Updating activity feed');
    
    const activityFeed = document.getElementById('activityFeed');
    const activities = userData.recentActivity || [];
    
    if (activities.length === 0) {
        activityFeed.innerHTML = '<p class="empty-state">No recent activity</p>';
        return;
    }
    
    activityFeed.innerHTML = activities.slice(0, 10).map(activity => {
        let date;
        try {
            if (activity.timestamp) {
                date = activity.timestamp.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp);
            } else {
                date = new Date();
            }
        } catch (e) {
            date = new Date();
        }
        const timeAgo = getTimeAgo(date);
        
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${activity.icon || 'circle'}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.message || 'Activity'}</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
                ${activity.points > 0 ? `<span class="activity-points">+${activity.points}</span>` : ''}
            </div>
        `;
    }).join('');
}

// Display user reports
async function displayReports(userId) {
    console.log('📄 Loading user reports');
    
    const reportsList = document.getElementById('reportsList');
    
    try {
        const reportsSnapshot = await db.collection('reports')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (reportsSnapshot.empty) {
            reportsList.innerHTML = '<p class="empty-state">No reports yet. <a href="map.html" style="color: var(--primary);">Start contributing!</a></p>';
            return;
        }
        
        console.log(`✅ Found ${reportsSnapshot.size} reports`);
        
        reportsList.innerHTML = reportsSnapshot.docs.map(doc => {
            const report = doc.data();
            const statusClass = report.status === 'verified' ? 'success' : report.status === 'rejected' ? 'danger' : 'warning';
            
            let date = 'Recently';
            try {
                if (report.createdAt) {
                    const reportDate = report.createdAt.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
                    date = getTimeAgo(reportDate);
                }
            } catch (e) {
                console.error('Error parsing date:', e);
            }
            
            return `
                <div class="report-item">
                    <div class="report-icon">
                        <i class="fas fa-industry"></i>
                    </div>
                    <div class="report-content">
                        <h4>${report.siteName || 'Industrial Site'}</h4>
                        <p>${report.facilityType || 'Unknown type'} • ${date}</p>
                        <span class="badge ${statusClass}">${report.status || 'pending'}</span>
                    </div>
                    <span class="report-carbon">${Math.round(report.carbonEstimate || 0)} tons</span>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('❌ Error loading reports:', error);
        reportsList.innerHTML = '<p class="empty-state">No reports yet. <a href="map.html" style="color: var(--primary);">Start contributing!</a></p>';
    }
}

// Display settings
function displaySettings(userData) {
    console.log('⚙️ Updating settings');
    
    const settings = userData.settings || {};
    document.getElementById('emailNotifications').checked = settings.emailNotifications !== false;
    document.getElementById('publicProfile').checked = settings.publicProfile !== false;
}

// ==================== EDIT PROFILE ====================

// Open edit modal
function openEditModal() {
    if (!currentUserData) {
        showError('User data not loaded yet');
        return;
    }
    
    const modal = document.getElementById('editProfileModal');
    
    document.getElementById('editName').value = currentUserData.displayName || '';
    document.getElementById('editBio').value = currentUserData.bio || '';
    document.getElementById('editAvatar').value = currentUserData.photoURL || '';
    
    modal.style.display = 'flex';
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editProfileModal').style.display = 'none';
}

// Save profile
async function saveProfile() {
    if (!currentUser) {
        showError('Please log in first');
        return;
    }
    
    const newName = document.getElementById('editName').value.trim();
    const newBio = document.getElementById('editBio').value.trim();
    const newAvatar = document.getElementById('editAvatar').value.trim();
    
    if (!newName) {
        showError('Please enter your name');
        return;
    }
    
    try {
        console.log('💾 Saving profile changes...');
        
        // Update Auth profile
        await currentUser.updateProfile({
            displayName: newName,
            photoURL: newAvatar || null
        });
        
        // Update Firestore document
        await db.collection('users').doc(currentUser.uid).update({
            displayName: newName,
            bio: newBio,
            photoURL: newAvatar || null,
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update leaderboard entry
        await db.collection('leaderboard').doc(currentUser.uid).update({
            displayName: newName,
            photoURL: newAvatar || null,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Profile updated successfully');
        showSuccess('Profile updated successfully!');
        
        closeEditModal();
        
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showError('Failed to update profile: ' + error.message);
    }
}

// ==================== SAVE SETTINGS ====================

async function saveSettings() {
    if (!currentUser) {
        showError('Please log in first');
        return;
    }
    
    const emailNotifications = document.getElementById('emailNotifications').checked;
    const publicProfile = document.getElementById('publicProfile').checked;
    
    try {
        console.log('💾 Saving settings...');
        
        await db.collection('users').doc(currentUser.uid).update({
            'settings.emailNotifications': emailNotifications,
            'settings.publicProfile': publicProfile,
            'settings.showOnLeaderboard': publicProfile,
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Settings saved');
        showSuccess('Settings saved successfully!');
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showError('Failed to save settings: ' + error.message);
    }
}

// ==================== LOGOUT ====================

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Cleanup listeners
        if (unsubscribeUser) unsubscribeUser();
        
        auth.signOut().then(() => {
            console.log('✅ User logged out');
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error('❌ Logout error:', error);
            showError('Failed to logout: ' + error.message);
        });
    }
}

// ==================== HELPER FUNCTIONS ====================

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function showError(message) {
    console.error('❌', message);
    alert('❌ ' + message);
}

function showSuccess(message) {
    console.log('✅', message);
    alert('✅ ' + message);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    console.log('🧹 Cleaning up profile listeners');
    if (unsubscribeUser) unsubscribeUser();
});

console.log('✅ Profile page script loaded');
