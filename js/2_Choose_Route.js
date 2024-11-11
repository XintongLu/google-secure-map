let map;

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const start = params.get('start');
    const destination = params.get('destination');
    const safetyMode = params.get('safetyMode');
    const travelMode = params.get('travelMode');

    return {
        start: start ? JSON.parse(decodeURIComponent(start)) : null,
        destination: destination ? JSON.parse(decodeURIComponent(destination)) : null,
        safetyMode: safetyMode ? decodeURIComponent(safetyMode) : null,
        travelMode: travelMode ? decodeURIComponent(travelMode) : null
    };
}

const { start, destination, safetyMode, travelMode } = getQueryParams();

console.log('Start  :', start);
console.log('Destination :', destination);
console.log('Safety Mode :', safetyMode);
console.log('Travel Mode :', travelMode);

async function fetchApiKey() {
    const response = await fetch('/api-key');
    const data = await response.json();
    return data.apiKey;
}

async function loadGoogleMapsAPI() {
    const GOOGLE_MAP_API_KEY = await fetchApiKey();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAP_API_KEY}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    script.onload = () => initMap(start, destination, safetyMode, travelMode);
}

async function initMap(start, destination, safetyMode, travelMode) {
    console.log('Start Position in route:', start);
    console.log('Destination Position in route:', destination);
    console.log('Safety Mode in route:', safetyMode);
    console.log('Travel Mode in route:', travelMode);

    //const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const { Map } = await google.maps.importLibrary("maps");
    const { PlacesService, PlacesServiceStatus } = await google.maps.importLibrary("places");

    // Initialize the map
    var map = new Map(document.getElementById('map'), {
        zoom: 13,
        center: { lat: -34.6037, lng: -58.3816 }, // Coordinates for Buenos Aires
        mapId: "MAP_ID",
        disableDefaultUI: true // This will hide all the default UI controls
    });

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer();

    directionsRenderer.setMap(map);

    // Clear existing markers
    if (window.markers) {
        window.markers.forEach(marker => marker.setMap(null));
    }
    window.markers = [];

    const policeButton = document.getElementById('policeButton');
    const brightestButton = document.getElementById('brightestButton');

    // Sample places - you can modify or remove these
    const angelas = [
        { name: "Hábito Café", lat: -34.6153903, lng: -58.3824091 },
        { name: "Atis Bar", lat: -34.6199446, lng: -58.3741662 }
    ];

    let policeStations = [];
    let angelaPlaces = angelas;
    travelMode = getTravelMode(travelMode);


    await firstCalculate(brightestButton, policeButton, start, destination, safetyMode, travelMode);

    // Police Button
    policeButton.addEventListener("click", async function () {
        policeButton.style.backgroundColor = "#6ef8ea";
        brightestButton.style.backgroundColor = "#ffffff";
        // Clear existing markers
        clearMarkers();
        // Add initial markers if any
        angelas.forEach(place => {
            createMarker(place, new google.maps.LatLng(place.lat, place.lng), '/img/Ask-for-Angela.png');
        });

        // Fetch police station
        fetchNearbyPlaces(PlacesService, map, start, 'police', (results, status) => {
            if (status === PlacesServiceStatus.OK) {
                results.forEach(place => {
                    // Create marker for each police station
                    createMarker(place, place.geometry.location, '/img/police.png');
                });
                policeStations = results;
                // calculateBestRoute(policeStations, angelaPlaces, start, destination,map);

                const waypoints = [...policeStations, ...angelaPlaces]
                    .filter(place => place.lat !== undefined && place.lng !== undefined)
                    .map(place => ({
                        location: new google.maps.LatLng(place.lat, place.lng),
                        stopover: false
                    }));

                console.log('waypoints:', waypoints);

                const request = {
                    origin: start,
                    destination: destination,
                    waypoints: waypoints,
                    optimizeWaypoints: true,
                    travelMode: travelMode
                };

                // Get directions from Google Maps
                directionsService.route(request, (result, status) => {
                    if (status === 'OK') {
                        // Display the route
                        directionsRenderer.setDirections(result);
                    } else {
                        console.error('Directions request failed due to', status);
                    }
                });
            }
        });
    });

    // Brightest Button
    brightestButton.addEventListener("click", async function () {
        brightestButton.style.backgroundColor = "#6ef8ea";
        policeButton.style.backgroundColor = "#ffffff";
        // Clear existing markers
        clearMarkers();
        try {
            console.log("json:", JSON.stringify({ start: start, destination: destination }))
            const routeData = await brightestRoute(start, destination);

            // Use the returned waypoints to create a route request
            const request = {
                origin: start,
                destination: destination,
                waypoints: routeData.waypoints.map(wp => ({
                    location: new google.maps.LatLng(wp.lat, wp.lng),
                    stopover: false
                })),
                travelMode: travelMode
            };

            // Get directions from Google Maps
            directionsService.route(request, (result, status) => {
                if (status === 'OK') {
                    // Display the route
                    directionsRenderer.setDirections(result);

                    // Add markers for street lights along the route
                    routeData.streetLights.forEach(light => {
                        createMarker(light, { lat: light.lat, lng: light.lng }, '/img/street-light.png');
                    });

                    //Fit map bounds to show entire route
                    const bounds = new google.maps.LatLngBounds();
                    result.routes[0].legs[0].steps.forEach(step => {
                        bounds.extend(step.start_location);
                        bounds.extend(step.end_location);
                    });
                    map.fitBounds(bounds);
                } else {
                    window.alert('Directions request failed due to ' + status);
                }
            });
        } catch (error) {
            console.error('Error:', error);
            window.alert('Failed to calculate the brightest route');
        }
    });

    const aiButton = document.getElementById('ai');

    aiButton.addEventListener("click", async function () {
        clearMarkers();
        const routeJsonString = await askAIForRoute(aiButton);
        routeJson = JSON.parse(routeJsonString);

        start = await geoCoder(routeJson.start);
        destination = await geoCoder(routeJson.end);
        safetyMode = routeJson["safety mode"];

        await firstCalculate(brightestButton, policeButton, start, destination, safetyMode, travelMode);
    });

    async function firstCalculate(brightestButton, policeButton, start, destination, safetyMode, travelMode) {
        travelMode = getTravelMode(travelMode);
        
        if (safetyMode === "brightest") {
            brightestButton.style.backgroundColor = "#6ef8ea";
            policeButton.style.backgroundColor = "#ffffff";
            try {
                console.log("json:", JSON.stringify({ start: start, destination: destination }))
                const routeData = await brightestRoute(start, destination);

                // Use the returned waypoints to create a route request
                const request = {
                    origin: start,
                    destination: destination,
                    waypoints: routeData.waypoints.map(wp => ({
                        location: new google.maps.LatLng(wp.lat, wp.lng),
                        stopover: false
                    })),
                    travelMode: travelMode
                };

                // Get directions from Google Maps
                directionsService.route(request, (result, status) => {
                    if (status === 'OK') {
                        // Display the route
                        directionsRenderer.setDirections(result);

                        // Add markers for street lights along the route
                        routeData.streetLights.forEach(light => {
                            createMarker(light, { lat: light.lat, lng: light.lng }, '/img/street-light.png');
                        });

                        //Fit map bounds to show entire route
                        const bounds = new google.maps.LatLngBounds();
                        result.routes[0].legs[0].steps.forEach(step => {
                            bounds.extend(step.start_location);
                            bounds.extend(step.end_location);
                        });
                        map.fitBounds(bounds);
                    } else {
                        window.alert('Directions request failed due to ' + status);
                    }
                });
            } catch (error) {
                console.error('Error:', error);
                window.alert('Failed to calculate the brightest route');
            }
        }
        else if (safetyMode === "police/angela") {
            policeButton.style.backgroundColor = "#6ef8ea";
            brightestButton.style.backgroundColor = "#ffffff";
            angelas.forEach(place => {
                createMarker(place, new google.maps.LatLng(place.lat, place.lng), '/img/Ask-for-Angela.png');
            });

            // Fetch police station
            fetchNearbyPlaces(PlacesService, map, start, 'police', (results, status) => {
                if (status === PlacesServiceStatus.OK) {
                    results.forEach(place => {
                        // Create marker for each police station
                        createMarker(place, place.geometry.location, '/img/police.png');
                    });
                    policeStations = results;
                    // calculateBestRoute(policeStations, angelaPlaces, start, destination,map);

                    const waypoints = [...policeStations, ...angelaPlaces]
                        .filter(place => place.lat !== undefined && place.lng !== undefined)
                        .map(place => ({
                            location: new google.maps.LatLng(place.lat, place.lng),
                            stopover: false
                        }));

                    console.log('waypoints:', waypoints);

                    const request = {
                        origin: start,
                        destination: destination,
                        waypoints: waypoints,
                        optimizeWaypoints: true,
                        travelMode: travelMode
                    };

                    // Get directions from Google Maps
                    directionsService.route(request, (result, status) => {
                        if (status === 'OK') {
                            // Display the route
                            directionsRenderer.setDirections(result);
                        } else {
                            console.error('Directions request failed due to', status);
                        }
                    });
                }
            });
        }
    }

    function createMarker(place, position, icon) {
        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: place.name,
            icon: {
                url: icon,
                scaledSize: new google.maps.Size(40, 40),  // Adjust the size as needed
                zIndex: google.maps.Marker.MAX_ZINDEX + 1
            },

        });
        // Add info window for each marker
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <h3>${place.name}</h3>
                <p>Rating: ${place.rating ? place.rating : 'N/A'}</p>
                <p>Address: ${place.vicinity}</p>
            `
        });
        // Add click listener to show info window
        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });
        window.markers.push(marker);
    }
}

function clearMarkers() {
    if (window.markers) {
        window.markers.forEach(marker => marker.setMap(null));
    }
    window.markers = [];
}

function getTravelMode(travelMode) {
    switch (travelMode) {
        case 'walking':
            return google.maps.TravelMode.WALKING;
        case 'cycling':
            return google.maps.TravelMode.BICYCLING;
        case 'transport':
            return google.maps.TravelMode.TRANSIT;
        default:
            return google.maps.TravelMode.WALKING;
    }
}


async function brightestRoute(start, destination) {
    if (window.markers) {
        window.markers.forEach(marker => marker.setMap(null));
    }
    window.markers = [];
    return new Promise(async (resolve, reject) => {
        // First, get the route from our BrightestRouteFinder backend
        const response = await fetch('/api/brightest-route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ start: start, destination: destination })
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to fetch brightest route:', errorText);
            reject(error);
            throw new Error('Failed to fetch brightest route');
        }

        const routeData = await response.json();
        console.log('Route Data:', routeData);
        resolve(routeData);
    });
}

async function angelaPoliceRoute(start, destination) {
    if (window.markers) {
        window.markers.forEach(marker => marker.setMap(null));
    }
    window.markers = [];
    return new Promise(async (resolve, reject) => {
        // First, get the route from our angela police backend
        const response = await fetch('/api/police-route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ start: start, destination: destination })
        });
        if (!response.ok) {
            const errorText = await response.text();
            reject(error);
            throw new Error('Failed to fetch the most police/angela route', errorText);
        }

        const routeData = await response.json();
        console.log('Route Data:', routeData);
        resolve(routeData);
    });
}

function fetchNearbyPlaces(PlacesService, map, location, type, callback) {
    // Create Places service
    const service = new PlacesService(map);

    // Search for police stations
    const request = {
        location: location,
        radius: '10000', // Search within 10km
        type: type
    };
    service.nearbySearch(request, callback);
}

async function askAIForRoute(aiButton) {
    if (aiButton) {
        return new Promise(async (resolve, reject) => {
            try {
                const prompt = document.getElementById('prompt').value;
                const response = await fetch('/api/ask-gemini', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt }),
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                console.log('API Response:', data);

                // Resolve the promise with the data
                resolve(data);
            } catch (error) {
                console.error('Error fetching AI route:', error);
                reject(error);
            }
        });
    } else {
        console.error('AI button not found');
        return Promise.reject('AI button not found');
    }
};

async function geoCoder(location) {
    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve, reject) => {
        geocoder.geocode({ address: location }, function (results, status) {
            if (status === 'OK') {
                const position = results[0].geometry.location.toJSON();
                console.log("Geocoded Position:", position);
                // Resolve the promise with the data
                resolve(position);
            } else {
                console.error('Geocode was not successful for the following reason: ' + status);
                reject(error);
            }
        });
    });
};

loadGoogleMapsAPI();
