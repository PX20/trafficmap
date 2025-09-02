// Utility functions for location-based filtering and proximity calculations

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Calculate the distance between two geographic points using the Haversine formula
 * @param point1 First coordinate point
 * @param point2 Second coordinate point
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lon - point1.lon);
  
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRad(value: number): number {
  return value * Math.PI / 180;
}

/**
 * Check if a point is within a specified radius of a center point
 * @param center The center point coordinates
 * @param point The point to check
 * @param radiusKm The radius in kilometers
 * @returns true if the point is within the radius
 */
export function isWithinRadius(center: Coordinates, point: Coordinates, radiusKm: number): boolean {
  const distance = calculateDistance(center, point);
  return distance <= radiusKm;
}

/**
 * Check if a point is within a bounding box
 * @param boundingBox The bounding box coordinates
 * @param point The point to check
 * @returns true if the point is within the bounding box
 */
export function isWithinBoundingBox(boundingBox: BoundingBox, point: Coordinates): boolean {
  return point.lat >= boundingBox.minLat &&
         point.lat <= boundingBox.maxLat &&
         point.lon >= boundingBox.minLon &&
         point.lon <= boundingBox.maxLon;
}

/**
 * Create an expanded bounding box around a point with a buffer radius
 * @param center The center point
 * @param radiusKm The radius in kilometers to expand
 * @returns Expanded bounding box
 */
export function createExpandedBoundingBox(center: Coordinates, radiusKm: number): BoundingBox {
  // Rough approximation: 1 degree latitude ≈ 111 km, 1 degree longitude ≈ 111 km * cos(lat)
  const latOffset = radiusKm / 111;
  const lonOffset = radiusKm / (111 * Math.cos(toRad(center.lat)));
  
  return {
    minLat: center.lat - latOffset,
    maxLat: center.lat + latOffset,
    minLon: center.lon - lonOffset,
    maxLon: center.lon + lonOffset
  };
}

/**
 * Filter locations based on proximity to home location
 * @param locations Array of locations with coordinates
 * @param homeLocation Home coordinates
 * @param homeBoundingBox Optional bounding box from geocoding service
 * @param maxDistanceKm Maximum distance in kilometers (default 15km)
 * @returns Filtered locations within proximity
 */
export function filterLocationsByProximity<T extends { coordinates: [number, number] }>(
  locations: T[],
  homeLocation: Coordinates,
  homeBoundingBox?: [number, number, number, number],
  maxDistanceKm: number = 15
): T[] {
  // If we have a bounding box from the geocoding service, use it first as a broad filter
  let filteredLocations = locations;
  
  if (homeBoundingBox) {
    const boundingBox: BoundingBox = {
      minLat: homeBoundingBox[0],
      maxLat: homeBoundingBox[1],
      minLon: homeBoundingBox[2],
      maxLon: homeBoundingBox[3]
    };
    
    // Expand the bounding box slightly for nearby suburbs
    const expandedBox = {
      minLat: boundingBox.minLat - 0.05, // ~5km buffer
      maxLat: boundingBox.maxLat + 0.05,
      minLon: boundingBox.minLon - 0.05,
      maxLon: boundingBox.maxLon + 0.05
    };
    
    filteredLocations = locations.filter(location => {
      const point: Coordinates = {
        lat: location.coordinates[1], // Note: GeoJSON uses [lon, lat] format
        lon: location.coordinates[0]
      };
      return isWithinBoundingBox(expandedBox, point);
    });
  }
  
  // Then apply distance filtering for more precise proximity
  return filteredLocations.filter(location => {
    const point: Coordinates = {
      lat: location.coordinates[1], // Note: GeoJSON uses [lon, lat] format  
      lon: location.coordinates[0]
    };
    return isWithinRadius(homeLocation, point, maxDistanceKm);
  });
}

/**
 * Extract coordinates from various GeoJSON geometry formats
 * @param geometry GeoJSON geometry object
 * @returns Coordinate pair [lon, lat] or null if can't extract
 */
export function extractCoordinatesFromGeometry(geometry: any): [number, number] | null {
  if (!geometry || !geometry.coordinates) return null;
  
  if (geometry.type === 'Point') {
    return [geometry.coordinates[0], geometry.coordinates[1]];
  }
  
  if (geometry.type === 'MultiPoint' && geometry.coordinates[0]) {
    const point = geometry.coordinates[0];
    return [point[0], point[1]];
  }
  
  if (geometry.type === 'GeometryCollection' && geometry.geometries) {
    const pointGeometry = geometry.geometries.find((g: any) => g.type === 'Point');
    if (pointGeometry?.coordinates) {
      return [pointGeometry.coordinates[0], pointGeometry.coordinates[1]];
    }
  }
  
  // Handle other geometry types by taking first coordinate
  if (geometry.geometries?.[0]?.coordinates) {
    const geom = geometry.geometries[0];
    if (geom.type === 'Point') {
      return [geom.coordinates[0], geom.coordinates[1]];
    }
    if (geom.type === 'MultiLineString' || geom.type === 'LineString') {
      const firstLine = geom.type === 'MultiLineString' ? geom.coordinates[0] : geom.coordinates;
      if (firstLine && firstLine[0]) {
        return [firstLine[0][0], firstLine[0][1]];
      }
    }
  }
  
  return null;
}