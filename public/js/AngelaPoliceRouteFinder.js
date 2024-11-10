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

    const plazaDeMayo = { lat: -34.6083, lng: -58.3708 };
    const abastoShopping = { lat: -34.6037, lng: -58.4108 };

    const start = plazaDeMayo;
    const end = abastoShopping;

    // Create a map centered in Buenos Aires
    const buenosAires = { lat: -34.6037, lng: -58.3716 };
    // Initialize the map
    map = new Map(document.getElementById('map'), {
        zoom: 13,
        center: buenosAires,
        mapId: "MAP_ID"
    });

    // Sample places - you can modify or remove these
    const angelas = [
        { name: "Place 1", lat: -34.6037, lng: -58.3822 },
        { name: "Place 2", lat: -34.6137, lng: -58.3922 }
    ];

    let policeStations = [];
    let angelaPlaces = angelas; 

    // Add initial markers if any
    angelas.forEach(place => {
        createMarker(place, new google.maps.LatLng(place.lat, place.lng),'/img/Ask-for-Angela.png');
    });

    // Fetch police station
    fetchNearbyPlaces(PlacesService, start, 'police',(results, status) => {
        if (status === PlacesServiceStatus.OK) {
            results.forEach(place => {
                // Create marker for each police station
                createMarker(place, place.geometry.location,'/img/police.png');
            });
            policeStations = results;
            calculateBestRoute(policeStations, angelaPlaces, start, end);
        }
    });
}

function createMarker(place, position, icon) {
    let markers = [];
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: place.name,
        animation: google.maps.Animation.DROP,
        icon: {
        url: icon,
         scaledSize: new google.maps.Size(40,40),  // Adjust the size as needed
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

function fetchNearbyPlaces(PlacesService, location, type, callback){
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

function calculateBestRoute(policeStations,angelaPlaces, start, end) {
    const waypoints = [...policeStations, ...angelaPlaces].map(place => ({
        location: new google.maps.LatLng(place.lat, place.lng),
        stopover: true
    }));

    const directionsService = new google.maps.DirectionsService();
    const request = {
        origin: start,
        destination: end,
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.WALKING
    };

    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            displayRoute(result);
        }
    });
}

function displayRoute(result) {
    const directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    directionsRenderer.setDirections(result);
}

// Load the Google Maps API script
loadGoogleMapsAPI();