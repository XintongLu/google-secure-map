let map;

let startPosition = [];
let endPosition = [];

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
      async() => {
        try {
          // First, get the route from our BrightestRouteFinder backend
          const response = await fetch('/api/brightest-route', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ origin: startPosition, destination: endPosition })
          });
          if (!response.ok) {
              throw new Error('Failed to fetch brightest route');
          }

          const routeData = await response.json();

          // Use the returned waypoints to create a route request
          const request = {
              origin: startPosition,
              destination: endPosition,
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

                  // Fit map bounds to show entire route
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
      },
    );
  });

  });
}

// Load the map
// window.initMap = initMap;

// document.addEventListener("DOMContentLoaded", () => {
//   initMap();
// });

// Load the Google Maps API script
loadGoogleMapsAPI();