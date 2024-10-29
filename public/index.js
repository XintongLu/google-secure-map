let map;

let startPosition = [];
let endPosition = [];

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
  var searchInput = document.getElementById('search');
  var searchBox = new SearchBox(searchInput);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });

  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener('places_changed', function() {
    var places1 = searchBox.getPlaces();

    if (places1.length == 0) {
      return;
    }

    var bounds = new google.maps.LatLngBounds();
    places1.forEach(function(endPlace) {
      
      if (!endPlace.geometry) {
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
        title: endPlace.name,
        position: endPlace.geometry.location,
        title: "Uluru",
      });
      // Get the accurate position of the place
      endPosition=(endPlace.geometry.location.toJSON());
      console.log("Accurate Position:", endPosition);

      // Store the marker
      window.markers.push(marker);

      if (endPlace.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(endPlace.geometry.viewport);
      } else {
        bounds.extend(endPlace.geometry.location);
      }
    });

    map.fitBounds(bounds);
    
    //showDirectionsButtons();
  const button = document.getElementById('directionsButton');
  const startButton = document.getElementById('start');
  button.style.display = 'block';
  startButton.style.display = 'block';

  var startBox = new google.maps.places.SearchBox(startButton);

  map.addListener('bounds_changed', function() {
    startBox.setBounds(map.getBounds());
  });

  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  startBox.addListener('places_changed', function() {
    var places = startBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
      if (!place.geometry) {
        console.log("Returned place contains no geometry");
        return;
      }

      // Create a new marker
      const marker = new AdvancedMarkerElement({
        map: map,
        title: place.name,
        position: place.geometry.location,
        title: "Uluru",
      });

      // Get the accurate position of the place
      startPosition = (place.geometry.location.toJSON());
      console.log("Accurate Position:", startPosition);
      
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

    // Create the directions service
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer();

    directionsRenderer.setMap(map);

    button.addEventListener(
      "click",
      () => {
        directionsService
        .route({
          origin: startPosition,
          destination: endPosition, 
          travelMode: google.maps.TravelMode.WALKING,
        })
        .then((response) => {
          directionsRenderer.setDirections(response);
        })
        .catch((e) => window.alert("Directions request failed due to " + e));
      },
    );
  });

  });
}

// Load the map
window.initMap = initMap;

document.addEventListener("DOMContentLoaded", () => {
  initMap();
});