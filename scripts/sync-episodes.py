#!/usr/bin/env python3
"""
Sync episodes and Tom's route from tomscott.com/england into the map data.

Reads the episode table and the route drawn on Tom's series page, then:
  - public/data/counties.json: YouTube/Nebula links, status and release dates
    (several episodes in one county go into `additionalVideos`)
  - public/data/journey.json: one stop per episode in filming order, plus the
    announced next stop. New stops are georeferenced from Tom's SVG using the
    stops already in journey.json as control points.

Safe to re-run: values already in the data (release dates, places, links you
fixed by hand) are kept unless the page has something newer. Only the video
fields of counties.json are rewritten, in place, so its formatting survives.

Usage:
  python3 scripts/sync-episodes.py            # fetch and update
  python3 scripts/sync-episodes.py --dry-run  # show what would change
  python3 scripts/sync-episodes.py --html page.html --offline
"""

import argparse
import datetime as dt
import html
import json
import math
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

PAGE_URL = 'https://www.tomscott.com/england/'
CHANNEL_FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCBa659QWEk1AI4Tg--mrJ2A'
USER_AGENT = 'tom-scott-england-map/1.0 (+https://github.com/reesz/tom-scott-england)'

ROOT = Path(__file__).resolve().parent.parent
COUNTIES_PATH = ROOT / 'public/data/counties.json'
JOURNEY_PATH = ROOT / 'public/data/journey.json'

# Tom films historic counties; the map uses ceremonial ones. Episodes are filed
# by filming location. Historic counties not listed here map to the county with
# the same id; add an entry when a new one doesn't exist in counties.json.
COUNTY_MAP = {
    'west-riding-of-yorkshire': 'south-yorkshire',   # Sheffield Hallam University
    'north-riding-of-yorkshire': 'north-yorkshire',  # Peasholm Park, Scarborough
    'durham': 'tyne-and-wear',                       # Tyne Tunnels
    'westmorland': 'cumbria',                        # Morecambe Bay
    'cumberland': 'cumbria',                         # Cumbria Clock Company
    'lancashire': 'greater-manchester',              # Network Rail Manchester classroom
    'huntingdonshire': 'cambridgeshire',             # Nene Valley Railway
    'surrey': 'greater-london',                      # Kirkaldy's Testing Works, Southwark
    'middlesex': 'greater-london',
}

# YouTube IDs on Tom's page that are dead, mapped to the live upload
YOUTUBE_FIXES = {
    'pqUqgMsxJdk': 'BxXfeotgVVA',  # Cumberland, re-uploaded with a new title
}

MONTHS = {m: i for i, m in enumerate(
    ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
     'september', 'october', 'november', 'december'], 1)}


# --- Fetching ---------------------------------------------------------------

def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept-Language': 'en'})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read().decode('utf-8', errors='replace')


def youtube_is_live(video_id: str) -> bool:
    """Only a 404 counts as dead; rate limits or outages (common on CI) don't."""
    try:
        fetch(f'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json')
        return True
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return False
        print(f'warning: could not check YouTube {video_id} (HTTP {err.code}); keeping it')
        return True
    except urllib.error.URLError as err:
        print(f'warning: could not check YouTube {video_id} ({err.reason}); keeping it')
        return True


def youtube_description(video_id: str) -> str:
    try:
        page = fetch(f'https://www.youtube.com/watch?v={video_id}')
    except urllib.error.URLError:
        return ''
    m = re.search(r'"shortDescription":"((?:[^"\\]|\\.)*)"', page)
    return json.loads(f'"{m.group(1)}"') if m else ''


def guess_place(description: str, county: str) -> str | None:
    """First 'At X,' in the opening sentence, e.g. 'At Warwick Castle, it's…'"""
    first = description.split('\n')[0]
    for m in re.finditer(r"\b(?:At|at|In|in) (?:the )?([A-Z][^,.|!?]{2,60}?)(?=,| I | it's| there)", first):
        place = m.group(1).strip()
        if place.lower() not in (county.lower(), 'yorkshire', 'england'):
            return place
    return None


# --- Parsing Tom's page -----------------------------------------------------

