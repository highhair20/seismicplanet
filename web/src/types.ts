export interface EarthquakeEvent {
  time:      number   // Unix ms UTC
  lat:       number
  lon:       number
  depth_km:  number
  magnitude: number
}

export type ColorMode = 'depth' | 'magnitude'
