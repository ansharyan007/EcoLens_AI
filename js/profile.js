// Profile Page JavaScript
// Handles user profile display, badges, activity feed, and settings

let currentUser = null;

// Demo user data
const demoUser = {
    id: 'demo123',
    name: 'Demo User',
    email: 'demo@ecolens.ai',
    bio: 'Environmental advocate | Carbon monitoring enthusiast',
    avatar: null,
    points: 1250,
    rank: 23,
    totalReports: 47,
    badgesEarned: 8,
    memberSince: 'Aug 15, 2024'
};

// Badges data
const badges = [
    {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Submit your first report',
        icon: 'fa-flag-checkered',
        unlocked: true,
        progress: 100
    },
    {
        id: 'rising_star',
        name: 'Rising Star',
        description: 'Earn 500 points',
        icon: 'fa-star',
        unlocked: true,
        progress: 100
    },
    {
        id: 'carbon_detective',
        name: 'Carbon Detective',
        description: 'Report 10 sites',
        icon: 'fa-search',
        unlocked: true,
        progress: 100
    },
    {
        id: 'top_contributor',
        name: 'Top Contributor',
        description: 'Reach Top 50',
        icon: 'fa-trophy',
        unlocked: true,
        progress: 100
    },
    {
        id: 'accuracy_expert',
        name: 'Accuracy Expert',
        description: '95% report accuracy',
        icon: 'fa-bullseye',
        unlocked: true,
        progress: 100
    },
    {
        id: 'violation_hunter',
        name: 'Violation Hunter',
        description: 'Report 5 violations',
        icon: 'fa-exclamation-triangle',
        unlocked: true,
        progress: 100
    },
    {
        id: 'streak_master',
        name: 'Streak Master',
        description: '7-day streak',
        icon: 'fa-fire',
        unlocked: true,
        progress: 100
    },
    {
        id: 'data_scientist',
        name: 'Data Scientist',
        description: 'Use AI analysis 50 times',
        icon: 'fa-brain',
        unlocked: true,
        progress: 100
    },
    {
        id: 'elite_rank',
        name: 'Elite Rank',
        description: 'Reach Top 10',
        icon: 'fa-crown',
        unlocked: false,
        progress: 60
    },
    {
        id: 'century_club',
        name: 'Century Club',
        description: 'Submit 100 reports',
        icon: 'fa-hundred-points',
        unlocked: false,
        progress: 47
    },
    {
        id: 'master_detector',
        name: 'Master Detector',
        description: 'Report all facility types',
        icon: 'fa-industry',
        unlocked: false,
        progress: 83
    },
    {
        id: 'legend',
        name: 'Legend',
        description: 'Earn 10,000 points',
        icon: 'fa-medal',
        unlocked: false,
        progress: 12
    }
];

// Recent activity data
const recentActivity = [
    {
        id: 'act1',
        type: 'report',
        title: 'Reported Delhi Cement Plant',
        description: 'High emissions detected',
        emission: 'high',
        carbon: 245,
        date: '2 hours ago'
    },
    {
        id: 'act2',
        type: 'badge',
        title: 'Earned "Data Scientist" Badge',
        description: 'Used AI analysis 50 times',
        date: '1 day ago'
    },
    {
        id: 'act3',
        type: 'report',
        title: 'Reported Mumbai Steel Factory',
        description: 'Medium emissions detected',
        emission: 'medium',
        carbon: 156,
        date: '2 days ago'
    },
    {
        id: 'act4',
        type: 'report',
        title: 'Reported Bangalore Power Plant',
        description: 'Low emissions detected',
        emission: 'low',
        carbon: 67,
        date: '3 days ago'
    },
    {
        id: 'act5',
        type: 'badge',
        title: 'Earned "Streak Master" Badge',
        description: 'Maintained 7-day streak',
        date: '5 days ago'
    }
];

// User reports data
const userReports = [
    {
        id: 'rep1',
        siteName: 'Delhi Cement Plant',
        location: 'Delhi, India',
        carbon: 245,
        emissionLevel: 'high',
        date: '2 hours ago'
    },
    {
        id: 'rep2',
        siteName: 'Mumbai Steel Factory',
        location: 'Mumbai, Maharashtra',
        carbon: 156,
        emissionLevel: 'medium',
        date: '2 days ago'
    },
    {
        id: 'rep3',
        siteName: 'Bangalore Power Plant',
        location: 'Bangalore, Karnataka',
        carbon: 67,
        emissionLevel: 'low',
        date: '3 days ago'
    },
    {
        id: 'rep4',
        siteName: 'Chennai Refinery',
        location: 'Chennai, Tamil Nadu',
        carbon: 420,
        emissionLevel: 'high',
        date: '1 week ago'
    },
    {
        id: 'rep5',
        siteName: 'Kolkata Chemical Plant',
        location: 'Kolkata, West Bengal',
        carbon: 89,
        emissionLevel: 'low',
        date: '1 week ago'
    }
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load demo user data
    loadUserProfile();
    
    // Load badges
    loadBadges();
    
    // Load activity feed
    loadActivityFeed();
    
    // Load user reports
    loadUserReports();
});

