import { env } from '../config/env.js';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export const DEFAULT_BOUNDS: GeoBounds = {
  minLat: env.GEO_BOUNDS_MIN_LAT,
  maxLat: env.GEO_BOUNDS_MAX_LAT,
  minLng: env.GEO_BOUNDS_MIN_LNG,
  maxLng: env.GEO_BOUNDS_MAX_LNG,
};

export const isValidCoordinate = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export const isWithinBounds = (
  lat: number,
  lng: number,
  bounds: GeoBounds = DEFAULT_BOUNDS
): boolean => {
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
};

export const calculateDistance = (
  point1: GeoLocation,
  point2: GeoLocation
): number => {
  const R = 6371;
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLng = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
      Math.cos(toRadians(point2.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

export const obfuscateLocation = (
  lat: number,
  lng: number,
  radiusMeters = 500
): GeoLocation => {
  const radiusKm = radiusMeters / 1000;
  const earthRadiusKm = 6371;

  const latOffset = (Math.random() - 0.5) * 2 * (radiusKm / earthRadiusKm) * (180 / Math.PI);
  const lngOffset =
    (Math.random() - 0.5) *
    2 *
    (radiusKm / earthRadiusKm) *
    (180 / Math.PI) /
    Math.cos((lat * Math.PI) / 180);

  return {
    latitude: lat + latOffset,
    longitude: lng + lngOffset,
  };
};

export const generateBoundingBox = (
  centerLat: number,
  centerLng: number,
  radiusKm: number
): GeoBounds => {
  const earthRadiusKm = 6371;
  const latDelta = (radiusKm / earthRadiusKm) * (180 / Math.PI);
  const lngDelta = latDelta / Math.cos((centerLat * Math.PI) / 180);

  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLng: centerLng - lngDelta,
    maxLng: centerLng + lngDelta,
  };
};
