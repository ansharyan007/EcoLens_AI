console.log('📊 Dashboard.js loading...');

let map, heatLayer;
let isDemoMode = false;
let currentUserData = null;
let unsubscribeUser = null;

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
    
    // Event listeners
    document.getElementById('timeFilter')?.addEventListener('change', loadTopContributors);
    document.getElementById('refreshHeatmap')?.addEventListener('click', loadHeatmapData);
    document.getElementById('zoomInHeatmap')?.addEventListener('click', zoomInHeatmap);
    document.getElementById('zoomOutHeatmap')?.addEventListener('click', zoomOutHeatmap);
});

// ============================================
// AUTHENTICATION
// ============================================

function checkAuth() {
    console.log('🔐 Checking auth...');
    
    auth.onAuthStateChanged(user => {
        if (!user) {
            console.log('⚠️ No user logged in - redirecting to login');
            window.location.href = '../pages/login.html';
        } else {
            console.log('✅ User logged in:', user.email);
            loadUserInfo(user);
            
            // Load dashboard data after user is authenticated
            loadDashboardData();
            
            // Setup real-time listeners
            setupRealtimeListeners();
        }
    });
}

function loadUserInfo(user) {
    console.log('👤 Loading user info for:', user.uid);
    
    // Use real-time listener for user data
    unsubscribeUser = db.collection('users').doc(user.uid)
        .onSnapshot(doc => {
            if (doc.exists) {
                currentUserData = { id: doc.id, ...doc.data() };
                console.log('✅ User data loaded:', currentUserData.displayName);
                updateUserUI();
            } else {
                console.error('❌ User document not found');
                loadDemoMode();
            }
        }, error => {
            console.error('❌ Error loading user:', error);
            loadDemoMode();
        });
}

