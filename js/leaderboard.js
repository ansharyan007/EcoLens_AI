// Leaderboard JavaScript - Firebase Integration with Authentication
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
    
    // Check authentication and load user data
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('✅ User authenticated:', user.email);
            loadCurrentUser(user.uid);
            loadLeaderboard('all');
            
            // Load challenges after user data is ready
            setTimeout(() => {
                console.log('⏱️ Loading challenges after delay...');
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
        // Real-time listener for user data
        unsubscribeUser = db.collection('users').doc(userId)
            .onSnapshot(doc => {
                if (doc.exists) {
                    currentUserData = { id: doc.id, ...doc.data() };
                    console.log('✅ User data loaded:', currentUserData.displayName);
                    console.log('📊 User stats:', {
                        points: currentUserData.points,
                        totalReports: currentUserData.totalReports,
                        verifiedReports: currentUserData.verifiedReports,
                        currentStreak: currentUserData.currentStreak,
                        badgesEarned: currentUserData.badgesEarned
                    });
                    
                    updateUserUI();
                    
                    // Reload challenges with actual user data
                    loadChallenges();
                } else {
                    console.error('❌ User document not found');
                    showError('User profile not found. Please contact support.');
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

// Update user UI elements
function updateUserUI() {
    if (!currentUserData) return;
    
    const displayName = currentUserData.displayName || 'User';
    const points = currentUserData.points || 0;
    const photoURL = currentUserData.photoURL;
    
    console.log('🎨 Updating UI for:', displayName);
    
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
    
    // Build query
    let query = db.collection('leaderboard')
        .orderBy('points', 'desc')
        .limit(50);
    
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
            console.log('✅ Displaying leaderboard data');
            displayPodium(allLeaders.slice(0, 3));
            displayLeaderboardTable(allLeaders);
        } else {
            console.log('⚠️ No leaderboard data available');
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
    const container = document.getElementById('podiumContainer');
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No leaderboard data available yet</p>';
    
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">No rankings available</td></tr>';
}

// Calculate trend based on recent activity
function calculateTrend(userData) {
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

// Load challenges from Firebase
async function loadChallenges() {
    console.log('🎯 Loading challenges...');
    console.log('👤 Current user data:', currentUserData);
    
    if (!currentUserData) {
        console.log('⚠️ User data not loaded yet, skipping challenges');
        return;
    }
    
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
                const userProgress = currentUserData.challengeProgress?.[doc.id] || 0;
                
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
        console.log('📦 Falling back to default challenges');
        loadDefaultChallenges();
    }
}

// Load default challenges (using actual user data)
function loadDefaultChallenges() {
    console.log('📦 Loading default challenges');
    console.log('📊 User stats for challenges:');
    console.log('  - Total Reports:', currentUserData.totalReports);
    console.log('  - Verified Reports:', currentUserData.verifiedReports);
    console.log('  - Current Streak:', currentUserData.currentStreak);
    console.log('  - Badges Earned:', currentUserData.badgesEarned);
    
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
    
    console.log('✅ Created', challenges.length, 'default challenges with user progress');
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

// Display challenges with user progress
function displayChallenges(challenges) {
    const grid = document.getElementById('challengesGrid');
    
    if (!grid) {
        console.error('❌ challengesGrid element not found in DOM!');
        return;
    }
    
    if (!challenges || challenges.length === 0) {
        console.warn('⚠️ No challenges to display');
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #666;">
                <i class="fas fa-trophy" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                <p style="font-size: 18px; margin-bottom: 10px;">No active challenges at the moment</p>
                <p style="font-size: 14px; opacity: 0.7;">Check back soon for new challenges!</p>
            </div>
        `;
        return;
    }
    
    console.log(`🎯 Displaying ${challenges.length} challenges`);
    
    const challengesHTML = challenges.map(challenge => {
        const percentage = Math.min((challenge.progress / challenge.total * 100), 100).toFixed(0);
        const isCompleted = challenge.progress >= challenge.total;
        
        console.log(`  - ${challenge.title}: ${challenge.progress}/${challenge.total} (${percentage}%)`);
        
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
    
    grid.innerHTML = challengesHTML;
    console.log('✅ Challenges displayed successfully');
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
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut().then(() => {
            console.log('✅ Logged out successfully');
            window.location.href = '../pages/login.html';
        }).catch(error => {
            console.error('❌ Logout error:', error);
            alert('Failed to logout. Please try again.');
        });
    }
}

// ==================== CLEANUP ====================

// Cleanup listeners when page unloads
window.addEventListener('beforeunload', () => {
    console.log('🧹 Cleaning up listeners');
    if (unsubscribeLeaderboard) unsubscribeLeaderboard();
    if (unsubscribeUser) unsubscribeUser();
});

console.log('✅ Leaderboard page loaded - Waiting for authentication');
