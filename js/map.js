// Map Explorer JavaScript with Environmental Layers
// Handles map, sites, and environmental data

let map;
let markers = [];
let allSites = [];
let addMode = false;
let tempMarker = null;
let selectedLocation = null;

// Environmental layers
let activeLayers = {
    aqi: null,
    pollution: null,
    rainfall: null,
    nitrogen: null,
    temperature: null
};
let layerMarkers = [];

// OpenWeather API Key - Get free key from openweathermap.org
const OPENWEATHER_API_KEY = 'demo'; // Replace with your API key

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadSites();
    loadUserInfo();
});

// Initialize map
function initMap() {
    map = L.map('map').setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    map.on('click', function(e) {
        if (addMode) {
            handleMapClick(e);
        }
    });
}

// Load sites from Firestore
async function loadSites() {
    try {
        const sitesRef = db.collection('sites');
        const snapshot = await sitesRef.limit(500).get();

        allSites = [];
        snapshot.forEach(doc => {
            allSites.push({ id: doc.id, ...doc.data() });
        });

        if (allSites.length === 0) {
            loadMockSites();
        } else {
            displaySitesOnMap(allSites);
            displaySitesInSidebar(allSites);
        }
    } catch (error) {
        console.error('Error loading sites:', error);
        loadMockSites();
    }
}

// Display sites on map
function displaySitesOnMap(sites) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    sites.forEach(site => {
        if (site.latitude && site.longitude) {
            const marker = createMarker(site);
            markers.push(marker);
        }
    });
}

// Create marker
function createMarker(site) {
    const color = getMarkerColor(site.carbonEstimate || 0);

    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:30px;height:30px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    const marker = L.marker([site.latitude, site.longitude], { icon }).addTo(map);

    const popupContent = `
        <div>
            <div class="popup-title">${site.name || 'Industrial Site'}</div>
            <div class="popup-type">${site.facilityType || 'Unknown'}</div>
            <div class="popup-emission">
                <i class="fas fa-smog"></i>
                <span><strong>${(site.carbonEstimate || 0).toFixed(0)}</strong> tons/year</span>
            </div>
            <div class="popup-actions">
                <button class="popup-btn popup-btn-primary" onclick="viewSiteDetails('${site.id}')">
                    View Details
                </button>
            </div>
        </div>
    `;

    marker.bindPopup(popupContent);
    return marker;
}

function getMarkerColor(carbonEstimate) {
    if (carbonEstimate < 100) return '#22c55e';
    if (carbonEstimate < 300) return '#eab308';
    return '#ef4444';
}

// Display sites in sidebar
function displaySitesInSidebar(sites) {
    const sitesList = document.getElementById('sitesList');

    if (sites.length === 0) {
        sitesList.innerHTML = '<div class="empty-state"><i class="fas fa-map-marked-alt"></i><p>No sites found</p></div>';
        return;
    }

    sitesList.innerHTML = sites.map(site => createSiteCard(site)).join('');
}

function createSiteCard(site) {
    const iconClass = getIconClass(site.facilityType);
    const emissionClass = getEmissionClass(site.carbonEstimate || 0);
    const carbon = (site.carbonEstimate || 0).toFixed(0);

    return `
        <div class="site-card" onclick="zoomToSite(${site.latitude}, ${site.longitude}, '${site.id}')">
            <div class="site-card-header">
                <div class="site-icon-wrapper">
                    <div class="site-icon ${site.facilityType || 'other'}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="site-info">
                        <h3>${site.name || 'Industrial Site'}</h3>
                        <p>${site.address || 'Unknown location'}</p>
                    </div>
                </div>
                ${site.verifiedViolation ? '<span class="violation-badge">Violation</span>' : ''}
            </div>
            <div class="site-card-footer">
                <span class="site-type">${site.facilityType || 'unknown'}</span>
                <span class="site-emissions ${emissionClass}">
                    <i class="fas fa-chart-line"></i>
                    ${carbon} tons/year
                </span>
            </div>
        </div>
    `;
}

function getIconClass(type) {
    const icons = {
        cement: 'fas fa-industry',
        steel: 'fas fa-hammer',
        power: 'fas fa-bolt',
        refinery: 'fas fa-oil-can',
        chemical: 'fas fa-flask',
        other: 'fas fa-building'
    };
    return icons[type] || icons.other;
}