// Load user profile
function loadUserProfile() {
    currentUser = demoUser;
    
    // Update profile header
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileBio').textContent = currentUser.bio;
    document.getElementById('memberSince').textContent = currentUser.memberSince;
    
    // Update profile avatar
    const profileAvatar = document.getElementById('profileAvatar');
    if (currentUser.avatar) {
        profileAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="Profile">`;
    } else {
        const initials = currentUser.name.split(' ').map(n => n[0]).join('');
        profileAvatar.textContent = initials;
    }
    
    // Update sidebar
    document.getElementById('sidebarName').textContent = currentUser.name;
    document.getElementById('sidebarPoints').textContent = `${currentUser.points.toLocaleString()} points`;
    
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (currentUser.avatar) {
        sidebarAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="Profile">`;
    } else {
        const initials = currentUser.name.split(' ').map(n => n[0]).join('');
        sidebarAvatar.textContent = initials;
    }
    
    // Update stats
    document.getElementById('totalPoints').textContent = currentUser.points.toLocaleString();
    document.getElementById('globalRank').textContent = `#${currentUser.rank}`;
    document.getElementById('totalReports').textContent = currentUser.totalReports;
    document.getElementById('badgesEarned').textContent = `${currentUser.badgesEarned}/12`;
}

// Load badges
function loadBadges() {
    const badgesGrid = document.getElementById('badgesGrid');
    
    badgesGrid.innerHTML = badges.map(badge => {
        const statusClass = badge.unlocked ? 'unlocked' : 'locked';
        const progressHTML = !badge.unlocked ? `
            <div class="badge-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${badge.progress}%"></div>
                </div>
            </div>
        ` : '';
        
        return `
            <div class="badge-item ${statusClass}" title="${badge.description}">
                <div class="badge-icon">
                    <i class="fas ${badge.icon}"></i>
                </div>
                <div class="badge-name">${badge.name}</div>
                ${progressHTML}
            </div>
        `;
    }).join('');
}

// Load activity feed
function loadActivityFeed() {
    const activityFeed = document.getElementById('activityFeed');
    
    activityFeed.innerHTML = recentActivity.map(activity => {
        if (activity.type === 'report') {
            return `
                <div class="activity-item">
                    <div class="activity-icon ${activity.emission}">
                        <i class="fas fa-flag"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-desc">${activity.description}</div>
                        <div class="activity-meta">
                            <span><i class="fas fa-smog"></i>${activity.carbon} tons/year</span>
                            <span><i class="fas fa-clock"></i>${activity.date}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="activity-item">
                    <div class="activity-icon" style="background: rgba(139, 92, 246, 0.2); color: #8b5cf6;">
                        <i class="fas fa-medal"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-desc">${activity.description}</div>
                        <div class="activity-meta">
                            <span><i class="fas fa-clock"></i>${activity.date}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');
}

// Load user reports
function loadUserReports() {
    const reportsList = document.getElementById('reportsList');
    
    reportsList.innerHTML = userReports.map(report => `
        <div class="report-item">
            <div class="report-header">
                <div class="report-title">${report.siteName}</div>
                <div class="report-emission ${report.emissionLevel}">
                    ${report.carbon} tons/year
                </div>
            </div>
            <div class="report-location">
                <i class="fas fa-map-marker-alt"></i> ${report.location}
            </div>
            <div class="report-date">
                <i class="fas fa-clock"></i> ${report.date}
            </div>
        </div>
    `).join('');
}

// Open edit modal
function openEditModal() {
    document.getElementById('editName').value = currentUser.name;
    document.getElementById('editBio').value = currentUser.bio;
    document.getElementById('editAvatar').value = currentUser.avatar || '';
    document.getElementById('editProfileModal').classList.add('active');
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editProfileModal').classList.remove('active');
}

// Save profile
function saveProfile() {
    const newName = document.getElementById('editName').value.trim();
    const newBio = document.getElementById('editBio').value.trim();
    const newAvatar = document.getElementById('editAvatar').value.trim();
    
    if (!newName) {
        alert('Please enter your name');
        return;
    }
    
    // Update demo user data
    currentUser.name = newName;
    currentUser.bio = newBio;
    currentUser.avatar = newAvatar || null;
    
    // Reload profile display
    loadUserProfile();
    
    // Close modal
    closeEditModal();
    
    alert('Profile updated successfully!');
}

// Save settings
function saveSettings() {
    const emailNotifications = document.getElementById('emailNotifications').checked;
    const publicProfile = document.getElementById('publicProfile').checked;
    
    alert(`Settings saved!\n\nEmail Notifications: ${emailNotifications ? 'Enabled' : 'Disabled'}\nPublic Profile: ${publicProfile ? 'Enabled' : 'Disabled'}`);
}

// Logout function - DISABLED FOR TESTING
function logout() {
    alert('Logout disabled in demo mode');
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('editProfileModal');
    if (e.target === modal) {
        closeEditModal();
    }
});
