// Profile JavaScript - Dynamic User Profile
// Loads user-specific data from Firestore

let currentUser = null;
let userData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
});

// Load user profile
async function loadUserProfile() {
    try {
        // Check if user is logged in
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                // Not logged in - redirect to login
                // window.location.href = 'index.html';
                
                // FOR TESTING: Load mock data
                loadMockProfile();
                return;
            }
            
            currentUser = user;
            
            // Load user data from Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                userData = userDoc.data();
                displayUserProfile(userData);
                loadUserReports(user.uid);
                loadUserActivity(userData.recentActivity || []);
                loadUserBadges(userData.badges || []);
            } else {
                console.error('User document not found');
                loadMockProfile();
            }
        });
    } catch (error) {
        console.error('Error loading profile:', error);
        loadMockProfile();
    }
}

// Display user profile
function displayUserProfile(data) {
    // Header - Name and Bio
    document.getElementById('profileName').textContent = data.displayName || 'User';
    document.getElementById('profileBio').textContent = data.bio || 'New EcoLens contributor';
    
    // Member Since
    if (data.memberSince) {
        const memberDate = data.memberSince.toDate();
        const formattedDate = memberDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        document.getElementById('memberSince').textContent = formattedDate;
    }
    
    // Avatar
    const avatarEls = document.querySelectorAll('#profileAvatar, #sidebarAvatar');
    avatarEls.forEach(el => {
        if (data.photoURL) {
            el.innerHTML = `<img src="${data.photoURL}" alt="Avatar">`;
        } else {
            const initials = getInitials(data.displayName || 'User');
            el.innerHTML = initials;
        }
    });
    
    // Sidebar Info
    document.getElementById('sidebarName').textContent = data.displayName || 'User';
    document.getElementById('sidebarPoints').textContent = `${formatNumber(data.points || 0)} points`;
    
    // Stats Cards
    document.getElementById('totalPoints').textContent = formatNumber(data.points || 0);
    document.getElementById('globalRank').textContent = `#${data.rank || '--'}`;
    document.getElementById('totalReports').textContent = data.totalReports || 0;
    document.getElementById('badgesEarned').textContent = `${data.badgesEarned || 0}/${data.totalBadges || 12}`;
    
    // Add rank badge if in top percentage
    if (data.rank && data.rank <= 50) {
        const rankPercentage = Math.ceil((data.rank / 1000) * 100); // Assuming 1000 users
        const badge = document.createElement('span');
        badge.className = 'stat-badge';
        badge.textContent = `Top ${rankPercentage}%`;
        document.getElementById('globalRank').parentElement.appendChild(badge);
    }
    
    // Settings
    if (data.settings) {
        document.getElementById('emailNotifications').checked = data.settings.emailNotifications !== false;
        document.getElementById('publicProfile').checked = data.settings.publicProfile !== false;
    }
}

// Load user reports
async function loadUserReports(userId) {
    try {
        const reportsSnapshot = await db.collection('reports')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        const reports = [];
        reportsSnapshot.forEach(doc => {
            reports.push({ id: doc.id, ...doc.data() });
        });
        
        displayUserReports(reports);
    } catch (error) {
        console.error('Error loading reports:', error);
        displayUserReports(getMockReports());
    }
}

// Display user reports
function displayUserReports(reports) {
    const reportsList = document.getElementById('reportsList');
    
    if (reports.length === 0) {
        reportsList.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 2rem;">No reports yet</p>';
        return;
    }
    
    reportsList.innerHTML = reports.map(report => `
        <div class="report-item">
            <div class="report-icon ${report.verified ? 'verified' : 'pending'}">
                <i class="fas ${report.verified ? 'fa-check-circle' : 'fa-clock'}"></i>
            </div>
            <div class="report-info">
                <h4>${report.siteName || 'Unknown Site'}</h4>
                <p>${formatDate(report.timestamp)}</p>
                <div class="report-meta">
                    <span><i class="fas fa-smog"></i> ${Math.round(report.carbonEstimate || 0)} tons/year</span>
                    <span><i class="fas fa-brain"></i> ${Math.round((report.aiConfidence || 0) * 100)}% confidence</span>
                </div>
            </div>
            <button class="btn-view" onclick="viewReport('${report.id}')">
                <i class="fas fa-eye"></i>
            </button>
        </div>
    `).join('');
}

