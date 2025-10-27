// Leaderboard JavaScript - Simplified (All Time Only)
// Handles leaderboard display, rankings, and challenges

let allLeaders = [];
let currentUserData = null;
let currentUserRank = null;
let unsubscribeLeaderboard = null;
let unsubscribeUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏆 Leaderboard page initializing...');
    
    // Check authentication and load user data
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('✅ User authenticated:', user.email);
            loadCurrentUser(user.uid);
            loadLeaderboard();
            
            // Load challenges after user data is ready
            setTimeout(() => {
                loadChallenges();
            }, 1500);
        } else {
            console.log('❌ No user logged in, redirecting to login...');
            window.location.href = '../pages/login.html';
        }
    });
});

// ==================== LOAD CURRENT USER ====================

async function loadCurrentUser(userId) {
    console.log('👤 Loading user data for:', userId);
    
    try {
        unsubscribeUser = db.collection('users').doc(userId)
            .onSnapshot(doc => {
                if (doc.exists) {
                    currentUserData = { id: doc.id, ...doc.data() };
                    console.log('✅ User data loaded:', currentUserData.displayName);
                    updateUserUI();
                    loadChallenges();
                } else {
                    console.error('❌ User document not found');
                    showError('User profile not found');
                }
            }, error => {
                console.error('❌ Error loading user:', error);
                showError('Failed to load user data: ' + error.message);
            });
    } catch (error) {
        console.error('❌ Error setting up user listener:', error);
        showError('Failed to initialize user data');
    }
}

// Update user UI
function updateUserUI() {
    if (!currentUserData) return;
    
    const displayName = currentUserData.displayName || 'User';
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

// ==================== LOAD LEADERBOARD ====================

function loadLeaderboard() {
    console.log('📡 Loading leaderboard (All Time)...');
    
    if (unsubscribeLeaderboard) {
        unsubscribeLeaderboard();
    }
    
    // Query all-time leaderboard
    const query = db.collection('leaderboard')
        .orderBy('points', 'desc')
        .limit(50);
    
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
                trend: Math.random() > 0.5 ? 'up' : 'down',
                trendValue: Math.floor(Math.random() * 5) + 1
            });
        });
        
        // Find current user's rank
        if (currentUserData) {
            const userIndex = allLeaders.findIndex(leader => leader.userId === currentUserData.id);
            currentUserRank = userIndex >= 0 ? userIndex + 1 : null;
            console.log('🎯 Current user rank:', currentUserRank || 'Not in top 50');
        }
        
        // Display data
        if (allLeaders.length > 0) {
            displayPodium(allLeaders.slice(0, 3));
            displayLeaderboardTable(allLeaders);
        } else {
            displayEmptyState();
        }
        
    }, error => {
        console.error('❌ Error loading leaderboard:', error);
        showError('Failed to load leaderboard: ' + error.message);
        displayEmptyState();
    });
}

// Display empty state
function displayEmptyState() {
    document.getElementById('podiumContainer').innerHTML = 
        '<p style="text-align: center; color: #666; padding: 40px;">No leaderboard data available yet</p>';
    
    document.getElementById('leaderboardBody').innerHTML = 
        '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">No rankings available</td></tr>';
}

// ==================== DISPLAY FUNCTIONS ====================

function displayPodium(topThree) {
    const container = document.getElementById('podiumContainer');
    
    if (!topThree || topThree.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No leaderboard data available</p>';
        return;
    }
    
    container.innerHTML = topThree.map((leader, index) => {
        const isCurrentUser = currentUserData && leader.userId === currentUserData.id;
        const avatarHTML = leader.photoURL 
            ? `<img src="${leader.photoURL}" alt="${leader.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
            : leader.initials;
            
        return `
            <div class="podium-card rank-${leader.rank} ${isCurrentUser ? 'current-user-podium' : ''}">
                <div class="medal">${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
                <div class="podium-avatar">${avatarHTML}</div>
                <div class="podium-name">
                    ${leader.name}
                    ${isCurrentUser ? '<span style="font-size: 0.8rem; color: var(--primary);"> (You)</span>' : ''}
                </div>
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

function displayLeaderboardTable(leaders) {
    const tbody = document.getElementById('leaderboardBody');
    
    if (!leaders || leaders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">No leaderboard data available</td></tr>';
        return;
    }
    
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
                            <div class="user-name">
                                ${leader.name}${isCurrentUser ? ' <span style="color: var(--primary); font-weight: 600;">(You)</span>' : ''}
                            </div>
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

async function loadChallenges() {
    if (!currentUserData) return;
    
    console.log('🎯 Loading challenges...');
    
    try {
        const challengesSnapshot = await db.collection('challenges')
            .where('active', '==', true)
            .limit(4)
            .get();
        
        if (!challengesSnapshot.empty) {
            const challenges = [];
            challengesSnapshot.forEach(doc => {
                const data = doc.data();
                challenges.push({
                    title: data.title,
                    description: data.description,
                    reward: data.reward,
                    progress: currentUserData.challengeProgress?.[doc.id] || 0,
                    total: data.target,
                    timeLeft: 'Ongoing'
                });
            });
            displayChallenges(challenges);
        } else {
            loadDefaultChallenges();
        }
    } catch (error) {
        console.error('❌ Error loading challenges:', error);
        loadDefaultChallenges();
    }
}

function loadDefaultChallenges() {
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
            progress: Math.min(currentUserData.verifiedReports || 0, 20),
            total: 20,
            timeLeft: '5 days left'
        },
        {
            title: 'Streak Master',
            description: 'Maintain a 7-day streak',
            reward: '+300 points',
            progress: Math.min(currentUserData.currentStreak || 0, 7),
            total: 7,
            timeLeft: 'Ongoing'
        },
        {
            title: 'Badge Collector',
            description: 'Earn 5 badges',
            reward: '+600 points',
            progress: Math.min(currentUserData.badgesEarned || 0, 5),
            total: 5,
            timeLeft: '1 week left'
        }
    ];
    
    displayChallenges(challenges);
}

function displayChallenges(challenges) {
    const grid = document.getElementById('challengesGrid');
    
    if (!challenges || challenges.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">No active challenges</div>';
        return;
    }
    
    grid.innerHTML = challenges.map(challenge => {
        const percentage = Math.min((challenge.progress / challenge.total * 100), 100).toFixed(0);
        const isCompleted = challenge.progress >= challenge.total;
        
        return `
            <div class="challenge-card ${isCompleted ? 'completed' : ''}">
                <div class="challenge-header">
                    <div>
                        <div class="challenge-title">
                            ${challenge.title}
                            ${isCompleted ? '<span style="margin-left: 8px; color: #22c55e;">✓</span>' : ''}
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

function getInitials(name) {
    if (!name) return 'UN';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function showError(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #ef4444;
        color: white; padding: 15px 20px; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; font-weight: 500;
    `;
    notification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut().then(() => {
            window.location.href = '../pages/login.html';
        }).catch(error => {
            console.error('❌ Logout error:', error);
            alert('Failed to logout. Please try again.');
        });
    }
}

window.addEventListener('beforeunload', () => {
    if (unsubscribeLeaderboard) unsubscribeLeaderboard();
    if (unsubscribeUser) unsubscribeUser();
});

console.log('✅ Leaderboard page loaded');
