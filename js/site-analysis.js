// ==================== SITE ANALYSIS - FIREBASE INTEGRATION (NO AUTH) ====================

// Assume auth and db are already declared in config.js
let currentSite = null;
let unsubscribeSite = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Site Analysis page initializing...');
    
    // Get site ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const siteId = urlParams.get('id');
    
    if (siteId) {
        console.log('📍 Loading site ID:', siteId);
        loadSiteData(siteId);
    } else {
        console.error('❌ No site ID in URL');
        showError('No site ID provided');
        
        // Try to load from sessionStorage as fallback
        const cachedData = sessionStorage.getItem('currentSiteData');
        if (cachedData) {
            console.log('✅ Found cached site data');
            currentSite = JSON.parse(cachedData);
            displaySiteData(currentSite);
            loadMockReports(); // Load reports if no siteId
        }
    }
    
    // Load user info if available (optional)
    loadUserInfoIfAvailable();
});

// ==================== LOAD SITE DATA FROM FIREBASE ====================

async function loadSiteData(siteId) {
    console.log('📡 Loading site data for ID:', siteId);
    
    try {
        // First, try to get data from sessionStorage (instant load)
        const cachedData = sessionStorage.getItem('currentSiteData');
        if (cachedData) {
            const siteData = JSON.parse(cachedData);
            console.log('✅ Found cached site data:', siteData.name);
            currentSite = siteData;
            displaySiteData(currentSite);
            loadReportsForSite(siteId);
        }
        
        // Then fetch from Firebase for real-time data
        console.log('🔍 Fetching from Firestore...');
        const siteDoc = await db.collection('sites').doc(siteId).get();
        
        if (siteDoc.exists) {
            const firestoreData = { id: siteDoc.id, ...siteDoc.data() };
            console.log('✅ Loaded from Firestore:', firestoreData);
            
            currentSite = {
                id: firestoreData.id,
                name: firestoreData.name || `${firestoreData.facilityType || 'Industrial'} Site`,
                latitude: firestoreData.latitude || firestoreData.location?.latitude,
                longitude: firestoreData.longitude || firestoreData.location?.longitude,
                address: firestoreData.address || 'Unknown location',
                facilityType: firestoreData.facilityType || 'unknown',
                carbonEstimate: firestoreData.carbonEstimate || 0,
                reportCount: firestoreData.reportCount || 0,
                verifiedViolation: firestoreData.verifiedViolation || false,
                aiConfidence: firestoreData.aiConfidence || 0.85,
                createdAt: firestoreData.createdAt,
                lastUpdated: firestoreData.lastUpdated,
                createdBy: firestoreData.createdBy,
                notes: firestoreData.notes || ''
            };
            
            displaySiteData(currentSite);
            loadReportsForSite(siteId);
            
            // Set up real-time listener for updates
            setupRealtimeListener(siteId);
        } else {
            console.warn('⚠️ Site not found in Firestore, trying mock data');
            loadMockSiteData(siteId);
        }
            
    } catch (error) {
        console.error('❌ Error loading site:', error);
        showError('Failed to load site data: ' + error.message);
        
        // Fallback to mock data
        loadMockSiteData(siteId);
    }
}

// Setup real-time listener
function setupRealtimeListener(siteId) {
    console.log('👂 Setting up real-time listener...');
    
    unsubscribeSite = db.collection('sites').doc(siteId)
        .onSnapshot(doc => {
            if (doc.exists) {
                console.log('🔄 Real-time update received');
                const data = doc.data();
                
                // Update current site data
                currentSite.carbonEstimate = data.carbonEstimate || currentSite.carbonEstimate;
                currentSite.reportCount = data.reportCount || currentSite.reportCount;
                currentSite.verifiedViolation = data.verifiedViolation;
                
                // Update UI elements that might change
                document.getElementById('carbonEstimate').textContent = Math.round(currentSite.carbonEstimate);
                document.getElementById('reportCount').textContent = currentSite.reportCount;
            }
        }, error => {
            console.error('❌ Real-time listener error:', error);
        });
}

