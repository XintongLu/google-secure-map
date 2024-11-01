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
    const API_KEY = await fetchApiKey();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
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

      // Initialize the map
    var map = new Map(document.getElementById('map'), {
        zoom: 13,
        center: {lat: 48.87, lng: 2.29},
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
            throw new Error('Failed to fetch brightest route');    
        }

        const routeData = await response.json();
        console.log('Route Data:', routeData);

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
}
loadGoogleMapsAPI();
