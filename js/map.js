// Map Explorer JavaScript - ON-DEMAND LOADING ONLY
// Environmental data loads ONLY when user searches

// ==================== DEBUGGING HELPER ====================
const DEBUG = true; // Set to false to disable debug logs

function debugLog(emoji, message, data = null) {
    if (DEBUG) {
        if (data) {
            console.log(`${emoji} ${message}`, data);
        } else {
            console.log(`${emoji} ${message}`);
        }
    }
}

// ==================== GLOBAL VARIABLES ====================

let map;
let markers = [];
let allSites = [];
let addMode = false;
let tempMarker = null;
let selectedLocation = null;

// Layer groups
let aqiLayerGroup;
let rainfallLayerGroup;
let weatherLayerGroup;

// Track active layers
let activeLayers = {
    aqi: null,
    rainfall: null,
    weather: null,
    nitrogen: null
};

// API Keys
const WAQI_API_TOKEN = '403a249b1cf1a345da77a7598c537c4e9b6bac58';

// Environmental data cache
let environmentalData = {
    aqi: [],
    rainfall: [],
    weather: []
};

// Cities cache
let indianCitiesList = [];
let searchedCities = new Set(); // Track already searched cities to avoid duplicate API calls

// Current search
let currentSearchedCity = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function () {
    debugLog('🚀', 'Initializing Map Explorer...');

    initMap();
    loadSites();
    loadUserInfo();
    loadIndianCitiesList();

    // NO automatic data loading - wait for user search
    debugLog('⏸️', 'Environmental data will load on-demand when user searches');

    // Show initial message
    updateSearchResultsInfo(null);
});

// Load Indian cities list
async function loadIndianCitiesList() {
    try {
        debugLog('📋', 'Loading Indian cities list...');

        const response = await fetch('https://raw.githubusercontent.com/nshntarora/Indian-Cities-JSON/master/cities.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        indianCitiesList = data
            .filter(city => city.City && city.State)
            .map(city => ({
                name: city.City,
                state: city.State,
                searchKey: `${city.City}, ${city.State}`.toLowerCase()
            }));

        debugLog('✅', `Loaded ${indianCitiesList.length} valid Indian cities from GitHub`);
    } catch (error) {
        debugLog('⚠️', 'Error loading cities list:', error);
        loadEssentialCitiesList();
    }
}

// Essential cities fallback
function loadEssentialCitiesList() {
    indianCitiesList = [
        { name: 'Delhi', state: 'Delhi' },
        { name: 'Mumbai', state: 'Maharashtra' },
        { name: 'Bangalore', state: 'Karnataka' },
        { name: 'Chennai', state: 'Tamil Nadu' },
        { name: 'Kolkata', state: 'West Bengal' },
        { name: 'Hyderabad', state: 'Telangana' },
        { name: 'Pune', state: 'Maharashtra' },
        { name: 'Ahmedabad', state: 'Gujarat' },
        { name: 'Jaipur', state: 'Rajasthan' },
        { name: 'Lucknow', state: 'Uttar Pradesh' }
    ].map(city => ({
        ...city,
        searchKey: `${city.name}, ${city.state}`.toLowerCase()
    }));
    debugLog('✅', 'Loaded essential cities list');
}

// Initialize map
function initMap() {
    debugLog('🗺️', 'Initializing map...');

    map = L.map('map').setView([20.5937, 78.9629], 5);

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    });

    osmLayer.addTo(map);

    aqiLayerGroup = L.layerGroup();
    rainfallLayerGroup = L.layerGroup();
    weatherLayerGroup = L.layerGroup();

    const baseLayers = {
        "Street Map": osmLayer,
        "Satellite": satelliteLayer
    };

    const overlayLayers = {
        "Air Quality (AQI)": aqiLayerGroup,
        "Rainfall Data": rainfallLayerGroup,
        "Weather Stations": weatherLayerGroup
    };

    L.control.layers(baseLayers, overlayLayers, {
        position: 'topright',
        collapsed: false
    }).addTo(map);

    map.on('click', function (e) {
        if (addMode) {
            handleMapClick(e);
        }
    });

    debugLog('✅', 'Map initialized');
}

// ==================== SEARCH FUNCTIONALITY ====================

