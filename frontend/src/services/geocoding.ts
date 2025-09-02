export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export class GeocodingService {
  private static apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  static async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
        };
      } else {
        console.warn('Geocoding failed:', data.status);
        return null;
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  static async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding request failed');
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      } else {
        console.warn('Reverse geocoding failed:', data.status);
        return null;
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Get default coordinates for a city/state (fallback when exact address geocoding fails)
  static getDefaultCoordinates(city: string, state: string): { lat: number; lng: number } {
    const cityDefaults: { [key: string]: { lat: number; lng: number } } = {
      'new york': { lat: 40.7128, lng: -74.0060 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'houston': { lat: 29.7604, lng: -95.3698 },
      'phoenix': { lat: 33.4484, lng: -112.0740 },
      'philadelphia': { lat: 39.9526, lng: -75.1652 },
      'san antonio': { lat: 29.4241, lng: -98.4936 },
      'san diego': { lat: 32.7157, lng: -117.1611 },
      'dallas': { lat: 32.7767, lng: -96.7970 },
      'san jose': { lat: 37.3382, lng: -121.8863 },
      'austin': { lat: 30.2672, lng: -97.7431 },
      'jacksonville': { lat: 30.3322, lng: -81.6557 },
      'fort worth': { lat: 32.7555, lng: -97.3308 },
      'columbus': { lat: 39.9612, lng: -82.9988 },
      'charlotte': { lat: 35.2271, lng: -80.8431 },
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'indianapolis': { lat: 39.7684, lng: -86.1581 },
      'seattle': { lat: 47.6062, lng: -122.3321 },
      'denver': { lat: 39.7392, lng: -104.9903 },
      'washington': { lat: 38.9072, lng: -77.0369 },
      'boston': { lat: 42.3601, lng: -71.0589 },
      'el paso': { lat: 31.7619, lng: -106.4850 },
      'nashville': { lat: 36.1627, lng: -86.7816 },
      'detroit': { lat: 42.3314, lng: -83.0458 },
      'oklahoma city': { lat: 35.4676, lng: -97.5164 },
      'portland': { lat: 45.5152, lng: -122.6784 },
      'las vegas': { lat: 36.1699, lng: -115.1398 },
      'memphis': { lat: 35.1495, lng: -90.0490 },
      'louisville': { lat: 38.2527, lng: -85.7585 },
      'baltimore': { lat: 39.2904, lng: -76.6122 },
      'milwaukee': { lat: 43.0389, lng: -87.9065 },
      'albuquerque': { lat: 35.0844, lng: -106.6504 },
      'tucson': { lat: 32.2226, lng: -110.9747 },
      'fresno': { lat: 36.7378, lng: -119.7871 },
      'sacramento': { lat: 38.5816, lng: -121.4944 },
      'mesa': { lat: 33.4152, lng: -111.8315 },
      'kansas city': { lat: 39.0997, lng: -94.5786 },
      'atlanta': { lat: 33.7490, lng: -84.3880 },
      'colorado springs': { lat: 38.8339, lng: -104.8214 },
      'omaha': { lat: 41.2565, lng: -95.9345 },
      'raleigh': { lat: 35.7796, lng: -78.6382 },
      'miami': { lat: 25.7617, lng: -80.1918 },
      'long beach': { lat: 33.7701, lng: -118.1937 },
      'virginia beach': { lat: 36.8529, lng: -75.9780 },
      'oakland': { lat: 37.8044, lng: -122.2711 },
      'minneapolis': { lat: 44.9778, lng: -93.2650 },
      'tulsa': { lat: 36.1540, lng: -95.9928 },
      'tampa': { lat: 27.9506, lng: -82.4572 },
      'arlington': { lat: 32.7357, lng: -97.1081 },
      'new orleans': { lat: 29.9511, lng: -90.0715 },
    };

    const cityKey = city.toLowerCase();
    return cityDefaults[cityKey] || { lat: 39.8283, lng: -98.5795 }; // Default to center of US
  }
}
