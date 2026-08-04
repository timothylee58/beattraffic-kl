import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { fallbackStations } from '../lib/transitData'
import { predictCrowdLevel } from '../lib/predictiveEngine'
import { GOOGLE_MAPS_API_KEY, KL_CENTER, CROWD_MARKER_COLORS } from '../lib/mapConfig'
import type { CrowdForecast } from '../lib/transitData'

interface StationMarker {
  id: string
  name: string
  lat: number
  lon: number
  forecast: CrowdForecast | null
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100vh' }

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
}

function markerIcon(label: CrowdForecast['label'] | undefined): google.maps.Symbol {
  const color = CROWD_MARKER_COLORS[label ?? 'calm']
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 10,
    fillColor: color,
    fillOpacity: 0.9,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  }
}

export function MapPage() {
  const navigate = useNavigate()
  const [markers, setMarkers] = useState<StationMarker[]>([])
  const [selected, setSelected] = useState<StationMarker | null>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '',
    id: 'google-map-script',
  })

  useEffect(() => {
    const base: StationMarker[] = fallbackStations.map(s => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      forecast: null,
    }))
    setMarkers(base)

    // Fetch crowd forecasts in parallel
    Promise.all(
      fallbackStations.map(s =>
        predictCrowdLevel(s as any, []).then(f => ({ id: s.id, forecast: f }))
      )
    ).then(results => {
      setMarkers(prev =>
        prev.map(m => {
          const r = results.find(r => r.id === m.id)
          return r ? { ...m, forecast: r.forecast } : m
        })
      )
    })
  }, [])

  const handleMarkerClick = useCallback((marker: StationMarker) => {
    setSelected(marker)
  }, [])

  const handleInfoClose = useCallback(() => setSelected(null), [])

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center h-screen text-center p-8">
        <div>
          <p className="text-lg font-semibold">Google Maps API key not configured</p>
          <p className="text-sm text-muted-foreground mt-2">Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in your <code>.env</code> file.</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-destructive">Failed to load Google Maps: {loadError.message}</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-muted-foreground">Loading map…</div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white dark:bg-gray-900 rounded-xl shadow-lg px-4 py-3 space-y-1.5 text-sm">
        <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Crowd Level</p>
        {Object.entries(CROWD_MARKER_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
            <span className="capitalize">{label}</span>
          </div>
        ))}
      </div>

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={KL_CENTER}
        zoom={12}
        options={MAP_OPTIONS}
      >
        {markers.map(m => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lon }}
            icon={markerIcon(m.forecast?.label)}
            title={m.name}
            onClick={() => handleMarkerClick(m)}
          />
        ))}

        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lon }}
            onCloseClick={handleInfoClose}
          >
            <div className="text-sm min-w-[140px]">
              <p className="font-semibold">{selected.name}</p>
              {selected.forecast ? (
                <>
                  <p className="text-muted-foreground capitalize mt-1">{selected.forecast.label} — score {selected.forecast.score}</p>
                  <button
                    className="mt-2 text-blue-600 underline text-xs"
                    onClick={() => navigate(`/station/${selected.id}`)}
                  >
                    View station details →
                  </button>
                </>
              ) : (
                <p className="text-muted-foreground mt-1">Loading…</p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