// Handle Enter key in search input
function handleSearchKeyPress(event) {
    if (event.key === 'Enter') {
        debugLog('⌨️', 'Enter key pressed in search');
        performSearch();
    }

    // Show/hide clear button
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (searchInput.value.trim()) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
}

// Clear search
function clearSearch() {
    debugLog('🧹', 'Clearing search');
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    updateSearchResultsInfo(null);

    // Clear sites list
    const sitesList = document.getElementById('sitesList');
    sitesList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-search-location"></i>
            <p>Search for a city to view environmental data</p>
            <small>Try: Delhi, Mumbai, Bangalore, etc.</small>
        </div>
    `;
}
// Perform search - ONLY entry point for loading environmental data
async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchQuery = searchInput.value.trim().toLowerCase();

    if (!searchQuery) {
        showError('Please enter a city name to search');
        return;
    }

    debugLog('🔍', `User initiated search for: "${searchQuery}"`);

    // Show loading state
    showSearchLoading(searchQuery);

    try {
        // Search for city in list
        const matchedCity = indianCitiesList.find(city => {
            if (!city || !city.name || !city.searchKey) return false;
            return city.name.toLowerCase().includes(searchQuery) ||
                city.searchKey.includes(searchQuery);
        });

        if (matchedCity) {
            debugLog('✅', `Found city: ${matchedCity.name}, ${matchedCity.state}`);

            // Check if already loaded
            const cacheKey = `${matchedCity.name}-${matchedCity.state}`;
            if (searchedCities.has(cacheKey)) {
                debugLog('💾', `Using cached data for ${matchedCity.name}`);

                // Just zoom to the city
                const coords = await geocodeCity(matchedCity.name);
                if (coords) {
                    map.setView([coords.lat, coords.lng], 11);
                    updateSearchResultsInfo(matchedCity.name);
                    showCityDataCard(matchedCity.name); // Show data card
                    showSuccess(`📍 Viewing ${matchedCity.name}`);
                }
            } else {
                // Load fresh data
                debugLog('🌐', `Loading fresh data for ${matchedCity.name}`);
                const success = await loadCityEnvironmentalData(matchedCity.name);

                if (success) {
                    searchedCities.add(cacheKey);
                    const coords = await geocodeCity(matchedCity.name);
                    if (coords) {
                        map.setView([coords.lat, coords.lng], 11);
                        updateSearchResultsInfo(matchedCity.name);
                        showCityDataCard(matchedCity.name); // Show data card
                        showSuccess(`✅ Environmental data loaded for ${matchedCity.name}!`);
                    }
                } else {
                    hideSearchLoading();
                    showError(`Could not load data for ${matchedCity.name}`);
                }
            }
        } else {
            // Try geocoding directly
            debugLog('🔍', `City not found in list, trying geocoding for: ${searchQuery}`);

            const coords = await geocodeCity(searchQuery);
            if (coords) {
                const success = await loadCityEnvironmentalData(searchQuery, coords.lat, coords.lng);
                if (success) {
                    map.setView([coords.lat, coords.lng], 11);
                    updateSearchResultsInfo(searchQuery);
                    showCityDataCard(searchQuery); // Show data card
                    showSuccess(`✅ Environmental data loaded for ${searchQuery}!`);
                } else {
                    hideSearchLoading();
                    showError(`Could not load data for ${searchQuery}`);
                }
            } else {
                hideSearchLoading();
                showError(`❌ Could not find location: ${searchQuery}`);
            }
        }
    } catch (error) {
        debugLog('❌', 'Search error:', error);
        hideSearchLoading();
        showError(`Search failed: ${error.message}`);
    }
}


// Show search loading
function showSearchLoading(query) {
    const sitesList = document.getElementById('sitesList');
    sitesList.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Searching for ${query}...</p>
            <small>Loading environmental data...</small>
        </div>
    `;
}

