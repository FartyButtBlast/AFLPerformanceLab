import { mkdir, writeFile } from "node:fs/promises";

const OUT_FILE = new URL("../data/player-positions.js", import.meta.url);

const teamPages = [
  ["Adelaide", "https://www.afc.com.au/teams/afl"],
  ["Brisbane Lions", "https://www.lions.com.au/teams/afl/players"],
  ["Carlton", "https://www.carltonfc.com.au/teams/afl"],
  ["Collingwood", "https://www.collingwoodfc.com.au/teams/afl"],
  ["Essendon", "https://www.essendonfc.com.au/teams/afl"],
  ["Fremantle", "https://www.fremantlefc.com.au/teams/afl"],
  ["Geelong", "https://www.geelongcats.com.au/teams/afl"],
  ["Gold Coast", "https://www.goldcoastfc.com.au/teams/afl/players"],
  ["Greater Western Sydney", "https://www.gwsgiants.com.au/teams/afl"],
  ["Hawthorn", "https://www.hawthornfc.com.au/teams/afl"],
  ["Melbourne", "https://www.melbournefc.com.au/teams/afl"],
  ["North Melbourne", "https://www.nmfc.com.au/teams/afl/players/"],
  ["Port Adelaide", "https://www.portadelaidefc.com.au/teams/afl"],
  ["Richmond", "https://www.richmondfc.com.au/teams/afl/players/"],
  ["St Kilda", "https://www.saints.com.au/teams/afl/players/"],
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
  if (rows.length) return rows;

  const text = stripTags(html);
  const positions = ["Key Forward", "Key Defender", "Midfielder", "Defender", "Forward", "Ruck"];
  const positionPattern = positions.join("|");
  const pattern = new RegExp(`\\b\\d{1,2}\\s+([A-Z][A-Za-z' .-]+?)\\s+(${positionPattern})\\b`, "g");
  for (const match of text.matchAll(pattern)) {
    const parts = match[1].trim().split(/\s+/);
    if (parts.length < 2) continue;
    const surname = parts.pop();
    const player = `${surname}, ${parts.join(" ")}`;
    rows.push({
      team,
      player,
      position: match[2],
      playerKey: `${player.toLowerCase()}|${team.toLowerCase()}`,
    });
  }
  return rows;
}

const allRows = [];
for (const [team, url] of teamPages) {
  try {
    console.log(`Fetching ${team} positions`);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Could not fetch ${team} positions: ${response.status}; the app will estimate those roles.`);
      continue;
    }
    const rows = parsePlayers(await response.text(), team);
    if (!rows.length) {
      console.warn(`No positions found for ${team}; the app will estimate those roles.`);
      continue;
    }
    allRows.push(...rows);
  } catch (error) {
    console.warn(`Could not fetch ${team} positions: ${error.message}; the app will estimate those roles.`);
  }
}

if (!allRows.length) {
  throw new Error("No player positions were fetched. Keeping the existing position file.");
}

await mkdir(new URL("../data", import.meta.url), { recursive: true });
await writeFile(OUT_FILE, `window.PLAYER_POSITIONS = ${JSON.stringify(allRows, null, 2)};\n`);
console.log(`Wrote ${allRows.length} player positions.`);
