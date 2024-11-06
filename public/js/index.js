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

const call = document.getElementById('call');

if (call) {
  call.addEventListener("click", async function() {
    const prompt = document.getElementById('prompt').value;
    console.log('Prompt:', prompt);
    const response = await fetch('/api/get-route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();
    console.log('API Response:', data);
  });
} else {
  console.error('Call button not found');
}




//添加一个 emergency button 的长按事件，对应在 choose-route。html 中
document.addEventListener('DOMContentLoaded', function() {
    const emergencyButton = document.getElementById('emergency-button');
    let pressTimer;

    // 开始按压
    emergencyButton.addEventListener('mousedown', function() {
        pressTimer = setTimeout(() => {
            handleEmergencyCall();
        }, 3000); // 3秒后触发
    });

    // 如果手指移开或松开，取消计时器
    emergencyButton.addEventListener('mouseup', function() {
        clearTimeout(pressTimer);
    });
    
    emergencyButton.addEventListener('mouseleave', function() {
        clearTimeout(pressTimer);
    });







    // 处理紧急呼叫
    function handleEmergencyCall() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                
                // 这里可以根据实际需求修改紧急电话号码
                const emergencyNumber = '110'; // 中国警察报警电话
                
                // 创建紧急呼叫链接
                const emergencyUrl = `tel:${emergencyNumber}`;
                
                // 可以在这里添加发送位置信息到紧急服务的逻辑
                alert(`正在拨打警察电话，您的位置是：\n纬度:${latitude}\n经度: ${longitude}`);
                
                // 触发电话呼叫
                window.location.href = emergencyUrl;
            });
        } else {
            alert("您的浏览器不支持地理位置功能");
        }
    }
});
// emergency 事件 结束





// Load the Google Maps API script
loadGoogleMapsAPI();

}