import { useEffect, useState } from 'react'

export interface HazardCell {
  lat: number
  lon: number
  a:   number   // G-R a-value (log10 cumulative count above Mc)
  b:   number   // G-R b-value
  n:   number   // event count used to fit
}

export interface HazardData {
  mc:            number
  catalog_years: number
  cells:         HazardCell[]
}

/**
 * Compute the annual rate of events ≥ M in a cell and derive the
 * Poisson exceedance probability over T years.
 *
 *   rate/yr  = 10^(a − b×M) / catalog_years
 *   P(≥M, T) = 1 − exp(−rate × T)
 */
export function exceedanceProbability(
  cell: HazardCell,
  catalogYears: number,
  magnitudeThreshold: number,
  forecastYears: number,
): number {
  const annualRate = Math.pow(10, cell.a - cell.b * magnitudeThreshold) / catalogYears
  return 1 - Math.exp(-annualRate * forecastYears)
}

let cached: HazardData | null = null

export function useHazardData(): HazardData | null {
  const [data, setData] = useState<HazardData | null>(cached)

  useEffect(() => {
    if (cached) return

    fetch('/data/hazard.json')
      .then(r => r.json())
      .then((raw: { mc: number; catalog_years: number; cells: number[][] }) => {
        const parsed: HazardData = {
          mc:            raw.mc,
          catalog_years: raw.catalog_years,
          cells: raw.cells.map(([lat, lon, a, b, n]) => ({ lat, lon, a, b, n })),
        }
        cached = parsed
        setData(parsed)
      })
      .catch(err => {
        console.error('Failed to load hazard data', err)
      })
  }, [])

  return data
}