def parse_episodes(page: str) -> list[dict]:
    table = page[page.index('<table class="videos-table"'):]
    table = table[:table.index('</table>')]
    episodes = []
    for m in re.finditer(r'<tr id="row-([^"]+)">(.*?)</tr>', table, re.S):
        row_id, body = m.groups()
        links = re.search(r'vid-links">(.*?)</div>', body, re.S)
        links = links.group(1) if links else ''
        nebula = re.search(r'href="(https://nebula\.tv/[^"]+)"', links)
        youtube = re.search(r'youtube\.com/watch\?v=([\w-]{11})', links)
        title = re.search(r'td-video">\s*(.*?)<div', body, re.S)
        episodes.append({
            'id': row_id,
            'county': html.unescape(re.search(r'td-county">(.*?)</td>', body, re.S).group(1).strip()),
            'title': html.unescape(title.group(1).strip()) if title else None,
            'nebulaUrl': nebula.group(1) if nebula else None,
            'youtubeId': youtube.group(1) if youtube else None,
        })
    return episodes


def parse_upcoming(page: str) -> tuple[str, int, int] | None:
    """'Coming up November 2 on Nebula: Wiltshire' -> ('Wiltshire', 11, 2)"""
    m = re.search(r'class="coming-up">\s*Coming up (\w+) (\d+)[^:]*:\s*([^<]+?)\s*</div>', page)
    if not m or m.group(1).lower() not in MONTHS:
        return None
    return html.unescape(m.group(3)), MONTHS[m.group(1).lower()], int(m.group(2))


def parse_points(d: str) -> list[tuple[float, float]]:
    return [(float(x), float(y)) for x, y in re.findall(r'(-?[\d.]+),(-?[\d.]+)', d)]


def parse_route(page: str) -> tuple[list[tuple[float, float]], tuple[float, float] | None, set[int]]:
    """Route stops (SVG coords), the dashed leg's end, and the stop indices reached by train."""
    route = re.search(r'<path d="(M[^"]+)" fill="none" stroke="#c02c38" stroke-width="8" stroke-linecap="round" stroke-linejoin', page)
    if not route:
        sys.exit('Could not find the route path on the page; has the map markup changed?')
    stops = parse_points(route.group(1))
    nxt = re.search(r'<path d="(M[^"]+)" fill="none" stroke="#c02c38" stroke-width="8" stroke-linecap="round" stroke-dasharray', page)
    next_point = parse_points(nxt.group(1))[-1] if nxt else None

    # The car hides while the train drives. The motion's keyTimes alternate
    # arrive/depart per stop, so leg k (stop k-1 -> k) runs keyTimes[2k-1]..[2k].
    train: set[int] = set()
    car = re.search(r'<g class="route-dot route-car">(.*?)</g>\s*<g class="route-dot route-train"', page, re.S)
    if car:
        motion = re.search(r'<animateMotion[^>]*keyTimes="([^"]+)"', car.group(1))
        vis = re.search(r'<animate attributeName="visibility"[^>]*keyTimes="([^"]+)"[^>]*values="([^"]+)"', car.group(1))
        if motion and vis:
            key_times = [float(t) for t in motion.group(1).split(';')]
            vis_times = [float(t) for t in vis.group(1).split(';')]
            vis_values = vis.group(2).split(';')

            def car_visible(t: float) -> bool:
                value = vis_values[0]
                for kt, v in zip(vis_times, vis_values):
                    if kt <= t:
                        value = v
                return value == 'visible'

            for k in range(1, len(stops)):
                if 2 * k < len(key_times):
                    mid = (key_times[2 * k - 1] + key_times[2 * k]) / 2
                    if not car_visible(mid):
                        train.add(k)
    return stops, next_point, train


# --- Georeferencing ---------------------------------------------------------

def merc(lat: float) -> float:
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def inv_merc(y: float) -> float:
    return math.degrees(2 * math.atan(math.exp(y)) - math.pi / 2)


def fit_line(xs: list[float], ys: list[float]) -> tuple[float, float]:
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    a = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    return a, my - a * mx


def georeferencer(points: list[tuple[float, float]], known: list[dict]):
    """Fit SVG -> lat/lng (Tom's map is Mercator) on stops we already have."""
    pairs = [(points[s['episode'] - 1], s['coords']) for s in known if s['episode'] - 1 < len(points)]
    if len(pairs) < 3:
        sys.exit('Need at least 3 existing journey stops to georeference new ones.')
    ax, bx = fit_line([p[0] for p, _ in pairs], [c['lng'] for _, c in pairs])
    ay, by = fit_line([p[1] for p, _ in pairs], [merc(c['lat']) for _, c in pairs])

    def to_coords(p: tuple[float, float]) -> dict:
        return {'lat': round(inv_merc(ay * p[1] + by), 4), 'lng': round(ax * p[0] + bx, 4)}

    worst = max(
        math.hypot((to_coords(p)['lat'] - c['lat']) * 111,
                   (to_coords(p)['lng'] - c['lng']) * 111 * math.cos(math.radians(c['lat'])))
        for p, c in pairs)
    return to_coords, worst


