const { Client } = require('@googlemaps/google-maps-services-js');
const axios = require('axios');

class BrightestRouteFinder {
  constructor(API_KEY) {
    this.googleMapsClient = new Client({});
    this.apiKey = API_KEY;
  }

  async findBrightestRoute(origin, destination, departureTime = new Date()) {
    console.log('Requesting directions with the following parameters:');
    console.log('Origin:', origin);
    console.log('Destination:', destination);
    console.log('Departure Time:', departureTime);

    try {
      // Get alternative routes from Google Maps
      const routesResponse = await this.googleMapsClient.directions({
        params: {
          origin: origin,
          destination: destination,
          alternatives: true,
          mode: 'walking', // Walking mode gives us more detailed segments
          key: this.apiKey,
          departure_time: departureTime
        }
      });
      console.log('Routes Response:', routesResponse.data);

      if (!routesResponse.data.routes.length) {
        throw new Error('No routes found');
      }

      // Process each route
      const routesWithLightScores = await Promise.all(
        routesResponse.data.routes.map(async route => {
          const lightScore = await this.calculateRouteLightScore(route, departureTime);
          console.log(`Route ${route} Score:`, lightScore);
          return { route, lightScore };
        })
      );

      // Sort routes by light score and return the brightest
      routesWithLightScores.sort((a, b) => b.lightScore - a.lightScore);
      return routesWithLightScores[0].route;
    } catch (error) {
      console.error('Error finding brightest route:', error);
      throw error;
    }
  }

  async calculateRouteLightScore(route, time) {
    let totalScore = 0;
    let totalDistance = 0;

    for (const leg of route.legs) {
      for (const step of leg.steps) {
        const stepScore = await this.calculateStepLightScore(step, time);
        const stepDistance = step.distance.value;
        totalScore += stepScore * stepDistance;
        totalDistance += stepDistance;
      }
    }

    return totalDistance ? totalScore / totalDistance : 0;
  }

  async calculateStepLightScore(step, time) {
    let score = 0;

    // Base lighting score based on time of day
    score += this.getTimeBasedScore(time);

    // Get lighting information for the step
    const lightingData = await this.getLightingData(
      step.start_location.lat,
      step.start_location.lng
    );
    
    score += lightingData.streetLightScore;

    // Additional factors that affect brightness
    if (step.html_instructions.toLowerCase().includes('tunnel')) {
      score -= 0.5;
    }
    if (step.html_instructions.toLowerCase().includes('park')) {
      score -= 0.3;
    }
    if (step.html_instructions.toLowerCase().includes('main')) {
      score += 0.3; // Main streets typically have better lighting
    }

    return Math.max(0, Math.min(score, 1)); // Normalize score between 0 and 1
  }

  getTimeBasedScore(time) {
    const hour = time.getHours();
    
    // Daylight hours (8 AM - 5 PM) get maximum score
    if (hour >= 8 && hour < 17) {
      return 1;
    }
    
    // Dawn/dusk (6-8 AM and 5-7 PM) get medium score
    if ((hour >= 6 && hour < 8) || (hour >= 17 && hour < 19)) {
      return 0.5;
    }
    
    // Night hours get minimum score
    return 0.2;
  }

  async getLightingData(lat, lng) {
    try {
      // This is where you would integrate with a street lighting database
      // For demonstration, we'll use OpenStreetMap's overpass API to check for street lights
      const query = `
        [out:json][timeout:25];
        (
          node["highway"="street_lamp"](around:50,${lat},${lng});
        );
        out body;
      `;
      
      const response = await axios.post('https://overpass-api.de/api/interpreter', query);
      
      // Calculate score based on number of street lights in vicinity
      const streetLights = response.data.elements.length;
      const streetLightScore = Math.min(streetLights * 0.1, 0.5); // Cap at 0.5
      
      return { streetLightScore };
    } catch (error) {
      console.warn('Error fetching lighting data:', error);
      return { streetLightScore: 0.2 }; // Default score if data unavailable
    }
  }
}

// // Example usage
// async function main() {
//   const finder = new BrightestRouteFinder('YOUR_GOOGLE_MAPS_API_KEY');
  
//   try {
//     const brightestRoute = await finder.findBrightestRoute(
//       '40.7128,-74.0060', // New York
//       '40.7614,-73.9776', // Manhattan
//       new Date()
//     );
    
//     console.log('Brightest route found:', brightestRoute);
//   } catch (error) {
//     console.error('Error:', error);
//   }
// }

module.exports = BrightestRouteFinder;