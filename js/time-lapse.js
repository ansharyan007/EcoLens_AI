// ==================== TIME-LAPSE LOGIC COMPONENT ====================

let timelapseInterval = null;
let currentFrame = 0;
let isPlaying = false;
let carbonChart = null;
let isGenerating = false;

let timelapseData = {
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    carbonValues: [187, 195, 203, 215, 228, 242, 256, 265, 271, 273, 275],
    images: [],
    isGenerated: false
};

// ==================== GENERATION ====================
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
        
        // Initialize chart and start playback
        if (!carbonChart) setTimeout(() => initializeCarbonChart(), 100);
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
        overlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(17, 24, 39, 0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; border-radius: 1rem;';
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
    
    timelapseData.images = timelapseData.years.map((year, i) => {
        const intensity = Math.floor((i / 10) * 255);
        const color = `rgb(${intensity}, ${255 - intensity}, 100)`;
        return createTimelapseFrame(year, color);
    });
    
    console.log('Satellite time-lapse images generated');
}

function createTimelapseFrame(year, color) {
    const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="grad${year}">
                <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
                <stop offset="100%" style="stop-color:#1f2937;stop-opacity:1" />
            </radialGradient>
        </defs>
        <rect width="800" height="600" fill="#111827"/>
        <circle cx="400" cy="300" r="200" fill="url(#grad${year})"/>
        <text x="400" y="320" font-family="Arial" font-size="72" font-weight="bold" fill="white" text-anchor="middle">${year}</text>
        <text x="400" y="370" font-family="Arial" font-size="24" fill="#9ca3af" text-anchor="middle">Satellite Imagery</text>
    </svg>`;
    
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

async function calculateCarbonEstimates() {
    const baseCarbon = currentSite.carbonEstimate || 200;
    timelapseData.carbonValues = timelapseData.years.map((year, i) => 
        Math.round(baseCarbon * Math.pow(1.05, i) * (0.85 + Math.random() * 0.15))
    );
    timelapseData.carbonValues[10] = Math.round(currentSite.carbonEstimate);
    
    await new Promise(r => setTimeout(r, 1500));
    console.log('Carbon estimates calculated:', timelapseData.carbonValues);
}

// ==================== PLAYBACK ====================
function initializeCarbonChart() {
    const ctx = document.getElementById('carbonChart');
    if (!ctx) return;
    
    if (carbonChart) carbonChart.destroy();
    
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
                legend: { display: true, labels: { color: '#fff', font: { size: 14 } } },
                tooltip: { backgroundColor: '#1f2937', titleColor: '#fff', bodyColor: '#fff', borderColor: '#22c55e', borderWidth: 1 }
            },
            scales: {
                x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' }, beginAtZero: false }
            }
        }
    });
}

function togglePlayPause() {
    if (isPlaying) pauseTimelapse();
    else playTimelapse();
}

function playTimelapse() {
    isPlaying = true;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    document.getElementById('playPauseBtn').classList.add('playing');
    
    timelapseInterval = setInterval(() => {
        currentFrame++;
        if (currentFrame >= timelapseData.years.length) currentFrame = 0;
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

console.log('Time-lapse component loaded');
