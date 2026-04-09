import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/sources')({ component: SourcesPage })

function SourcesPage() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-[var(--parchment)]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-1 text-sm text-[var(--gold)]">
          &larr; Back to map
        </Link>
        <h1 className="display-title mb-2 text-3xl font-bold text-[var(--ink)]">
          Sources &amp; Attribution
        </h1>
        <p className="mb-10 text-sm leading-relaxed text-[var(--ink-soft)]">
          This project relies on openly licensed data from the following sources.
          We gratefully acknowledge each contributor.
        </p>

        <section className="mb-8">
          <h2 className="display-title mb-2 text-lg font-bold text-[var(--ink)]">County Coat of Arms</h2>
          <p className="text-sm leading-relaxed text-[var(--ink)]">
            Coat of arms images are sourced from{' '}
            <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">
              Wikimedia Commons
            </a>
            , specifically the{' '}
            <a
              href="https://en.wikipedia.org/wiki/Armorial_of_county_councils_of_England"
              target="_blank"
              rel="noopener noreferrer"
            >
              Armorial of county councils of England
            </a>
            . These images are licensed under the{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
            </a>{' '}
            license. Individual authors are credited on each file's Wikimedia Commons page.
          </p>
        </section>

        <div className="mb-8 h-px bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />

        <section className="mb-8">
          <h2 className="display-title mb-2 text-lg font-bold text-[var(--ink)]">Elevation Data</h2>
          <p className="text-sm leading-relaxed text-[var(--ink)]">
            Terrain height data is derived from{' '}
            <a
              href="https://registry.opendata.aws/terrain-tiles/"
              target="_blank"
              rel="noopener noreferrer"
            >
              AWS Terrain Tiles
            </a>{' '}
            (Terrarium encoding), which aggregates elevation data from multiple public-domain sources
            including{' '}
            <a href="https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1" target="_blank" rel="noopener noreferrer">
              USGS SRTM
            </a>
            ,{' '}
            <a href="https://asterweb.jpl.nasa.gov/gdem.asp" target="_blank" rel="noopener noreferrer">
              ASTER GDEM
            </a>
            , and{' '}
            <a href="https://www.gebco.net/" target="_blank" rel="noopener noreferrer">
              GEBCO
            </a>
            . The tiles are provided by{' '}
            <a href="https://www.mapzen.com/" target="_blank" rel="noopener noreferrer">
              Mapzen
            </a>{' '}
            and hosted on AWS Open Data.
          </p>
        </section>

        <div className="mb-8 h-px bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />

        <section className="mb-8">
          <h2 className="display-title mb-2 text-lg font-bold text-[var(--ink)]">County Boundaries</h2>
          <p className="text-sm leading-relaxed text-[var(--ink)]">
            County boundary outlines (GeoJSON) are derived from{' '}
            <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer">
              OpenStreetMap
            </a>{' '}
            data, licensed under the{' '}
            <a
              href="https://opendatacommons.org/licenses/odbl/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Data Commons Open Database License (ODbL)
            </a>
            . &copy; OpenStreetMap contributors.
          </p>
        </section>

        <div className="mb-8 h-px bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />

        <section className="mb-8">
          <h2 className="display-title mb-2 text-lg font-bold text-[var(--ink)]">Coastline &amp; Land Data</h2>
          <p className="text-sm leading-relaxed text-[var(--ink)]">
            British Isles coastline outlines and land mask data are sourced from{' '}
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">
              Natural Earth
            </a>
            , a public domain dataset of cultural and physical geographic features.
          </p>
        </section>

        <div className="mb-8 h-px bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />

        <section className="mb-8">
          <h2 className="display-title mb-2 text-lg font-bold text-[var(--ink)]">Video Content</h2>
          <p className="text-sm leading-relaxed text-[var(--ink)]">
            Video embeds link to Tom Scott's "Every County" series on{' '}
            <a href="https://www.youtube.com/@TomScottGo" target="_blank" rel="noopener noreferrer">
              YouTube
            </a>{' '}
            and{' '}
            <a href="https://nebula.tv/" target="_blank" rel="noopener noreferrer">
              Nebula
            </a>
            . This site is not affiliated with Tom Scott or his production team.
            Videos are embedded via youtube-nocookie.com for privacy.
          </p>
        </section>

        <div className="mb-8 h-px bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />

        <section className="mb-16">
          <h2 className="display-title mb-2 text-lg font-bold text-[var(--ink)]">Fonts</h2>
          <p className="text-sm leading-relaxed text-[var(--ink)]">
            <a href="https://fonts.google.com/specimen/Fraunces" target="_blank" rel="noopener noreferrer">
              Fraunces
            </a>{' '}
            (display serif) and{' '}
            <a href="https://fonts.google.com/specimen/Manrope" target="_blank" rel="noopener noreferrer">
              Manrope
            </a>{' '}
            (UI sans-serif) are served via Google Fonts under the{' '}
            <a href="https://scripts.sil.org/cms/scripts/page.php?item_id=OFL_web" target="_blank" rel="noopener noreferrer">
              SIL Open Font License
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
