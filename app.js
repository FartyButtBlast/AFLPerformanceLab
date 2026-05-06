const data = window.AFL_DATA;
data.statLabels.INDEX = "Performance index";
const season = data.season ?? Math.max(...data.years);
const teamSelect = document.querySelector("#teamSelect");
const statSelect = document.querySelector("#statSelect");
const compareSelect = document.querySelector("#compareSelect");
const playerSelect = document.querySelector("#playerSelect");
const questionInput = document.querySelector("#questionInput");
const askButton = document.querySelector("#askButton");

const positiveStats = ["INDEX", "KI", "MK", "HB", "DI", "DA", "GL", "HO", "TK", "RB", "IF", "CL", "CP", "UP", "CM", "MI", "OP", "BO", "GA"];
const lowerIsBetter = ["CG", "FA"];
const defaultStat = "DI";
let selectedTeam = "Collingwood";
let selectedStat = defaultStat;
let selectedPlayer = "";
let lastQuestion = "";

const statAliases = {
  goals: "GL",
  goal: "GL",
  disposals: "DI",
  disposal: "DI",
  touches: "DI",
  kicks: "KI",
  marks: "MK",
  handballs: "HB",
  tackles: "TK",
  clearances: "CL",
  clearance: "CL",
  contested: "CP",
  "contested possessions": "CP",
  uncontested: "UP",
  "inside 50": "IF",
  rebounds: "RB",
  "rebound 50": "RB",
  hitouts: "HO",
  "hit outs": "HO",
  clangers: "CG",
  assists: "GA",
  "goal assists": "GA",
  "one percenters": "OP",
  bounces: "BO",
  performance: "INDEX",
  performing: "INDEX",
  ranking: "INDEX",
  rank: "INDEX",
  overall: "INDEX",
  "all stats": "INDEX",
};

function fmt(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  return Math.abs(value) >= 100 ? Math.round(value).toLocaleString() : value.toFixed(digits);
}

function statValue(record, stat) {
  if (!record) return 0;
  if (stat === "INDEX") return performanceIndex(record, false);
  return record[stat] ?? 0;
}

function teamStatValue(record, stat) {
  if (!record) return 0;
  if (stat === "INDEX") return performanceIndex(record, true);
  if (stat === "DA") return record.DI ?? 0;
  return record[stat] ?? 0;
}

function performanceIndex(record, isTeam) {
  return (
    (record.DI ?? 0) * 0.22 +
    (record.GL ?? 0) * 4.8 +
    (record.GA ?? 0) * 3.4 +
    (record.TK ?? 0) * 1.35 +
    (record.CL ?? 0) * 2.1 +
    (record.CP ?? 0) * 0.82 +
    (record.IF ?? 0) * 0.95 +
    (record.MI ?? 0) * 1.25 +
    (record.CM ?? 0) * 1.6 +
    (record.RB ?? 0) * 0.62 +
    (record.HO ?? 0) * 0.2 +
    (record.OP ?? 0) * 0.42 -
    (record.CG ?? 0) * 0.9 -
    (record.FA ?? 0) * 0.55
  );
}

function changeDirection(stat, change) {
  const multiplier = lowerIsBetter.includes(stat) ? -1 : 1;
  const adjusted = change * multiplier;
  if (adjusted > 0.6) return "up";
  if (adjusted < -0.6) return "down";
  return "flat";
}

function signalText(direction) {
  return direction === "up" ? "Improving" : direction === "down" ? "Backwards" : "Stable";
}

function avg(rows, stat) {
  if (!rows.length) return null;
  return rows.reduce((sum, row) => sum + statValue(row, stat), 0) / rows.length;
}

function playerRounds(team, player) {
  return data.playerGames
    .filter((row) => row.team === team && row.player === player)
    .sort((a, b) => a.round - b.round);
}

function latestPlayers(team) {
  const names = [...new Set(data.playerGames.filter((row) => row.team === team).map((row) => row.player))];
  return names
    .map((player) => {
      const games = playerRounds(team, player);
      const current = avg(games, selectedStat) ?? 0;
      return { season, team, player, GM: games.length, current };
    })
    .sort((a, b) => b.current - a.current);
}

function splitForComparison(games, mode) {
  if (games.length < 3) return { recent: [], baseline: [] };
  if (mode === "lastGame") {
    return { recent: games.slice(-1), baseline: games.slice(-4, -1) };
  }
  if (mode === "halves") {
    const midpoint = Math.floor(games.length / 2);
    return { recent: games.slice(midpoint), baseline: games.slice(0, midpoint) };
  }
  return { recent: games.slice(-3), baseline: games.slice(0, -3) };
}

