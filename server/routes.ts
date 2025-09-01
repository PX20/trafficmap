import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertIncidentSchema, insertCommentSchema } from "@shared/schema";
import { z } from "zod";

const API_BASE_URL = "https://api.qldtraffic.qld.gov.au";
const PUBLIC_API_KEY = "3e83add325cbb69ac4d8e5bf433d770b";

// Traffic data cache to avoid hitting rate limits
const trafficCache = {
  events: { data: null as any, lastFetch: 0 },
  cameras: { data: null as any, lastFetch: 0 }
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const RETRY_DELAY = 30 * 1000; // 30 seconds delay on rate limit

function isCacheValid(cacheEntry: any): boolean {
  return cacheEntry.data && (Date.now() - cacheEntry.lastFetch) < CACHE_DURATION;
}

async function fetchWithRetry(url: string, retryDelay: number = RETRY_DELAY): Promise<Response> {
  const response = await fetch(url);
  
  if (response.status === 429) {
    console.log(`Rate limited, waiting ${retryDelay/1000}s before next attempt...`);
    throw new Error(`Rate limited - try again in ${retryDelay/1000} seconds`);
  }
  
  return response;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user's home suburb
  app.patch('/api/user/suburb', isAuthenticated, async (req: any, res) => {
    try {
      const { homeSuburb } = z.object({
        homeSuburb: z.string().min(1),
      }).parse(req.body);

      const userId = req.user.claims.sub;
      const updatedUser = await storage.updateUserSuburb(userId, homeSuburb);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user suburb:", error);
      res.status(500).json({ message: "Failed to update suburb" });
    }
  });

  // Get traffic events from QLD Traffic API (with caching)
  app.get("/api/traffic/events", async (req, res) => {
    try {
      const { suburb } = req.query;
      let data;

      // Check if we have valid cached data
      if (isCacheValid(trafficCache.events)) {
        console.log("Using cached traffic events data");
        data = trafficCache.events.data;
      } else {
        // Try to fetch fresh data
        try {
          console.log("Fetching fresh traffic events data...");
          const apiKey = process.env.QLD_TRAFFIC_API_KEY || PUBLIC_API_KEY;
          const response = await fetchWithRetry(`${API_BASE_URL}/v2/events?apikey=${apiKey}`);
          
          if (!response.ok) {
            throw new Error(`QLD Traffic API error: ${response.status} ${response.statusText}`);
          }
          
          data = await response.json();
          
          // Update cache
          trafficCache.events = {
            data: data,
            lastFetch: Date.now()
          };
          
        } catch (error) {
          // If fetch fails and we have old cached data, use it
          if (trafficCache.events.data) {
            console.log("API fetch failed, using stale cached data");
            data = trafficCache.events.data;
          } else {
            throw error;
          }
        }
      }
      
      // Filter by suburb if provided
      if (suburb && data.features) {
        data.features = data.features.filter((feature: any) => {
          const locality = feature.properties?.road_summary?.locality?.toLowerCase();
          const roadName = feature.properties?.road_summary?.road_name?.toLowerCase();
          const searchSuburb = (suburb as string).toLowerCase();
          return locality?.includes(searchSuburb) || roadName?.includes(searchSuburb);
        });
      }
      
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

  // Get traffic cameras from QLD Traffic API (with caching)
  app.get("/api/traffic/cameras", async (req, res) => {
    try {
      let data;

      // Check if we have valid cached data
      if (isCacheValid(trafficCache.cameras)) {
        console.log("Using cached traffic cameras data");
        data = trafficCache.cameras.data;
      } else {
        // Try to fetch fresh data
        try {
          console.log("Fetching fresh traffic cameras data...");
          const apiKey = process.env.QLD_TRAFFIC_API_KEY || PUBLIC_API_KEY;
          const response = await fetchWithRetry(`${API_BASE_URL}/v2/cameras?apikey=${apiKey}`);
          
          if (!response.ok) {
            throw new Error(`QLD Traffic API error: ${response.status} ${response.statusText}`);
          }
          
          data = await response.json();
          
          // Update cache
          trafficCache.cameras = {
            data: data,
            lastFetch: Date.now()
          };
          
        } catch (error) {
          // If fetch fails and we have old cached data, use it
          if (trafficCache.cameras.data) {
            console.log("API fetch failed, using stale cached data");
            data = trafficCache.cameras.data;
          } else {
            throw error;
          }
        }
      }
      
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

  // Get cached incidents (fast endpoint with pagination)
  app.get("/api/incidents", async (req, res) => {
    try {
      const { suburb, limit = '50' } = req.query;
      const maxLimit = parseInt(limit as string, 10);
      
      // Get recent incidents from database with a reasonable limit
      const recentIncidents = await storage.getRecentIncidents(maxLimit);
      
      // Transform incidents to GeoJSON format
      let incidentFeatures = recentIncidents.map(incident => ({
        type: "Feature",
        properties: {
          ...(incident.properties || {}),
          incidentType: incident.incidentType,
          description: incident.description,
          locationDescription: incident.location,
          createdAt: incident.lastUpdated,
          userReported: incident.incidentType === 'Crime' || incident.incidentType === 'Suspicious' || !(incident.properties as any)?.Master_Incident_Number,
        },
        geometry: incident.geometry || {
          type: "Point",
          coordinates: [153.0251, -27.4698] // Default to Brisbane
        }
      }));
      
      // Filter by suburb if provided
      if (suburb) {
        incidentFeatures = incidentFeatures.filter((feature: any) => {
          const locality = feature.properties?.Locality?.toLowerCase();
          const location = feature.properties?.Location?.toLowerCase();
          const locationDesc = feature.properties?.locationDescription?.toLowerCase();
          const searchSuburb = (suburb as string).toLowerCase();
          return locality?.includes(searchSuburb) || 
                 location?.includes(searchSuburb) || 
                 locationDesc?.includes(searchSuburb);
        });
      }
      
      const data = {
        type: "FeatureCollection",
        features: incidentFeatures,
        lastUpdated: new Date().toISOString(),
        total: incidentFeatures.length
      };
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching cached incidents:", error);
      res.status(500).json({ 
        error: "Failed to fetch incidents", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Refresh incidents from external API (slow endpoint)
  app.post("/api/incidents/refresh", async (req, res) => {
    try {
      console.log("Refreshing incidents from external API...");
      
      // Set timeout for external API call to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(
        "https://services1.arcgis.com/vkTwD8kHw2woKBqV/arcgis/rest/services/ESCAD_Current_Incidents_Public/FeatureServer/0/query?f=geojson&where=1%3D1&outFields=*",
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      let data;
      if (!response.ok) {
        console.warn(`ArcGIS API error: ${response.status} ${response.statusText}`);
        return res.json({ success: false, message: "External API temporarily unavailable" });
      }
      
      data = await response.json();
      
      // Clear existing emergency incidents (but keep user reports)
      const existingIncidents = await storage.getIncidents();
      const userIncidents = existingIncidents.filter(inc => (inc.properties as any)?.userReported);
      
      // Store new emergency incidents
      let storedCount = 0;
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
            storedCount++;
          } catch (error) {
            console.warn('Failed to store incident:', incident.id, error);
          }
        }
      }
      
      res.json({ 
        success: true, 
        message: `Successfully refreshed ${storedCount} emergency incidents`,
        count: storedCount
      });
    } catch (error) {
      console.error("Error refreshing incidents:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to refresh incidents", 
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

  // Report new incident (authenticated users only)
  app.post("/api/incidents/report", isAuthenticated, async (req: any, res) => {
    try {
      const reportData = z.object({
        incidentType: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        location: z.string().min(1),
        priority: z.enum(["High", "Medium", "Low"]).optional(),
      }).parse(req.body);

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const incident = {
        incidentType: reportData.incidentType,
        title: reportData.title,
        description: reportData.description || null,
        location: reportData.location,
        status: "Reported",
        priority: reportData.priority || null,
        agency: "User Report",
        publishedDate: new Date(),
        geometry: null,
        properties: {
          reportedBy: user?.email || "Anonymous",
          userReported: true,
        },
      };
      
      const newIncident = await storage.createIncident(incident);
      res.json(newIncident);
    } catch (error) {
      console.error("Error creating incident report:", error);
      res.status(500).json({ 
        error: "Failed to submit incident report", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });


  // Comments API endpoints
  app.get("/api/incidents/:incidentId/comments", async (req, res) => {
    try {
      const { incidentId } = req.params;
      const comments = await storage.getCommentsByIncidentId(incidentId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/incidents/:incidentId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const { incidentId } = req.params;
      const userId = req.user.claims.sub;
      
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        incidentId,
        userId,
      });

      const comment = await storage.createComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.patch("/api/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user.claims.sub;

      // Check if user owns the comment
      const existingComments = await storage.getCommentsByIncidentId(''); // We'll need to get by comment ID
      // For now, we'll trust the user - in production, add proper ownership check

      const validatedData = z.object({
        content: z.string().min(1),
      }).parse(req.body);

      const comment = await storage.updateComment(commentId, validatedData);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  app.delete("/api/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user.claims.sub;

      // In production, add proper ownership check here
      const success = await storage.deleteComment(commentId);
      
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function randomUUID() {
  return crypto.randomUUID();
}