// Load mock site data (fallback)
function loadMockSiteData(siteId) {
    console.log('📦 Loading mock data for:', siteId);
    
    const mockSites = {
        'mock1': {
            id: 'mock1',
            name: 'Delhi Cement Plant',
            latitude: 28.7041,
            longitude: 77.1025,
            address: 'Delhi, India',
            facilityType: 'cement',
            carbonEstimate: 245,
            reportCount: 12,
            verifiedViolation: false,
            aiConfidence: 0.87,
            createdAt: new Date('2024-01-15')
        },
        'mock2': {
            id: 'mock2',
            name: 'Mumbai Power Station',
            latitude: 19.0760,
            longitude: 72.8777,
            address: 'Mumbai, India',
            facilityType: 'power',
            carbonEstimate: 890,
            reportCount: 25,
            verifiedViolation: true,
            aiConfidence: 0.92,
            createdAt: new Date('2023-08-10')
        },
        'mock3': {
            id: 'mock3',
            name: 'Bangalore Steel Factory',
            latitude: 12.9716,
            longitude: 77.5946,
            address: 'Bangalore, India',
            facilityType: 'steel',
            carbonEstimate: 156,
            reportCount: 8,
            verifiedViolation: false,
            aiConfidence: 0.81,
            createdAt: new Date('2024-03-20')
        }
    };
    
    currentSite = mockSites[siteId] || mockSites['mock1'];
    displaySiteData(currentSite);
    loadMockReports();
}

// ==================== DISPLAY SITE DATA ====================