# --- Writing ----------------------------------------------------------------

def j(v) -> str:
    return json.dumps(v, ensure_ascii=False)


def patch_county(text: str, cid: str, fields: dict, extra: list[dict]) -> str:
    """Rewrite one county's video fields in place, keeping the file's layout."""
    pat = re.compile(
        r'(\n(\s*)"id": "%s",.*?)"youtubeId": .*?\n\s*"nebulaUrl": .*?\n\s*"status": .*?\n'
        r'\s*"releaseDate": [^\n]*?(?:,\n\s*"additionalVideos": \[.*?\n\s*\])?(?=\n\s*\})' % re.escape(cid),
        re.S)
    m = pat.search(text)
    if not m:
        sys.exit(f'Could not find video fields for "{cid}" in counties.json')
    ind = m.group(2)
    body = f',\n{ind}'.join(f'"{k}": {j(fields[k])}' for k in ('youtubeId', 'nebulaUrl', 'status', 'releaseDate'))
    if extra:
        rows = ',\n'.join(
            f'{ind}  {{ ' + ', '.join(f'"{k}": {j(v[k])}' for k in ('title', 'youtubeId', 'nebulaUrl', 'releaseDate')) + ' }'
            for v in extra)
        body += f',\n{ind}"additionalVideos": [\n{rows}\n{ind}]'
    return text[:m.start()] + m.group(1) + body + text[m.end():]


def write_journey(stops: list[dict]) -> str:
    rows = ',\n'.join('    { ' + ', '.join(f'{j(k)}: {j(v)}' for k, v in s.items()) + ' }' for s in stops)
    return f'{{\n  "source": {j(PAGE_URL)},\n  "stops": [\n{rows}\n  ]\n}}\n'


