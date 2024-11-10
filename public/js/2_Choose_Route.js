let map;

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const start = params.get('start');
    const destination = params.get('destination');
    return {
        start: start ? JSON.parse(decodeURIComponent(start)) : null,
        destination: destination ? JSON.parse(decodeURIComponent(destination)) : null,
    };
}

const { start, destination } = getQueryParams();

console.log('Start  :', start);
console.log('Destination :', destination);

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
    script.onload = () => initMap(start, destination);
}

async function initMap(start, destination) {
    console.log('Start Position in route:', start);
    console.log('Destination Position in route:', destination);

    //const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const { Map } = await google.maps.importLibrary("maps");
    const { PlacesService, PlacesServiceStatus } = await google.maps.importLibrary("places");

    // Initialize the map
    var map = new Map(document.getElementById('map'), {
        zoom: 13,
        center: { lat: -34.6037, lng: -58.3816 }, // Coordinates for Buenos Aires
        mapId: "MAP_ID"
    });

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer();

    directionsRenderer.setMap(map);

    // Clear existing markers
    if (window.markers) {
        window.markers.forEach(marker => marker.setMap(null));
    }
    window.markers = [];

    try {
        console.log("json:",JSON.stringify({ start: start, destination: destination }))
        const routeData = await brightestRoute(start, destination);

        // Use the returned waypoints to create a route request
        const request = {
            origin: start,
            destination: destination,
            waypoints: routeData.waypoints.map(wp => ({
                location: new google.maps.LatLng(wp.lat, wp.lng),
                stopover: false
            })),
            travelMode: google.maps.TravelMode.WALKING
        };

        // Get directions from Google Maps
        directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                // Display the route
                directionsRenderer.setDirections(result);

                // Add custom markers for start and end points
                const startMarker = new google.maps.Marker({
                    position: result.routes[0].legs[0].start_location,
                    map: map,
                    icon: {
                        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                    },
                    title: 'Start'
                });

                const endMarker = new google.maps.Marker({
                    position: result.routes[0].legs[0].end_location,
                    map: map,
                    icon: {
                        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                    },
                    title: 'Destination'
                });

                markers.push(startMarker, endMarker);

                // Add markers for street lights along the route
                routeData.streetLights.forEach(light => {
                    const lightMarker = new google.maps.Marker({
                        position: { lat: light.lat, lng: light.lng },
                        map: map,
                        icon: {
                            url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
                        },
                        title: 'Street Light'
                    });
                    markers.push(lightMarker);
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

    const policeButton = document.getElementById('policeButton');
    // Sample places - you can modify or remove these
    const angelas = [
        { name: "Place 1", lat: -34.6037, lng: -58.3822 },
        { name: "Place 2", lat: -34.6137, lng: -58.3922 }
    ];

    let policeStations = [];
    let angelaPlaces = angelas;

    policeButton.addEventListener("click", async function () {
        // Clear existing markers
        if (window.markers) {
            window.markers.forEach(marker => marker.setMap(null));
        }
        window.markers = [];
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
                        stopover: true
                    }));

                console.log('waypoints:', waypoints);

                const request = {
                    origin: start,
                    destination: destination,
                    waypoints: waypoints,
                    optimizeWaypoints: true,
                    travelMode: google.maps.TravelMode.WALKING
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

    function createMarker(place, position, icon) {
        let markers = [];
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
        markers.push(marker);
    }
}


async function brightestRoute(start, destination) {
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
        throw new Error('Failed to fetch the most police/angela route',errorText);    
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

// function calculateBestRoute(policeStations, angelaPlaces, start, end, map) {
//     const directionsService = new google.maps.DirectionsService();
//     const directionsRenderer = new google.maps.DirectionsRenderer();
//     directionsRenderer.setMap(map);

//     console.log('start point:', start);
//     console.log('end point:', end);
//     console.log('police stations:', policeStations);
//     console.log('angela places:', angelaPlaces);

//     const request = {
//         origin: start,
//         destination: end,
//         waypoints: waypoints,
//         // optimizeWaypoints: true,
//         travelMode: google.maps.TravelMode.WALKING
//     };

//     directionsService.route(request, (result, status) => {
//         console.log('Route:', result);
//         if (status === google.maps.DirectionsStatus.OK) {
//             directionsRenderer.setDirections(result);
//         } else {
//             console.error('Directions request failed due to', status);
//         }
//     });
// }

loadGoogleMapsAPI();
