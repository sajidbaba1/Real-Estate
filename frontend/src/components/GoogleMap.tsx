import React, { useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { MapPin, AlertCircle } from 'lucide-react';

interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    title?: string;
    info?: string;
  }>;
  height?: string;
  className?: string;
}

interface GoogleMapComponentProps extends MapProps {
  onMapLoad?: (map: google.maps.Map) => void;
}

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  center,
  zoom = 15,
  markers = [],
  height = '400px',
  className = '',
  onMapLoad,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });
      
      setMap(newMap);
      onMapLoad?.(newMap);
    }
  }, [ref, map, center, zoom, onMapLoad]);

  useEffect(() => {
    if (map) {
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  useEffect(() => {
    if (map) {
      // Clear existing markers
      const existingMarkers = (map as any)._markers || [];
      existingMarkers.forEach((marker: google.maps.Marker) => marker.setMap(null));

      // Add new markers
      const newMarkers = markers.map((markerData) => {
        const marker = new google.maps.Marker({
          position: markerData.position,
          map,
          title: markerData.title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        if (markerData.info) {
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div class="p-3">
                <h3 class="font-semibold text-gray-900 mb-1">${markerData.title || 'Property'}</h3>
                <p class="text-sm text-gray-600">${markerData.info}</p>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
        }

        return marker;
      });

      // Store markers on map instance for cleanup
      (map as any)._markers = newMarkers;
    }
  }, [map, markers]);

  return <div ref={ref} style={{ height }} className={`w-full rounded-lg ${className}`} />;
};

const LoadingComponent: React.FC = () => (
  <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto mb-2"></div>
      <p className="text-gray-600">Loading map...</p>
    </div>
  </div>
);

const ErrorComponent: React.FC<{ error: Error }> = ({ error }) => (
  <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border border-red-200">
    <div className="text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-red-800 mb-2">Map Error</h3>
      <p className="text-red-600 text-sm">{error.message}</p>
    </div>
  </div>
);

const render = (status: Status): React.ReactElement => {
  switch (status) {
    case Status.LOADING:
      return <LoadingComponent />;
    case Status.FAILURE:
      return <ErrorComponent error={new Error('Failed to load Google Maps')} />;
    case Status.SUCCESS:
      return <GoogleMapComponent {...({} as GoogleMapComponentProps)} />;
  }
};

const GoogleMap: React.FC<MapProps> = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Map Unavailable</h3>
          <p className="text-yellow-600 text-sm">Google Maps API key not configured</p>
        </div>
      </div>
    );
  }

  return (
    <Wrapper apiKey={apiKey} render={render} libraries={['places']}>
      <GoogleMapComponent {...props} />
    </Wrapper>
  );
};

export default GoogleMap;
