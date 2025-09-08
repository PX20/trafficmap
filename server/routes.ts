import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { isAuthenticated, setupAuth as setupReplitAuth } from "./replitAuth";
import webpush from "web-push";
import { insertIncidentSchema, insertCommentSchema, insertConversationSchema, insertMessageSchema, insertNotificationSchema } from "@shared/schema";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import express from "express";
import path from "path";
import sharp from "sharp";
import fs from "fs";
import { 
  findRegionBySuburb, 
  getRegionFromCoordinates, 
  isFeatureInRegion, 
  extractCoordinatesFromGeometry,
  QLD_REGIONS
} from "./region-utils";

const API_BASE_URL = "https://api.qldtraffic.qld.gov.au";
const PUBLIC_API_KEY = "3e83add325cbb69ac4d8e5bf433d770b";

// Traffic data cache to avoid hitting rate limits
const trafficCache = {
  events: { data: null as any, lastFetch: 0 },
  sunshineCoast: { data: null as any, lastFetch: 0 }
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const SUNSHINE_COAST_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for Sunshine Coast
const RETRY_DELAY = 30 * 1000; // 30 seconds delay on rate limit

// Configure web push - Generate VAPID keys for production
// For now, skip configuration to avoid startup errors
// In production, generate proper VAPID keys with: npx web-push generate-vapid-keys
try {
  // Only configure if proper VAPID keys are available
  const publicKey = process.env.VAPID_PUBLIC_KEY || 'BNXnNJlwtD-_OLQ_8YE3WRe3dXHO_-ZI2sGE7zJyR5eKjsEMAp0diFzOl1ZUgQzfOjm4Cf8PSQ7c1-oIqY2GsHw';
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  
  if (privateKey && privateKey.length > 20) {
    webpush.setVapidDetails(
      'mailto:support@example.com',
      publicKey,
      privateKey
    );
    console.log('Web push configured with VAPID keys');
  } else {
    console.log('Web push: VAPID keys not configured - push notifications disabled');
  }
} catch (error) {
  console.log('Web push configuration skipped:', error instanceof Error ? error.message : 'Unknown error');
}

// Sunshine Coast suburbs for filtering
const SUNSHINE_COAST_SUBURBS = [
  'caloundra', 'mooloolaba', 'noosa', 'maroochydore', 'nambour', 'cooroy', 
  'tewantin', 'buderim', 'sippy downs', 'kawana', 'pelican waters', 
  'kings beach', 'moffat beach', 'dicky beach', 'currimundi', 'bokarina',
  'warana', 'wurtulla', 'landsborough', 'beerwah', 'glass house mountains'
];

function isCacheValid(cacheEntry: any, duration: number = CACHE_DURATION): boolean {
  return cacheEntry.data && (Date.now() - cacheEntry.lastFetch) < duration;
}

function isSunshineCoastLocation(feature: any): boolean {
  const locality = feature.properties?.road_summary?.locality?.toLowerCase() || '';
  const roadName = feature.properties?.road_summary?.road_name?.toLowerCase() || '';
  const location = `${locality} ${roadName}`.toLowerCase();
  
  return SUNSHINE_COAST_SUBURBS.some(suburb => 
    location.includes(suburb) || locality.includes(suburb)
  );
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
  // Debug: log the path being used
  const assetsPath = path.resolve(process.cwd(), 'attached_assets');
  console.log('Serving static assets from:', assetsPath);
  console.log('Directory exists:', fs.existsSync(assetsPath));
  
  // Serve static assets with compression for images
  app.use('/attached_assets', express.static(assetsPath));
  
  // Image compression endpoint - compresses images on-the-fly
  app.get('/api/compress-image', async (req, res) => {
    const imagePath = req.query.path as string;
    if (!imagePath) {
      return res.status(400).json({ error: 'Path parameter required' });
    }
    
    const filePath = path.join(process.cwd(), imagePath);
    
    try {
      if (!fs.existsSync(filePath) || !imagePath.startsWith('/attached_assets/')) {
        return res.status(404).json({ error: 'Image not found' });
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      
      // Only compress images larger than 100KB
      if (fileSize < 100 * 1024) {
        return res.sendFile(filePath);
      }

      const compressed = await sharp(filePath)
        .resize(800, 800, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 75, 
          progressive: true 
        })
        .toBuffer();

      res.set({
        'Content-Type': 'image/jpeg',
        'Content-Length': compressed.length.toString(),
        'Cache-Control': 'public, max-age=86400', // 1 day cache
        'X-Original-Size': fileSize.toString(),
        'X-Compressed-Size': compressed.length.toString(),
        'X-Compression-Ratio': `${Math.round(((fileSize - compressed.length) / fileSize) * 100)}%`
      });

      res.send(compressed);
      
    } catch (error) {
      console.error('Image compression error:', error);
      res.status(500).json({ error: 'Compression failed' });
    }
  });

  // Auth middleware
  await setupAuth(app);
  
  // Replit Auth routes (login, logout, callback)
  await setupReplitAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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

      const userId = (req.user as any).claims.sub;
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

  // Get traffic events from QLD Traffic API (with enhanced caching)
  app.get("/api/traffic/events", async (req, res) => {
    try {
      const { suburb } = req.query;
      let data;
      
      // Check if this is a Sunshine Coast request
      const isSunshineCoastRequest = suburb && 
        SUNSHINE_COAST_SUBURBS.some(scSuburb => 
          (suburb as string).toLowerCase().includes(scSuburb)
        );

      // Use Sunshine Coast specific cache if applicable  
      if (isSunshineCoastRequest && isCacheValid(trafficCache.sunshineCoast, SUNSHINE_COAST_CACHE_DURATION)) {
        console.log("Using cached Sunshine Coast traffic data");
        data = JSON.parse(JSON.stringify(trafficCache.sunshineCoast.data)); // Deep copy to avoid modifying cache
      } else if (!isSunshineCoastRequest && isCacheValid(trafficCache.events)) {
        console.log("Using cached traffic events data");
        data = JSON.parse(JSON.stringify(trafficCache.events.data)); // Deep copy to avoid modifying cache
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
          
          // Update general cache
          trafficCache.events = {
            data: data,
            lastFetch: Date.now()
          };
          
          // Also update Sunshine Coast specific cache with filtered data
          if (data.features) {
            const sunshineCoastEvents = {
              ...data,
              features: data.features.filter(isSunshineCoastLocation)
            };
            trafficCache.sunshineCoast = {
              data: sunshineCoastEvents,
              lastFetch: Date.now()
            };
            console.log(`Cached ${sunshineCoastEvents.features.length} Sunshine Coast events for 1 hour`);
          }
          
        } catch (error) {
          // If fetch fails and we have old cached data, use it
          const fallbackCache = isSunshineCoastRequest ? trafficCache.sunshineCoast : trafficCache.events;
          if (fallbackCache.data) {
            console.log("API fetch failed, using stale cached data");
            data = JSON.parse(JSON.stringify(fallbackCache.data)); // Deep copy
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
      
      // Transform and store events in local storage for caching (filter by age only)
      let trafficStoredCount = 0;
      let trafficAgeFilteredCount = 0;
      if (data.features) {
        for (const feature of data.features) {
          // Filter out traffic events older than 7 days
          const publishedDate = feature.properties.published ? new Date(feature.properties.published) : null;
          const lastUpdated = feature.properties.last_updated ? new Date(feature.properties.last_updated) : null;
          const eventDate = publishedDate || lastUpdated;
          
          if (eventDate) {
            const daysSinceEvent = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceEvent > 7) {
              trafficAgeFilteredCount++;
              continue;
            }
          }
          
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
            areaAlert: feature.properties.area_area || false,
            alertMessage: feature.properties.alert_message || null,
          };
          
          
          await storage.updateTrafficEvent(event.id, event) || await storage.createTrafficEvent(event);
          trafficStoredCount++;
        }
        
        if (trafficAgeFilteredCount > 0) {
          console.log(`Filtered out ${trafficAgeFilteredCount} traffic events older than 7 days`);
        }
      }
      
      
      // Apply 7-day age filter to data being returned to client
      if (data && data.features && Array.isArray(data.features)) {
        const originalCount = data.features.length;
        
        data.features = data.features.filter((feature: any) => {
          try {
            const publishedDate = feature.properties?.published ? new Date(feature.properties.published) : null;
            const lastUpdated = feature.properties?.last_updated ? new Date(feature.properties.last_updated) : null;
            const eventDate = publishedDate || lastUpdated;
            
            if (eventDate && !isNaN(eventDate.getTime())) {
              const daysSince = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
              return daysSince <= 7;
            }
            
            // If no valid date available, exclude it
            return false;
          } catch (error) {
            return false;
          }
        });
        
        const filteredCount = originalCount - data.features.length;
        if (filteredCount > 0) {
          console.log(`Filtered out ${filteredCount} traffic events older than 7 days (${data.features.length} remaining)`);
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


  // Get cached incidents (fast endpoint with pagination)
  app.get("/api/incidents", async (req, res) => {
    try {
      const { suburb, limit = '50' } = req.query;
      const maxLimit = parseInt(limit as string, 10);
      
      // Get recent incidents from database with a reasonable limit
      const recentIncidents = await storage.getRecentIncidents(maxLimit);
      
      // Transform incidents to GeoJSON format
      let incidentFeatures = recentIncidents.map(incident => {
        const props = incident.properties as any || {};
        const isUserReported = incident.agency === 'User Report' || incident.incidentType === 'user_reported';
        
        // Debug logging for user-reported incidents
        if (isUserReported) {
          console.log('User reported incident transformation:', {
            original: props,
            reportedBy: props.reportedBy,
            reporterName: props.reporterName
          });
        }
        
        
        return {
          type: "Feature",
          properties: {
            id: incident.id,
            ...(incident.properties || {}),
            incidentType: incident.incidentType,
            description: incident.description,
            locationDescription: incident.location,
            status: incident.status, // Include the status field for marker coloring
            createdAt: incident.lastUpdated,
            userReported: isUserReported,
            // Add proper user attribution for user-reported incidents
            ...(isUserReported && {
              reporterId: props.reporterId,
              reporterName: props.reporterName || props.reportedBy?.split('@')[0] || "Anonymous User",
              timeReported: props.timeReported || incident.lastUpdated,
              photoUrl: incident.photoUrl || props.photoUrl, // Include incident photo from database
              title: incident.title || props.title
            })
          },
          geometry: (() => {
            // Use the robust coordinate extraction function
            const coords = extractCoordinatesFromGeometry(incident.geometry);
            
            if (coords) {
              // Valid coordinates found, use them (convert back to [lng, lat] for GeoJSON)
              const [lat, lng] = coords;
              return {
                type: "Point", 
                coordinates: [lng, lat]
              };
            } else {
              // No valid coordinates, use Brisbane default
              return {
                type: "Point",
                coordinates: [153.0251, -27.4698] // Default to Brisbane
              };
            }
          })()
        };
      });
      
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

  // Location search endpoint using Nominatim (OpenStreetMap)
  app.get('/api/location/search', async (req, res) => {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    try {
      // Using Nominatim (OpenStreetMap) as a free alternative
      // Focus on Queensland, Australia for better local results
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(q + ', Queensland, Australia')}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5&` +
        `countrycodes=au&` +
        `bounded=1&` +
        `viewbox=138.0,-29.0,154.0,-9.0`, // Queensland bounding box
        {
          headers: {
            'User-Agent': 'QLD Safety Monitor (contact: support@example.com)'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      // Transform to our format and filter for Queensland suburbs
      const locationSuggestions = data
        .filter((item: any) => 
          item.address && 
          (item.address.suburb || item.address.city || item.address.town || item.address.village) &&
          item.address.state && 
          (item.address.state.includes('Queensland') || item.address.state.includes('QLD'))
        )
        .map((item: any) => {
          // Extract the actual suburb name from display_name
          // Format: "Street Name, Suburb, City, Region, State, Postcode, Country"
          const parts = item.display_name.split(',').map((p: string) => p.trim());
          
          // Try to get suburb from the second part of display_name first
          let suburb = parts[1] || parts[0]; // Use second part (suburb) or fallback to first part
          
          // Fallback to address fields if display_name doesn't work
          if (!suburb || suburb.length < 2) {
            suburb = item.address.suburb || 
                    item.address.town || 
                    item.address.village ||
                    item.address.city;
          }
          
          const postcode = item.address.postcode;
          
          return {
            display_name: item.display_name, // Keep original for debugging
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            address: {
              suburb: suburb,
              city: item.address.city,
              state: item.address.state,
              postcode: postcode,
              country: item.address.country
            },
            boundingbox: item.boundingbox ? [
              item.boundingbox[0], // min_lat
              item.boundingbox[1], // max_lat
              item.boundingbox[2], // min_lon
              item.boundingbox[3]  // max_lon
            ] : undefined
          };
        });

      // Deduplicate results by suburb + postcode combination
      const uniqueLocations = locationSuggestions.filter((location: any, index: number, arr: any[]) => {
        const key = `${location.address.suburb}-${location.address.postcode}`;
        return arr.findIndex((l: any) => `${l.address.suburb}-${l.address.postcode}` === key) === index;
      });

      res.json(uniqueLocations);

    } catch (error) {
      console.error('Location search error:', error);
      res.status(500).json({ error: 'Location search failed' });
    }
  });

  // Reverse geocoding endpoint - convert coordinates to suburb name
  app.get("/api/location/reverse", async (req, res) => {
    const lat = req.query.lat as string;
    const lon = req.query.lon as string;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&extratags=1&namedetails=1`,
        {
          headers: {
            'User-Agent': 'QLD Safety Monitor/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding request failed');
      }

      const data = await response.json();
      
      if (!data.address) {
        return res.status(404).json({ error: 'No address found for coordinates' });
      }

      // Extract street/road name from address data
      const road = data.address.road || 
                  data.address.street ||
                  // Get from display_name if it's not infrastructure
                  (() => {
                    const parts = data.display_name?.split(',') || [];
                    const firstPart = parts[0]?.trim();
                    // Only use first part if it's NOT infrastructure (no numbers, "Access", etc.)
                    if (firstPart && !(/\d|Access|Way$|Path$|Bridge|Link|Cycleway|Pathway/.test(firstPart))) {
                      return firstPart;
                    }
                    return null;
                  })();

      // Extract suburb name from address data - prioritize actual suburb over infrastructure names
      const suburb = data.address.suburb || 
                    data.address.residential ||  // Local area name like "Kawana Forest"
                    data.address.town || 
                    data.address.village ||
                    data.address.city_district ||  // More specific than city
                    data.address.city ||
                    // If no address suburb, try to get actual suburb from display_name (usually 2nd part)
                    (() => {
                      const parts = data.display_name?.split(',') || [];
                      // Skip first part if it looks like infrastructure (contains numbers, "Access", "Way", etc.)
                      if (parts.length > 1 && parts[0] && (/\d|Access|Way|Path|Bridge|Link|Cycleway|Pathway/.test(parts[0]))) {
                        return parts[1]?.trim();
                      }
                      return parts[0]?.trim();
                    })();
      
      const postcode = data.address.postcode;
      const state = data.address.state;

      // Only return locations in Queensland
      if (!state || !state.includes('Queensland')) {
        return res.status(400).json({ error: 'Location must be in Queensland' });
      }

      res.json({
        road: road,
        suburb: suburb,
        postcode: postcode,
        state: state,
        display_name: data.display_name
      });

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({ error: 'Reverse geocoding failed' });
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
      
      // Store new emergency incidents (keep all, filter by age only)
      let storedCount = 0;
      let ageFilteredCount = 0;
      if (data.features) {
        for (const feature of data.features) {
          const props = feature.properties;
          
          // Filter out incidents older than 7 days
          const responseDate = props.Response_Date ? new Date(props.Response_Date) : null;
          if (responseDate) {
            const daysSinceResponse = (Date.now() - responseDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceResponse > 7) {
              ageFilteredCount++;
              continue;
            }
          }
          
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
        message: `Successfully refreshed ${storedCount} emergency incidents (filtered out ${ageFilteredCount} incidents older than 7 days)`,
        count: storedCount,
        filtered: ageFilteredCount
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
        categoryId: z.string().min(1, "Category is required"),
        subcategoryId: z.string().min(1, "Subcategory is required"),
        title: z.string().min(1),
        description: z.string().optional(),
        location: z.string().min(1),
        policeNotified: z.enum(["yes", "no", "not_needed", "unsure"]).optional(),
        photoUrl: z.string().optional(),
      }).parse(req.body);

      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      
      // Increment subcategory report count for analytics
      if (reportData.subcategoryId) {
        await storage.incrementSubcategoryReportCount(reportData.subcategoryId);
      }

      // Geocode the location to get coordinates for mapping
      let geometry = null;
      try {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(reportData.location + ', Queensland, Australia')}&` +
          `format=json&limit=1&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'QLD Safety Monitor (contact: support@example.com)'
            }
          }
        );
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.length > 0) {
            const result = geocodeData[0];
            geometry = {
              type: "Point",
              coordinates: [parseFloat(result.lon), parseFloat(result.lat)]
            };
          }
        }
      } catch (error) {
        console.error("Error geocoding user incident location:", error);
        // Continue without coordinates - incident will still be created but won't appear on map
      }

      const incident = {
        incidentType: "User Report", // Keep for backward compatibility
        categoryId: reportData.categoryId,
        subcategoryId: reportData.subcategoryId,
        title: reportData.title,
        description: reportData.description || null,
        location: reportData.location,
        status: "Reported",
        policeNotified: reportData.policeNotified || null,
        agency: "User Report",
        publishedDate: new Date(),
        photoUrl: reportData.photoUrl || null, // User-uploaded photo
        geometry: geometry,
        properties: {
          reportedBy: user?.email || "Anonymous",
          userReported: true,
          // Store user details for proper attribution
          reporterId: user?.id,
          reporterName: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.firstName || user?.email?.split('@')[0] || "Anonymous User",
          photoUrl: user?.profileImageUrl,
          timeReported: new Date().toISOString(),
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

  // Update incident status - only allow creator to mark complete
  app.patch("/api/incidents/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const incidentId = req.params.id;
      const { status } = req.body;
      const userId = (req.user as any).claims.sub;

      if (!status || !['active', 'completed'].includes(status)) {
        return res.status(400).json({ error: "Status must be 'active' or 'completed'" });
      }

      // Get the incident to check if user is the creator
      const incident = await storage.getIncident(incidentId);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      // Check if user is the creator (stored in properties.reporterId)
      const reporterId = (incident.properties as any)?.reporterId;
      if (reporterId !== userId) {
        return res.status(403).json({ error: "Only the incident creator can update status" });
      }

      // Update the incident status
      await storage.updateIncidentStatus(incidentId, status);
      
      res.json({ success: true, message: "Incident status updated successfully" });
    } catch (error) {
      console.error("Error updating incident status:", error);
      res.status(500).json({ error: "Failed to update incident status" });
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
      
      // Check if user object exists and has expected structure
      if (!req.user || !req.user.id) {
        console.error("User object missing or malformed:", req.user);
        return res.status(401).json({ message: "User authentication failed" });
      }
      
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        incidentId,
        userId,
      });

      const comment = await storage.createComment(validatedData);
      
      // Create notification for replies
      if (comment.parentCommentId) {
        // This is a reply - notify the original comment author
        const parentComment = await storage.getCommentById(comment.parentCommentId);
        if (parentComment && parentComment.userId !== userId) {
          const displayName = user?.displayName || user?.firstName || 'Someone';
          await storage.createNotification({
            userId: parentComment.userId,
            type: 'comment_reply',
            title: 'New Reply',
            message: `${displayName} replied to your comment`,
            entityId: comment.id,
            entityType: 'comment',
            fromUserId: userId,
          });
        }
      }
      
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
      const userId = (req.user as any).claims.sub;

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
      const userId = (req.user as any).claims.sub;

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

  // User Profile Routes
  app.get('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check privacy settings - only return public information for non-own profiles
      const currentUserId = (req.user as any).claims.sub;
      if (currentUserId !== userId && user.profileVisibility === 'private') {
        return res.status(403).json({ message: "This profile is private" });
      }
      
      // Filter sensitive information for non-own profiles
      if (currentUserId !== userId) {
        const { phoneNumber, ...publicUser } = user;
        return res.json(user.profileVisibility === 'public' ? user : publicUser);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Messaging Routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const { otherUserId } = z.object({
        otherUserId: z.string().min(1),
      }).parse(req.body);

      const currentUserId = (req.user as any).claims.sub;
      
      // Check if conversation already exists
      let conversation = await storage.getConversationBetweenUsers(currentUserId, otherUserId);
      
      if (!conversation) {
        // Create new conversation
        conversation = await storage.createConversation({
          user1Id: currentUserId,
          user2Id: otherUserId,
        });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:conversationId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const userId = (req.user as any).claims.sub;
      
      // Verify user has access to this conversation
      const conversation = await storage.getConversationBetweenUsers(userId, "dummy"); // We'll check properly
      const conversations = await storage.getConversationsByUserId(userId);
      const hasAccess = conversations.some(c => c.id === conversationId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      
      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:conversationId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const { content } = z.object({
        content: z.string().min(1).max(1000),
      }).parse(req.body);

      const userId = (req.user as any).claims.sub;
      
      // Verify user has access to this conversation
      const conversations = await storage.getConversationsByUserId(userId);
      const hasAccess = conversations.some(c => c.id === conversationId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      
      const message = await storage.createMessage({
        conversationId,
        senderId: userId,
        content,
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch('/api/conversations/:conversationId/read', isAuthenticated, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const userId = (req.user as any).claims.sub;
      
      // Verify user has access to this conversation
      const conversations = await storage.getConversationsByUserId(userId);
      const hasAccess = conversations.some(c => c.id === conversationId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      
      await storage.markMessagesAsRead(conversationId, userId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Notification Routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !(req.user as any).claims.sub) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      
      const userId = (req.user as any).claims.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json(count);
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread notification count" });
    }
  });

  app.patch('/api/notifications/:notificationId/read', isAuthenticated, async (req: any, res) => {
    try {
      const { notificationId } = req.params;
      await storage.markNotificationAsRead(notificationId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.get('/api/messages/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !(req.user as any).claims.sub) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      
      const userId = (req.user as any).claims.sub;
      const count = await storage.getUnreadMessageCount(userId);
      res.json(count);
    } catch (error) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });

  // Object storage routes for profile photos
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve object files
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Update profile photo
  app.put("/api/user/profile-photo", isAuthenticated, async (req, res) => {
    if (!req.body.photoURL) {
      return res.status(400).json({ error: "photoURL is required" });
    }

    try {
      const userId = (req.user as any)?.claims?.sub;
      const objectStorageService = new ObjectStorageService();
      
      // Normalize the object path from the uploaded URL
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.photoURL
      );

      // Set ACL policy for the uploaded photo (make it public since profile photos are visible to others)
      await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoURL,
        {
          owner: userId,
          visibility: "public",
        }
      );

      // Update user's profileImageUrl in the database
      const updatedUser = await storage.updateUserProfile(userId, {
        profileImageUrl: objectPath,
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        objectPath: objectPath,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error setting profile photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Enhanced user profile routes
  app.put('/api/user/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const profileData = req.body;
      
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/users/suburb/:suburb', async (req, res) => {
    try {
      const { suburb } = req.params;
      const users = await storage.getUsersBySuburb(suburb);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users by suburb:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Comment voting routes
  app.post('/api/comments/:commentId/vote', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { commentId } = req.params;
      const { voteType } = req.body;
      
      if (!['helpful', 'not_helpful'].includes(voteType)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }
      
      const vote = await storage.voteOnComment({
        userId,
        commentId,
        voteType
      });
      
      res.json(vote);
    } catch (error) {
      console.error("Error voting on comment:", error);
      res.status(500).json({ message: "Failed to vote on comment" });
    }
  });

  app.get('/api/comments/:commentId/user-vote', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { commentId } = req.params;
      
      const vote = await storage.getUserVoteOnComment(userId, commentId);
      res.json(vote || null);
    } catch (error) {
      console.error("Error fetching user vote:", error);
      res.status(500).json({ message: "Failed to fetch vote" });
    }
  });

  // Neighborhood group routes
  app.get('/api/neighborhood-groups', async (req, res) => {
    try {
      const { suburb } = req.query;
      
      let groups;
      if (suburb) {
        groups = await storage.getGroupsBySuburb(suburb as string);
      } else {
        groups = await storage.getNeighborhoodGroups();
      }
      
      res.json(groups);
    } catch (error) {
      console.error("Error fetching neighborhood groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post('/api/neighborhood-groups', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const groupData = {
        ...req.body,
        createdBy: userId
      };
      
      const group = await storage.createNeighborhoodGroup(groupData);
      
      // Auto-join the creator to the group
      await storage.joinNeighborhoodGroup({
        userId,
        groupId: group.id,
        role: 'admin'
      });
      
      res.json(group);
    } catch (error) {
      console.error("Error creating neighborhood group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.post('/api/neighborhood-groups/:groupId/join', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { groupId } = req.params;
      
      const membership = await storage.joinNeighborhoodGroup({
        userId,
        groupId,
        role: 'member'
      });
      
      res.json(membership);
    } catch (error) {
      console.error("Error joining neighborhood group:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  app.delete('/api/neighborhood-groups/:groupId/leave', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { groupId } = req.params;
      
      const success = await storage.leaveNeighborhoodGroup(userId, groupId);
      
      if (!success) {
        return res.status(404).json({ message: "Membership not found" });
      }
      
      res.json({ success });
    } catch (error) {
      console.error("Error leaving neighborhood group:", error);
      res.status(500).json({ message: "Failed to leave group" });
    }
  });

  // Emergency contact routes
  app.get('/api/emergency-contacts', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const contacts = await storage.getEmergencyContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching emergency contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post('/api/emergency-contacts', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const contactData = {
        ...req.body,
        userId
      };
      
      const contact = await storage.createEmergencyContact(contactData);
      res.json(contact);
    } catch (error) {
      console.error("Error creating emergency contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.delete('/api/emergency-contacts/:contactId', isAuthenticated, async (req, res) => {
    try {
      const { contactId } = req.params;
      const success = await storage.deleteEmergencyContact(contactId);
      
      if (!success) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json({ success });
    } catch (error) {
      console.error("Error deleting emergency contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Safety check-in routes
  app.post('/api/safety-checkins', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const checkInData = {
        ...req.body,
        userId
      };
      
      const checkIn = await storage.createSafetyCheckIn(checkInData);
      res.json(checkIn);
    } catch (error) {
      console.error("Error creating safety check-in:", error);
      res.status(500).json({ message: "Failed to create check-in" });
    }
  });

  app.get('/api/safety-checkins/incident/:incidentId', async (req, res) => {
    try {
      const { incidentId } = req.params;
      const checkIns = await storage.getSafetyCheckIns(incidentId);
      res.json(checkIns);
    } catch (error) {
      console.error("Error fetching safety check-ins:", error);
      res.status(500).json({ message: "Failed to fetch check-ins" });
    }
  });

  app.get('/api/safety-checkins/user', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const checkIns = await storage.getUserSafetyCheckIns(userId);
      res.json(checkIns);
    } catch (error) {
      console.error("Error fetching user safety check-ins:", error);
      res.status(500).json({ message: "Failed to fetch check-ins" });
    }
  });
  
  // Seed categories with hierarchical structure
  app.post("/api/categories/seed", async (req, res) => {
    try {
      console.log("Seeding hierarchical categories...");
      
      // Check if categories already exist
      const existingCategories = await storage.getCategories();
      if (existingCategories.length > 0) {
        return res.json({ 
          success: true, 
          message: "Categories already seeded", 
          count: existingCategories.length 
        });
      }
      
      // Main categories with hierarchy
      const categoryData = [
        {
          name: "Safety & Crime",
          description: "Crime, violence, theft, and public safety concerns",
          icon: "shield",
          color: "#7c3aed", // purple
          order: 1,
          subcategories: [
            { name: "Violence & Threats", description: "Physical violence, threats, intimidation", order: 1 },
            { name: "Theft & Property Crime", description: "Theft, burglary, property damage", order: 2 },
            { name: "Suspicious Activity", description: "Unusual behavior or activities", order: 3 },
            { name: "Public Disturbances", description: "Noise, disruptions, antisocial behavior", order: 4 }
          ]
        },
        {
          name: "Infrastructure & Hazards",
          description: "Road hazards, utilities, and structural problems",
          icon: "construction",
          color: "#ea580c", // orange
          order: 2,
          subcategories: [
            { name: "Road Hazards", description: "Fallen trees, debris, potholes, dangerous conditions", order: 1 },
            { name: "Utility Issues", description: "Power lines, water leaks, gas problems", order: 2 },
            { name: "Building Problems", description: "Structural damage, unsafe buildings", order: 3 },
            { name: "Environmental Hazards", description: "Chemical spills, pollution, toxic materials", order: 4 }
          ]
        },
        {
          name: "Emergency Situations",
          description: "Active emergencies requiring immediate attention",
          icon: "siren",
          color: "#dc2626", // red
          order: 3,
          subcategories: [
            { name: "Fire & Smoke", description: "Fires, smoke, burning structures or vegetation", order: 1 },
            { name: "Medical Emergencies", description: "Medical incidents in public spaces", order: 2 },
            { name: "Natural Disasters", description: "Floods, storms, weather emergencies", order: 3 },
            { name: "Chemical/Hazmat", description: "Chemical spills, gas leaks, hazardous materials", order: 4 }
          ]
        },
        {
          name: "Wildlife & Nature",
          description: "Animal-related incidents and environmental concerns",
          icon: "leaf",
          color: "#16a34a", // green
          order: 4,
          subcategories: [
            { name: "Dangerous Animals", description: "Snakes, aggressive animals, pest control", order: 1 },
            { name: "Animal Welfare", description: "Injured or distressed animals", order: 2 },
            { name: "Environmental Issues", description: "Pollution, illegal dumping, habitat damage", order: 3 },
            { name: "Pest Problems", description: "Insect infestations, rodent problems", order: 4 }
          ]
        },
        {
          name: "Community Issues",
          description: "Local community concerns and quality of life issues",
          icon: "users",
          color: "#2563eb", // blue
          order: 5,
          subcategories: [
            { name: "Noise Complaints", description: "Excessive noise, loud parties, construction", order: 1 },
            { name: "Traffic Issues", description: "Dangerous driving, parking problems", order: 2 },
            { name: "Public Space Problems", description: "Park issues, playground damage", order: 3 },
            { name: "Events & Gatherings", description: "Large gatherings, street events", order: 4 }
          ]
        },
        {
          name: "Lost & Found",
          description: "Lost and found items, missing and found pets",
          icon: "search",
          color: "#f59e0b", // amber
          order: 6,
          subcategories: [
            { name: "Lost Items", description: "Lost keys, phones, wallets, jewelry, documents", order: 1 },
            { name: "Found Items", description: "Found personal belongings that need to be returned", order: 2 },
            { name: "Missing Pets", description: "Lost or missing cats, dogs, and other pets", order: 3 },
            { name: "Found Pets", description: "Found animals looking for their owners", order: 4 }
          ]
        }
      ];
      
      let categoryCount = 0;
      let subcategoryCount = 0;
      
      // Create categories and subcategories
      for (const catData of categoryData) {
        const { subcategories, ...categoryInfo } = catData;
        const category = await storage.createCategory(categoryInfo);
        categoryCount++;
        
        // Create subcategories for this category
        for (const subData of subcategories) {
          await storage.createSubcategory({
            ...subData,
            categoryId: category.id
          });
          subcategoryCount++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `Successfully seeded ${categoryCount} categories and ${subcategoryCount} subcategories`,
        categories: categoryCount,
        subcategories: subcategoryCount
      });
    } catch (error) {
      console.error("Error seeding categories:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to seed categories", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get all categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  
  // Get subcategories (all or by category)
  app.get("/api/subcategories", async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const subcategories = await storage.getSubcategories(categoryId);
      res.json(subcategories);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      res.status(500).json({ error: "Failed to fetch subcategories" });
    }
  });

  // Create a new category
  app.post("/api/categories", async (req, res) => {
    try {
      const categoryData = req.body;
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Create a new subcategory
  app.post("/api/subcategories", async (req, res) => {
    try {
      const subcategoryData = req.body;
      const subcategory = await storage.createSubcategory(subcategoryData);
      res.json(subcategory);
    } catch (error) {
      console.error("Error creating subcategory:", error);
      res.status(500).json({ error: "Failed to create subcategory" });
    }
  });

  // Object Storage endpoints for photo uploads
  
  // Get upload URL for photos
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Serve uploaded photos (publicly accessible)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Photo not found" });
      }
      return res.status(500).json({ error: "Failed to serve photo" });
    }
  });

  // Push notification subscription endpoints
  app.post('/api/push/subscribe', isAuthenticated, async (req, res) => {
    try {
      const { subscription } = req.body;
      const userId = (req.user as any)?.claims?.sub;

      if (!subscription || !userId) {
        return res.status(400).json({ error: 'Invalid subscription data' });
      }

      // Save subscription to storage (you may want to add a subscriptions table)
      // For now, we'll store in user preferences or a simple in-memory store
      console.log('Push subscription registered for user:', userId, subscription);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving push subscription:', error);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  app.post('/api/push/unsubscribe', isAuthenticated, async (req, res) => {
    try {
      const { endpoint } = req.body;
      const userId = (req.user as any)?.claims?.sub;

      if (!endpoint || !userId) {
        return res.status(400).json({ error: 'Invalid unsubscribe data' });
      }

      // Remove subscription from storage
      console.log('Push subscription removed for user:', userId, endpoint);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing push subscription:', error);
      res.status(500).json({ error: 'Failed to remove subscription' });
    }
  });

  // Test push notification endpoint (for development)
  app.post('/api/push/test', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      
      // In a real implementation, you'd fetch user's subscription from database
      // For demo purposes, we'll return success without sending actual notification
      console.log('Test push notification requested for user:', userId);
      
      res.json({ 
        success: true, 
        message: 'Push notification system is ready. Subscription management needed for actual sending.' 
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  // Incident Follow-up Routes
  app.get('/api/incidents/:incidentId/follow-ups', async (req, res) => {
    try {
      const { incidentId } = req.params;
      const followUps = await storage.getIncidentFollowUps(incidentId);
      res.json(followUps);
    } catch (error) {
      console.error("Error fetching incident follow-ups:", error);
      res.status(500).json({ message: "Failed to fetch incident follow-ups" });
    }
  });

  app.post('/api/incidents/:incidentId/follow-ups', isAuthenticated, async (req: any, res) => {
    try {
      const { incidentId } = req.params;
      const { status, description, photoUrl } = req.body;
      const userId = (req.user as any).claims.sub;

      // Validate required fields
      if (!status || !description) {
        return res.status(400).json({ message: "Status and description are required" });
      }

      const followUp = await storage.createIncidentFollowUp({
        incidentId,
        userId,
        status,
        description,
        photoUrl: photoUrl || null,
      });

      res.json(followUp);
    } catch (error) {
      console.error("Error creating incident follow-up:", error);
      res.status(500).json({ message: "Failed to create incident follow-up" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function randomUUID() {
  return crypto.randomUUID();
}