# --- Main -------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dry-run', action='store_true', help='print changes without writing files')
    ap.add_argument('--html', type=Path, help='read the series page from a local file')
    ap.add_argument('--offline', action='store_true', help="skip YouTube checks (dead links, places)")
    args = ap.parse_args()

    page = args.html.read_text() if args.html else fetch(PAGE_URL)
    episodes = parse_episodes(page)
    upcoming = parse_upcoming(page)
    points, next_point, train = parse_route(page)
    if len(points) != len(episodes):
        print(f'warning: page lists {len(episodes)} episodes but the route has {len(points)} stops')

    counties_text = COUNTIES_PATH.read_text()
    counties = {c['id']: c for c in json.loads(counties_text)['counties']}
    journey = json.loads(JOURNEY_PATH.read_text())['stops']
    known_stops = {s['episode']: s for s in journey}
    notes: list[str] = []

    def county_id(row_id: str, name: str) -> str:
        cid = COUNTY_MAP.get(row_id, row_id)
        if cid not in counties:
            sys.exit(f'"{name}" ({row_id}) has no county in counties.json; add it to COUNTY_MAP.')
        return cid

    # Release dates already in the data, by link (Nebula date: the week before YouTube)
    known_dates: dict[str, str] = {}
    for c in counties.values():
        for v in [c, *c.get('additionalVideos', [])]:
            for key in ('youtubeId', 'nebulaUrl'):
                if v.get(key) and v.get('releaseDate'):
                    known_dates[v[key]] = v['releaseDate']

    feed_ids: list[str] | None = None
    prev_date: dt.date | None = None
    for n, ep in enumerate(episodes, 1):
        ep['episode'] = n
        ep['countyId'] = county_id(ep['id'], ep['county'])
        yt = YOUTUBE_FIXES.get(ep['youtubeId'], ep['youtubeId'])
        if yt and yt == ep['youtubeId'] and not args.offline and not youtube_is_live(yt):
            # Try the newest channel upload of the series that the page doesn't link yet
            if feed_ids is None:
                try:
                    feed_ids = re.findall(r'<yt:videoId>([\w-]{11})</yt:videoId>', fetch(CHANNEL_FEED))
                except urllib.error.URLError:
                    feed_ids = []
            linked = {e['youtubeId'] for e in episodes}
            candidates = [v for v in feed_ids if v not in linked and v not in YOUTUBE_FIXES.values()]
            notes.append(f'E{n} {ep["county"]}: YouTube {yt} is unavailable'
                         + (f'; recent unlinked uploads: {", ".join(candidates[:3])} (add to YOUTUBE_FIXES)' if candidates else ''))
            yt = None
        ep['youtubeId'] = yt

        date = known_dates.get(yt or '') or known_dates.get(ep['nebulaUrl'] or '')
        if not date:
            date = (prev_date + dt.timedelta(weeks=1)).isoformat() if prev_date else None
            notes.append(f'E{n} {ep["county"]}: new episode, release date assumed {date} (a week after the last)')
        ep['releaseDate'] = date
        prev_date = dt.date.fromisoformat(date) if date else prev_date

    # --- counties.json ---
    by_county: dict[str, list[dict]] = {}
    for ep in episodes:
        by_county.setdefault(ep['countyId'], []).append(ep)

    upcoming_id = upcoming_date = None
    if upcoming:
        name, month, day = upcoming
        upcoming_id = county_id(re.sub(r'[^a-z]+', '-', name.lower()).strip('-'), name)
        year = prev_date.year if prev_date else dt.date.today().year
        guess = dt.date(year, month, day)
        if prev_date and guess < prev_date:
            guess = dt.date(year + 1, month, day)
        upcoming_date = guess.isoformat()

    changed_counties = []
    for cid, c in counties.items():
        vids = by_county.get(cid)
        if vids:
            first = vids[0]
            fields = {'youtubeId': first['youtubeId'], 'nebulaUrl': first['nebulaUrl'],
                      'status': 'released', 'releaseDate': first['releaseDate']}
            extra = [{'title': v['title'], 'youtubeId': v['youtubeId'], 'nebulaUrl': v['nebulaUrl'],
                      'releaseDate': v['releaseDate']} for v in vids[1:]]
        else:
            fields = {'youtubeId': None, 'nebulaUrl': None, 'status': 'upcoming',
                      'releaseDate': upcoming_date if cid == upcoming_id else
                      (c['releaseDate'] if c['status'] == 'upcoming' and c['releaseDate'] and
                       c['releaseDate'] > dt.date.today().isoformat() else None)}
            extra = []
        before = ({k: c.get(k) for k in fields}, c.get('additionalVideos', []))
        if before != (fields, extra):
            changed_counties.append(cid)
            counties_text = patch_county(counties_text, cid, fields, extra)
    json.loads(counties_text)  # sanity check

    # --- journey.json ---
    to_coords, worst_km = georeferencer(points, journey)
    stops = []
    for ep in episodes:
        n = ep['episode']
        old = known_stops.get(n)
        reused = old is not None and old.get('countyId') == ep['countyId'] and not old.get('upcoming')
        place = old.get('place') if reused else None
        if not reused and not args.offline and ep['youtubeId']:
            place = guess_place(youtube_description(ep['youtubeId']), ep['county'])
            notes.append(f'E{n} {ep["county"]}: new stop, place guessed as {place!r} (check journey.json)')
        stops.append({
            'episode': n,
            'historicCounty': old['historicCounty'] if reused else ep['county'],
            'countyId': ep['countyId'],
            'title': ep['title'],
            'place': place,
            'coords': old['coords'] if reused else to_coords(points[n - 1]),
            'travel': 'train' if (n - 1) in train else 'car',
        })
    if upcoming and next_point:
        stops.append({
            'episode': len(episodes) + 1, 'historicCounty': upcoming[0], 'countyId': upcoming_id,
            'title': None, 'place': None, 'coords': to_coords(next_point), 'travel': 'car', 'upcoming': True,
        })
    journey_text = write_journey(stops)
    journey_changed = journey_text != JOURNEY_PATH.read_text()

    # --- Report ---
    print(f'{len(episodes)} episodes on the page'
          + (f', next: {upcoming[0]} on {upcoming_date}' if upcoming else '')
          + f'; georeference error on known stops ≤ {worst_km:.1f} km')
    print(f'counties.json: {len(changed_counties)} counties changed'
          + (f' ({", ".join(changed_counties)})' if changed_counties else ''))
    print(f'journey.json: {"changed" if journey_changed else "unchanged"} ({len(stops)} stops)')
    for note in notes:
        print(f'  - {note}')

    if args.dry_run:
        print('Dry run: nothing written.')
        return
    if changed_counties:
        COUNTIES_PATH.write_text(counties_text)
    if journey_changed:
        JOURNEY_PATH.write_text(journey_text)


if __name__ == '__main__':
    main()