function getEmissionClass(carbon) {
    if (carbon < 100) return 'low';
    if (carbon < 300) return 'medium';
    return 'high';
}

function filterSites() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const emissionFilter = document.getElementById('emissionFilter').value;

    let filtered = allSites.filter(site => {
        const matchesSearch = !searchQuery || 
            (site.name && site.name.toLowerCase().includes(searchQuery)) ||
            (site.address && site.address.toLowerCase().includes(searchQuery)) ||
            (site.facilityType && site.facilityType.toLowerCase().includes(searchQuery));

        const carbon = site.carbonEstimate || 0;
        let matchesEmission = true;
        if (emissionFilter === 'low') matchesEmission = carbon < 100;
        else if (emissionFilter === 'medium') matchesEmission = carbon >= 100 && carbon < 300;
        else if (emissionFilter === 'high') matchesEmission = carbon >= 300;

        return matchesSearch && matchesEmission;
    });

    displaySitesOnMap(filtered);
    displaySitesInSidebar(filtered);
}

function zoomToSite(lat, lon, siteId) {
    map.setView([lat, lon], 15);
    markers.forEach(marker => {
        const markerPos = marker.getLatLng();
        if (markerPos.lat === lat && markerPos.lng === lon) {
            marker.openPopup();
        }
    });
}

function viewSiteDetails(siteId) {
    window.location.href = `site-analysis.html?id=${siteId}`;
}

// ==================== ENVIRONMENTAL LAYERS ====================

async function toggleLayer(layerType) {
    const checkbox = document.getElementById(`layer${layerType.charAt(0).toUpperCase() + layerType.slice(1)}`);
    
    if (checkbox.checked) {
        await loadEnvironmentalLayer(layerType);
    } else {
        removeEnvironmentalLayer(layerType);
    }
}

async function loadEnvironmentalLayer(layerType) {
    console.log(`🌍 Loading ${layerType} layer...`);
    
    try {
        const center = map.getCenter();
        
        switch(layerType) {
            case 'aqi':
                await loadAQILayer(center.lat, center.lng);
                break;
            case 'pollution':
                await loadPollutionLayer(center.lat, center.lng);
                break;
            case 'rainfall':
                await loadRainfallLayer(center.lat, center.lng);
                break;
            case 'nitrogen':
                await loadNitrogenLayer(center.lat, center.lng);
                break;
            case 'temperature':
                await loadTemperatureLayer(center.lat, center.lng);
                break;
        }
        
        console.log(`✅ ${layerType} layer loaded`);
    } catch (error) {
        console.error(`❌ Error loading ${layerType} layer:`, error);
        showError(`Failed to load ${layerType} data`);
        document.getElementById(`layer${layerType.charAt(0).toUpperCase() + layerType.slice(1)}`).checked = false;
    }
}

async function loadAQILayer(lat, lng) {
    // Load mock data (real API integration available with key)
    loadMockAQILayer(lat, lng);
}

async function loadPollutionLayer(lat, lng) {
    loadMockPollutionLayer(lat, lng);
}

async function loadRainfallLayer(lat, lng) {
    loadMockRainfallLayer(lat, lng);
}

async function loadNitrogenLayer(lat, lng) {
    loadMockNitrogenLayer(lat, lng);
}

async function loadTemperatureLayer(lat, lng) {
    loadMockTemperatureLayer(lat, lng);
}

function removeEnvironmentalLayer(layerType) {
    if (activeLayers[layerType]) {
        map.removeLayer(activeLayers[layerType]);
        activeLayers[layerType] = null;
        console.log(`✅ ${layerType} layer removed`);
    }
}

// Mock data functions
function loadMockAQILayer(lat, lng) {
    const mockAQI = Math.floor(Math.random() * 5) + 1;
    const aqiColor = getAQIColor(mockAQI);
    
    const aqiMarker = L.circle([lat, lng], {
        radius: 50000,
        color: aqiColor,
        fillColor: aqiColor,
        fillOpacity: 0.3,
        weight: 2
    }).addTo(map);
    
    aqiMarker.bindPopup(`
        <div class="env-popup">
            <h4>Air Quality Index</h4>
            <div class="env-value" style="color: ${aqiColor};">${getAQIText(mockAQI)}</div>
            <p>Mock data - Get API key for real data</p>
        </div>
    `);
    
    activeLayers.aqi = aqiMarker;
    layerMarkers.push(aqiMarker);
}

