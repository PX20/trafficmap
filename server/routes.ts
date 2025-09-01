import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

const API_BASE_URL = "https://api.qldtraffic.qld.gov.au";
const PUBLIC_API_KEY = "3e83add325cbb69ac4d8e5bf433d770b";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get traffic events from QLD Traffic API
  app.get("/api/traffic/events", async (req, res) => {
    try {
      const apiKey = process.env.QLD_TRAFFIC_API_KEY || PUBLIC_API_KEY;
      const response = await fetch(`${API_BASE_URL}/v2/events?apikey=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`QLD Traffic API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform and store events in local storage for caching
      if (data.features) {
        for (const feature of data.features) {
          const event = {
            id: feature.properties.id.toString(),
            eventType: feature.properties.event_type,
            eventSubtype: feature.properties.event_subtype || null,
            title: feature.properties.description || feature.properties.event_type,
            description: feature.properties.description || null,
            location: feature.properties.road_summary?.road_name || 'Unknown location',
            impact: feature.properties.event_priority?.toLowerCase() || 'unknown',
            priority: feature.properties.event_priority,
            status: feature.properties.status,
            advice: feature.properties.advice || null,
            information: feature.properties.information || null,
            geometry: feature.geometry,
            properties: feature.properties,
            nextInspection: feature.properties.next_inspection ? new Date(feature.properties.next_inspection) : null,
            webLink: feature.properties.web_link || null,
            areaAlert: feature.properties.area_alert || false,
            alertMessage: feature.properties.alert_message || null,
          };
          
          await storage.updateTrafficEvent(event.id, event) || await storage.createTrafficEvent(event);
        }
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching traffic events:", error);
      res.status(500).json({ 
        error: "Failed to fetch traffic events", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get traffic cameras from QLD Traffic API
  app.get("/api/traffic/cameras", async (req, res) => {
    try {
      const apiKey = process.env.QLD_TRAFFIC_API_KEY || PUBLIC_API_KEY;
      const response = await fetch(`${API_BASE_URL}/v2/cameras?apikey=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`QLD Traffic API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform and store cameras in local storage for caching
      if (data.features) {
        for (const feature of data.features) {
          const camera = {
            id: feature.properties.id?.toString() || randomUUID(),
            name: feature.properties.name || 'Traffic Camera',
            location: feature.properties.location || null,
            status: feature.properties.status || 'active',
            imageUrl: feature.properties.image_url || null,
            geometry: feature.geometry,
            properties: feature.properties,
          };
          
          await storage.updateTrafficCamera(camera.id, camera) || await storage.createTrafficCamera(camera);
        }
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching traffic cameras:", error);
      res.status(500).json({ 
        error: "Failed to fetch traffic cameras", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get cached events from local storage
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getTrafficEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching cached events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get cached cameras from local storage
  app.get("/api/cameras", async (req, res) => {
    try {
      const cameras = await storage.getTrafficCameras();
      res.json(cameras);
    } catch (error) {
      console.error("Error fetching cached cameras:", error);
      res.status(500).json({ error: "Failed to fetch cameras" });
    }
  });

  // Get emergency incidents from ArcGIS Feature Server
  app.get("/api/incidents", async (req, res) => {
    try {
      const response = await fetch("https://services1.arcgis.com/vkTwD8kHw2woKBqV/arcgis/rest/services/ESCAD_Current_Incidents_Public/FeatureServer/0/query?f=geojson&where=1%3D1&outFields=*");
      
      if (!response.ok) {
        throw new Error(`ArcGIS API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform and store incidents in local storage for caching
      if (data.features) {
        for (const feature of data.features) {
          const props = feature.properties;
          const incident = {
            id: props.OBJECTID?.toString() || randomUUID(),
            incidentType: props.GroupedType || 'Incident',
            title: `${props.GroupedType || 'Emergency Incident'} - ${props.Locality || 'Queensland'}`,
            description: props.Master_Incident_Number ? `Incident #${props.Master_Incident_Number}` : null,
            location: props.Location || props.Locality || null,
            status: props.CurrentStatus || 'Active',
            priority: null,
            agency: props.Jurisdiction || null,
            geometry: feature.geometry,
            properties: feature.properties,
            publishedDate: props.Response_Date ? new Date(props.Response_Date) : null,
          };
          
          try {
            await storage.updateIncident(incident.id, incident) || await storage.createIncident(incident);
          } catch (error) {
            console.warn('Failed to store incident:', incident.id, error);
          }
        }
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ 
        error: "Failed to fetch incidents", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get cached incidents from local storage
  app.get("/api/cached/incidents", async (req, res) => {
    try {
      const incidents = await storage.getIncidents();
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching cached incidents:", error);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  // Get weather data from Open-Meteo for Queensland cities
  app.get("/api/weather", async (req, res) => {
    try {
      const queenslandCities = [
        { name: "Brisbane", location: "Brisbane Metro", lat: -27.4698, lng: 153.0251 },
        { name: "Gold Coast", location: "Gold Coast", lat: -28.0167, lng: 153.4000 },
        { name: "Sunshine Coast", location: "Sunshine Coast", lat: -26.6500, lng: 153.0667 },
        { name: "Townsville", location: "Townsville", lat: -19.2590, lng: 146.8169 },
        { name: "Cairns", location: "Cairns", lat: -16.9186, lng: 145.7781 },
        { name: "Toowoomba", location: "Toowoomba", lat: -27.5598, lng: 151.9507 },
        { name: "Rockhampton", location: "Rockhampton", lat: -23.3781, lng: 150.5136 },
        { name: "Mackay", location: "Mackay", lat: -21.1550, lng: 149.1844 },
      ];

      const weatherData = [];
      
      for (const city of queenslandCities) {
        try {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=Australia/Brisbane`
          );
          
          if (response.ok) {
            const data = await response.json();
            const current = data.current;
            
            const stationData = {
              id: city.name.toLowerCase().replace(' ', '-'),
              name: city.name,
              location: city.location,
              latitude: city.lat.toString(),
              longitude: city.lng.toString(),
              temperature: current.temperature_2m?.toString(),
              humidity: current.relative_humidity_2m?.toString(),
              weatherCode: current.weather_code?.toString(),
              windSpeed: current.wind_speed_10m?.toString(),
              windDirection: current.wind_direction_10m?.toString(),
            };
            
            // Store/update in cache
            await storage.updateWeatherStation(stationData.id, stationData) || 
                  await storage.createWeatherStation(stationData);
            
            weatherData.push({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [city.lng, city.lat]
              },
              properties: {
                id: stationData.id,
                name: city.name,
                location: city.location,
                temperature: current.temperature_2m,
                humidity: current.relative_humidity_2m,
                weather_code: current.weather_code,
                wind_speed: current.wind_speed_10m,
                wind_direction: current.wind_direction_10m,
                last_updated: current.time
              }
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch weather for ${city.name}:`, error);
        }
      }
      
      res.json({
        type: "FeatureCollection",
        features: weatherData
      });
    } catch (error) {
      console.error("Error fetching weather data:", error);
      res.status(500).json({ 
        error: "Failed to fetch weather data", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get cached weather stations from local storage
  app.get("/api/cached/weather", async (req, res) => {
    try {
      const stations = await storage.getWeatherStations();
      res.json(stations);
    } catch (error) {
      console.error("Error fetching cached weather stations:", error);
      res.status(500).json({ error: "Failed to fetch weather stations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function randomUUID() {
  return crypto.randomUUID();
}
