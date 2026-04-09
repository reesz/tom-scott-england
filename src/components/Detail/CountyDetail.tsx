import { useState } from 'react'
import type { County } from '#/types/county'
import type { CountyFeature } from '#/hooks/useGeoData'
import { CountdownBadge } from './CountdownBadge'
import { CountyMiniMap } from './CountyMiniMap'
import { VideoSection } from './VideoSection'

interface CountyDetailProps {
  county: County
  feature: CountyFeature
}

export function CountyDetail({ county, feature }: CountyDetailProps) {
  const [hoveredLandmarkId, setHoveredLandmarkId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Video embed at top */}
      <VideoSection
        youtubeId={county.youtubeId}
        nebulaUrl={county.nebulaUrl}
        status={county.status}
        releaseDate={county.releaseDate}
      />

      {/* 2. County name + description */}
      <div>
        <span className="atlas-kicker mb-1 block">County Details</span>
        <div className="mb-2 h-px bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />
        <div className="flex items-start gap-3">
          {county.coatOfArms && (
            <img
              src={county.coatOfArms}
              alt={`${county.name} coat of arms`}
              className="h-12 w-12 object-contain"
            />
          )}
          <div>
            <h2 className="display-title text-[22px] font-bold text-[var(--ink)]">
              {county.name}
            </h2>
            <CountdownBadge status={county.status} releaseDate={county.releaseDate} />
          </div>
        </div>
        {county.description && (
          <p className="mt-3 text-[13px] italic leading-relaxed text-[var(--ink-soft)]">
            {county.description}
          </p>
        )}
      </div>

      {/* 3. Mini map with highlightable landmarks */}
      <CountyMiniMap
        feature={feature}
        county={county}
        hoveredLandmarkId={hoveredLandmarkId}
      />

      {/* 4. Stats */}
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

      {/* 5. Landmarks list with hover interaction */}
      {county.landmarks.length > 0 && (
        <div>
          <span className="atlas-kicker mb-2 block">Landmarks</span>
          <ul className="flex flex-col">
            {county.landmarks.map((lm) => (
              <li
                key={lm.name}
                className="relative cursor-default rounded-md border-b border-dotted border-[var(--line-dotted)] px-2 py-2 text-[12px] text-[var(--ink)] transition last:border-0 hover:bg-[var(--parchment-dark)]"
                onMouseEnter={() => setHoveredLandmarkId(lm.name)}
                onMouseLeave={() => setHoveredLandmarkId(null)}
              >
                {lm.name}
                {/* Popover */}
                {hoveredLandmarkId === lm.name && lm.description && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2.5 text-[11px] shadow-[0_2px_8px_var(--shadow-soft)] transition-all">
                    <p className="font-bold text-[var(--ink)]">{lm.name}</p>
                    <p className="text-[var(--ink-soft)]">{lm.description}</p>
                    {/* Triangle */}
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
