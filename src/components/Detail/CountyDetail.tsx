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
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        {county.coatOfArms && (
          <img
            src={county.coatOfArms}
            alt={`${county.name} coat of arms`}
            className="h-12 w-12 object-contain"
          />
        )}
        <div>
          <h2 className="display-title text-xl font-bold text-[var(--sea-ink)]">{county.name}</h2>
          <CountdownBadge status={county.status} releaseDate={county.releaseDate} />
        </div>
      </div>

      <CountyMiniMap feature={feature} county={county} />

      {(county.population || county.areaSqKm || county.countyTown) && (
        <div className="grid grid-cols-3 gap-3 text-center">
          {county.population && (
            <div>
              <p className="text-xs text-[var(--sea-ink-soft)]">Population</p>
              <p className="text-sm font-semibold text-[var(--sea-ink)]">
                {county.population.toLocaleString('en-GB')}
              </p>
            </div>
          )}
          {county.areaSqKm && (
            <div>
              <p className="text-xs text-[var(--sea-ink-soft)]">Area</p>
              <p className="text-sm font-semibold text-[var(--sea-ink)]">{county.areaSqKm} km²</p>
            </div>
          )}
          {county.countyTown && (
            <div>
              <p className="text-xs text-[var(--sea-ink-soft)]">County Town</p>
              <p className="text-sm font-semibold text-[var(--sea-ink)]">{county.countyTown.name}</p>
            </div>
          )}
        </div>
      )}

      {county.description && (
        <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)]">{county.description}</p>
      )}

      {county.landmarks.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
            Notable Landmarks
          </h3>
          <ul className="flex flex-wrap gap-2">
            {county.landmarks.map((lm) => (
              <li
                key={lm.name}
                className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-xs text-[var(--sea-ink)]"
              >
                {lm.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <VideoSection
        youtubeId={county.youtubeId}
        nebulaUrl={county.nebulaUrl}
        status={county.status}
        releaseDate={county.releaseDate}
      />
    </div>
  )
}
