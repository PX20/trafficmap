import { useMemo, useRef, useCallback } from 'react';
import Supercluster from 'supercluster';

export interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  markerType: string;
  color: string;
  feature: any;
  timestamp: number;
}

export interface ClusterPoint {
  type: 'Feature';
  properties: {
    cluster: false;
    id: string;
    markerType: string;
    color: string;
    feature: any;
    timestamp: number;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface ClusterData {
  type: 'Feature';
  properties: {
    cluster: true;
    cluster_id: number;
    point_count: number;
    point_count_abbreviated: string | number;
    dominantType: string;
    dominantColor: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export type ClusterOrPoint = ClusterData | ClusterPoint;

interface UseClusteredMarkersOptions {
  radius?: number;
  maxZoom?: number;
  minZoom?: number;
}

export function useClusteredMarkers(
  markers: MarkerData[],
  options: UseClusteredMarkersOptions = {}
) {
  const { radius = 60, maxZoom = 16, minZoom = 0 } = options;
  
  const superclusterRef = useRef<Supercluster | null>(null);

  const points = useMemo(() => {
    return markers.map((marker): ClusterPoint => ({
      type: 'Feature',
      properties: {
        cluster: false,
        id: marker.id,
        markerType: marker.markerType,
        color: marker.color,
        feature: marker.feature,
        timestamp: marker.timestamp,
      },
      geometry: {
        type: 'Point',
        coordinates: [marker.lng, marker.lat],
      },
    }));
  }, [markers]);

  const supercluster = useMemo(() => {
    const index = new Supercluster({
      radius,
      maxZoom,
      minZoom,
      map: (props: any) => ({
        markerType: props.markerType,
        color: props.color,
        count: 1,
        typeCounts: { [props.markerType]: 1 },
        colorCounts: { [props.color]: 1 },
      }),
      reduce: (accumulated: any, props: any) => {
        accumulated.count = (accumulated.count || 0) + (props.count || 1);
        if (!accumulated.typeCounts) {
          accumulated.typeCounts = {};
        }
        if (props.typeCounts) {
          for (const [type, count] of Object.entries(props.typeCounts)) {
            accumulated.typeCounts[type] = (accumulated.typeCounts[type] || 0) + (count as number);
          }
        }
        if (!accumulated.colorCounts) {
          accumulated.colorCounts = {};
        }
        if (props.colorCounts) {
          for (const [color, count] of Object.entries(props.colorCounts)) {
            accumulated.colorCounts[color] = (accumulated.colorCounts[color] || 0) + (count as number);
          }
        }
      },
    });
    
    index.load(points);
    superclusterRef.current = index;
    return index;
  }, [points, radius, maxZoom, minZoom]);

  const getClusters = useCallback(
    (bounds: { west: number; south: number; east: number; north: number }, zoom: number): ClusterOrPoint[] => {
      if (!supercluster) return [];
      
      const clusters = supercluster.getClusters(
        [bounds.west, bounds.south, bounds.east, bounds.north],
        Math.floor(zoom)
      );

      return clusters.map((cluster: any) => {
        if (cluster.properties.cluster) {
          const typeCounts = cluster.properties.typeCounts || {};
          const colorCounts = cluster.properties.colorCounts || {};
          
          let dominantType = 'traffic';
          let maxTypeCount = 0;
          for (const [type, count] of Object.entries(typeCounts)) {
            if ((count as number) > maxTypeCount) {
              maxTypeCount = count as number;
              dominantType = type;
            }
          }
          
          let dominantColor = '#6b7280';
          let maxColorCount = 0;
          for (const [color, count] of Object.entries(colorCounts)) {
            if ((count as number) > maxColorCount) {
              maxColorCount = count as number;
              dominantColor = color;
            }
          }

          return {
            type: 'Feature',
            properties: {
              cluster: true,
              cluster_id: cluster.properties.cluster_id,
              point_count: cluster.properties.point_count,
              point_count_abbreviated: cluster.properties.point_count_abbreviated,
              dominantType,
              dominantColor,
            },
            geometry: cluster.geometry,
          } as ClusterData;
        } else {
          return cluster as ClusterPoint;
        }
      });
    },
    [supercluster]
  );

  const getClusterExpansionZoom = useCallback(
    (clusterId: number): number => {
      if (!supercluster) return 16;
      try {
        return supercluster.getClusterExpansionZoom(clusterId);
      } catch {
        return 16;
      }
    },
    [supercluster]
  );

  const getClusterLeaves = useCallback(
    (clusterId: number, limit: number = 100): ClusterPoint[] => {
      if (!supercluster) return [];
      try {
        return supercluster.getLeaves(clusterId, limit) as ClusterPoint[];
      } catch {
        return [];
      }
    },
    [supercluster]
  );

  return {
    getClusters,
    getClusterExpansionZoom,
    getClusterLeaves,
    pointCount: points.length,
  };
}
