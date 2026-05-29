import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { WeatherDay } from '@/types/app.types'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface FarmMapProps {
  lat: number
  lng: number
  farmName: string
  weather?: WeatherDay | null
}

export function FarmMap({ lat, lng, farmName, weather }: FarmMapProps) {
  return (
    <MapContainer center={[lat, lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={icon}>
        <Popup minWidth={180}>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{farmName}</div>

            {weather ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <img
                    src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                    alt={weather.condition}
                    style={{ width: 40, height: 40, margin: '-4px -4px -4px -8px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {Math.round(weather.tempMax)}° / {Math.round(weather.tempMin)}°C
                    </div>
                    <div style={{ color: '#666', fontSize: 11, textTransform: 'capitalize' }}>
                      {weather.condition}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#555', borderTop: '1px solid #eee', paddingTop: 5 }}>
                  <span>💧 {weather.humidity}%</span>
                  <span>💨 {Math.round(weather.windSpeed)} m/s</span>
                </div>
              </div>
            ) : (
              <div style={{ color: '#888', fontSize: 11 }}>
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </div>
            )}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  )
}