function moversFor(team, stat) {
  return latestPlayers(team)
    .filter((row) => row.GM >= 3)
    .map((row) => {
      const games = playerRounds(team, row.player);
      const split = splitForComparison(games, compareSelect.value);
      const current = avg(split.recent, stat) ?? row.current;
      const baseline = avg(split.baseline, stat);
      const change = baseline === null ? 0 : current - baseline;
      const pct = baseline && baseline > 0 ? (change / baseline) * 100 : 0;
      const direction = baseline === null ? "flat" : changeDirection(stat, change);
      return { ...row, current, baseline, change, pct, direction };
    })
    .sort((a, b) => {
      const multiplier = lowerIsBetter.includes(stat) ? -1 : 1;
      return b.change * multiplier - a.change * multiplier;
    });
}

function teamTrend(team, stat) {
  return data.teamGames
    .filter((row) => row.team === team)
    .sort((a, b) => a.round - b.round)
    .map((row) => ({ round: row.round, value: teamStatValue(row, stat) }));
}

function leagueLatest(stat) {
  const teams = [...new Set(data.teamGames.map((row) => row.team))];
  return teams
    .map((team) => {
      const rows = data.teamGames.filter((row) => row.team === team);
      return { team, value: avg(rows, stat) ?? 0 };
    })
    .sort((a, b) => (lowerIsBetter.includes(stat) ? a.value - b.value : b.value - a.value));
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  });
  children.forEach((child) => node.append(child));
  return node;
}

function svgLineChart(container, points, options = {}) {
  container.innerHTML = "";
  const width = container.clientWidth || 720;
  const height = options.height || 300;
  const pad = { top: 18, right: 24, bottom: 34, left: 48 };
  const min = Math.min(...points.map((p) => p.value), 0);
  const max = Math.max(...points.map((p) => p.value), 1);
  const span = max - min || 1;
  const keys = points.map((p) => p.round ?? p.year);
  const minKey = Math.min(...keys);
  const maxKey = Math.max(...keys);
  const x = (key) => pad.left + ((key - minKey) / Math.max(maxKey - minKey, 1)) * (width - pad.left - pad.right);
  const y = (value) => pad.top + (1 - (value - min) / span) * (height - pad.top - pad.bottom);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
    const yy = pad.top + tick * (height - pad.top - pad.bottom);
    svg.append(svgNode("line", { x1: pad.left, x2: width - pad.right, y1: yy, y2: yy, class: "grid-line" }));
    svg.append(svgNode("text", { x: 8, y: yy + 4, class: "axis" }, fmt(max - tick * span)));
  });

  const d = points.map((point, index) => `${index ? "L" : "M"} ${x(point.round ?? point.year)} ${y(point.value)}`).join(" ");
  svg.append(svgNode("path", { d, class: "line-path" }));
  points.forEach((point) => {
    const key = point.round ?? point.year;
    svg.append(svgNode("circle", { cx: x(key), cy: y(point.value), r: 5, fill: key === maxKey ? "var(--accent)" : "var(--blue)" }));
    svg.append(svgNode("text", { x: x(key) - 10, y: height - 10, class: "axis" }, point.round ? `R${point.round}` : point.year));
  });
  container.append(svg);
}

function svgBarChart(container, bars, options = {}) {
  container.innerHTML = "";
  const width = container.clientWidth || 520;
  const rowHeight = options.rowHeight || 28;
  const height = Math.max(options.height || 340, bars.length * rowHeight + 24);
  const pad = { top: 8, right: 52, bottom: 8, left: 144 };
  const max = Math.max(...bars.map((bar) => Math.abs(bar.value)), 1);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  bars.forEach((bar, index) => {
    const y = pad.top + index * rowHeight;
    const barWidth = (Math.abs(bar.value) / max) * (width - pad.left - pad.right);
    const fill = bar.team === selectedTeam || bar.player === selectedPlayer ? "var(--accent)" : options.color || "var(--blue)";
    svg.append(svgNode("text", { x: 4, y: y + 18, class: "bar-label" }, bar.team || bar.player));
    svg.append(svgNode("rect", { x: pad.left, y: y + 5, width: Math.max(barWidth, 2), height: 15, rx: 2, fill }));
    svg.append(svgNode("text", { x: pad.left + barWidth + 6, y: y + 17, class: "bar-value" }, fmt(bar.value)));
  });
  container.append(svg);
}

