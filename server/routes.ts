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
            eventSubtype: feature.properties.event_subtype,
            title: feature.properties.description || feature.properties.event_type,
            description: feature.properties.description,
            location: feature.properties.road_summary?.road_name || 'Unknown location',
            impact: feature.properties.event_priority?.toLowerCase() || 'unknown',
            priority: feature.properties.event_priority,
            status: feature.properties.status,
            advice: feature.properties.advice,
            information: feature.properties.information,
            geometry: feature.geometry,
            properties: feature.properties,
            nextInspection: feature.properties.next_inspection ? new Date(feature.properties.next_inspection) : null,
            webLink: feature.properties.web_link,
            areaAlert: feature.properties.area_alert || false,
            alertMessage: feature.properties.alert_message,
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
            location: feature.properties.location || 'Unknown location',
            status: feature.properties.status || 'active',
            imageUrl: feature.properties.image_url,
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

  const httpServer = createServer(app);
  return httpServer;
}

function randomUUID() {
  return crypto.randomUUID();
}
