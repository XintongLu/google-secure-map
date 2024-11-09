let map;

let startPosition = [];
let destinationPosition = [];

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
  script.onload = initMap;
}


// Main
async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const { PlacesService,PlacesServiceStatus } = await google.maps.importLibrary("places");

    // Create a map centered in Buenos Aires
    const buenosAires = { lat: -34.6037, lng: -58.3716 };
    // Initialize the map
    map = new Map(document.getElementById('map'), {
        zoom: 13,
        center: buenosAires,
        mapId: "MAP_ID"
    });

    // Create Places service
    const service = new PlacesService(map);

    // Search for police stations
    const request = {
        location: buenosAires,
        radius: '5000', // Search within 5km
        type: ['police'] // Search for police stations
    };

    service.nearbySearch(request, (results, status) => {
        if (status === PlacesServiceStatus.OK) {
            results.forEach(place => {
                // Create marker for each police station
                const marker = new google.maps.Marker({
                    map: map,
                    position: place.geometry.location,
                    title: place.name
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
            });
        }
    });



    let markers = [];
    // Sample places - you can modify or remove these
    const angelas = [
        { name: "Place 1", lat: -34.6037, lng: -58.3822 },
        { name: "Place 2", lat: -34.6137, lng: -58.3922 }
    ];

        // Add initial markers if any
        angelas.forEach(place => {
        createMarker(place);
    });

    function createMarker(place) {
        const marker = new google.maps.Marker({
            position: { lat: place.lat, lng: place.lng },
            map: map,
            title: place.name,
            animation: google.maps.Animation.DROP,
            icon: {
            url: '/img/Ask-for-Angela.png',
             scaledSize: new google.maps.Size(40,40),  // Adjust the size as needed
             zIndex: google.maps.Marker.MAX_ZINDEX + 1
            },
            
        });
        markers.push(marker);
    }
}

// Load the Google Maps API script
loadGoogleMapsAPI();