function loadMockPollutionLayer(lat, lng) {
    const mockPM25 = Math.random() * 60 + 10;
    const color = getPollutionColor(mockPM25);
    
    const marker = L.circle([lat, lng], {
        radius: 40000,
        color: color,
        fillColor: color,
        fillOpacity: 0.4,
        weight: 2
    }).addTo(map);
    
    marker.bindPopup(`
        <div class="env-popup">
            <h4>PM2.5 Pollution</h4>
            <div class="env-value" style="color: ${color};">${mockPM25.toFixed(1)} μg/m³</div>
            <p>${getPollutionLevel(mockPM25)}</p>
        </div>
    `);
    
    activeLayers.pollution = marker;
    layerMarkers.push(marker);
}

function loadMockRainfallLayer(lat, lng) {
    const mockRainfall = Math.random() * 10;
    
    if (mockRainfall > 1) {
        const marker = L.circle([lat, lng], {
            radius: 30000,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.3,
            weight: 2
        }).addTo(map);
        
        marker.bindPopup(`
            <div class="env-popup">
                <h4>Rainfall Data</h4>
                <div class="env-value" style="color: #3b82f6;">${mockRainfall.toFixed(1)} mm/h</div>
                <p>Mock precipitation data</p>
            </div>
        `);
        
        activeLayers.rainfall = marker;
        layerMarkers.push(marker);
    }
}

function loadMockNitrogenLayer(lat, lng) {
    const mockNO2 = Math.random() * 100 + 20;
    const color = getNO2Color(mockNO2);
    
    const marker = L.circle([lat, lng], {
        radius: 35000,
        color: color,
        fillColor: color,
        fillOpacity: 0.35,
        weight: 2
    }).addTo(map);
    
    marker.bindPopup(`
        <div class="env-popup">
            <h4>Nitrogen Dioxide (NO₂)</h4>
            <div class="env-value" style="color: ${color};">${mockNO2.toFixed(1)} μg/m³</div>
            <p>${getNO2Level(mockNO2)}</p>
        </div>
    `);
    
    activeLayers.nitrogen = marker;
    layerMarkers.push(marker);
}

function loadMockTemperatureLayer(lat, lng) {
    const mockTemp = Math.random() * 25 + 15;
    const color = getTemperatureColor(mockTemp);
    
    const marker = L.circle([lat, lng], {
        radius: 25000,
        color: color,
        fillColor: color,
        fillOpacity: 0.25,
        weight: 2
    }).addTo(map);
    
    marker.bindPopup(`
        <div class="env-popup">
            <h4>Temperature</h4>
            <div class="env-value" style="color: ${color};">${mockTemp.toFixed(1)}°C</div>
            <p>Mock temperature data</p>
        </div>
    `);
    
    activeLayers.temperature = marker;
    layerMarkers.push(marker);
}

// Helper functions
function getAQIColor(aqi) {
    const colors = { 1: '#22c55e', 2: '#84cc16', 3: '#eab308', 4: '#f97316', 5: '#ef4444' };
    return colors[aqi] || '#9ca3af';
}

function getAQIText(aqi) {
    const texts = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' };
    return texts[aqi] || 'Unknown';
}

function getPollutionColor(pm25) {
    if (pm25 < 12) return '#22c55e';
    if (pm25 < 35) return '#eab308';
    if (pm25 < 55) return '#f97316';
    return '#ef4444';
}

function getPollutionLevel(pm25) {
    if (pm25 < 12) return 'Good air quality';
    if (pm25 < 35) return 'Moderate air quality';
    if (pm25 < 55) return 'Unhealthy for sensitive groups';
    return 'Unhealthy';
}

function getNO2Color(no2) {
    if (no2 < 40) return '#22c55e';
    if (no2 < 70) return '#eab308';
    if (no2 < 150) return '#f97316';
    return '#ef4444';
}

function getNO2Level(no2) {
    if (no2 < 40) return 'Low nitrogen dioxide levels';
    if (no2 < 70) return 'Moderate nitrogen dioxide';
    if (no2 < 150) return 'High nitrogen dioxide';
    return 'Very high nitrogen dioxide';
}

function getTemperatureColor(temp) {
    if (temp < 10) return '#3b82f6';
    if (temp < 20) return '#22c55e';
    if (temp < 30) return '#eab308';
    return '#ef4444';
}