function updateUserUI() {
    if (!currentUserData) {
        console.warn('⚠️ No user data available');
        return;
    }
    
    const displayName = currentUserData.displayName || currentUserData.email || 'User';
    const points = currentUserData.points || 0;
    const photoURL = currentUserData.photoURL;
    
    console.log('🎨 Updating UI for:', displayName, 'with', points, 'points');
    
    // Update sidebar user info (FIXED ELEMENT IDs)
    const displayNameEl = document.getElementById('displayName');
    if (displayNameEl) {
        displayNameEl.textContent = displayName;
        console.log('✅ Updated displayName');
    } else {
        console.warn('⚠️ displayName element not found');
    }
    
    const userPointsEl = document.getElementById('userPoints');
    if (userPointsEl) {
        userPointsEl.textContent = `${formatNumber(points)} points`;
        console.log('✅ Updated userPoints');
    } else {
        console.warn('⚠️ userPoints element not found');
    }
    
    const userAvatarEl = document.getElementById('userAvatar');
    if (userAvatarEl) {
        if (photoURL) {
            userAvatarEl.innerHTML = `<img src="${photoURL}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            userAvatarEl.innerHTML = getInitials(displayName);
        }
        console.log('✅ Updated userAvatar');
    } else {
        console.warn('⚠️ userAvatar element not found');
    }
    
    // Also update top nav if elements exist
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = displayName;
    }
    
    const topNavAvatarEl = document.getElementById('topNavAvatar');
    if (topNavAvatarEl && photoURL) {
        topNavAvatarEl.innerHTML = `<img src="${photoURL}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    }
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function loadDemoMode() {
    console.log('🎭 Loading demo mode');
    
    const displayNameEl = document.getElementById('displayName');
    if (displayNameEl) displayNameEl.textContent = 'Demo User';
    
    const userPointsEl = document.getElementById('userPoints');
    if (userPointsEl) userPointsEl.textContent = '1,250 points';
    
    const userAvatarEl = document.getElementById('userAvatar');
    if (userAvatarEl) userAvatarEl.innerHTML = 'DU';
}

// ============================================
// SIDEBAR & NAVIGATION
// ============================================

function initSidebar() {
    console.log('📱 Initializing sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    menuToggle?.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
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
        
        logout();
    });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Cleanup listeners
        if (unsubscribeUser) {
            unsubscribeUser();
        }
        
        auth.signOut().then(() => {
            console.log('✅ Logged out');
            window.location.href = '../pages/login.html';
        }).catch(error => {
            console.error('❌ Logout error:', error);
        });
    }
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
        
        // Initialize heatmap AFTER other data is loaded
        setTimeout(() => {
            initHeatmap();
        }, 500);
        
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
        // 1. Total Sites, Violations
        const sitesSnapshot = await db.collection('sites').get();
        let totalSites = sitesSnapshot.size;
        let violations = 0;
        sitesSnapshot.forEach(doc => {
            if (doc.data().verifiedViolation) violations++;
        });
        
        const totalSitesEl = document.getElementById('totalSites');
        if (totalSitesEl) totalSitesEl.textContent = formatNumber(totalSites);
        
        const totalViolationsEl = document.getElementById('totalViolations');
        if (totalViolationsEl) totalViolationsEl.textContent = formatNumber(violations);

        // 2. Total Users, Total Reports (summed from users)
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;
        let totalReports = 0;
        usersSnapshot.forEach(doc => {
            totalReports += doc.data().totalReports || 0;
        });
        
        const totalUsersEl = document.getElementById('totalUsers');
        if (totalUsersEl) totalUsersEl.textContent = formatNumber(totalUsers);
        
        const totalReportsEl = document.getElementById('totalReports');
        if (totalReportsEl) totalReportsEl.textContent = formatNumber(totalReports);

        console.log(`✅ Stats loaded: ${totalSites} sites, ${totalUsers} users, ${totalReports} reports, ${violations} violations`);

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
    
    const totalSitesEl = document.getElementById('totalSites');
    if (totalSitesEl) totalSitesEl.textContent = '47';
    
    const totalUsersEl = document.getElementById('totalUsers');
    if (totalUsersEl) totalUsersEl.textContent = '1.2K';
    
    const totalReportsEl = document.getElementById('totalReports');
    if (totalReportsEl) totalReportsEl.textContent = '523';
    
    const totalViolationsEl = document.getElementById('totalViolations');
    if (totalViolationsEl) totalViolationsEl.textContent = '18';
}

// ============================================
// RECENT REPORTS (from recentActivity)
// ============================================

async function loadRecentReports() {
    console.log('📋 Loading recent reports...');
    const reportsList = document.getElementById('recentReportsList');
    
    if (!reportsList) {
        console.warn('⚠️ recentReportsList element not found');
        return;
    }
    
    try {
        const usersSnapshot = await db.collection('users').get();
        let activities = [];
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            if (user.recentActivity && Array.isArray(user.recentActivity)) {
                user.recentActivity.forEach(act => {
                    if (act.type === 'report') {
                        activities.push({ 
                            ...act, 
                            user: user.displayName || user.email,
                            userId: doc.id 
                        });
                    }
                });
            }
        });
        
        activities.sort((a, b) => {
            const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
            const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
            return bTime - aTime;
        });
        
        const latest = activities.slice(0, 10);
        
        if (latest.length === 0) {
            console.log('⚠️ No recent activities found, loading mock reports');
            loadMockReports();
            return;
        }
        
        reportsList.innerHTML = '';
        
        for (const report of latest) {
            let siteName = report.siteName || report.message || 'Unknown Site';
            let userName = report.user || 'Anonymous';
            let timeAgo = formatTimeAgo(report.timestamp?.toDate ? report.timestamp.toDate() : new Date(report.timestamp || 0));
            let statusClass = report.status || 'verified';

            const reportItem = document.createElement('div');
            reportItem.className = 'report-item';
            reportItem.onclick = () => {
                if (report.siteId) {
                    window.location.href = `site-analysis.html?id=${report.siteId}`;
                }
            };
            reportItem.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(siteName)}&background=22c55e&color=fff"
                     alt="Report"
                     class="report-image">
                <div class="report-content">
                    <div class="report-title">${siteName}</div>
                    <div class="report-meta">
                        <span><i class="fas fa-user"></i> ${userName}</span>
                        <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                    </div>
                    <span class="report-status ${statusClass}">${statusClass.charAt(0).toUpperCase() + statusClass.slice(1)}</span>
                </div>
            `;
            
            reportsList.appendChild(reportItem);
        }
        
        console.log(`✅ ${latest.length} recent reports displayed`);
        
    } catch (error) {
        console.error('❌ Error loading recent reports:', error);
        loadMockReports();
    }
}

function loadMockReports() {
    console.log('🎭 Loading mock reports');
    const reportsList = document.getElementById('recentReportsList');
    
    if (!reportsList) return;
    
    const mockReports = [
        { site: 'Delhi Cement Plant', user: 'John Doe', time: '2 hours ago', status: 'verified' },
        { site: 'Mumbai Power Station', user: 'Jane Smith', time: '5 hours ago', status: 'violation' },
        { site: 'Bangalore Steel Factory', user: 'Mike Johnson', time: '1 day ago', status: 'verified' },
        { site: 'Chennai Refinery', user: 'Sarah Williams', time: '2 days ago', status: 'pending' },
        { site: 'Kolkata Chemical Plant', user: 'David Brown', time: '3 days ago', status: 'verified' }
    ];
    
    reportsList.innerHTML = mockReports.map(report => `
        <div class="report-item">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(report.site)}&background=22c55e&color=fff" alt="Report" class="report-image">
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
// TOP CONTRIBUTORS (from users)
// ============================================

