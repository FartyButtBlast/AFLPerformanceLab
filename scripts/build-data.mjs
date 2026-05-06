import { mkdir, writeFile } from "node:fs/promises";

const SEASON = 2026;
const BASE_URL = "https://afltables.com/afl/stats";
const OUT_FILE = new URL("../data/afl-data.js", import.meta.url);

const columns = [
  "jumper",
  "player",
  "GM",
  "KI",
  "MK",
  "HB",
  "DI",
  "DA",
  "GL",
  "BH",
  "HO",
  "TK",
  "RB",
  "IF",
  "CL",
  "CG",
  "FF",
  "FA",
  "BR",
  "CP",
  "UP",
  "CM",
  "MI",
  "OP",
  "BO",
  "GA",
  "PCT",
  "SU",
];

const statLabels = {
  GM: "Games",
  KI: "Kicks",
  MK: "Marks",
  HB: "Handballs",
  DI: "Disposals",
  DA: "Disposal average",
  GL: "Goals",
  BH: "Behinds",
  HO: "Hit outs",
  TK: "Tackles",
  RB: "Rebound 50s",
  IF: "Inside 50s",
  CL: "Clearances",
  CG: "Clangers",
  FF: "Free kicks for",
  FA: "Free kicks against",
  BR: "Brownlow votes",
  CP: "Contested possessions",
  UP: "Uncontested possessions",
  CM: "Contested marks",
  MI: "Marks inside 50",
  OP: "One percenters",
  BO: "Bounces",
  GA: "Goal assists",
  PCT: "Time on ground %",
};

const tableHeadingToStat = {
  Disposals: "DI",
  Kicks: "KI",
  Marks: "MK",
  Handballs: "HB",
  Goals: "GL",
  Behinds: "BH",
  "Hit Outs": "HO",
  Tackles: "TK",
  "Rebound 50s": "RB",
  "Inside 50s": "IF",
  Clearances: "CL",
  Clangers: "CG",
  "Free Kicks For": "FF",
  "Free Kicks Against": "FA",
  "Contested Possessions": "CP",
  "Uncontested Possessions": "UP",
  "Contested Marks": "CM",
  "Marks Inside 50": "MI",
  "One Percenters": "OP",
  Bounces: "BO",
  "Goal Assists": "GA",
  "% Played": "PCT",
};

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&uarr;/g, "up")
    .replace(/&darr;/g, "down");
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value) {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned || cleaned === "-") return 0;
  if (cleaned.includes("/")) return toNumber(cleaned.split("/")[0]);
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function parseRows(section, year, team) {
  const body = section.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  const rows = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];

  return rows
    .map((row) => {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) =>
        stripTags(cell[1]),
      );
      if (cells.length < columns.length) return null;

      const record = { year, team };
      columns.forEach((column, index) => {
        if (column === "player" || column === "SU") {
          record[column] = cells[index] || "";
        } else {
          record[column] = toNumber(cells[index]) ?? 0;
        }
      });

      record.playerKey = `${record.player.toLowerCase()}|${team.toLowerCase()}`;
      return record;
    })
    .filter(Boolean);
}

function parseTeamTotal(section, year, team, playerRows) {
  const foot = (section.match(/<tfoot>([\s\S]*?)<\/tfoot>/i)?.[1] ?? "").replace(
    /(<th\b[^>]*>\s*\d+\s+players used)(?=<th\b)/i,
    "$1</th>",
  );
  const cells = [...foot.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((cell) => stripTags(cell[1]));
  const usedMatch = cells[0]?.match(/(\d+)\s+players used/i);
  const statCells = cells.slice(1);
  const teamGames = Math.max(...playerRows.map((row) => row.GM), 0);
  const total = { year, team, playersUsed: usedMatch ? Number(usedMatch[1]) : playerRows.length, teamGames };

  columns.slice(3, 27).forEach((column, index) => {
    total[column] = toNumber(statCells[index] ?? "") ?? 0;
  });

  return total;
}

function parseYear(html, year) {
  const sections = [...html.matchAll(/<table[^>]*class="sortable"[^>]*>([\s\S]*?)<\/table>/gi)];
  const players = [];
  const teams = [];

  sections.forEach((sectionMatch) => {
    const section = sectionMatch[1];
    const firstHeading = section.match(/<th[^>]*colspan=28[^>]*>([\s\S]*?)<\/th>/i)?.[1];
    if (!firstHeading) return;

    const team = stripTags(firstHeading).split("[")[0].trim();
    if (!team) return;

    const playerRows = parseRows(section, year, team);
    players.push(...playerRows);
    teams.push(parseTeamTotal(section, year, team, playerRows));
  });

  return { players, teams };
}

async function fetchYear(year) {
  const response = await fetch(`${BASE_URL}/${year}.html`);
  if (!response.ok) throw new Error(`Could not fetch ${year}: ${response.status}`);
  return response.text();
}

const fetchedAt = new Date().toISOString();
const allPlayers = [];
const allTeams = [];
const playerGames = [];
const teamGames = [];

function parseTeamSlugs(html) {
  const teams = [];
  const seen = new Set();
  for (const match of html.matchAll(/<th colspan=28><a href="\.\.\/teams\/([^"]+)_idx\.html">([^<]+)<\/a>[\s\S]*?<a href="teams\/([^/]+)\/2026_gbg\.html">Players Game by Game<\/a>/gi)) {
    const team = stripTags(match[2]);
    const slug = match[3];
    if (!seen.has(team)) {
      seen.add(team);
      teams.push({ team, slug });
    }
  }
  return teams;
}

