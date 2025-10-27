// Site Analysis JavaScript - ENHANCED WITH TIME-LAPSE GENERATION
// Handles site details, time-lapse animation, and reports

let currentSite = null;
let timelapseInterval = null;
let currentFrame = 0;
let isPlaying = false;
let carbonChart = null;
let isGenerating = false;

// Time-lapse data structure
let timelapseData = {
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    carbonValues: [187, 195, 203, 215, 228, 242, 256, 265, 271, 273, 275],
    images: [],
    isGenerated: false
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const siteId = urlParams.get('id') || 'mock1';
    loadSiteData(siteId);
});

// Load site data
async function loadSiteData(siteId) {
    try {
        console.log('Loading mock site data for:', siteId);
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
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.tab-btn').classList.add('active');
    
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'timelapse' && !carbonChart) {
        setTimeout(() => initializeCarbonChart(), 100);
    }
}

// ==================== TIME-LAPSE GENERATION ====================

async function generateTimeLapse() {
    if (isGenerating) return;
    
    // Switch to timelapse tab
    const timelapseTab = document.querySelectorAll('.tab-btn')[1];
    if (timelapseTab) timelapseTab.click();
    
    showGeneratingState();
    
    try {
        isGenerating = true;
        
        updateGeneratingProgress('Fetching satellite imagery...', 10);
        await new Promise(r => setTimeout(r, 1500));
        await fetchSatelliteImages(currentSite.latitude, currentSite.longitude);
        
        updateGeneratingProgress('Analyzing carbon emissions...', 40);
        await new Promise(r => setTimeout(r, 1500));
        
        updateGeneratingProgress('Running AI models...', 60);
        await calculateCarbonEstimates();
        
        updateGeneratingProgress('Generating time-lapse...', 80);
        await new Promise(r => setTimeout(r, 1000));
        
        timelapseData.isGenerated = true;
        updateGeneratingProgress('Complete!', 100);
        
        await new Promise(r => setTimeout(r, 500));
        hideGeneratingState();
        
        if (!carbonChart) {
            setTimeout(() => initializeCarbonChart(), 100);
        }
        
        setTimeout(() => playTimelapse(), 500);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate time-lapse. Using demo data.');
        hideGeneratingState();
    } finally {
        isGenerating = false;
    }
}

function showGeneratingState() {
    const viewer = document.querySelector('.timelapse-viewer');
    let overlay = document.getElementById('generatingOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'generatingOverlay';
        overlay.style.cssText = `
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(17, 24, 39, 0.95); display: flex;
            flex-direction: column; align-items: center; justify-content: center;
            z-index: 100; border-radius: 1rem;
        `;
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 400px;">
                <i class="fas fa-satellite fa-spin" style="font-size: 4rem; color: #22c55e; margin-bottom: 2rem;"></i>
                <h3 style="color: white; font-size: 1.5rem; margin-bottom: 1rem;">Generating Time-Lapse</h3>
                <p id="genStatus" style="color: #9ca3af; margin-bottom: 1.5rem;">Initializing...</p>
                <div style="width: 100%; height: 8px; background: #1f2937; border-radius: 4px; overflow: hidden;">
                    <div id="genProgress" style="width: 0%; height: 100%; background: #22c55e; transition: width 0.3s;"></div>
                </div>
                <p id="genPercent" style="color: #22c55e; margin-top: 0.5rem; font-weight: 600;">0%</p>
            </div>
        `;
        viewer.style.position = 'relative';
        viewer.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function updateGeneratingProgress(message, percent) {
    const status = document.getElementById('genStatus');
    const progress = document.getElementById('genProgress');
    const percentEl = document.getElementById('genPercent');
    if (status) status.textContent = message;
    if (progress) progress.style.width = percent + '%';
    if (percentEl) percentEl.textContent = percent + '%';
}

function hideGeneratingState() {
    const overlay = document.getElementById('generatingOverlay');
    if (overlay) overlay.style.display = 'none';
}

async function fetchSatelliteImages(lat, lon) {
    await new Promise(r => setTimeout(r, 2000));
    
    const colors = ['22c55e', '3b82f6', '6366f1', '8b5cf6', 'a855f7', 
                   'd946ef', 'ec4899', 'f43f5e', 'f97316', 'eab308', 'ef4444'];
    
    timelapseData.images = timelapseData.years.map((year, i) => 
        `https://via.placeholder.com/800x600/1f2937/${colors[i]}?text=${year}+Satellite`
    );
    
    console.log('Satellite images fetched for', lat, lon);
}

async function calculateCarbonEstimates() {
    const baseCarbon = currentSite.carbonEstimate || 200;
    const growthRate = 0.05;
    
    timelapseData.carbonValues = timelapseData.years.map((year, i) => 
        Math.round(baseCarbon * Math.pow(1.05, i) * (0.85 + Math.random() * 0.15))
    );
    
    timelapseData.carbonValues[10] = Math.round(currentSite.carbonEstimate);
    await new Promise(r => setTimeout(r, 1500));
    console.log('Carbon estimates calculated:', timelapseData.carbonValues);
}

// ==================== TIME-LAPSE PLAYBACK ====================

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
                    labels: { color: '#fff', font: { size: 14 } }
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

function togglePlayPause() {
    if (isPlaying) {
        pauseTimelapse();
    } else {
        playTimelapse();
    }
}

function playTimelapse() {
    isPlaying = true;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    document.getElementById('playPauseBtn').classList.add('playing');
    
    timelapseInterval = setInterval(() => {
        currentFrame++;
        if (currentFrame >= timelapseData.years.length) {
            currentFrame = 0;
        }
        updateTimelapseFrame(currentFrame);
    }, 1000);
}

function pauseTimelapse() {
    isPlaying = false;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
    document.getElementById('playPauseBtn').classList.remove('playing');
    
    if (timelapseInterval) {
        clearInterval(timelapseInterval);
        timelapseInterval = null;
    }
}

function resetTimelapse() {
    pauseTimelapse();
    currentFrame = 0;
    updateTimelapseFrame(0);
}

function stepForward() {
    pauseTimelapse();
    currentFrame = (currentFrame + 1) % timelapseData.years.length;
    updateTimelapseFrame(currentFrame);
}

function seekTimelapse(value) {
    pauseTimelapse();
    currentFrame = parseInt(value);
    updateTimelapseFrame(currentFrame);
}

function updateTimelapseFrame(frame) {
    const year = timelapseData.years[frame];
    const carbon = timelapseData.carbonValues[frame];
    const image = timelapseData.images[frame];
    
    const imgEl = document.getElementById('timelapseImage');
    if (imgEl) imgEl.src = image;
    
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = year;
    
    const carbonEl = document.getElementById('currentCarbon');
    if (carbonEl) carbonEl.textContent = `${carbon} tons/year`;
    
    const progressEl = document.getElementById('timelapseProgress');
    if (progressEl) progressEl.value = frame;
}

function downloadTimelapse() {
    alert('Time-lapse download feature\n\nGenerating video from frames...\n\nThis will create an MP4 file of the 10-year animation.\n\nFeature coming soon!');
}

// ==================== OTHER FUNCTIONS ====================

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
    alert('Export Report Feature\n\nGenerating comprehensive PDF report with:\n• Site details\n• Time-lapse analysis\n• Carbon trend data\n• Comparison charts\n\nFeature coming soon!');
}

function zoomImage(type) {
    alert(`Full-screen ${type} image viewer coming soon!`);
}

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

function logout() {
    alert('Logout disabled in demo mode');
}

console.log('Site analysis page loaded - Enhanced with time-lapse generation');
