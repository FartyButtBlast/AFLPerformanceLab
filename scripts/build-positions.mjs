import { mkdir, writeFile } from "node:fs/promises";

const OUT_FILE = new URL("../data/player-positions.js", import.meta.url);

const teamPages = [
  ["Adelaide", "https://www.afc.com.au/teams/afl"],
  ["Brisbane Lions", "https://www.lions.com.au/teams/afl"],
  ["Carlton", "https://www.carltonfc.com.au/teams/afl"],
  ["Collingwood", "https://www.collingwoodfc.com.au/teams/afl"],
  ["Essendon", "https://www.essendonfc.com.au/teams/afl"],
  ["Fremantle", "https://www.fremantlefc.com.au/teams/afl"],
  ["Geelong", "https://www.geelongcats.com.au/teams/afl"],
  ["Gold Coast", "https://www.goldcoastfc.com.au/teams/afl"],
  ["Greater Western Sydney", "https://www.gwsgiants.com.au/teams/afl"],
  ["Hawthorn", "https://www.hawthornfc.com.au/teams/afl"],
  ["Melbourne", "https://www.melbournefc.com.au/teams/afl"],
  ["North Melbourne", "https://www.nmfc.com.au/teams/afl"],
  ["Port Adelaide", "https://www.portadelaidefc.com.au/teams/afl"],
  ["Richmond", "https://www.richmondfc.com.au/teams/afl"],
  ["St Kilda", "https://www.saints.com.au/teams/afl"],
  ["Sydney", "https://www.sydneyswans.com.au/teams/afl"],
  ["West Coast", "https://www.westcoasteagles.com.au/teams/afl"],
  ["Western Bulldogs", "https://www.westernbulldogs.com.au/teams/afl"],
];

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function parsePlayers(html, team) {
  const rows = [];
  const items = html.match(/<li class="squad-list__item">[\s\S]*?<\/li>/g) ?? [];
  for (const item of items) {
    const firstName = stripTags(item.match(/<h1 class="player-item__name">\s*([^<]+?)\s*<span/i)?.[1] ?? "");
    const lastName = stripTags(item.match(/<span class="player-item__last-name">([\s\S]*?)<\/span>/i)?.[1] ?? "");
    const position = stripTags(item.match(/<span class="player-item__position">([\s\S]*?)<\/span>/i)?.[1] ?? "");
    if (!firstName || !lastName || !position) continue;
    const player = `${lastName}, ${firstName}`;
    rows.push({
      team,
      player,
      position,
      playerKey: `${player.toLowerCase()}|${team.toLowerCase()}`,
    });
  }
  return rows;
}

const allRows = [];
for (const [team, url] of teamPages) {
  console.log(`Fetching ${team} positions`);
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Could not fetch ${team} positions: ${response.status}; the app will infer those roles.`);
    continue;
  }
  const rows = parsePlayers(await response.text(), team);
  if (!rows.length) {
    console.warn(`No positions found for ${team}; the app will infer those roles.`);
    continue;
  }
  allRows.push(...rows);
}

await mkdir(new URL("../data", import.meta.url), { recursive: true });
await writeFile(OUT_FILE, `window.PLAYER_POSITIONS = ${JSON.stringify(allRows, null, 2)};\n`);
console.log(`Wrote ${allRows.length} player positions.`);