function svgNode(tag, attrs = {}, text = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (text) node.textContent = text;
  return node;
}

function populateControls() {
  const teams = [...new Set(data.teamGames.map((row) => row.team))].sort();
  teamSelect.replaceChildren(...teams.map((team) => el("option", { value: team, text: team })));
  teamSelect.value = teams.includes(selectedTeam) ? selectedTeam : teams[0];
  selectedTeam = teamSelect.value;

  const options = Object.entries(data.statLabels)
    .filter(([key]) => positiveStats.includes(key) || lowerIsBetter.includes(key))
    .map(([key, label]) => el("option", { value: key, text: label }));
  statSelect.replaceChildren(...options);
  statSelect.value = selectedStat;
}

function updatePlayerSelect(players) {
  playerSelect.replaceChildren(...players.map((row) => el("option", { value: row.player, text: row.player })));
  if (!players.some((row) => row.player === selectedPlayer)) selectedPlayer = players[0]?.player ?? "";
  playerSelect.value = selectedPlayer;
}

function renderSummary(movers) {
  const trend = teamTrend(selectedTeam, selectedStat);
  const split = splitForComparison(
    data.teamGames.filter((row) => row.team === selectedTeam).sort((a, b) => a.round - b.round),
    compareSelect.value,
  );
  const latest = avg(split.recent, selectedStat) ?? trend.at(-1)?.value ?? 0;
  const previous = avg(split.baseline, selectedStat) ?? trend.at(-2)?.value ?? 0;
  const change = latest - previous;
  const direction = changeDirection(selectedStat, change);
  const improvers = movers.filter((row) => row.direction === "up").length;
  const decliners = movers.filter((row) => row.direction === "down").length;
  const league = leagueLatest(selectedStat);
  const rank = league.findIndex((row) => row.team === selectedTeam) + 1;

  document.querySelector("#teamDirection").textContent = signalText(direction);
  document.querySelector("#teamDirectionDetail").textContent = `${change >= 0 ? "+" : ""}${fmt(change)} ${data.statLabels[selectedStat]} vs earlier ${season}`;
  document.querySelector("#improverCount").textContent = improvers;
  document.querySelector("#declinerCount").textContent = decliners;
  document.querySelector("#teamRank").textContent = `${rank} / ${league.length}`;
  document.querySelector("#teamRankDetail").textContent = `${fmt(league[rank - 1]?.value ?? latest)} average in ${season}`;
}

function renderMovers(movers) {
  const list = document.querySelector("#moversList");
  const top = movers.slice(0, 7);
  const bottom = movers.slice(-7).reverse();
  const rows = [...top, ...bottom].filter((row, index, arr) => arr.findIndex((item) => item.player === row.player) === index);
  list.replaceChildren(
    ...rows.map((row) => {
      const card = el("div", { class: "mover" }, [
        el("div", {}, [
          el("strong", { text: row.player }),
          el("span", { text: `${fmt(row.current)} recent, ${row.baseline === null ? "no baseline" : `${fmt(row.baseline)} earlier`}` }),
        ]),
        el("span", { class: `pill ${row.direction}`, text: `${row.change >= 0 ? "+" : ""}${fmt(row.change)}` }),
      ]);
      card.addEventListener("click", () => {
        selectedPlayer = row.player;
        playerSelect.value = selectedPlayer;
        render();
      });
      return card;
    }),
  );
}

function renderTable(movers) {
  const tbody = document.querySelector("#playerTable");
  document.querySelector("#selectedStatHeader").textContent = data.statLabels[selectedStat];
  tbody.replaceChildren(
    ...movers.map((row) => {
      const tr = el("tr", {}, [
        el("td", { text: row.player }),
        el("td", { text: row.GM }),
        el("td", { text: fmt(row.current) }),
        el("td", { text: `${row.change >= 0 ? "+" : ""}${fmt(row.change)}` }),
        el("td", {}, [el("span", { class: `pill ${row.direction}`, text: signalText(row.direction) })]),
      ]);
      tr.addEventListener("click", () => {
        selectedPlayer = row.player;
        playerSelect.value = selectedPlayer;
        render();
      });
      return tr;
    }),
  );
}

