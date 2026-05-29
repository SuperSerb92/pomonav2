import { useQuery } from '@tanstack/react-query'
import type { WeatherDay } from '@/types/app.types'

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string

interface OWMForecastItem {
  dt: number
  main: { temp: number; temp_min: number; temp_max: number; humidity: number }
  weather: { id: number; main: string; description: string; icon: string }[]
  wind: { speed: number }
  dt_txt: string
}

function groupByDay(items: OWMForecastItem[]): WeatherDay[] {
  const map = new Map<string, OWMForecastItem[]>()
  items.forEach((item) => {
    const date = item.dt_txt.split(' ')[0]
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(item)
  })

  return Array.from(map.entries())
    .slice(0, 5)
    .map(([date, items]) => {
      const temps = items.map((i) => i.main.temp)
      const midday = items.find((i) => i.dt_txt.includes('12:00:00')) ?? items[Math.floor(items.length / 2)]
      return {
        date,
        tempMin: Math.min(...temps),
        tempMax: Math.max(...temps),
        condition: midday.weather[0].description,
        conditionCode: midday.weather[0].id,
        humidity: midday.main.humidity,
        windSpeed: midday.wind.speed,
        icon: midday.weather[0].icon,
      }
    })
}

export function useWeather(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: ['weather', lat, lng],
    queryFn: async () => {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&cnt=40&units=metric&appid=${API_KEY}`
      )
      if (!res.ok) throw new Error('Failed to fetch weather data')
      const json = await res.json()
      return groupByDay(json.list as OWMForecastItem[])
    },
    enabled: lat != null && lng != null && !!API_KEY,
    staleTime: 1000 * 60 * 30,
  })
}
