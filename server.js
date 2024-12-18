const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
require('dotenv').config();
const GOOGLE_MAP_API_KEY = process.env.GOOGLE_MAP_API_KEY;

const BrightestRouteFinder = require('./js/BrightestRouteFinder');
const brightestRouteFinder = new BrightestRouteFinder(process.env.GOOGLE_MAP_API_KEY);

const CallGemini = require('./js/CallGemini');
const callGemini = new CallGemini(process.env.GEMINI_API_KEY);


// Parse application/json
app.use(bodyParser.json());

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Serve navigate.html for the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '', 'index.html'));
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '')));

app.get('/api-key', (req, res) => {
  res.json({ apiKey: GOOGLE_MAP_API_KEY });
});

app.post('/api/ask-gemini', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log('Getting route from Gemini with prompt:', prompt);
    const routeInfo = await callGemini.startChat(prompt);
    console.log('Route info:', routeInfo);
    res.json(routeInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/brightest-route', async (req, res) => {
  try {
    const { start, destination } = req.body;
    console.log('Calculating brightest route from', start, 'to', destination);
    
    // Get the brightest route
    const route = await brightestRouteFinder.findBrightestRoute(start, destination);
    
    // Extract waypoints from the route
    const waypoints = route.legs[0].steps.map(step => ({
      lat: step.start_location.lat,
      lng: step.start_location.lng
    }));

    // Get street light data along the route
    const streetLights = await Promise.all(
      waypoints.map(async point => {
        const lightingData = await brightestRouteFinder.getLightingData(
          point.lat,
          point.lng
        );
        return {
                  ...point,
                  score: lightingData.streetLightScore
        };
      })
    );

      res.json({
          waypoints,
          streetLights,
          duration: route.legs[0].duration,
          distance: route.legs[0].distance
      });
  } catch (error) {
      console.error('Error calculating brightest route:', error);
      res.status(500).json({ error: 'Failed to calculate route' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});