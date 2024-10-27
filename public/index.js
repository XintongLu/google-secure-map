let map;

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
  var input = document.getElementById('search');
  var searchBox = new SearchBox(input);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });

  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener('places_changed', function() {
    var places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
      if (!place.geometry) {
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
        title: place.name,
        position: place.geometry.location,
        title: "Uluru",
      });

      // Store the marker
      window.markers.push(marker);

      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });

    map.fitBounds(bounds);
    showDirectionsButtons();
  });
}

// Function to show the Directions button
function showDirectionsButtons() {
  const button = document.getElementById('directionsButton');
  const startButton = document.getElementById('start');
  button.style.display = 'block';
  startButton.style.display = 'block';
}

function calculateAndDisplayRoute(directionsService, directionsRenderer) {
  document.getElementById("calculate-route").addEventListener("click", () => {
    //const start = document.getElementById("start").value;
    const end = document.getElementById("end").value;
    const selectedMode = document.getElementById("mode").value;
    const autocompleteStart = new google.maps.places.Autocomplete(document.getElementById("start"));
    autocompleteStart.bindTo("bounds", map);

    autocompleteStart.addListener("place_changed", () => {
      const place = autocompleteStart.getPlace();
      if (!place.geometry) {
        window.alert("No details available for input: '" + place.name + "'");
        return;
      }
    });

    directionsService
      .route({
        origin: place.geometry.location,
        destination: {query: end, },
        travelMode: google.maps.TravelMode[selectedMode],
      })
      .then((response) => {
        directionsRenderer.setDirections(response);
        addMarkers(response);
      })
      .catch((e) => window.alert("Directions request failed due to " + e));
  });
}

// Load the map
window.initMap = initMap;

document.addEventListener("DOMContentLoaded", () => {
  initMap();
});