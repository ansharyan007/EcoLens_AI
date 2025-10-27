console.log('📊 Dashboard.js loading...');

let map, heatLayer;
let isDemoMode = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM loaded');
    
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase not loaded!');
        return;
    }
    console.log('✅ Firebase loaded');
    
    // Initialize Firebase
    try {
        console.log('✅ Firebase initialized');
    } catch (error) {
        console.error('❌ Firebase init error:', error);
        return;
    }
    
    // Check authentication
    checkAuth();
    
    // Initialize components
    initSidebar();
    initTopNav();
    initHeatmap();
    
    // Load data
    console.log('📥 Loading dashboard data...');
    loadDashboardData();
    
    // Setup real-time listeners
    setupRealtimeListeners();
    
    // Event listeners
    document.getElementById('timeFilter')?.addEventListener('change', loadTopContributors);
    document.getElementById('refreshHeatmap')?.addEventListener('click', loadHeatmapData);
});

// ============================================
// AUTHENTICATION
// ============================================

function checkAuth() {
    console.log('🔐 Checking auth...');
    
    auth.onAuthStateChanged(user => {
        if (!user) {
            console.log('⚠️ No user logged in - using demo mode');
            loadDemoMode();
            isDemoMode = true;
        } else {
            console.log('✅ User logged in:', user.email);
            loadUserInfo(user);
        }
    });
}

function loadUserInfo(user) {
    console.log('👤 Loading user info for:', user.uid);
    
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                console.log('✅ User data loaded:', userData);
                
                const displayName = userData.displayName || user.email;
                const points = userData.points || 0;
                
                // Update top nav
                document.getElementById('userName').textContent = displayName;
                document.getElementById('userAvatar').querySelector('img').src = 
                    userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=22c55e&color=fff`;
                
                // Update sidebar
                document.getElementById('sidebarUsername').textContent = displayName;
                document.getElementById('sidebarPoints').textContent = `${formatNumber(points)} points`;
                document.getElementById('sidebarAvatar').querySelector('img').src = 
                    userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=22c55e&color=fff`;
            }
        })
        .catch(error => {
            console.error('❌ Error loading user:', error);
            loadDemoMode();
        });
}

function loadDemoMode() {
    console.log('🎭 Loading demo mode');
    document.getElementById('userName').textContent = 'Demo User';
    document.getElementById('sidebarUsername').textContent = 'Demo User';
    document.getElementById('sidebarPoints').textContent = '1,250 points';
}

// ============================================
// SIDEBAR & NAVIGATION
// ============================================

