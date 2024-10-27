function initMap() {
  const directionsRenderer = new google.maps.DirectionsRenderer();
  const directionsService = new google.maps.DirectionsService();
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
    center: { lat: 37.77, lng: -122.447 },
  });

  directionsRenderer.setMap(map);
  calculateAndDisplayRoute(directionsService, directionsRenderer);
}

function calculateAndDisplayRoute(directionsService, directionsRenderer) {
  document.getElementById("calculate-route").addEventListener("click", () => {
    const start = document.getElementById("start").value;
    const end = document.getElementById("end").value;
    const selectedMode = document.getElementById("mode").value;

    directionsService
      .route({
        origin: {query: start,},
        destination: {query: end, },
        travelMode: google.maps.TravelMode[selectedMode],
      })
      .then((response) => {
        directionsRenderer.setDirections(response);
      })
      .catch((e) => window.alert("Directions request failed due to " + e));
  });
}

window.initMap = initMap;

document.addEventListener("DOMContentLoaded", () => {
  initMap();
});