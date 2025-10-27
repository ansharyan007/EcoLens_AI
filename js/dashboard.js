// ============================================
// DASHBOARD.JS - Main Dashboard Logic
// ============================================

let db, auth;
let map, heatLayer;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Check authentication
    checkAuth();
    
    // Initialize components
    initSidebar();
    initTopNav();
    initHeatmap();
    
    // Load data
    loadDashboardData();
    
    // Setup real-time listeners
    setupRealtimeListeners();
    
    // Event listeners
    document.getElementById('timeFilter').addEventListener('change', loadTopContributors);
    document.getElementById('refreshHeatmap')?.addEventListener('click', loadHeatmapData);
});

// ============================================
// AUTHENTICATION
// ============================================

function checkAuth() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = '../index.html';
        } else {
            loadUserInfo(user);
        }
    });
}

function loadUserInfo(user) {
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const displayName = userData.name || user.email;
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
        .catch(error => console.error('Error loading user:', error));
}

// ============================================
// SIDEBAR & NAVIGATION
// ============================================

function initSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    menuToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (sidebar && !sidebar.contains(e.target) && !menuToggle?.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

function initTopNav() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    logoutBtn?.addEventListener('click', () => {
        auth.signOut().then(() => {
            showToast('Logged out successfully', 'success');
            window.location.href = '../index.html';
        }).catch(error => {
            console.error('Logout error:', error);
            showToast('Error logging out', 'error');
        });
    });
}

// ============================================
// LOAD DASHBOARD DATA
// ============================================

async function loadDashboardData() {
    try {
        await Promise.all([
            loadStatistics(),
            loadRecentReports(),
            loadTopContributors()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

// ============================================
// STATISTICS CARDS
// ============================================

async function loadStatistics() {
    try {
        // Count total sites
        const sitesSnapshot = await db.collection('sites').get();
        document.getElementById('totalSites').textContent = formatNumber(sitesSnapshot.size);
        
        // Count total users
        const usersSnapshot = await db.collection('users').get();
        document.getElementById('totalUsers').textContent = formatNumber(usersSnapshot.size);
        
        // Count total reports
        const reportsSnapshot = await db.collection('reports').get();
        document.getElementById('totalReports').textContent = formatNumber(reportsSnapshot.size);
        
        // Count violations
        let violationCount = 0;
        reportsSnapshot.forEach(doc => {
            if (doc.data().violationDetected === true) {
                violationCount++;
            }
        });
        document.getElementById('totalViolations').textContent = formatNumber(violationCount);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        document.getElementById('totalSites').textContent = '0';
        document.getElementById('totalUsers').textContent = '0';
        document.getElementById('totalReports').textContent = '0';
        document.getElementById('totalViolations').textContent = '0';
    }
}

// ============================================
// RECENT REPORTS
// ============================================

async function loadRecentReports() {
    const reportsList = document.getElementById('recentReportsList');
    
    try {
        const reportsSnapshot = await db.collection('reports')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        if (reportsSnapshot.empty) {
            reportsList.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-inbox"></i>
                    <p>No reports yet. Be the first to report!</p>
                </div>
            `;
            return;
        }
        
        reportsList.innerHTML = '';
        
        for (const doc of reportsSnapshot.docs) {
            const report = doc.data();
            
            let siteName = 'Unknown Site';
            if (report.siteId) {
                const siteDoc = await db.collection('sites').doc(report.siteId).get();
                if (siteDoc.exists) {
                    siteName = siteDoc.data().name;
                }
            }
            
            let userName = 'Anonymous';
            if (report.userId) {
                const userDoc = await db.collection('users').doc(report.userId).get();
                if (userDoc.exists) {
                    userName = userDoc.data().name;
                }
            }
            
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
        
    } catch (error) {
        console.error('Error loading recent reports:', error);
        reportsList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading reports</p>
            </div>
        `;
    }
}

// ============================================
// TOP CONTRIBUTORS
// ============================================

async function loadTopContributors() {
    const contributorsList = document.getElementById('topContributorsList');
    const timeFilter = document.getElementById('timeFilter').value;
    
    try {
        let query = db.collection('leaderboard')
            .orderBy('points', 'desc')
            .limit(5);
        
        if (timeFilter === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            query = query.where('lastActive', '>=', monthAgo);
        } else if (timeFilter === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            query = query.where('lastActive', '>=', weekAgo);
        }
        
        const contributorsSnapshot = await query.get();
        
        if (contributorsSnapshot.empty) {
            contributorsList.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-users"></i>
                    <p>No contributors yet</p>
                </div>
            `;
            return;
        }
        
        contributorsList.innerHTML = '';
        
        contributorsSnapshot.forEach((doc, index) => {
            const contributor = doc.data();
            
            let rankClass = '';
            if (index === 0) rankClass = 'gold';
            else if (index === 1) rankClass = 'silver';
            else if (index === 2) rankClass = 'bronze';
            
            const contributorItem = document.createElement('div');
            contributorItem.className = 'contributor-item';
            contributorItem.innerHTML = `
                <div class="contributor-rank ${rankClass}">${index + 1}</div>
                <img src="${contributor.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(contributor.name)}&background=random`}" 
                     alt="${contributor.name}" 
                     class="contributor-avatar">
                <div class="contributor-info">
                    <div class="contributor-name">${contributor.name}</div>
                    <div class="contributor-points">
                        <i class="fas fa-star"></i> ${formatNumber(contributor.points)} points
                    </div>
                </div>
            `;
            
            contributorsList.appendChild(contributorItem);
        });
        
    } catch (error) {
        console.error('Error loading top contributors:', error);
        contributorsList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading contributors</p>
            </div>
        `;
    }
}

// ============================================
// GLOBAL HEATMAP
// ============================================

function initHeatmap() {
    map = L.map('globalHeatmap').setView([20, 0], 2);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    loadHeatmapData();
}

async function loadHeatmapData() {
    try {
        const sitesSnapshot = await db.collection('sites').get();
        
        const heatData = [];
        sitesSnapshot.forEach(doc => {
            const site = doc.data();
            if (site.location && site.location.latitude && site.location.longitude) {
                const intensity = Math.min(site.carbonEmissions / 100, 1);
                heatData.push([
                    site.location.latitude,
                    site.location.longitude,
                    intensity
                ]);
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
        
    } catch (error) {
        console.error('Error loading heatmap data:', error);
    }
}

// ============================================
// REALTIME LISTENERS
// ============================================

function setupRealtimeListeners() {
    db.collection('reports')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    loadStatistics();
                    loadRecentReports();
                    
                    const badge = document.getElementById('notifBadge');
                    const currentCount = parseInt(badge.textContent) || 0;
                    badge.textContent = currentCount + 1;
                }
            });
        });
}

console.log('✅ Dashboard loaded successfully');
