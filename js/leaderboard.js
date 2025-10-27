// Leaderboard JavaScript - Firebase Integration (NO AUTH REQUIRED)
// Handles leaderboard display, rankings, and challenges with real-time data

let currentPeriod = 'all';
let allLeaders = [];
let currentUserData = null;
let currentUserRank = null;
let unsubscribeLeaderboard = null;
let unsubscribeUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏆 Leaderboard page initializing...');
    
    // Try to load current user if auth is available
    loadCurrentUserIfAvailable();
    
    // Load leaderboard data immediately
    loadLeaderboard('all');
    
    // Load challenges
    loadChallenges();
});

// ==================== LOAD CURRENT USER (OPTIONAL) ====================

async function loadCurrentUserIfAvailable() {
    try {
        // Check if auth is available and user is logged in
        if (typeof auth !== 'undefined' && auth.currentUser) {
            const userId = auth.currentUser.uid;
            console.log('👤 Loading user data for:', userId);
            
            // Real-time listener for user data
            unsubscribeUser = db.collection('users').doc(userId)
                .onSnapshot(doc => {
                    if (doc.exists) {
                        currentUserData = { id: doc.id, ...doc.data() };
                        console.log('✅ User data loaded:', currentUserData.displayName);
                        updateUserUI();
                    } else {
                        console.warn('⚠️ User document not found');
                        setDefaultUser();
                    }
                }, error => {
                    console.error('❌ Error loading user:', error);
                    setDefaultUser();
                });
        } else {
            console.log('ℹ️ No auth available, using guest user');
            setDefaultUser();
        }
    } catch (error) {
        console.error('❌ Error in loadCurrentUserIfAvailable:', error);
        setDefaultUser();
    }
}

// Set default guest user
function setDefaultUser() {
    currentUserData = {
        id: 'guest',
        displayName: 'Guest User',
        points: 0,
        totalReports: 0,
        verifiedReports: 0,
        currentStreak: 0,
        badgesEarned: 0
    };
    updateUserUI();
}

