// Leaderboard JavaScript
// Handles leaderboard display, rankings, and challenges

let currentPeriod = 'all';
let allLeaders = [];
let currentUserRank = 23; // Demo user rank

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set demo user
    setDemoUser();
    
    // Load initial data
    loadLeaderboard('all');
    loadChallenges();
});

// Set demo user info
function setDemoUser() {
    document.getElementById('displayName').textContent = 'Demo User';
    document.getElementById('userPoints').textContent = '1,250 points';
    const avatarEl = document.getElementById('userAvatar');
    avatarEl.innerHTML = 'DU';
}

// Switch tab
function switchTab(period) {
    currentPeriod = period;
    
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

// Load leaderboard data
function loadLeaderboard(period) {
    console.log('Loading leaderboard for period:', period);
    
    // Generate mock data based on period
    allLeaders = generateMockLeaders(period);
    
    // Display podium (top 3)
    displayPodium(allLeaders.slice(0, 3));
    
    // Display table (rank 4 onwards)
    displayLeaderboardTable(allLeaders);
}

// Generate mock leader data
function generateMockLeaders(period) {
    const names = [
        'Arjun Kumar', 'Priya Sharma', 'Rahul Verma', 'Ananya Patel', 'Rohan Singh',
        'Sneha Reddy', 'Vikram Joshi', 'Divya Gupta', 'Amit Desai', 'Kavya Iyer',
        'Siddharth Roy', 'Meera Nair', 'Aditya Mehta', 'Pooja Shah', 'Karthik Rao',
        'Lakshmi Pillai', 'Nikhil Malhotra', 'Anjali Bose', 'Varun Kapoor', 'Riya Das',
        'Suresh Kumar', 'Deepika Singh', 'Manish Agarwal', 'Swati Menon', 'Rajesh Pandey'
    ];
    
    const leaders = [];
    const multiplier = period === 'week' ? 0.3 : period === 'month' ? 0.6 : 1;
    
    for (let i = 0; i < 50; i++) {
        const basePoints = Math.floor((5000 - i * 80) * multiplier);
        const reports = Math.floor((150 - i * 2) * multiplier);
        const badges = Math.min(Math.floor(reports / 10), 8);
        
        leaders.push({
            rank: i + 1,
            name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''),
            initials: getInitials(names[i % names.length]),
            points: basePoints,
            reports: reports,
            badges: badges,
            trend: Math.random() > 0.5 ? 'up' : 'down',
            trendValue: Math.floor(Math.random() * 5) + 1
        });
    }
    
    return leaders;
}

// Get initials from name
function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('');
}

// Display podium (top 3)
function displayPodium(topThree) {
    const container = document.getElementById('podiumContainer');
    
    if (!topThree || topThree.length < 3) {
        container.innerHTML = '<p>Loading...</p>';
        return;
    }
    
    container.innerHTML = topThree.map((leader, index) => `
        <div class="podium-card rank-${leader.rank}">
            <div class="medal">${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
            <div class="podium-avatar">${leader.initials}</div>
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
    `).join('');
}

// Display leaderboard table
function displayLeaderboardTable(leaders) {
    const tbody = document.getElementById('leaderboardBody');
    
    if (!leaders || leaders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = leaders.map(leader => {
        const isCurrentUser = leader.rank === currentUserRank;
        const topRankClass = leader.rank <= 3 ? 'top-rank' : '';
        const rowClass = isCurrentUser ? 'current-user' : '';
        
        return `
            <tr class="${rowClass}">
                <td class="rank-cell ${topRankClass}">#${leader.rank}</td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-small">${leader.initials}</div>
                        <div class="user-info-small">
                            <div class="user-name">${leader.name}${isCurrentUser ? ' (You)' : ''}</div>
                            <div class="user-badges">
                                ${Array(leader.badges).fill().map(() => '<div class="badge-icon">★</div>').join('')}
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

// Load challenges
function loadChallenges() {
    const challenges = [
        {
            title: 'Weekly Warrior',
            description: 'Report 10 sites this week',
            reward: '+500 points',
            progress: 7,
            total: 10,
            timeLeft: '3 days left'
        },
        {
            title: 'Carbon Detective',
            description: 'Find 5 high-emission sites',
            reward: '+750 points',
            progress: 3,
            total: 5,
            timeLeft: '5 days left'
        },
        {
            title: 'Early Bird',
            description: 'Log in 7 days in a row',
            reward: '+300 points',
            progress: 5,
            total: 7,
            timeLeft: '2 days left'
        },
        {
            title: 'Team Player',
            description: 'Verify 15 community reports',
            reward: '+600 points',
            progress: 9,
            total: 15,
            timeLeft: '1 week left'
        }
    ];
    
    displayChallenges(challenges);
}

// Display challenges
function displayChallenges(challenges) {
    const grid = document.getElementById('challengesGrid');
    
    grid.innerHTML = challenges.map(challenge => {
        const percentage = (challenge.progress / challenge.total * 100).toFixed(0);
        
        return `
            <div class="challenge-card">
                <div class="challenge-header">
                    <div>
                        <div class="challenge-title">${challenge.title}</div>
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

// Logout function (disabled for demo)
function logout() {
    alert('Logout disabled in demo mode');
}