function initSidebar() {
    console.log('📱 Initializing sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    menuToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

function initTopNav() {
    console.log('🔝 Initializing top nav');
    const logoutBtn = document.getElementById('logoutBtn');
    
    logoutBtn?.addEventListener('click', () => {
        if (isDemoMode) {
            alert('Demo mode - logout disabled');
            return;
        }
        
        auth.signOut().then(() => {
            console.log('✅ Logged out');
            window.location.href = 'index.html';
        }).catch(error => {
            console.error('❌ Logout error:', error);
        });
    });
}

// ============================================
// LOAD DASHBOARD DATA
// ============================================

async function loadDashboardData() {
    console.log('📥 Starting to load dashboard data...');
    
    try {
        await Promise.all([
            loadStatistics(),
            loadRecentReports(),
            loadTopContributors()
        ]);
        console.log('✅ All dashboard data loaded');
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        loadMockData();
    }
}

// ============================================
// STATISTICS CARDS
// ============================================

async function loadStatistics() {
    console.log('📊 Loading statistics...');
    
    try {
        // Count total sites
        const sitesSnapshot = await db.collection('sites').get();
        const totalSites = sitesSnapshot.size;
        console.log('✅ Sites count:', totalSites);
        document.getElementById('totalSites').textContent = formatNumber(totalSites);
        
        // Count total users
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;
        console.log('✅ Users count:', totalUsers);
        document.getElementById('totalUsers').textContent = formatNumber(totalUsers);
        
        // Count total reports
        const reportsSnapshot = await db.collection('reports').get();
        const totalReports = reportsSnapshot.size;
        console.log('✅ Reports count:', totalReports);
        document.getElementById('totalReports').textContent = formatNumber(totalReports);
        
        // Count violations
        let violationCount = 0;
        reportsSnapshot.forEach(doc => {
            if (doc.data().violationDetected === true) {
                violationCount++;
            }
        });
        console.log('✅ Violations count:', violationCount);
        document.getElementById('totalViolations').textContent = formatNumber(violationCount);
        
        // If all counts are 0, load mock data
        if (totalSites === 0 && totalUsers === 0 && totalReports === 0) {
            console.log('⚠️ No data found, loading mock data');
            loadMockStatistics();
        }
        
    } catch (error) {
        console.error('❌ Error loading statistics:', error);
        loadMockStatistics();
    }
}

function loadMockStatistics() {
    console.log('🎭 Loading mock statistics');
    document.getElementById('totalSites').textContent = '47';
    document.getElementById('totalUsers').textContent = '1.2K';
    document.getElementById('totalReports').textContent = '523';
    document.getElementById('totalViolations').textContent = '18';
}

// ============================================
// RECENT REPORTS
// ============================================

async function loadRecentReports() {
    console.log('📋 Loading recent reports...');
    const reportsList = document.getElementById('recentReportsList');
    
    try {
        const reportsSnapshot = await db.collection('reports')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        console.log('✅ Reports fetched:', reportsSnapshot.size);
        
        if (reportsSnapshot.empty) {
            console.log('⚠️ No reports found, loading mock data');
            loadMockReports();
            return;
        }
        
        reportsList.innerHTML = '';
        
        let reportCount = 0;
        for (const doc of reportsSnapshot.docs) {
            const report = doc.data();
            reportCount++;
            console.log(`✅ Processing report ${reportCount}:`, report);
            
            let siteName = report.siteName || 'Unknown Site';
            let userName = report.userName || 'Anonymous';
            
            const date = report.timestamp?.toDate();
            const timeAgo = formatTimeAgo(date);
            
            let statusClass = 'pending';
            let statusText = 'Pending';
            if (report.violationDetected) {
                statusClass = 'violation';
                statusText = 'Violation';
            } else if (report.verified) {
                statusClass = 'verified';
                statusText = 'Verified';
            }
            
            const reportItem = document.createElement('div');
            reportItem.className = 'report-item';
            reportItem.onclick = () => window.location.href = `site-analysis.html?id=${report.siteId}`;
            reportItem.innerHTML = `
                <img src="${report.imageUrl || 'https://via.placeholder.com/60'}" 
                     alt="Report" 
                     class="report-image"
                     onerror="this.src='https://via.placeholder.com/60?text=No+Image'">
                <div class="report-content">
                    <div class="report-title">${siteName}</div>
                    <div class="report-meta">
                        <span><i class="fas fa-user"></i> ${userName}</span>
                        <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                    </div>
                    <span class="report-status ${statusClass}">${statusText}</span>
                </div>
            `;
            
            reportsList.appendChild(reportItem);
        }
        
        console.log('✅ All reports displayed');
        
    } catch (error) {
        console.error('❌ Error loading recent reports:', error);
        loadMockReports();
    }
}

function loadMockReports() {
    console.log('🎭 Loading mock reports');
    const reportsList = document.getElementById('recentReportsList');
    const mockReports = [
        { site: 'Delhi Cement Plant', user: 'John Doe', time: '2 hours ago', status: 'verified' },
        { site: 'Mumbai Power Station', user: 'Jane Smith', time: '5 hours ago', status: 'violation' },
        { site: 'Bangalore Steel Factory', user: 'Mike Johnson', time: '1 day ago', status: 'verified' },
        { site: 'Chennai Refinery', user: 'Sarah Williams', time: '2 days ago', status: 'pending' },
        { site: 'Kolkata Chemical Plant', user: 'David Brown', time: '3 days ago', status: 'verified' }
    ];
    
    reportsList.innerHTML = mockReports.map(report => `
        <div class="report-item">
            <img src="https://via.placeholder.com/60" alt="Report" class="report-image">
            <div class="report-content">
                <div class="report-title">${report.site}</div>
                <div class="report-meta">
                    <span><i class="fas fa-user"></i> ${report.user}</span>
                    <span><i class="fas fa-clock"></i> ${report.time}</span>
                </div>
                <span class="report-status ${report.status}">${report.status}</span>
            </div>
        </div>
    `).join('');
}

// ============================================
// TOP CONTRIBUTORS
// ============================================

async function loadTopContributors() {
    console.log('🏆 Loading top contributors...');
    const contributorsList = document.getElementById('topContributorsList');
    const timeFilter = document.getElementById('timeFilter').value;
    
    try {
        let query = db.collection('leaderboard')
            .orderBy('points', 'desc')
            .limit(5);
        
        const contributorsSnapshot = await query.get();
        console.log('✅ Contributors fetched:', contributorsSnapshot.size);
        
        if (contributorsSnapshot.empty) {
            console.log('⚠️ No contributors found, loading mock data');
            loadMockContributors();
            return;
        }
        
        contributorsList.innerHTML = '';
        
        contributorsSnapshot.forEach((doc, index) => {
            const contributor = doc.data();
            console.log(`✅ Contributor ${index + 1}:`, contributor);
            
            let rankClass = '';
            if (index === 0) rankClass = 'gold';
            else if (index === 1) rankClass = 'silver';
            else if (index === 2) rankClass = 'bronze';
            
            const contributorItem = document.createElement('div');
            contributorItem.className = 'contributor-item';
            contributorItem.innerHTML = `
                <div class="contributor-rank ${rankClass}">${index + 1}</div>
                <img src="${contributor.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(contributor.displayName || contributor.name || 'User')}&background=random`}" 
                     alt="${contributor.displayName || contributor.name}" 
                     class="contributor-avatar">
                <div class="contributor-info">
                    <div class="contributor-name">${contributor.displayName || contributor.name || 'Anonymous'}</div>
                    <div class="contributor-points">
                        <i class="fas fa-star"></i> ${formatNumber(contributor.points)} points
                    </div>
                </div>
            `;
            
            contributorsList.appendChild(contributorItem);
        });
        
        console.log('✅ All contributors displayed');
        
    } catch (error) {
        console.error('❌ Error loading top contributors:', error);
        loadMockContributors();
    }
}

function loadMockContributors() {
    console.log('🎭 Loading mock contributors');
    const contributorsList = document.getElementById('topContributorsList');
    const mockContributors = [
        { name: 'Sarah Johnson', points: 2450 },
        { name: 'Mike Chen', points: 1890 },
        { name: 'Emma Davis', points: 1650 },
        { name: 'Alex Kumar', points: 1420 },
        { name: 'Lisa Wang', points: 1180 }
    ];
    
    contributorsList.innerHTML = mockContributors.map((contributor, index) => {
        let rankClass = '';
        if (index === 0) rankClass = 'gold';
        else if (index === 1) rankClass = 'silver';
        else if (index === 2) rankClass = 'bronze';
        
        return `
            <div class="contributor-item">
                <div class="contributor-rank ${rankClass}">${index + 1}</div>
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(contributor.name)}&background=random" 
                     alt="${contributor.name}" 
                     class="contributor-avatar">
                <div class="contributor-info">
                    <div class="contributor-name">${contributor.name}</div>
                    <div class="contributor-points">
                        <i class="fas fa-star"></i> ${formatNumber(contributor.points)} points
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// GLOBAL HEATMAP
// ============================================

function initHeatmap() {
    console.log('🗺️ Initializing heatmap...');
    
    try {
        map = L.map('globalHeatmap').setView([20, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);
        
        console.log('✅ Heatmap initialized');
        loadHeatmapData();
    } catch (error) {
        console.error('❌ Error initializing heatmap:', error);
    }
}

async function loadHeatmapData() {
    console.log('🗺️ Loading heatmap data...');
    
    try {
        const sitesSnapshot = await db.collection('sites').get();
        console.log('✅ Sites for heatmap:', sitesSnapshot.size);
        
        if (sitesSnapshot.empty) {
            console.log('⚠️ No sites found, loading mock heatmap');
            loadMockHeatmap();
            return;
        }
        
        const heatData = [];
        sitesSnapshot.forEach(doc => {
            const site = doc.data();
            if (site.location) {
                const lat = site.location.latitude || site.location._lat;
                const lng = site.location.longitude || site.location._long;
                const intensity = Math.min((site.carbonEmissions || 200) / 1000, 1);
                heatData.push([lat, lng, intensity]);
                console.log(`✅ Added heatmap point: ${lat}, ${lng}`);
            }
        });
        
        if (heatLayer) {
            map.removeLayer(heatLayer);
        }
        
        heatLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 10,
            gradient: {
                0.0: '#22c55e',
                0.5: '#eab308',
                1.0: '#ef4444'
            }
        }).addTo(map);
        
        console.log('✅ Heatmap data loaded');
        
    } catch (error) {
        console.error('❌ Error loading heatmap data:', error);
        loadMockHeatmap();
    }
}

function loadMockHeatmap() {
    console.log('🎭 Loading mock heatmap');
    const mockLocations = [
        [28.7041, 77.1025, 0.6],
        [19.0760, 72.8777, 0.9],
        [12.9716, 77.5946, 0.4],
        [13.0827, 80.2707, 0.7],
        [22.5726, 88.3639, 0.5]
    ];
    
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }
    
    heatLayer = L.heatLayer(mockLocations, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        gradient: {
            0.0: '#22c55e',
            0.5: '#eab308',
            1.0: '#ef4444'
        }
    }).addTo(map);
}

// ============================================
// REALTIME LISTENERS
// ============================================

function setupRealtimeListeners() {
    if (isDemoMode) {
        console.log('⚠️ Demo mode - skipping realtime listeners');
        return;
    }
    
    console.log('👂 Setting up realtime listeners');
    
    db.collection('reports')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    console.log('🔔 New report added');
                    loadStatistics();
                    loadRecentReports();
                    
                    const badge = document.getElementById('notifBadge');
                    const currentCount = parseInt(badge.textContent) || 0;
                    badge.textContent = currentCount + 1;
                }
            });
        });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatTimeAgo(date) {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

function loadMockData() {
    console.log('🎭 Loading all mock data');
    loadMockStatistics();
    loadMockReports();
    loadMockContributors();
    loadMockHeatmap();
}

console.log('✅ Dashboard.js loaded successfully');