// Update user UI elements
function updateUserUI() {
    if (!currentUserData) return;
    
    const displayName = currentUserData.displayName || 'Guest User';
    const points = currentUserData.points || 0;
    const photoURL = currentUserData.photoURL;
    
    document.getElementById('displayName').textContent = displayName;
    document.getElementById('userPoints').textContent = `${points.toLocaleString()} points`;
    
    const avatarEl = document.getElementById('userAvatar');
    if (photoURL) {
        avatarEl.innerHTML = `<img src="${photoURL}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
        avatarEl.innerHTML = getInitials(displayName);
    }
}

// ==================== TAB SWITCHING ====================

// Switch tab
function switchTab(period) {
    currentPeriod = period;
    
    console.log('📊 Switching to:', period);
    
    // Update tab UI
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.period === period) {
            tab.classList.add('active');
        }
    });
    
    // Reload leaderboard
    loadLeaderboard(period);
}

// ==================== LOAD LEADERBOARD ====================

// Load leaderboard data from Firebase
function loadLeaderboard(period) {
    console.log('📡 Loading leaderboard for period:', period);
    
    // Unsubscribe from previous listener
    if (unsubscribeLeaderboard) {
        console.log('🔌 Unsubscribing from previous listener');
        unsubscribeLeaderboard();
    }
    
    // Calculate date range based on period
    let startDate = null;
    if (period === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        console.log('📅 Week filter:', startDate);
    } else if (period === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        console.log('📅 Month filter:', startDate);
    }
    
    // Build query
    let query = db.collection('leaderboard')
        .orderBy('points', 'desc')
        .limit(50);
    
    // Note: For period filtering with date ranges, you need composite index
    // For now, we'll filter all-time only
    if (startDate && period !== 'all') {
        console.log('⚠️ Period filtering requires composite index in Firestore');
        // Uncomment when index is created:
        // query = db.collection('leaderboard')
        //     .where('lastUpdated', '>=', firebase.firestore.Timestamp.fromDate(startDate))
        //     .orderBy('lastUpdated', 'desc')
        //     .orderBy('points', 'desc')
        //     .limit(50);
    }
    
    // Real-time listener for leaderboard
    unsubscribeLeaderboard = query.onSnapshot(snapshot => {
        console.log(`📊 Received ${snapshot.size} leaderboard entries`);
        
        allLeaders = [];
        let rank = 1;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            allLeaders.push({
                userId: doc.id,
                rank: rank++,
                name: data.displayName || 'Anonymous',
                initials: getInitials(data.displayName || 'Anonymous'),
                photoURL: data.photoURL || null,
                points: data.points || 0,
                reports: data.totalReports || 0,
                badges: data.badgesEarned || 0,
                trend: calculateTrend(data),
                trendValue: Math.floor(Math.random() * 5) + 1 // Mock for now
            });
        });
        
        // Find current user's rank
        if (currentUserData && currentUserData.id !== 'guest') {
            const userIndex = allLeaders.findIndex(leader => leader.userId === currentUserData.id);
            currentUserRank = userIndex >= 0 ? userIndex + 1 : null;
            console.log('🎯 Current user rank:', currentUserRank || 'Not in top 50');
        }
        
        // Display data
        if (allLeaders.length > 0) {
            console.log('✅ Displaying leaderboard data');
            displayPodium(allLeaders.slice(0, 3));
            displayLeaderboardTable(allLeaders);
        } else {
            console.log('⚠️ No leaderboard data, loading mock data');
            loadMockLeaderboard();
        }
        
    }, error => {
        console.error('❌ Error loading leaderboard:', error);
        showError('Failed to load leaderboard: ' + error.message);
        loadMockLeaderboard();
    });
}

// Load mock leaderboard (fallback)
function loadMockLeaderboard() {
    console.log('📦 Loading mock leaderboard data');
    
    const mockNames = [
        'Arjun Kumar', 'Priya Sharma', 'Rahul Verma', 'Ananya Patel', 'Rohan Singh',
        'Sneha Reddy', 'Vikram Joshi', 'Divya Gupta', 'Amit Desai', 'Kavya Iyer',
        'Siddharth Roy', 'Meera Nair', 'Aditya Mehta', 'Pooja Shah', 'Karthik Rao'
    ];
    
    allLeaders = mockNames.map((name, index) => ({
        userId: `mock-${index}`,
        rank: index + 1,
        name: name,
        initials: getInitials(name),
        photoURL: null,
        points: 5000 - (index * 200),
        reports: 150 - (index * 5),
        badges: Math.max(8 - Math.floor(index / 2), 0),
        trend: Math.random() > 0.5 ? 'up' : 'down',
        trendValue: Math.floor(Math.random() * 5) + 1
    }));
    
    displayPodium(allLeaders.slice(0, 3));
    displayLeaderboardTable(allLeaders);
}

// Calculate trend based on recent activity
function calculateTrend(userData) {
    // You can implement this based on comparing current points with historical data
    // For now, return random for demonstration
    return Math.random() > 0.5 ? 'up' : 'down';
}

// ==================== DISPLAY FUNCTIONS ====================

// Display podium (top 3)
function displayPodium(topThree) {
    const container = document.getElementById('podiumContainer');
    
    if (!topThree || topThree.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No leaderboard data available</p>';
        return;
    }
    
    console.log('🏆 Displaying podium for top 3');
    
    container.innerHTML = topThree.map((leader, index) => {
        const avatarHTML = leader.photoURL 
            ? `<img src="${leader.photoURL}" alt="${leader.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
            : leader.initials;
            
        return `
            <div class="podium-card rank-${leader.rank}">
                <div class="medal">${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
                <div class="podium-avatar">${avatarHTML}</div>
                <div class="podium-name">${leader.name}</div>
                <div class="podium-points">
                    <i class="fas fa-star"></i>
                    ${leader.points.toLocaleString()}
                </div>
                <div class="podium-stats">
                    <div class="podium-stat">
                        <div class="podium-stat-value">${leader.reports}</div>
                        <div class="podium-stat-label">Reports</div>
                    </div>
                    <div class="podium-stat">
                        <div class="podium-stat-value">${leader.badges}</div>
                        <div class="podium-stat-label">Badges</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Display leaderboard table
function displayLeaderboardTable(leaders) {
    const tbody = document.getElementById('leaderboardBody');
    
    if (!leaders || leaders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">No leaderboard data available</td></tr>';
        return;
    }
    
    console.log(`📋 Displaying ${leaders.length} leaders in table`);
    
    tbody.innerHTML = leaders.map(leader => {
        const isCurrentUser = currentUserData && leader.userId === currentUserData.id;
        const topRankClass = leader.rank <= 3 ? 'top-rank' : '';
        const rowClass = isCurrentUser ? 'current-user' : '';
        
        const avatarHTML = leader.photoURL
            ? `<img src="${leader.photoURL}" alt="${leader.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`
            : `<div class="user-avatar-small">${leader.initials}</div>`;
        
        return `
            <tr class="${rowClass}">
                <td class="rank-cell ${topRankClass}">#${leader.rank}</td>
                <td>
                    <div class="user-cell">
                        ${avatarHTML}
                        <div class="user-info-small">
                            <div class="user-name">${leader.name}${isCurrentUser ? ' (You)' : ''}</div>
                            <div class="user-badges">
                                ${Array(Math.min(leader.badges, 8)).fill().map(() => '<div class="badge-icon">★</div>').join('')}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="points-cell">${leader.points.toLocaleString()}</td>
                <td class="reports-cell">${leader.reports}</td>
                <td class="trend-cell">
                    <span class="trend-${leader.trend}">
                        <i class="fas fa-arrow-${leader.trend === 'up' ? 'up' : 'down'}"></i>
                        ${leader.trendValue}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== CHALLENGES ====================

// Load challenges from Firebase
async function loadChallenges() {
    console.log('🎯 Loading challenges...');
    
    try {
        // Check if challenges collection exists
        const challengesSnapshot = await db.collection('challenges')
            .where('active', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(4)
            .get();
        
        if (!challengesSnapshot.empty) {
            console.log(`✅ Found ${challengesSnapshot.size} active challenges`);
            
            const challenges = [];
            challengesSnapshot.forEach(doc => {
                const data = doc.data();
                
                // Get user's progress for this challenge
                const userProgress = currentUserData?.challengeProgress?.[doc.id] || 0;
                
                challenges.push({
                    id: doc.id,
                    title: data.title,
                    description: data.description,
                    reward: data.reward,
                    progress: userProgress,
                    total: data.target,
                    timeLeft: calculateTimeLeft(data.endDate)
                });
            });
            
            displayChallenges(challenges);
        } else {
            console.log('⚠️ No challenges in Firebase, using defaults');
            loadDefaultChallenges();
        }
    } catch (error) {
        console.error('❌ Error loading challenges:', error);
        loadDefaultChallenges();
    }
}

// Load default challenges (fallback)
function loadDefaultChallenges() {
    console.log('📦 Loading default challenges');
    
    if (!currentUserData) {
        displayChallenges([]);
        return;
    }
    
    const challenges = [
        {
            title: 'Weekly Warrior',
            description: 'Report 10 sites this week',
            reward: '+500 points',
            progress: Math.min(currentUserData.totalReports || 0, 10),
            total: 10,
            timeLeft: '3 days left'
        },
        {
            title: 'Verification Expert',
            description: 'Get 20 reports verified',
            reward: '+750 points',
            progress: currentUserData.verifiedReports || 0,
            total: 20,
            timeLeft: '5 days left'
        },
        {
            title: 'Streak Master',
            description: 'Maintain a 7-day streak',
            reward: '+300 points',
            progress: currentUserData.currentStreak || 0,
            total: 7,
            timeLeft: 'Ongoing'
        },
        {
            title: 'Badge Collector',
            description: 'Earn 5 badges',
            reward: '+600 points',
            progress: currentUserData.badgesEarned || 0,
            total: 5,
            timeLeft: '1 week left'
        }
    ];
    
    displayChallenges(challenges);
}

// Calculate time left for challenges
function calculateTimeLeft(endDate) {
    if (!endDate) return 'Ongoing';
    
    const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
}

// Display challenges
function displayChallenges(challenges) {
    const grid = document.getElementById('challengesGrid');
    
    if (!challenges || challenges.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1; padding: 40px;">No active challenges at the moment</p>';
        return;
    }
    
    console.log(`🎯 Displaying ${challenges.length} challenges`);
    
    grid.innerHTML = challenges.map(challenge => {
        const percentage = Math.min((challenge.progress / challenge.total * 100), 100).toFixed(0);
        const isCompleted = challenge.progress >= challenge.total;
        
        return `
            <div class="challenge-card ${isCompleted ? 'completed' : ''}">
                <div class="challenge-header">
                    <div>
                        <div class="challenge-title">
                            ${challenge.title}
                            ${isCompleted ? '<span style="margin-left: 8px;">✓</span>' : ''}
                        </div>
                        <div class="challenge-description">${challenge.description}</div>
                    </div>
                    <div class="challenge-reward">${challenge.reward}</div>
                </div>
                <div class="challenge-progress">
                    <div class="challenge-progress-label">
                        <span>${challenge.progress}/${challenge.total} completed</span>
                        <span>${percentage}%</span>
                    </div>
                    <div class="challenge-progress-bar">
                        <div class="challenge-progress-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="challenge-time">
                    <i class="fas fa-clock"></i>
                    ${challenge.timeLeft}
                </div>
            </div>
        `;
    }).join('');
}

// ==================== HELPER FUNCTIONS ====================

// Get initials from name
function getInitials(name) {
    if (!name) return 'UN';
    return name.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Show error message
function showError(message) {
    console.error('❌', message);
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 500;
    `;
    notification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
}

// ==================== LOGOUT ====================

// Logout function
function logout() {
    if (typeof auth !== 'undefined' && auth.currentUser) {
        if (confirm('Are you sure you want to logout?')) {
            auth.signOut().then(() => {
                console.log('✅ Logged out successfully');
                window.location.href = '../pages/index.html';
            }).catch(error => {
                console.error('❌ Logout error:', error);
                alert('Failed to logout. Please try again.');
            });
        }
    } else {
        // No auth, just redirect
        window.location.href = '../pages/index.html';
    }
}

// ==================== CLEANUP ====================

// Cleanup listeners when page unloads
window.addEventListener('beforeunload', () => {
    console.log('🧹 Cleaning up listeners');
    if (unsubscribeLeaderboard) unsubscribeLeaderboard();
    if (unsubscribeUser) unsubscribeUser();
});

console.log('✅ Leaderboard page loaded - Ready to display data');