function renderQuestionAnswer() {
  const question = lastQuestion.trim().toLowerCase();
  if (!question) {
    document.querySelector("#answerText").textContent =
      "Use natural language to filter teams, stats, and direction. The app reads team names, common stat names, and words like improving, backwards, up, down, goals, clearances, tackles, disposals, or contested.";
    return;
  }

  const movers = moversFor(selectedTeam, selectedStat);
  const wantsDown = /back|down|declin|worse|drop/.test(question);
  const wantsTeam = /team|teams|club|clubs|league/.test(question);

  if (wantsTeam) {
    const league = leagueLatest(selectedStat).slice(0, 5);
    document.querySelector("#answerText").textContent = `For ${data.statLabels[selectedStat]}, the leading ${season} teams are ${league.map((row) => `${row.team} (${fmt(row.value)})`).join(", ")}.`;
    return;
  }

  const candidates = wantsDown ? movers.filter((row) => row.direction === "down").slice(-5).reverse() : movers.filter((row) => row.direction === "up").slice(0, 5);
  document.querySelector("#answerText").textContent =
    candidates.length
      ? `${selectedTeam}: ${candidates.map((row) => `${row.player} (${row.change >= 0 ? "+" : ""}${fmt(row.change)})`).join(", ")} are the clearest ${wantsDown ? "backward" : "improving"} signals for ${data.statLabels[selectedStat]}.`
      : `I could not find a strong ${wantsDown ? "backward" : "improving"} signal for ${selectedTeam} on ${data.statLabels[selectedStat]}.`;
}

function applyQuestionIntent() {
  lastQuestion = questionInput.value;
  const question = lastQuestion.trim().toLowerCase();
  if (!question) return;

  const alias = Object.entries(statAliases).find(([term]) => question.includes(term));
  const statMatch = Object.entries(data.statLabels).find(
    ([key, label]) => question.includes(label.toLowerCase()) || question.includes(key.toLowerCase()),
  );
  if (alias || statMatch) {
    selectedStat = alias ? alias[1] : statMatch[0];
    statSelect.value = selectedStat;
  }

  const teamMatch = [...new Set(data.teamGames.map((row) => row.team))].find((team) => question.includes(team.toLowerCase()));
  if (teamMatch) {
    selectedTeam = teamMatch;
    teamSelect.value = selectedTeam;
    selectedPlayer = "";
  }
}

function render() {
  selectedTeam = teamSelect.value;
  selectedStat = statSelect.value;
  const movers = moversFor(selectedTeam, selectedStat);
  updatePlayerSelect(movers);
  renderSummary(movers);
  renderMovers(movers);
  renderTable(movers);
  svgLineChart(document.querySelector("#teamTrendChart"), teamTrend(selectedTeam, selectedStat));
  svgBarChart(document.querySelector("#leagueChart"), leagueLatest(selectedStat).slice(0, 18), { height: 500 });
  const playerPoints = playerRounds(selectedTeam, selectedPlayer).map((row) => ({ round: row.round, value: statValue(row, selectedStat) }));
  svgLineChart(document.querySelector("#playerChart"), playerPoints.length ? playerPoints : [{ round: 1, value: 0 }]);
  document.querySelector("#rollupCaption").textContent = `${selectedTeam} ${data.statLabels[selectedStat]} by round, ${season}.`;
  document.querySelector("#seasonBadge").textContent = `${season} season only, fetched ${new Date(data.fetchedAt).toLocaleDateString()}`;
  renderQuestionAnswer();
}

teamSelect.addEventListener("change", () => {
  selectedPlayer = "";
  window.trackAppEvent?.("team_selected", { team: teamSelect.value });
  render();
});
statSelect.addEventListener("change", () => {
  window.trackAppEvent?.("stat_selected", { stat: statSelect.value });
  render();
});
compareSelect.addEventListener("change", () => {
  window.trackAppEvent?.("comparison_changed", { comparison: compareSelect.value });
  render();
});
playerSelect.addEventListener("change", () => {
  selectedPlayer = playerSelect.value;
  window.trackAppEvent?.("player_selected", { team: selectedTeam });
  render();
});
askButton.addEventListener("click", () => {
  applyQuestionIntent();
  window.trackAppEvent?.("question_submitted", {
    team: selectedTeam,
    stat: selectedStat,
    question_length: questionInput.value.trim().length,
  });
  render();
});
questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    applyQuestionIntent();
    window.trackAppEvent?.("question_submitted", {
      team: selectedTeam,
      stat: selectedStat,
      question_length: questionInput.value.trim().length,
    });
    render();
  }
});

populateControls();
render();