function displaySiteData(site) {
    console.log('🖼️ Displaying site:', site.name);
    console.log('📍 Coordinates:', site.latitude, site.longitude);
    
    // Update header
    document.getElementById('siteName').textContent = site.name;
    document.getElementById('locationText').textContent = site.address;
    
    // Update metrics
    document.getElementById('facilityType').textContent = formatFacilityType(site.facilityType);
    document.getElementById('carbonEstimate').textContent = Math.round(site.carbonEstimate);
    document.getElementById('reportCount').textContent = site.reportCount;
    
    // Update status
    const statusEl = document.getElementById('violationStatus');
    if (site.verifiedViolation) {
        statusEl.textContent = 'Violation';
        statusEl.style.color = '#ef4444';
    } else {
        statusEl.textContent = 'Compliant';
        statusEl.style.color = '#22c55e';
    }
    
    // Update details
    document.getElementById('coordinates').textContent = 
        `${site.latitude.toFixed(4)}°N, ${site.longitude.toFixed(4)}°E`;
    document.getElementById('aiConfidence').textContent = 
        `${(site.aiConfidence * 100).toFixed(0)}%`;
    
    // Format dates
    if (site.createdAt) {
        const date = site.createdAt.toDate ? site.createdAt.toDate() : new Date(site.createdAt);
        document.getElementById('firstReported').textContent = 
            date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else {
        document.getElementById('firstReported').textContent = 'Unknown';
    }
    
    document.getElementById('contributors').textContent = `${site.reportCount} users`;
    
    // Load images with ACTUAL coordinates from the site
    console.log('🗺️ Loading maps for:', site.latitude, site.longitude);
    setSiteImages(site);
}

// ==================== LOAD GOOGLE MAPS IMAGES ====================

function setSiteImages(site) {
    console.log('📸 Loading Google Maps images');
    console.log('   Latitude:', site.latitude);
    console.log('   Longitude:', site.longitude);
    
    const satelliteImg = document.getElementById('satelliteImage');
    const groundImg = document.getElementById('groundImage');
    
    // Load real Google Maps views with actual site coordinates
    loadGoogleMapsImages(site.latitude, site.longitude, satelliteImg, groundImg);
    
    satelliteImg.alt = `Satellite view of ${site.name}`;
    groundImg.alt = `Ground view of ${site.name}`;
}

// Load real Google Maps satellite and street view images
function loadGoogleMapsImages(lat, lng, satelliteImg, groundImg) {
    console.log('🌍 Creating map iframes for:', lat, lng);
    
    const satelliteCard = document.getElementById('satelliteImageCard');
    const groundCard = document.getElementById('groundImageCard');
    
    // Street View URL with exact coordinates
    const streetViewUrl = `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`;
    
    // Satellite View URL with exact coordinates
    const satelliteUrl = `https://maps.google.com/maps?t=k&q=loc:${lat}+${lng}&output=embed&z=17`;
    
    console.log('🛰️ Satellite URL:', satelliteUrl);
    console.log('🚶 Street View URL:', streetViewUrl);
    
    // Create iframes for both views
    createMapIframe(streetViewUrl, groundCard, groundImg, 'street');
    createMapIframe(satelliteUrl, satelliteCard, satelliteImg, 'satellite');
    
    console.log('✅ Map iframes created successfully');
}

// Create iframe for map display
function createMapIframe(url, cardElement, imgElement, type) {
    console.log(`🔧 Creating ${type} iframe`);
    
    // Remove existing iframe if any
    const existingIframe = cardElement.querySelector('iframe');
    if (existingIframe) {
        console.log(`   Removing existing ${type} iframe`);
        existingIframe.remove();
    }
    
    // Hide loading placeholder
    const loadingPlaceholder = cardElement.querySelector('.loading-placeholder');
    if (loadingPlaceholder) {
        loadingPlaceholder.style.display = 'none';
    }
    
    // Create new iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; border-radius: 0.5rem;';
    iframe.src = url;
    iframe.title = type === 'street' ? 'Ground View' : 'Satellite View';
    iframe.loading = 'lazy';
    
    // Hide the img element
    imgElement.style.display = 'none';
    
    // Insert iframe before img element
    cardElement.querySelector('.image-container').insertBefore(iframe, imgElement);
    
    console.log(`✅ ${type} iframe inserted`);
}

// ==================== ZOOM IMAGE FUNCTION ====================

function zoomImage(type) {
    if (!currentSite) {
        console.warn('⚠️ No current site data for zoom');
        return;
    }
    
    const lat = currentSite.latitude;
    const lng = currentSite.longitude;
    let url;
    
    if (type === 'satellite') {
        url = `https://maps.google.com/maps?t=k&q=loc:${lat}+${lng}&output=embed&z=18`;
    } else {
        url = `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`;
    }
    
    console.log('🔍 Opening fullscreen:', type, 'at', lat, lng);
    
    // Create fullscreen modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        z-index: 10001;
    `;
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `width: 90%; height: 90%; border: 2px solid #22c55e; border-radius: 12px;`;
    iframe.src = url;
    
    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    document.body.appendChild(modal);
}

// ==================== LOAD REPORTS FOR SITE ====================

async function loadReportsForSite(siteId) {
    console.log('📋 Loading reports for site:', siteId);
    
    try {
        const reportsSnapshot = await db.collection('reports')
            .where('siteId', '==', siteId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        if (reportsSnapshot.empty) {
            console.log('⚠️ No reports found, loading mock data');
            loadMockReports();
            return;
        }
        
        const reports = [];
        for (const doc of reportsSnapshot.docs) {
            const reportData = doc.data();
            
            // Get user info
            let userName = 'Anonymous';
            let userInitials = 'AN';
            
            if (reportData.userId) {
                try {
                    const userDoc = await db.collection('users').doc(reportData.userId).get();
                    if (userDoc.exists) {
                        userName = userDoc.data().displayName || 'Anonymous';
                        userInitials = getInitials(userName);
                    }
                } catch (error) {
                    console.error('Error loading user:', error);
                }
            }
            
            reports.push({
                id: doc.id,
                userName: userName,
                userInitials: userInitials,
                date: reportData.createdAt?.toDate() || new Date(),
                status: reportData.status || 'pending',
                carbon: reportData.carbonEstimate || 0,
                confidence: reportData.aiConfidence ? (reportData.aiConfidence * 100) : 85,
                notes: reportData.notes || 'No additional notes'
            });
        }
        
        console.log(`✅ Loaded ${reports.length} reports`);
        displayReports(reports);
        
    } catch (error) {
        console.error('❌ Error loading reports:', error);
        loadMockReports();
    }
}

// Load mock reports (fallback)
function loadMockReports() {
    console.log('📦 Loading mock reports');
    
    const mockReports = [
        { 
            id: 1, 
            userName: 'John Doe', 
            userInitials: 'JD', 
            date: new Date('2025-10-25'), 
            status: 'verified', 
            carbon: 245, 
            confidence: 89, 
            notes: 'High emissions detected from chimney stack during peak operation hours' 
        },
        { 
            id: 2, 
            userName: 'Jane Smith', 
            userInitials: 'JS', 
            date: new Date('2025-10-20'), 
            status: 'verified', 
            carbon: 238, 
            confidence: 85, 
            notes: 'Consistent with previous measurements, slight decrease noted' 
        },
        { 
            id: 3, 
            userName: 'Mike Johnson', 
            userInitials: 'MJ', 
            date: new Date('2025-10-15'), 
            status: 'pending', 
            carbon: 252, 
            confidence: 78, 
            notes: 'Needs verification from additional sources, higher than average' 
        }
    ];
    displayReports(mockReports);
}

// Display reports
function displayReports(reports) {
    const reportsList = document.getElementById('reportsList');
    if (!reportsList) return;
    
    if (reports.length === 0) {
        reportsList.innerHTML = '<div class="loading-state"><p>No reports found</p></div>';
        return;
    }
    
    reportsList.innerHTML = reports.map(report => `
        <div class="report-card">
            <div class="report-header">
                <div class="report-user">
                    <div class="report-avatar">${report.userInitials}</div>
                    <div>
                        <div class="report-username">${report.userName}</div>
                        <div class="report-date">${formatDate(report.date)}</div>
                    </div>
                </div>
                <span class="report-status ${report.status}">
                    ${report.status === 'verified' ? 'Verified' : 'Pending'}
                </span>
            </div>
            <div class="report-details">${report.notes}</div>
            <div class="report-metrics">
                <div class="report-metric">
                    <i class="fas fa-smog"></i>
                    <span>${report.carbon} tons/year</span>
                </div>
                <div class="report-metric">
                    <i class="fas fa-brain"></i>
                    <span>${report.confidence}% confidence</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== HELPER FUNCTIONS ====================

function getInitials(name) {
    if (!name) return 'UN';
    return name.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function formatFacilityType(type) {
    const types = {
        'cement': 'Cement Plant',
        'steel': 'Steel Factory',
        'power': 'Power Plant',
        'refinery': 'Oil Refinery',
        'chemical': 'Chemical Plant',
        'other': 'Industrial Facility'
    };
    return types[type] || 'Industrial Site';
}

function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ==================== LOAD USER INFO (OPTIONAL) ====================

async function loadUserInfoIfAvailable() {
    try {
        // Check if auth is available and user is logged in
        if (typeof auth !== 'undefined' && auth.currentUser) {
            const userId = auth.currentUser.uid;
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                document.getElementById('displayName').textContent = userData.displayName || 'User';
                document.getElementById('userPoints').textContent = `${userData.points || 0} points`;
                
                const avatarEl = document.getElementById('userAvatar');
                if (userData.photoURL) {
                    avatarEl.innerHTML = `<img src="${userData.photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                } else {
                    avatarEl.innerHTML = getInitials(userData.displayName || 'User');
                }
            }
        } else {
            // Set default values
            document.getElementById('displayName').textContent = 'Guest User';
            document.getElementById('userPoints').textContent = '0 points';
            document.getElementById('userAvatar').innerHTML = 'GU';
        }
    } catch (error) {
        console.log('ℹ️ User info not available (optional)');
        document.getElementById('displayName').textContent = 'Guest User';
        document.getElementById('userPoints').textContent = '0 points';
        document.getElementById('userAvatar').innerHTML = 'GU';
    }
}