// ==================== ADD SITE FUNCTIONS ====================

function enableAddMode() {
    addMode = true;
    document.getElementById('addModeIndicator').style.display = 'flex';
    document.querySelector('.add-site-btn').style.display = 'none';
    map.getContainer().style.cursor = 'crosshair';
}

function disableAddMode() {
    addMode = false;
    document.getElementById('addModeIndicator').style.display = 'none';
    document.querySelector('.add-site-btn').style.display = 'block';
    map.getContainer().style.cursor = '';
    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }
}

function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    selectedLocation = { lat, lng };

    if (tempMarker) map.removeLayer(tempMarker);

    tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'temp-marker',
            html: '<div style="width:40px;height:40px;background:#22c55e;border:4px solid white;border-radius:50%;animation:pulse 1s infinite;"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        })
    }).addTo(map);

    openAddSiteModal(lat, lng);
}

function openAddSiteModal(lat, lng) {
    document.getElementById('modalLocation').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    document.getElementById('addSiteModal').classList.add('active');
}

function closeAddSiteModal() {
    document.getElementById('addSiteModal').classList.remove('active');
    disableAddMode();
}

async function submitNewSite() {
    if (!selectedLocation) return;

    const siteName = document.getElementById('modalSiteName').value.trim();
    const facilityType = document.getElementById('modalFacilityType').value;
    const notes = document.getElementById('modalNotes').value.trim();

    document.getElementById('analyzingState').style.display = 'block';

    try {
        const user = auth.currentUser;
        if (!user) {
            showError('Please login to add sites');
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        const mockCarbon = Math.random() * 400 + 50;
        const address = `Location near ${selectedLocation.lat.toFixed(2)}°N, ${selectedLocation.lng.toFixed(2)}°E`;

        const siteData = {
            name: siteName || `${facilityType} Site`,
            location: new firebase.firestore.GeoPoint(selectedLocation.lat, selectedLocation.lng),
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            address: address,
            facilityType: facilityType,
            carbonEstimate: mockCarbon,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            reportCount: 1,
            verifiedViolation: mockCarbon > 300,
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            aiConfidence: 0.85,
            notes: notes
        };

        await db.collection('sites').add(siteData);

        await db.collection('reports').add({
            siteId: null,
            userId: user.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            location: new firebase.firestore.GeoPoint(selectedLocation.lat, selectedLocation.lng),
            carbonEstimate: mockCarbon,
            aiConfidence: 0.85,
            facilityType: facilityType,
            notes: notes,
            verified: false,
            violationDetected: mockCarbon > 300,
            platform: 'web'
        });

        showSuccess('Site added successfully! +50 points');
        closeAddSiteModal();
        loadSites();

    } catch (error) {
        console.error('Error adding site:', error);
        showError('Failed to add site. Please try again.');
    } finally {
        document.getElementById('analyzingState').style.display = 'none';
    }
}

// ==================== OTHER FUNCTIONS ====================

function loadMockSites() {
    allSites = [
        { id: 'mock1', name: 'Delhi Cement Plant', latitude: 28.7041, longitude: 77.1025, address: 'Delhi, India', facilityType: 'cement', carbonEstimate: 245, verifiedViolation: false },
        { id: 'mock2', name: 'Mumbai Power Station', latitude: 19.0760, longitude: 72.8777, address: 'Mumbai, India', facilityType: 'power', carbonEstimate: 890, verifiedViolation: true },
        { id: 'mock3', name: 'Bangalore Steel Factory', latitude: 12.9716, longitude: 77.5946, address: 'Bangalore, India', facilityType: 'steel', carbonEstimate: 156, verifiedViolation: false }
    ];
    displaySitesOnMap(allSites);
    displaySitesInSidebar(allSites);
}

async function loadUserInfo() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('displayName').textContent = userData.displayName || 'User';
            document.getElementById('userPoints').textContent = `${userData.points || 0} points`;

            const avatarEl = document.getElementById('userAvatar');
            if (userData.photoURL) {
                avatarEl.innerHTML = `<img src="${userData.photoURL}" alt="Avatar">`;
            } else {
                const initial = (userData.displayName || 'U').charAt(0).toUpperCase();
                avatarEl.innerHTML = initial;
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

console.log('✅ Map with environmental layers loaded');
