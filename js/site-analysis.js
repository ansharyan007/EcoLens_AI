// Site Analysis JavaScript
// Handles site details, time-lapse animation, and reports

let currentSite = null;
let timelapseInterval = null;
let currentFrame = 0;
let isPlaying = false;
let carbonChart = null;

// Mock time-lapse data (10 years)
const timelapseData = {
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    carbonValues: [187, 195, 203, 215, 228, 242, 256, 265, 271, 273, 275],
    images: [
        'https://via.placeholder.com/800x600/1f2937/22c55e?text=2015',
        'https://via.placeholder.com/800x600/1f2937/3b82f6?text=2016',
        'https://via.placeholder.com/800x600/1f2937/6366f1?text=2017',
        'https://via.placeholder.com/800x600/1f2937/8b5cf6?text=2018',
        'https://via.placeholder.com/800x600/1f2937/a855f7?text=2019',
        'https://via.placeholder.com/800x600/1f2937/d946ef?text=2020',
        'https://via.placeholder.com/800x600/1f2937/ec4899?text=2021',
        'https://via.placeholder.com/800x600/1f2937/f43f5e?text=2022',
        'https://via.placeholder.com/800x600/1f2937/f97316?text=2023',
        'https://via.placeholder.com/800x600/1f2937/eab308?text=2024',
        'https://via.placeholder.com/800x600/1f2937/ef4444?text=2025'
    ]
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Get site ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const siteId = urlParams.get('id') || 'mock1';

    // Load site data
    loadSiteData(siteId);
});

// Load site data
async function loadSiteData(siteId) {
    try {
        // FOR TESTING: Load mock data
        console.log('Loading mock site data for:', siteId);
        loadMockSiteData(siteId);

        /* FIREBASE CODE - COMMENTED FOR TESTING
        const siteDoc = await db.collection('sites').doc(siteId).get();
        if (siteDoc.exists) {
            currentSite = { id: siteDoc.id, ...siteDoc.data() };
            displaySiteData(currentSite);
            loadReports(siteId);
        }
        */
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
        }
    };

    currentSite = mockSites[siteId] || mockSites['mock1'];
    displaySiteData(currentSite);
    loadMockReports();
}

// Display site data
function displaySiteData(site) {
    // Header
    document.getElementById('siteName').textContent = site.name;
    document.getElementById('locationText').textContent = site.address;

    // Metrics
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

    // Details
    document.getElementById('coordinates').textContent = 
        `${site.latitude.toFixed(4)}°N, ${site.longitude.toFixed(4)}°E`;
    document.getElementById('aiConfidence').textContent = 
        `${(site.aiConfidence * 100).toFixed(0)}%`;
    document.getElementById('firstReported').textContent = 
        site.firstReported.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('contributors').textContent = `${site.reportCount} users`;
}

// Switch tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.tab-btn').classList.add('active');

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Initialize chart if switching to timelapse
    if (tabName === 'timelapse' && !carbonChart) {
        setTimeout(() => initializeCarbonChart(), 100);
    }
}

// ==================== TIME-LAPSE FUNCTIONS ====================

// Initialize carbon chart
function initializeCarbonChart() {
    const ctx = document.getElementById('carbonChart');
    if (!ctx) return;

    carbonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timelapseData.years,
            datasets: [{
                label: 'Carbon Emissions (tons/year)',
                data: timelapseData.carbonValues,
                borderColor: '#eab308',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#eab308',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#fff',
                        font: { size: 14 }
                    }
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#22c55e',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    beginAtZero: false
                }
            }
        }
    });
}

// Toggle play/pause
function togglePlayPause() {
    if (isPlaying) {
        pauseTimelapse();
    } else {
        playTimelapse();
    }
}

// Play timelapse
function playTimelapse() {
    isPlaying = true;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    document.getElementById('playPauseBtn').classList.add('playing');

    timelapseInterval = setInterval(() => {
        currentFrame++;
        if (currentFrame >= timelapseData.years.length) {
            currentFrame = 0; // Loop back to start
        }
        updateTimelapseFrame(currentFrame);
    }, 1000); // 1 second per frame
}

// Pause timelapse
function pauseTimelapse() {
    isPlaying = false;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
    document.getElementById('playPauseBtn').classList.remove('playing');

    if (timelapseInterval) {
        clearInterval(timelapseInterval);
        timelapseInterval = null;
    }
}

// Reset timelapse
function resetTimelapse() {
    pauseTimelapse();
    currentFrame = 0;
    updateTimelapseFrame(0);
}

// Step forward
function stepForward() {
    pauseTimelapse();
    currentFrame = (currentFrame + 1) % timelapseData.years.length;
    updateTimelapseFrame(currentFrame);
}

// Seek timelapse
function seekTimelapse(value) {
    pauseTimelapse();
    currentFrame = parseInt(value);
    updateTimelapseFrame(currentFrame);
}

// Update timelapse frame
function updateTimelapseFrame(frame) {
    const year = timelapseData.years[frame];
    const carbon = timelapseData.carbonValues[frame];
    const image = timelapseData.images[frame];

    document.getElementById('timelapseImage').src = image;
    document.getElementById('currentYear').textContent = year;
    document.getElementById('currentCarbon').textContent = `${carbon} tons/year`;
    document.getElementById('timelapseProgress').value = frame;
}

// Download timelapse
function downloadTimelapse() {
    alert('Time-lapse download feature coming soon!\n\nThis will generate a video file of the 10-year animation.');
}

// ==================== OTHER FUNCTIONS ====================

// Go back
function goBack() {
    window.history.back();
}

// View on map
function viewOnMap() {
    if (currentSite) {
        window.location.href = `map.html?lat=${currentSite.latitude}&lng=${currentSite.longitude}`;
    }
}

// Share site
function shareSite() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: currentSite.name,
            text: `Check out this industrial site on EcoLens AI`,
            url: url
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

// Export report
function exportReport() {
    alert('Export report feature coming soon!\n\nThis will generate a PDF report with all site data and time-lapse analysis.');
}

// Zoom image
function zoomImage(type) {
    alert(`Zoom ${type} image feature coming soon!`);
}

// Load mock reports
function loadMockReports() {
    const mockReports = [
        {
            id: 1,
            userName: 'John Doe',
            userInitials: 'JD',
            date: new Date('2025-10-25'),
            status: 'verified',
            carbon: 245,
            confidence: 89,
            notes: 'High emissions detected from chimney stack'
        },
        {
            id: 2,
            userName: 'Jane Smith',
            userInitials: 'JS',
            date: new Date('2025-10-20'),
            status: 'verified',
            carbon: 238,
            confidence: 85,
            notes: 'Consistent with previous measurements'
        },
        {
            id: 3,
            userName: 'Mike Johnson',
            userInitials: 'MJ',
            date: new Date('2025-10-15'),
            status: 'pending',
            carbon: 252,
            confidence: 78,
            notes: 'Needs verification from additional sources'
        }
    ];

    displayReports(mockReports);
}

// Display reports
function displayReports(reports) {
    const reportsList = document.getElementById('reportsList');

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
                    ${report.status === 'verified' ? '✓ Verified' : '⏳ Pending'}
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

// Format date
function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// Logout (demo mode)
function logout() {
    alert('Logout disabled in demo mode');
}

console.log('Site analysis page loaded');