function normaliseRound(value) {
  return Number(value.replace(/^R/i, ""));
}

function parseGameByGame(html, team) {
  const playerMap = new Map();
  const teamMap = new Map();
  const tables = [...html.matchAll(/<table[^>]*class="sortable"[^>]*>([\s\S]*?)<\/table>/gi)];

  for (const tableMatch of tables) {
    const table = tableMatch[1];
    const heading = stripTags(table.match(/<thead><tr><th[^>]*>([\s\S]*?)<\/th><\/tr>/i)?.[1] ?? "");
    const stat = tableHeadingToStat[heading];
    if (!stat) continue;

    const head = table.match(/<thead>([\s\S]*?)<\/thead>/i)?.[1] ?? "";
    const headRows = [...head.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map((row) => row[1]);
    const headerRow = headRows[1] ?? "";
    const headers = [...headerRow.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((cell) => stripTags(cell[1]));
    const rounds = headers.slice(1, -1).map(normaliseRound);
    const opponentRow = table.match(/<tr><th[^>]*>\s*Opponent\s*<\/th>([\s\S]*?)<\/tr>/i)?.[1] ?? "";
    const gameIds = [...opponentRow.matchAll(/games\/\d+\/(\d+)\.html/gi)].map((match) => match[1]);

    const body = table.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
    const rows = [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
    for (const row of rows) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => stripTags(cell[1]));
      const player = cells[0];
      if (!player) continue;
      rounds.forEach((round, index) => {
        const raw = cells[index + 1] ?? "";
        if (!raw) return;
        const key = `${team}|${player}|${round}`;
        const record = playerMap.get(key) ?? { season: SEASON, team, player, round };
        record[stat] = toNumber(raw) ?? 0;
        playerMap.set(key, record);
      });
    }

    const totalsRow = table.match(/<tr><th[^>]*>\s*Totals\s*<\/th>([\s\S]*?)<\/tr>/i)?.[1] ?? "";
    const totalCells = [...totalsRow.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((cell) => stripTags(cell[1]));
    totalCells.slice(0, rounds.length).forEach((raw, index) => {
      if (!raw) return;
      const round = rounds[index];
      const key = `${team}|${round}`;
      const record = teamMap.get(key) ?? { season: SEASON, team, round };
      if (gameIds[index]) record.gameId = gameIds[index];
      record[stat] = toNumber(raw) ?? 0;
      teamMap.set(key, record);
    });
  }

  for (const record of playerMap.values()) {
    record.DA = record.DI ?? 0;
    playerGames.push(record);
  }
  teamGames.push(...teamMap.values());
}

function enrichOpponentStats() {
  const byGame = new Map();
  for (const game of teamGames) {
    if (!game.gameId) continue;
    const games = byGame.get(game.gameId) ?? [];
    games.push(game);
    byGame.set(game.gameId, games);
  }

  for (const games of byGame.values()) {
    if (games.length !== 2) continue;
    const [homeSide, awaySide] = games;
    homeSide.opponent = awaySide.team;
    awaySide.opponent = homeSide.team;
    homeSide.againstIF = awaySide.IF ?? 0;
    awaySide.againstIF = homeSide.IF ?? 0;
    homeSide.againstPoints = (awaySide.GL ?? 0) * 6 + (awaySide.BH ?? 0);
    awaySide.againstPoints = (homeSide.GL ?? 0) * 6 + (homeSide.BH ?? 0);
  }
}

console.log(`Fetching ${SEASON}`);
const html = await fetchYear(SEASON);
const parsed = parseYear(html, SEASON);
allPlayers.push(...parsed.players);
allTeams.push(...parsed.teams);

const teams = parseTeamSlugs(html);
for (const { team, slug } of teams) {
  console.log(`Fetching ${team} game-by-game`);
  const response = await fetch(`${BASE_URL}/teams/${slug}/${SEASON}_gbg.html`);
  if (!response.ok) throw new Error(`Could not fetch ${team}: ${response.status}`);
  parseGameByGame(await response.text(), team);
}

enrichOpponentStats();

await mkdir(new URL("../data", import.meta.url), { recursive: true });
await writeFile(
  OUT_FILE,
  `window.AFL_DATA = ${JSON.stringify(
    {
      fetchedAt,
      season: SEASON,
      years: [SEASON],
      statLabels,
      players: allPlayers,
      teams: allTeams,
      playerGames,
      teamGames,
    },
    null,
    2,
  )};\n`,
);

console.log(
  `Wrote ${allPlayers.length} player summaries, ${playerGames.length} player games, ${teamGames.length} team games.`,
);