// Hide search loading
function hideSearchLoading() {
    setTimeout(() => {
        const sitesList = document.getElementById('sitesList');
        if (sitesList.innerHTML.includes('fa-spinner')) {
            sitesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search-location"></i>
                    <p>Search for a city to view environmental data</p>
                    <small>Try: Delhi, Mumbai, Bangalore, etc.</small>
                </div>
            `;
        }
    }, 500);
}

// Update search results info
function updateSearchResultsInfo(cityName) {
    const resultsInfo = document.getElementById('searchResultsInfo');
    const searchedCityEl = document.getElementById('searchedCity');

    if (cityName) {
        searchedCityEl.textContent = cityName;
        resultsInfo.style.display = 'flex';
        currentSearchedCity = cityName;
    } else {
        resultsInfo.style.display = 'none';
        currentSearchedCity = null;
    }
}

// ==================== ENVIRONMENTAL DATA LOADING ====================

// Load environmental data for a specific city (ON-DEMAND)
async function loadCityEnvironmentalData(cityName, lat = null, lng = null) {
    debugLog('🔍', `Loading environmental data for ${cityName}...`);

    try {
        // Geocode if coordinates not provided
        if (!lat || !lng) {
            const coords = await geocodeCity(cityName);
            if (!coords) {
                debugLog('❌', `Could not geocode ${cityName}`);
                return false;
            }
            lat = coords.lat;
            lng = coords.lng;
        }

        debugLog('📍', `Coordinates for ${cityName}:`, { lat, lng });

        // Load all data in parallel
        const [aqiSuccess, weatherSuccess, rainfallSuccess] = await Promise.all([
            loadAQIForLocation(cityName, lat, lng),
            loadWeatherForLocation(cityName, lat, lng),
            loadRainfallForLocation(cityName, lat, lng)
        ]);

        const successCount = [aqiSuccess, weatherSuccess, rainfallSuccess].filter(Boolean).length;
        debugLog('✅', `Loaded ${successCount}/3 data types for ${cityName}`);

        return successCount > 0;
    } catch (error) {
        debugLog('❌', `Error loading data for ${cityName}:`, error);
        return false;
    }
}

// Geocode city
async function geocodeCity(cityName) {
    try {
        debugLog('📍', `Geocoding ${cityName}...`);

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(cityName)}&country=India&format=json&limit=1`,
            {
                headers: {
                    'User-Agent': 'EcoLens-AI-Map-Explorer'
                }
            }
        );

        const data = await response.json();

        if (data && data.length > 0) {
            const coords = {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
            debugLog('✅', `Geocoded ${cityName}:`, coords);
            return coords;
        }

        debugLog('⚠️', `Could not geocode ${cityName}`);
        return null;
    } catch (error) {
        debugLog('❌', `Geocoding error for ${cityName}:`, error);
        return null;
    }
}

// Load AQI data
async function loadAQIForLocation(cityName, lat, lng) {
    try {
        debugLog('🌫️', `Fetching AQI for ${cityName}...`);

        const response = await fetch(
            `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${WAQI_API_TOKEN}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'ok' && data.data.aqi !== '-') {
            const aqiValue = data.data.aqi;
            const pollutants = data.data.iaqi || {};

            environmentalData.aqi.push({
                city: cityName,
                lat: lat,
                lng: lng,
                aqi: aqiValue,
                pm25: pollutants.pm25?.v || 'N/A',
                pm10: pollutants.pm10?.v || 'N/A',
                no2: pollutants.no2?.v || 'N/A',
                so2: pollutants.so2?.v || 'N/A',
                o3: pollutants.o3?.v || 'N/A',
                co: pollutants.co?.v || 'N/A'
            });

            displayAQIMarker(cityName, lat, lng, aqiValue, pollutants);
            debugLog('✅', `Real AQI data loaded for ${cityName}: ${aqiValue}`);
            return true;
        } else {
            debugLog('⚠️', `No AQI data available for ${cityName}`);
            return false;
        }
    } catch (error) {
        debugLog('❌', `Error fetching AQI for ${cityName}:`, error);
        return false;
    }
}

// Load weather data using Open-Meteo
async function loadWeatherForLocation(cityName, lat, lng) {
    try {
        debugLog('🌤️', `Fetching weather for ${cityName}...`);

        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.current) {
            const temp = data.current.temperature_2m;
            const humidity = data.current.relative_humidity_2m;
            const windSpeed = data.current.wind_speed_10m;
            const precipitation = data.current.precipitation || 0;
            const weatherCode = data.current.weather_code;
            const description = getWeatherDescription(weatherCode);

            displayWeatherMarker(cityName, lat, lng, temp, humidity, description, windSpeed);

            if (precipitation > 0) {
                displayRainfallMarker(cityName, lat, lng, precipitation);
            }

            debugLog('✅', `Real weather data loaded for ${cityName}: ${temp}°C, ${humidity}%`);
            return true;
        }
    } catch (error) {
        debugLog('❌', `Error fetching weather for ${cityName}:`, error);
        return false;
    }
}

// Load rainfall data
async function loadRainfallForLocation(cityName, lat, lng) {
    try {
        debugLog('🌧️', `Fetching rainfall for ${cityName}...`);

        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation,rain,showers&timezone=auto`
        );

        if (!response.ok) {
            return false;
        }

        const data = await response.json();

        if (data.current) {
            const rainfall = data.current.precipitation || data.current.rain || 0;

            if (rainfall > 0.1) {
                displayRainfallMarker(cityName, lat, lng, rainfall);
                debugLog('✅', `Real rainfall data loaded for ${cityName}: ${rainfall}mm`);
                return true;
            }
        }
    } catch (error) {
        debugLog('❌', `Error fetching rainfall for ${cityName}:`, error);
    }
    return false;
}

// Get weather description from WMO code
function getWeatherDescription(code) {
    const weatherCodes = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    return weatherCodes[code] || 'Unknown';
}

// ==================== DISPLAY MARKERS ====================

// Display AQI marker
function displayAQIMarker(cityName, lat, lng, aqi, pollutants) {
    const color = getAQIColor(aqi);
    const category = getAQICategory(aqi);

    const icon = L.divIcon({
        className: 'aqi-marker',
        html: `
            <div style="
                background: ${color};
                color: white;
                border: 3px solid white;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                font-size: 12px;
            ">
                <div style="font-size: 16px;">${aqi}</div>
                <div style="font-size: 8px;">AQI</div>
            </div>
        `,
        iconSize: [50, 50],
        iconAnchor: [25, 25]
    });

    const popupContent = `
        <div style="min-width: 250px;">
            <h3 style="margin: 0 0 10px 0; color: ${color};">${cityName}</h3>
            <div style="margin-bottom: 8px;">
                <strong>AQI:</strong> ${aqi} (${category})
            </div>
            <table style="width: 100%; font-size: 12px;">
                <tr><td><strong>PM2.5:</strong></td><td>${pollutants.pm25?.v || 'N/A'} µg/m³</td></tr>
                <tr><td><strong>PM10:</strong></td><td>${pollutants.pm10?.v || 'N/A'} µg/m³</td></tr>
                <tr><td><strong>NO₂:</strong></td><td>${pollutants.no2?.v || 'N/A'} µg/m³</td></tr>
                <tr><td><strong>SO₂:</strong></td><td>${pollutants.so2?.v || 'N/A'} µg/m³</td></tr>
                <tr><td><strong>O₃:</strong></td><td>${pollutants.o3?.v || 'N/A'} µg/m³</td></tr>
                <tr><td><strong>CO:</strong></td><td>${pollutants.co?.v || 'N/A'} mg/m³</td></tr>
            </table>
            <div style="margin-top: 8px; font-size: 10px; color: #666;">
                <em>Real-time data from WAQI</em>
            </div>
        </div>
    `;

    const marker = L.marker([lat, lng], { icon: icon }).bindPopup(popupContent);
    aqiLayerGroup.addLayer(marker);

    debugLog('📍', `AQI marker added for ${cityName}`);
}
// Display weather marker
function displayWeatherMarker(cityName, lat, lng, temp, humidity, description, windSpeed) {
    // Store weather data in cache
    environmentalData.weather.push({
        city: cityName,
        lat: lat,
        lng: lng,
        temp: temp,
        humidity: humidity,
        windSpeed: windSpeed,
        description: description
    });

    const icon = L.divIcon({
        className: 'weather-marker',
        html: `
            <div style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: 2px solid white;
                border-radius: 50%;
                width: 45px;
                height: 45px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                font-size: 10px;
            ">
                <div style="font-size: 14px;">${Math.round(temp)}°C</div>
            </div>
        `,
        iconSize: [45, 45],
        iconAnchor: [22, 22]
    });

    const popupContent = `
        <div>
            <h3 style="margin: 0 0 10px 0;">${cityName}</h3>
            <div><strong>Temperature:</strong> ${temp.toFixed(1)}°C</div>
            <div><strong>Humidity:</strong> ${humidity}%</div>
            <div><strong>Conditions:</strong> ${description}</div>
            <div><strong>Wind Speed:</strong> ${windSpeed.toFixed(1)} km/h</div>
            <div style="margin-top: 8px; font-size: 10px; color: #666;">
                <em>Real-time data from Open-Meteo</em>
            </div>
        </div>
    `;

    const marker = L.marker([lat, lng], { icon: icon }).bindPopup(popupContent);
    weatherLayerGroup.addLayer(marker);

    debugLog('📍', `Weather marker added for ${cityName}`);
}


// Display rainfall marker
function displayRainfallMarker(cityName, lat, lng, rainfall) {
    const icon = L.divIcon({
        className: 'rainfall-marker',
        html: `
            <div style="
                background: #3b82f6;
                color: white;
                border: 2px solid white;
                border-radius: 8px;
                padding: 5px 8px;
                font-weight: bold;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                font-size: 11px;
                white-space: nowrap;
            ">
                <i class="fas fa-cloud-rain"></i> ${rainfall.toFixed(1)}mm
            </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15]
    });

    const popupContent = `
        <div>
            <h3 style="margin: 0 0 10px 0;">${cityName}</h3>
            <div><strong>Current Rainfall:</strong> ${rainfall.toFixed(2)} mm</div>
            <div style="margin-top: 8px; font-size: 10px; color: #666;">
                <em>Real-time data from Open-Meteo</em>
            </div>
        </div>
    `;

    const marker = L.marker([lat, lng], { icon: icon }).bindPopup(popupContent);
    rainfallLayerGroup.addLayer(marker);

    debugLog('📍', `Rainfall marker added for ${cityName}`);
}

// Helper functions
function getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
}

function getAQICategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

// ==================== TOGGLE LAYERS ====================

function toggleLayer(layerType) {
    const checkbox = document.getElementById(`layer${layerType.charAt(0).toUpperCase() + layerType.slice(1)}`);

    if (!checkbox) return;

    debugLog('🔄', `Toggling ${layerType} layer: ${checkbox.checked ? 'ON' : 'OFF'}`);

    if (checkbox.checked) {
        switch (layerType) {
            case 'aqi':
            case 'pollution':
                map.addLayer(aqiLayerGroup);
                break;
            case 'rainfall':
                map.addLayer(rainfallLayerGroup);
                break;
            case 'nitrogen':
                loadNitrogenDataForCities();
                break;
            case 'temperature':
                map.addLayer(weatherLayerGroup);
                break;
        }
    } else {
        switch (layerType) {
            case 'aqi':
            case 'pollution':
                map.removeLayer(aqiLayerGroup);
                break;
            case 'rainfall':
                map.removeLayer(rainfallLayerGroup);
                break;
            case 'nitrogen':
                if (activeLayers.nitrogen) {
                    map.removeLayer(activeLayers.nitrogen);
                }
                break;
            case 'temperature':
                map.removeLayer(weatherLayerGroup);
                break;
        }
    }
}

// Load nitrogen data
function loadNitrogenDataForCities() {
    if (activeLayers.nitrogen) {
        map.removeLayer(activeLayers.nitrogen);
    }

    const nitrogenLayer = L.layerGroup();

    environmentalData.aqi.forEach(cityData => {
        if (!cityData || cityData.no2 === 'N/A' || cityData.no2 === undefined) {
            return;
        }

        const no2Value = cityData.no2;
        const color = getNO2Color(no2Value);

        const marker = L.circle([cityData.lat, cityData.lng], {
            radius: 35000,
            color: color,
            fillColor: color,
            fillOpacity: 0.35,
            weight: 2
        });

        marker.bindPopup(`
            <div>
                <h3>${cityData.city}</h3>
                <div><strong>NO₂:</strong> ${no2Value} µg/m³</div>
                <div>${getNO2Level(no2Value)}</div>
                <div style="margin-top: 8px; font-size: 10px; color: #666;">
                    <em>Real-time data from WAQI</em>
                </div>
            </div>
        `);

        nitrogenLayer.addLayer(marker);
    });

    if (nitrogenLayer.getLayers().length > 0) {
        map.addLayer(nitrogenLayer);
        activeLayers.nitrogen = nitrogenLayer;
        debugLog('✅', `Real NO₂ data displayed for ${nitrogenLayer.getLayers().length} cities`);
    } else {
        debugLog('⚠️', 'No NO₂ data available to display');
    }
}

function getNO2Color(no2) {
    if (no2 < 40) return '#22c55e';
    if (no2 < 70) return '#eab308';
    if (no2 < 150) return '#f97316';
    return '#ef4444';
}

function getNO2Level(no2) {
    if (no2 < 40) return 'Low levels';
    if (no2 < 70) return 'Moderate levels';
    if (no2 < 150) return 'High levels';
    return 'Very high levels';
}

// ==================== SITE MANAGEMENT ====================

function filterSites() {
    const emissionFilter = document.getElementById('emissionFilter').value;

    let filtered = allSites.filter(site => {
        const carbon = site.carbonEstimate || 0;
        let matchesEmission = true;
        if (emissionFilter === 'low') matchesEmission = carbon < 100;
        else if (emissionFilter === 'medium') matchesEmission = carbon >= 100 && carbon < 300;
        else if (emissionFilter === 'high') matchesEmission = carbon >= 300;
        return matchesEmission;
    });

    displaySitesOnMap(filtered);
    displaySitesInSidebar(filtered);
}

async function loadSites() {
    debugLog('📍', 'Loading sites...');

    try {
        const sitesRef = db.collection('sites');
        const snapshot = await sitesRef.limit(500).get();

        allSites = [];
        snapshot.forEach(doc => {
            allSites.push({ id: doc.id, ...doc.data() });
        });

        if (allSites.length === 0) {
            debugLog('⚠️', 'No sites found, loading mock data');
            loadMockSites();
        } else {
            displaySitesOnMap(allSites);
            displaySitesInSidebar(allSites);
            debugLog('✅', `Loaded ${allSites.length} sites`);
        }
    } catch (error) {
        debugLog('❌', 'Error loading sites:', error);
        loadMockSites();
    }
}

// Show city data card in sidebar
function showCityDataCard(cityName) {
    const sitesList = document.getElementById('sitesList');

    // Find the city's environmental data
    const aqiData = environmentalData.aqi.find(d => d.city.toLowerCase() === cityName.toLowerCase());
    const weatherData = environmentalData.weather.find(d => d.city && d.city.toLowerCase() === cityName.toLowerCase());

    if (!aqiData && !weatherData) {
        sitesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>No environmental data available for ${cityName}</p>
            </div>
        `;
        return;
    }

    // Build data card HTML
    let dataCardHTML = `
        <div class="city-data-card">
            <div class="city-data-header">
                <h3><i class="fas fa-map-marker-alt"></i> ${cityName}</h3>
                <span class="data-timestamp"><i class="fas fa-clock"></i> Real-time data</span>
            </div>
    `;

    // AQI Section
    if (aqiData) {
        const aqiColor = getAQIColor(aqiData.aqi);
        const aqiCategory = getAQICategory(aqiData.aqi);

        dataCardHTML += `
            <div class="data-section">
                <div class="data-section-header">
                    <i class="fas fa-wind"></i>
                    <h4>Air Quality</h4>
                </div>
                <div class="aqi-display" style="background: ${aqiColor};">
                    <div class="aqi-value">${aqiData.aqi}</div>
                    <div class="aqi-category">${aqiCategory}</div>
                </div>
                <div class="pollutants-grid">
                    <div class="pollutant-item">
                        <span class="pollutant-label">PM2.5</span>
                        <span class="pollutant-value">${aqiData.pm25} µg/m³</span>
                    </div>
                    <div class="pollutant-item">
                        <span class="pollutant-label">PM10</span>
                        <span class="pollutant-value">${aqiData.pm10} µg/m³</span>
                    </div>
                    <div class="pollutant-item">
                        <span class="pollutant-label">NO₂</span>
                        <span class="pollutant-value">${aqiData.no2} µg/m³</span>
                    </div>
                    <div class="pollutant-item">
                        <span class="pollutant-label">SO₂</span>
                        <span class="pollutant-value">${aqiData.so2} µg/m³</span>
                    </div>
                    <div class="pollutant-item">
                        <span class="pollutant-label">O₃</span>
                        <span class="pollutant-value">${aqiData.o3} µg/m³</span>
                    </div>
                    <div class="pollutant-item">
                        <span class="pollutant-label">CO</span>
                        <span class="pollutant-value">${aqiData.co} mg/m³</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Weather Section (from cache if available)
    const weatherInfo = getWeatherInfoForCity(cityName);
    if (weatherInfo) {
        dataCardHTML += `
            <div class="data-section">
                <div class="data-section-header">
                    <i class="fas fa-cloud-sun"></i>
                    <h4>Weather</h4>
                </div>
                <div class="weather-grid">
                    <div class="weather-item">
                        <i class="fas fa-temperature-high"></i>
                        <div>
                            <span class="weather-label">Temperature</span>
                            <span class="weather-value">${weatherInfo.temp}°C</span>
                        </div>
                    </div>
                    <div class="weather-item">
                        <i class="fas fa-tint"></i>
                        <div>
                            <span class="weather-label">Humidity</span>
                            <span class="weather-value">${weatherInfo.humidity}%</span>
                        </div>
                    </div>
                    <div class="weather-item">
                        <i class="fas fa-wind"></i>
                        <div>
                            <span class="weather-label">Wind Speed</span>
                            <span class="weather-value">${weatherInfo.windSpeed} km/h</span>
                        </div>
                    </div>
                    <div class="weather-item">
                        <i class="fas fa-cloud"></i>
                        <div>
                            <span class="weather-label">Conditions</span>
                            <span class="weather-value">${weatherInfo.description}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    dataCardHTML += `
            <div class="data-footer">
                <small><i class="fas fa-info-circle"></i> Data sources: WAQI, Open-Meteo</small>
            </div>
        </div>
    `;

    sitesList.innerHTML = dataCardHTML;
    debugLog('📊', `Displayed data card for ${cityName}`);
}

// Get weather info for a city from the markers
function getWeatherInfoForCity(cityName) {
    // Extract weather data from the weather layer group
    let weatherInfo = null;

    weatherLayerGroup.eachLayer(layer => {
        const popup = layer.getPopup();
        if (popup && popup.getContent().includes(cityName)) {
            // Parse the popup content to extract weather data
            const content = popup.getContent();
            const tempMatch = content.match(/Temperature:<\/strong>\s*([\d.]+)°C/);
            const humidityMatch = content.match(/Humidity:<\/strong>\s*([\d]+)%/);
            const windMatch = content.match(/Wind Speed:<\/strong>\s*([\d.]+)\s*km\/h/);
            const descMatch = content.match(/Conditions:<\/strong>\s*([^<]+)</);

            if (tempMatch) {
                weatherInfo = {
                    temp: parseFloat(tempMatch[1]).toFixed(1),
                    humidity: humidityMatch ? humidityMatch[1] : 'N/A',
                    windSpeed: windMatch ? parseFloat(windMatch[1]).toFixed(1) : 'N/A',
                    description: descMatch ? descMatch[1].trim() : 'N/A'
                };
            }
        }
    });

    return weatherInfo;
}


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

function loadMockSites() {
    allSites = [
        { id: 'mock1', name: 'Delhi Cement Plant', latitude: 28.7041, longitude: 77.1025, address: 'Delhi, India', facilityType: 'cement', carbonEstimate: 245, verifiedViolation: false },
        { id: 'mock2', name: 'Mumbai Power Station', latitude: 19.0760, longitude: 72.8777, address: 'Mumbai, India', facilityType: 'power', carbonEstimate: 890, verifiedViolation: true },
        { id: 'mock3', name: 'Bangalore Steel Factory', latitude: 12.9716, longitude: 77.5946, address: 'Bangalore, India', facilityType: 'steel', carbonEstimate: 156, verifiedViolation: false }
    ];
    displaySitesOnMap(allSites);
    displaySitesInSidebar(allSites);
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
            html: '<div style="width:40px;height:40px;background:#22c55e;border:4px solid white;border-radius:50%;"></div>',
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

        showSuccess('Site added successfully! +50 points');
        closeAddSiteModal();
        loadSites();

    } catch (error) {
        debugLog('❌', 'Error adding site:', error);
        showError('Failed to add site. Please try again.');
    } finally {
        document.getElementById('analyzingState').style.display = 'none';
    }
}

// ==================== UTILITY FUNCTIONS ====================

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
        debugLog('❌', 'Error loading user info:', error);
    }
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

function showSuccess(message) {
    debugLog('✅', message);
    const notification = document.createElement('div');
    notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#22c55e;color:white;padding:15px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-weight:500;';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function showError(message) {
    debugLog('❌', message);
    const notification = document.createElement('div');
    notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:15px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-weight:500;';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

debugLog('✅', 'Map with ON-DEMAND LOADING loaded successfully');
