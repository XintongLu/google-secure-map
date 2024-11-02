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

async function initMap() {
  // Request needed libraries.
  //@ts-ignore
  const { Map } = await google.maps.importLibrary("maps");
  const { SearchBox } = await google.maps.importLibrary("places");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

  // Initialize the map
  var map = new Map(document.getElementById('map'), {
    center: {lat: 48.8566, lng: 2.3522},
    zoom: 13,
    mapId: "MAP_ID",
  });

  // Create the search box and link it to the UI element.
  var destinationInput = document.getElementById('destination');
  var destinationBox = new SearchBox(destinationInput);
  
  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    destinationBox.setBounds(map.getBounds());
  });

  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  destinationBox.addListener('places_changed', function() {
    var places = destinationBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(destinationPlace) {
      
      if (!destinationPlace.geometry) {
        console.log("Returned place contains no geometry");
        return;
      }

      // Clear existing markers
      if (window.markers) {
        window.markers.forEach(marker => marker.setMap(null));
      }
      window.markers = [];

      // Create a new marker
      const marker = new AdvancedMarkerElement({
        map: map,
        title: destinationPlace.name,
        position: destinationPlace.geometry.location,
        title: "Uluru",
      });
      // Get the accurate position of the place
      destinationPosition=(destinationPlace.geometry.location.toJSON());
      console.log("Destination Position:", destinationPosition);

      // Store the marker
      window.markers.push(marker);

      if (destinationPlace.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(destinationPlace.geometry.viewport);
      } else {
        bounds.extend(destinationPlace.geometry.location);
      }
    });

    map.fitBounds(bounds);
    
  // Suppose the user's current location is Arc de Triomphe
  startPosition = {lat: 48.8737917, lng: 2.295027499999999}
  console.log("Current Position:", startPosition);

  // Add a button to get directions
  const dirButton = document.getElementById('directionButton');
  
  if (dirButton) {
    dirButton.addEventListener("click", function() {
      const destinationString = encodeURIComponent(JSON.stringify(destinationPosition));
      const startPositionString = encodeURIComponent(JSON.stringify(startPosition));
      const url = `route.html?start=${startPositionString}&destination=${destinationString}`;
      window.location.href = url;
    });
  } else {
    console.error('Directions button not found');
}
});
}
// Load the Google Maps API script
loadGoogleMapsAPI();