async function loadTopContributors() {
    console.log('🏆 Loading top contributors...');
    const contributorsList = document.getElementById('topContributorsList');
    
    if (!contributorsList) {
        console.warn('⚠️ topContributorsList element not found');
        return;
    }
    
    try {
        const usersSnapshot = await db.collection('users').get();
        let users = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.points > 0) {
                users.push(userData);
            }
        });
        
        users.sort((a, b) => (b.points || 0) - (a.points || 0));
        users = users.slice(0, 5);
        
        if (users.length === 0) {
            console.log('⚠️ No contributors found, loading mock contributors');
            loadMockContributors();
            return;
        }

        contributorsList.innerHTML = '';
        
        users.forEach((contributor, index) => {
            let rankClass = '';
            if (index === 0) rankClass = 'gold';
            else if (index === 1) rankClass = 'silver';
            else if (index === 2) rankClass = 'bronze';

            const contributorItem = document.createElement('div');
            contributorItem.className = 'contributor-item';
            contributorItem.innerHTML = `
                <div class="contributor-rank ${rankClass}">${index + 1}</div>
                <img src="${contributor.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(contributor.displayName || 'User')}&background=random`}"
                     alt="${contributor.displayName}" 
                     class="contributor-avatar">
                <div class="contributor-info">
                    <div class="contributor-name">${contributor.displayName || contributor.email}</div>
                    <div class="contributor-points">
                        <i class="fas fa-star"></i> ${formatNumber(contributor.points)} points
                    </div>
                </div>
            `;
            contributorsList.appendChild(contributorItem);
        });
        
        console.log(`✅ ${users.length} contributors displayed`);
        
    } catch (error) {
        console.error('❌ Error loading top contributors:', error);
        loadMockContributors();
    }
}

function loadMockContributors() {
    console.log('🎭 Loading mock contributors');
    const contributorsList = document.getElementById('topContributorsList');
    
    if (!contributorsList) return;
    
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
// GLOBAL HEATMAP - FIXED VERSION
// ============================================

function initHeatmap() {
    console.log('🗺️ Initializing heatmap...');
    
    const heatmapEl = document.getElementById('globalHeatmap');
    if (!heatmapEl) {
        console.error('❌ globalHeatmap element not found!');
        return;
    }
    
    try {
        // Clear any existing map
        if (map) {
            map.remove();
        }
        
        // Initialize map with better view
        map = L.map('globalHeatmap', {
            center: [20, 0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 10,
            worldCopyJump: true
        });
        
        // Add tile layer with better visibility
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            noWrap: true
        }).addTo(map);
        
        console.log('✅ Heatmap initialized successfully');
        
        // Load heatmap data
        loadHeatmapData();
        
    } catch (error) {
        console.error('❌ Error initializing heatmap:', error);
        // Try to load mock heatmap as fallback
        setTimeout(loadMockHeatmap, 1000);
    }
}

async function loadHeatmapData() {
    console.log('🗺️ Loading heatmap data...');
    
    if (!map) {
        console.error('❌ Map not initialized');
        return;
    }
    
    try {
        const sitesSnapshot = await db.collection('sites').get();
        console.log(`✅ Found ${sitesSnapshot.size} sites for heatmap`);
        
        if (sitesSnapshot.size === 0) {
            console.log('⚠️ No sites found, loading mock heatmap');
            loadMockHeatmap();
            return;
        }
        
        const heatData = [];
        let maxCarbon = 0;
        
        // First pass: find maximum carbon value for normalization
        sitesSnapshot.forEach(doc => {
            const site = doc.data();
            const carbon = site.carbonEstimate || 0;
            if (carbon > maxCarbon) maxCarbon = carbon;
        });
        
        console.log(`📊 Max carbon value: ${maxCarbon}`);
        
        // Second pass: create heat data with normalized intensity
        sitesSnapshot.forEach(doc => {
            const site = doc.data();
            if (site.location) {
                const lat = site.location.latitude || site.location._lat;
                const lng = site.location.longitude || site.location._long;
                if (lat && lng) {
                    // Normalize intensity between 0.1 and 1.0
                    const carbon = site.carbonEstimate || 0;
                    const intensity = maxCarbon > 0 ? 
                        Math.max(0.1, Math.min(1.0, carbon / maxCarbon)) : 0.1;
                    
                    heatData.push([lat, lng, intensity]);
                }
            }
        });
        
        console.log(`📍 Generated ${heatData.length} heat points`);
        
        // Remove existing heat layer
        if (heatLayer) {
            map.removeLayer(heatLayer);
        }
        
        if (heatData.length > 0) {
            // Create heat layer with more vibrant settings
            heatLayer = L.heatLayer(heatData, {
                radius: 35,
                blur: 20,
                maxZoom: 8,
                minOpacity: 0.4,
                gradient: {
                    0.0: '#22c55e',  // Green
                    0.5: '#eab308',  // Yellow
                    0.8: '#f97316',  // Orange
                    1.0: '#ef4444'   // Red
                }
            }).addTo(map);
            
            console.log('✅ Heatmap data loaded successfully');
            
            // Fit map to show all heat points
            const group = new L.featureGroup(heatData.map(point => L.marker([point[0], point[1]])));
            map.fitBounds(group.getBounds().pad(0.1));
            
        } else {
            console.log('⚠️ No valid heat data points');
            loadMockHeatmap();
        }
        
    } catch (error) {
        console.error('❌ Error loading heatmap data:', error);
        loadMockHeatmap();
    }
}

function loadMockHeatmap() {
    console.log('🎭 Loading mock heatmap data');
    
    if (!map) {
        console.error('❌ Map not available for mock data');
        return;
    }
    
    // More vibrant mock data with higher intensities
    const mockLocations = [
        [28.7041, 77.1025, 0.8],  // Delhi - High intensity
        [19.0760, 72.8777, 0.9],  // Mumbai - Very high
        [12.9716, 77.5946, 0.6],  // Bangalore - Medium
        [13.0827, 80.2707, 0.7],  // Chennai - Medium-high
        [22.5726, 88.3639, 0.5],  // Kolkata - Medium
        [17.3850, 78.4867, 0.6],  // Hyderabad
        [18.5204, 73.8567, 0.4],  // Pune
        [26.9124, 75.7873, 0.3],  // Jaipur
        [26.8467, 80.9462, 0.5],  // Lucknow
        [23.0225, 72.5714, 0.4]   // Ahmedabad
    ];
    
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }
    
    heatLayer = L.heatLayer(mockLocations, {
        radius: 35,
        blur: 20,
        maxZoom: 8,
        minOpacity: 0.4,
        gradient: {
            0.0: '#22c55e',
            0.5: '#eab308', 
            0.8: '#f97316',
            1.0: '#ef4444'
        }
    }).addTo(map);
    
    // Fit map to show mock data
    const group = new L.featureGroup(mockLocations.map(point => L.marker([point[0], point[1]])));
    map.fitBounds(group.getBounds().pad(0.1));
    
    console.log('✅ Mock heatmap loaded');
}

function zoomInHeatmap() {
    if (map) {
        map.zoomIn();
    }
}

function zoomOutHeatmap() {
    if (map) {
        map.zoomOut();
    }
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
    
    db.collection('users')
        .onSnapshot(snapshot => {
            loadStatistics();
            loadRecentReports();
        }, error => {
            console.error('❌ Realtime listener error:', error);
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    console.log('🧹 Cleaning up listeners');
    if (unsubscribeUser) {
        unsubscribeUser();
    }
});

console.log('✅ Dashboard.js loaded successfully');