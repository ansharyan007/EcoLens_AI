// ==================== OVERVIEW COMPONENT - GROUND & SATELLITE VIEWS ====================

let currentSite = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const siteId = urlParams.get('id') || 'mock1';
    loadSiteData(siteId);
});

// Load site data
async function loadSiteData(siteId) {
    try {
        console.log('Loading site data for:', siteId);
        loadMockSiteData(siteId);
    } catch (error) {
        console.error('Error loading site:', error);
        loadMockSiteData(siteId);
    }
}

// Load mock site data
function loadMockSiteData(siteId) {
    const mockSites = {
        'mock1': {
            id: 'mock1',
            name: 'Delhi Cement Plant',
            latitude: 28.7041,
            longitude: 77.1025,
            address: 'Industrial Area, Delhi, India',
            facilityType: 'cement',
            carbonEstimate: 245,
            reportCount: 12,
            verifiedViolation: false,
            aiConfidence: 0.87,
            firstReported: new Date('2024-01-15')
        },
        'mock2': {
            id: 'mock2',
            name: 'Mumbai Power Station',
            latitude: 19.0760,
            longitude: 72.8777,
            address: 'Mumbai, Maharashtra, India',
            facilityType: 'power',
            carbonEstimate: 890,
            reportCount: 25,
            verifiedViolation: true,
            aiConfidence: 0.92,
            firstReported: new Date('2023-08-10')
        },
        'mock3': {
            id: 'mock3',
            name: 'Bangalore Steel Factory',
            latitude: 12.9716,
            longitude: 77.5946,
            address: 'Bangalore, Karnataka, India',
            facilityType: 'steel',
            carbonEstimate: 156,
            reportCount: 8,
            verifiedViolation: false,
            aiConfidence: 0.81,
            firstReported: new Date('2024-03-20')
        }
    };
    
    currentSite = mockSites[siteId] || mockSites['mock1'];
    displaySiteData(currentSite);
    loadMockReports();
}

// Display site data
function displaySiteData(site) {
    document.getElementById('siteName').textContent = site.name;
    document.getElementById('locationText').textContent = site.address;
    document.getElementById('facilityType').textContent = site.facilityType;
    document.getElementById('carbonEstimate').textContent = Math.round(site.carbonEstimate);
    document.getElementById('reportCount').textContent = site.reportCount;
    
    const statusEl = document.getElementById('violationStatus');
    if (site.verifiedViolation) {
        statusEl.textContent = 'Violation';
        statusEl.style.color = '#ef4444';
    } else {
        statusEl.textContent = 'Compliant';
        statusEl.style.color = '#22c55e';
    }
    
    document.getElementById('coordinates').textContent = `${site.latitude.toFixed(4)}°N, ${site.longitude.toFixed(4)}°E`;
    document.getElementById('aiConfidence').textContent = `${(site.aiConfidence * 100).toFixed(0)}%`;
    document.getElementById('firstReported').textContent = site.firstReported.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('contributors').textContent = `${site.reportCount} users`;
    setSiteImages(site);
}

// Set images (GROUND & SATELLITE)
function setSiteImages(site) {
    const satelliteImg = document.getElementById('satelliteImage');
    const groundImg = document.getElementById('groundImage');
    loadGoogleMapsImages(site.latitude, site.longitude, satelliteImg, groundImg);
    satelliteImg.alt = `Satellite view of ${site.name}`;
    groundImg.alt = `Ground view of ${site.name}`;
    console.log('Loading real imagery for:', site.name);
}

// Load real Google Maps satellite and street view images
function loadGoogleMapsImages(lat, lng, satelliteImg, groundImg) {
    const streetViewUrl = `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`;
    convertIframeToImage(streetViewUrl, groundImg, 'street');
    convertIframeToImage(`https://maps.google.com/maps?t=k&q=loc:${lat}+${lng}&output=embed&z=17`, satelliteImg, 'satellite');
}

// Convert iframe embed to displayable image format
function convertIframeToImage(iframeUrl, imgElement, type) {
    const imageCard = imgElement.parentElement;
    const existingIframe = imageCard.querySelector('iframe');
    if (existingIframe) existingIframe.remove();
    
    const newIframe = document.createElement('iframe');
    newIframe.style.cssText = 'width: 100%; height: 100%; border: none; border-radius: 0.5rem;';
    newIframe.src = iframeUrl;
    newIframe.title = type === 'street' ? 'Ground View' : 'Satellite View';
    imgElement.style.display = 'none';
    imageCard.insertBefore(newIframe, imgElement);
}

// Enhanced zoom functionality with iframe support
function zoomImage(type) {
    const site = currentSite;
    if (!site) return;
    
    const lat = site.latitude;
    const lng = site.longitude;
    let url;
    
    if (type === 'satellite') {
        url = `https://maps.google.com/maps?t=k&q=loc:${lat}+${lng}&output=embed&z=18`;
    } else {
        url = `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center;`;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
    closeBtn.style.cssText = `position: absolute; top: 20px; right: 20px; padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; z-index: 10001;`;
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `width: 90%; height: 90%; border: 2px solid #22c55e; border-radius: 12px;`;
    iframe.src = url;
    
    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    document.body.appendChild(modal);
}

// Switch tabs function
function switchTab(tabName) {
    // Remove active class from all tabs and panels
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    // Add active class to clicked tab
    event.target.closest('.tab-btn').classList.add('active');
    
    // Show corresponding panel
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Initialize chart if switching to timelapse tab
    if (tabName === 'timelapse' && typeof initializeCarbonChart === 'function') {
        if (!carbonChart) {
            setTimeout(() => initializeCarbonChart(), 100);
        }
    }
}

// Load mock reports
function loadMockReports() {
    const mockReports = [
        { id: 1, userName: 'John Doe', userInitials: 'JD', date: new Date('2025-10-25'), status: 'verified', carbon: 245, confidence: 89, notes: 'High emissions detected from chimney stack during peak operation hours' },
        { id: 2, userName: 'Jane Smith', userInitials: 'JS', date: new Date('2025-10-20'), status: 'verified', carbon: 238, confidence: 85, notes: 'Consistent with previous measurements, slight decrease noted' },
        { id: 3, userName: 'Mike Johnson', userInitials: 'MJ', date: new Date('2025-10-15'), status: 'pending', carbon: 252, confidence: 78, notes: 'Needs verification from additional sources, higher than average' }
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
                <span class="report-status ${report.status}">${report.status === 'verified' ? 'Verified' : 'Pending'}</span>
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

// Format date helper
function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Other utility functions
function goBack() {
    window.history.back();
}

function viewOnMap() {
    if (currentSite) {
        window.location.href = `map.html?lat=${currentSite.latitude}&lng=${currentSite.longitude}`;
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
    alert('Export Report Feature\n\nGenerating comprehensive PDF report with:\n- Site details\n- Time-lapse analysis\n- Carbon trend data\n- Comparison charts\n\nFeature coming soon!');
}

function logout() {
    alert('Logout disabled in demo mode');
}

console.log('Site analysis page loaded - Overview component initialized');