// Load user activity
function loadUserActivity(activities) {
    const activityFeed = document.getElementById('activityFeed');
    
    if (activities.length === 0) {
        activities = getMockActivity();
    }
    
    activityFeed.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">
                <i class="fas fa-${activity.icon}"></i>
            </div>
            <div class="activity-info">
                <p>${activity.message}</p>
                <span class="activity-time">${formatTimestamp(activity.timestamp)}</span>
            </div>
            ${activity.points > 0 ? `<div class="activity-points">+${activity.points}</div>` : ''}
        </div>
    `).join('');
}

// Load user badges
function loadUserBadges(earnedBadges) {
    const badgesGrid = document.getElementById('badgesGrid');
    
    // All available badges
    const allBadges = [
        { id: 'first-report', name: 'First Report', icon: 'fa-flag', color: '#22c55e', description: 'Submit your first report' },
        { id: 'eco-warrior', name: 'Eco Warrior', icon: 'fa-leaf', color: '#10b981', description: 'Report 10 sites' },
        { id: 'top-contributor', name: 'Top Contributor', icon: 'fa-star', color: '#f59e0b', description: 'Reach top 100' },
        { id: 'carbon-detective', name: 'Carbon Detective', icon: 'fa-search', color: '#3b82f6', description: 'Find 5 violations' },
        { id: 'satellite-master', name: 'Satellite Master', icon: 'fa-satellite', color: '#8b5cf6', description: 'Analyze 50 sites' },
        { id: 'week-streak', name: 'Week Streak', icon: 'fa-fire', color: '#ef4444', description: '7 day streak' },
        { id: 'month-streak', name: 'Month Streak', icon: 'fa-fire-flame-curved', color: '#dc2626', description: '30 day streak' },
        { id: 'team-player', name: 'Team Player', icon: 'fa-users', color: '#06b6d4', description: 'Verify 20 reports' },
        { id: 'accuracy-ace', name: 'Accuracy Ace', icon: 'fa-bullseye', color: '#14b8a6', description: '95%+ accuracy' },
        { id: 'speed-demon', name: 'Speed Demon', icon: 'fa-bolt', color: '#eab308', description: '10 reports in 1 day' },
        { id: 'global-guardian', name: 'Global Guardian', icon: 'fa-globe', color: '#6366f1', description: 'Report from 10 countries' },
        { id: 'legendary', name: 'Legendary', icon: 'fa-crown', color: '#a855f7', description: 'Reach rank #1' }
    ];
    
    badgesGrid.innerHTML = allBadges.map(badge => {
        const earned = earnedBadges.includes(badge.id);
        return `
            <div class="badge-item ${earned ? 'earned' : 'locked'}">
                <div class="badge-icon" style="background: ${earned ? badge.color : '#374151'};">
                    <i class="fas ${badge.icon}"></i>
                </div>
                <h4>${badge.name}</h4>
                <p>${badge.description}</p>
                ${earned ? '<div class="badge-earned"><i class="fas fa-check"></i></div>' : '<div class="badge-lock"><i class="fas fa-lock"></i></div>'}
            </div>
        `;
    }).join('');
}

// Open edit modal
function openEditModal() {
    if (userData) {
        document.getElementById('editName').value = userData.displayName || '';
        document.getElementById('editBio').value = userData.bio || '';
        document.getElementById('editAvatar').value = userData.photoURL || '';
    }
    document.getElementById('editProfileModal').classList.add('active');
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editProfileModal').classList.remove('active');
}

// Save profile
async function saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const avatar = document.getElementById('editAvatar').value.trim();
    
    if (!name) {
        alert('Name is required');
        return;
    }
    
    try {
        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({
            displayName: name,
            bio: bio,
            photoURL: avatar || null
        });
        
        // Update Auth profile
        await currentUser.updateProfile({
            displayName: name,
            photoURL: avatar || null
        });
        
        alert('Profile updated successfully!');
        closeEditModal();
        
        // Reload profile
        loadUserProfile();
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile. Please try again.');
    }
}

// Save settings
async function saveSettings() {
    const emailNotifications = document.getElementById('emailNotifications').checked;
    const publicProfile = document.getElementById('publicProfile').checked;
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            'settings.emailNotifications': emailNotifications,
            'settings.publicProfile': publicProfile
        });
        
        alert('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings. Please try again.');
    }
}

// View report
function viewReport(reportId) {
    window.location.href = `site-analysis.html?reportId=${reportId}`;
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    }
}

// ==================== HELPER FUNCTIONS ====================

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(timestamp);
}

// ==================== MOCK DATA FOR TESTING ====================

function loadMockProfile() {
    const mockData = {
        displayName: 'Demo User',
        bio: 'Environmental advocate | Carbon monitoring enthusiast',
        photoURL: null,
        points: 1250,
        rank: 23,
        totalReports: 47,
        verifiedReports: 38,
        badgesEarned: 8,
        totalBadges: 12,
        badges: ['first-report', 'eco-warrior', 'top-contributor', 'carbon-detective', 'satellite-master', 'week-streak', 'month-streak', 'team-player'],
        memberSince: { toDate: () => new Date('2024-08-15') },
        settings: {
            emailNotifications: true,
            publicProfile: true
        }
    };
    
    userData = mockData;
    displayUserProfile(mockData);
    loadUserActivity(getMockActivity());
    loadUserBadges(mockData.badges);
    displayUserReports(getMockReports());
}

function getMockActivity() {
    return [
        { type: 'report', message: 'Reported Delhi Cement Plant', timestamp: { toDate: () => new Date(Date.now() - 3600000) }, points: 50, icon: 'flag' },
        { type: 'badge', message: 'Earned "Eco Warrior" badge', timestamp: { toDate: () => new Date(Date.now() - 86400000) }, points: 100, icon: 'medal' },
        { type: 'rank', message: 'Reached rank #23', timestamp: { toDate: () => new Date(Date.now() - 172800000) }, points: 0, icon: 'trophy' }
    ];
}

function getMockReports() {
    return [
        { id: '1', siteName: 'Delhi Cement Plant', timestamp: { toDate: () => new Date(Date.now() - 86400000) }, carbonEstimate: 245, aiConfidence: 0.87, verified: true },
        { id: '2', siteName: 'Mumbai Power Station', timestamp: { toDate: () => new Date(Date.now() - 172800000) }, carbonEstimate: 890, aiConfidence: 0.92, verified: true },
        { id: '3', siteName: 'Bangalore Steel Factory', timestamp: { toDate: () => new Date(Date.now() - 259200000) }, carbonEstimate: 156, aiConfidence: 0.81, verified: false }
    ];
}

console.log('Profile page loaded - Dynamic user profile');
