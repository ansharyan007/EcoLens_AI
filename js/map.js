// Map Explorer JavaScript
// Handles map initialization, site markers, search, and add functionality

let map;
let markers = [];
let allSites = [];
let addMode = false;
let tempMarker = null;
let selectedLocation = null;

// Initialize map on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();

    // Initialize map
    initMap();

    // Load sites from Firestore
    loadSites();

    // Load user info
    loadUserInfo();
});

// Initialize Leaflet map
function initMap() {
    // Create map centered on India (you can change default location)
    map = L.map('map').setView([20.5937, 78.9629], 5);

    // Add OpenStreetMap tiles (free, no API key needed!)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add click handler for add mode
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
            allSites.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Display sites on map
        displaySitesOnMap(allSites);

        // Display sites in sidebar
        displaySitesInSidebar(allSites);

    } catch (error) {
        console.error('Error loading sites:', error);
        showError('Failed to load sites. Please refresh the page.');

        // Show mock data for demo
        loadMockSites();
    }
}

// Display sites on map as markers
function displaySitesOnMap(sites) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    sites.forEach(site => {
        if (site.latitude && site.longitude) {
            const marker = createMarker(site);
            markers.push(marker);
        }
    });
}

// Create marker for a site
function createMarker(site) {
    const color = getMarkerColor(site.carbonEstimate || 0);

    // Create custom icon
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            width: 30px;
            height: 30px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    // Create marker
    const marker = L.marker([site.latitude, site.longitude], { icon: icon })
        .addTo(map);

    // Create popup content
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

// Get marker color based on carbon estimate
function getMarkerColor(carbonEstimate) {
    if (carbonEstimate < 100) return '#22c55e'; // Green
    if (carbonEstimate < 300) return '#eab308'; // Yellow
    return '#ef4444'; // Red
}

// Display sites in sidebar list
function displaySitesInSidebar(sites) {
    const sitesList = document.getElementById('sitesList');

    if (sites.length === 0) {
        sitesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-marked-alt"></i>
                <p>No sites found</p>
            </div>
        `;
        return;
    }

    sitesList.innerHTML = sites.map(site => createSiteCard(site)).join('');
}

// Create HTML for site card
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

// Get icon class based on facility type
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

// Get emission class (low/medium/high)
function getEmissionClass(carbon) {
    if (carbon < 100) return 'low';
    if (carbon < 300) return 'medium';
    return 'high';
}

// Filter sites based on search and filter
function filterSites() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const emissionFilter = document.getElementById('emissionFilter').value;

    let filtered = allSites.filter(site => {
        // Search filter
        const matchesSearch = !searchQuery || 
            (site.name && site.name.toLowerCase().includes(searchQuery)) ||
            (site.address && site.address.toLowerCase().includes(searchQuery)) ||
            (site.facilityType && site.facilityType.toLowerCase().includes(searchQuery));

        // Emission filter
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

// Zoom to specific site
function zoomToSite(lat, lon, siteId) {
    map.setView([lat, lon], 15);

    // Find and open popup for this marker
    markers.forEach(marker => {
        const markerPos = marker.getLatLng();
        if (markerPos.lat === lat && markerPos.lng === lon) {
            marker.openPopup();
        }
    });
}

// View site details page
function viewSiteDetails(siteId) {
    window.location.href = `site-analysis.html?id=${siteId}`;
}

// Enable add site mode
function enableAddMode() {
    addMode = true;
    document.getElementById('addModeIndicator').style.display = 'flex';
    document.querySelector('.add-site-btn').style.display = 'none';
    map.getContainer().style.cursor = 'crosshair';
}

// Disable add site mode
function disableAddMode() {
    addMode = false;
    document.getElementById('addModeIndicator').style.display = 'none';
    document.querySelector('.add-site-btn').style.display = 'block';
    map.getContainer().style.cursor = '';

    // Remove temp marker if exists
    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }
}

// Handle map click in add mode
function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    selectedLocation = { lat, lng };

    // Remove previous temp marker
    if (tempMarker) {
        map.removeLayer(tempMarker);
    }

    // Add temporary marker
    tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'temp-marker',
            html: '<div style="width:40px;height:40px;background:#22c55e;border:4px solid white;border-radius:50%;animation:pulse 1s infinite;"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        })
    }).addTo(map);

    // Open modal
    openAddSiteModal(lat, lng);
}

// Open add site modal
function openAddSiteModal(lat, lng) {
    document.getElementById('modalLocation').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    document.getElementById('addSiteModal').classList.add('active');
}

// Close add site modal
function closeAddSiteModal() {
    document.getElementById('addSiteModal').classList.remove('active');
    disableAddMode();
}

// Submit new site
async function submitNewSite() {
    if (!selectedLocation) return;

    const siteName = document.getElementById('modalSiteName').value.trim();
    const facilityType = document.getElementById('modalFacilityType').value;
    const notes = document.getElementById('modalNotes').value.trim();

    // Show analyzing state
    document.getElementById('analyzingState').style.display = 'block';

    try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            showError('Please login to add sites');
            return;
        }

        // Simulate AI analysis (in real app, call ML API here)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock carbon estimate (in real app, get from ML API)
        const mockCarbon = Math.random() * 400 + 50;

        // Get address from reverse geocoding (mock for now)
        const address = await reverseGeocode(selectedLocation.lat, selectedLocation.lng);

        // Create site document
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
            satelliteImageUrl: null,
            groundImageUrl: null,
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            aiConfidence: 0.85,
            notes: notes
        };

        // Add to Firestore
        await db.collection('sites').add(siteData);

        // Also create a report
        await db.collection('reports').add({
            siteId: null, // Will be updated with site ID
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

        // Update user points
        await updateUserPoints(user.uid, 50);

        // Show success
        showSuccess('Site added successfully! +50 points');

        // Close modal and reload sites
        closeAddSiteModal();
        loadSites();

    } catch (error) {
        console.error('Error adding site:', error);
        showError('Failed to add site. Please try again.');
    } finally {
        document.getElementById('analyzingState').style.display = 'none';
    }
}

// Reverse geocode (mock implementation)
async function reverseGeocode(lat, lng) {
    // In real app, use Nominatim API or similar
    // For now, return mock address
    return `Location near ${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`;
}

// Update user points
async function updateUserPoints(userId, points) {
    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const currentPoints = userDoc.data().points || 0;
            await userRef.update({
                points: currentPoints + points,
                totalReports: firebase.firestore.FieldValue.increment(1),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update leaderboard
            await db.collection('leaderboard').doc(userId).set({
                displayName: userDoc.data().displayName,
                points: currentPoints + points,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error updating points:', error);
    }
}

// Load mock sites for demo
function loadMockSites() {
    allSites = [
        {
            id: 'mock1',
            name: 'Delhi Cement Plant',
            latitude: 28.7041,
            longitude: 77.1025,
            address: 'Industrial Area, Delhi, India',
            facilityType: 'cement',
            carbonEstimate: 245,
            verifiedViolation: false
        },
        {
            id: 'mock2',
            name: 'Mumbai Power Station',
            latitude: 19.0760,
            longitude: 72.8777,
            address: 'Mumbai, Maharashtra, India',
            facilityType: 'power',
            carbonEstimate: 890,
            verifiedViolation: true
        },
        {
            id: 'mock3',
            name: 'Bangalore Steel Factory',
            latitude: 12.9716,
            longitude: 77.5946,
            address: 'Bangalore, Karnataka, India',
            facilityType: 'steel',
            carbonEstimate: 156,
            verifiedViolation: false
        }
    ];

    displaySitesOnMap(allSites);
    displaySitesInSidebar(allSites);
}

// Load user info for sidebar
async function loadUserInfo() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('displayName').textContent = userData.displayName || 'User';
            document.getElementById('userPoints').textContent = `${userData.points || 0} points`;

            // Set avatar
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

// Check authentication
function checkAuth() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html';
        }
    });
}

// Logout function
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// Show success message
function showSuccess(message) {
    // Simple alert for now (you can enhance this with custom toast)
    alert(message);
}

// Show error message
function showError(message) {
    // Simple alert for now (you can enhance this with custom toast)
    alert(message);
}