// ==================== TAB SWITCHING ====================

function switchTab(tabName) {
    // Remove active class from all tabs and panels
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    // Add active class to clicked tab
    event.target.closest('.tab-btn').classList.add('active');
    
    // Show corresponding panel
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// ==================== NAVIGATION FUNCTIONS ====================

function goBack() {
    window.location.href = 'map.html';
}

function viewOnMap() {
    if (currentSite) {
        window.location.href = `map.html?lat=${currentSite.latitude}&lng=${currentSite.longitude}`;
    }
}

function openTimelapsePage() {
    if (currentSite) {
        sessionStorage.setItem('timelapseData', JSON.stringify({
            siteId: currentSite.id,
            siteName: currentSite.name,
            latitude: currentSite.latitude,
            longitude: currentSite.longitude,
            carbonEstimate: currentSite.carbonEstimate,
            facilityType: currentSite.facilityType
        }));
        window.location.href = `time-lapse-page.html?siteId=${currentSite.id}`;
    }
}

function shareSite() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: currentSite.name,
            text: `Check out this industrial site on EcoLens AI: ${currentSite.carbonEstimate} tons CO2/year`,
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

function exportReport() {
    alert('Export Report Feature\n\nGenerating comprehensive PDF report with:\n- Site details\n- Carbon trend data\n- Analysis history\n\nFeature coming soon!');
}

function logout() {
    if (typeof auth !== 'undefined') {
        if (confirm('Are you sure you want to logout?')) {
            auth.signOut().then(() => {
                window.location.href = '../pages/index.html';
            }).catch(error => {
                console.error('Logout error:', error);
            });
        }
    } else {
        window.location.href = '../pages/index.html';
    }
}

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
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeSite) {
        console.log('🧹 Cleaning up listeners');
        unsubscribeSite();
    }
});

console.log('✅ Site analysis page loaded - Ready to load site data');
