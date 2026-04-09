import { useState } from 'react'
import type { County } from '#/types/county'
import type { CountyFeature } from '#/hooks/useGeoData'
import { CountyMiniMap } from './CountyMiniMap'
import { VideoSection } from './VideoSection'

interface CountyDetailProps {
  county: County
  feature: CountyFeature
}

const LandmarkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="mt-px flex-shrink-0">
    <circle cx="8" cy="6" r="3" stroke="var(--gold)" strokeWidth="1.2" fill="var(--gold)" fillOpacity="0.15" />
    <path d="M8 9.5L8 13" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5.5 13h5" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

export function CountyDetail({ county, feature }: CountyDetailProps) {
  const [hoveredLandmarkId, setHoveredLandmarkId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Video embed */}
      <VideoSection
        youtubeId={county.youtubeId}
        nebulaUrl={county.nebulaUrl}
        status={county.status}
        releaseDate={county.releaseDate}
      />

      {/* 2. County header + description */}
      <div className="pt-1">
        <span className="atlas-kicker mb-1 block">County Details</span>
        <div className="mb-3 h-px bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />

        <div>
          {county.coatOfArms && (
            <img
              src={county.coatOfArms}
              alt={`${county.name} coat of arms`}
              className="float-left mr-3 mb-1 h-16 w-16 object-contain"
            />
          )}
          <h2 className="display-title text-[22px] font-bold leading-tight text-[var(--ink)]">
            {county.name}
          </h2>
          {county.description && (
            <p className="drop-cap mt-1 text-[13px] italic leading-relaxed text-[var(--ink-soft)]">
              {county.description}
            </p>
          )}
          <div className="clear-left" />
        </div>
      </div>

      {/* 3. Stats */}
      {(county.population || county.areaSqKm || county.countyTown) && (
        <div className="flex justify-center gap-0">
          {county.population && (
            <>
              <div className="px-4 text-center">
                <p className="display-title text-lg font-bold text-[var(--ink)]">
                  {county.population.toLocaleString('en-GB')}
                </p>
                <p className="text-[8px] uppercase tracking-wider text-[var(--ink-soft)]">
                  Population
                </p>
              </div>
              <div className="w-px bg-[linear-gradient(180deg,transparent,var(--gold-line),transparent)]" />
            </>
          )}
          {county.areaSqKm && (
            <>
              <div className="px-4 text-center">
                <p className="display-title text-lg font-bold text-[var(--ink)]">
                  {county.areaSqKm}
                </p>
                <p className="text-[8px] uppercase tracking-wider text-[var(--ink-soft)]">
                  km²
                </p>
              </div>
              <div className="w-px bg-[linear-gradient(180deg,transparent,var(--gold-line),transparent)]" />
            </>
          )}
          {county.countyTown && (
            <div className="px-4 text-center">
              <p className="display-title text-lg font-bold text-[var(--ink)]">
                {county.countyTown.name}
              </p>
              <p className="text-[8px] uppercase tracking-wider text-[var(--ink-soft)]">
                County Town
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. Mini map — full width */}
      <CountyMiniMap
        feature={feature}
        county={county}
        hoveredLandmarkId={hoveredLandmarkId}
      />

      {/* 5. Landmarks */}
      {county.landmarks.length > 0 && (
        <div>
          <span className="atlas-kicker mb-2 block">Landmarks</span>
          <ul className="flex flex-col">
            {county.landmarks.map((lm) => (
              <li
                key={lm.name}
                className="relative flex cursor-default items-center gap-2 rounded-md border-b border-dotted border-[var(--line-dotted)] px-2 py-2 text-[12px] text-[var(--ink)] transition last:border-0 hover:bg-[var(--parchment-dark)]"
                onMouseEnter={() => setHoveredLandmarkId(lm.name)}
                onMouseLeave={() => setHoveredLandmarkId(null)}
              >
                <LandmarkIcon />
                {lm.name}
                {hoveredLandmarkId === lm.name && lm.description && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2.5 text-[11px] shadow-[0_2px_8px_var(--shadow-soft)] transition-all">
                    <p className="font-bold text-[var(--ink)]">{lm.name}</p>
                    <p className="text-[var(--ink-soft)]">{lm.description}</p>
                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--line)]" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
