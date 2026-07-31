"use strict";

const leagueData = {
  PL: {
    name: "Premier League",
    country: "England"
  },

  PD: {
    name: "La Liga",
    country: "Spain"
  },

  BL1: {
    name: "Bundesliga",
    country: "Germany"
  },

  SA: {
    name: "Serie A",
    country: "Italy"
  },

  FL1: {
    name: "Ligue 1",
    country: "France"
  }
};

const el = (id) => {
  return document.getElementById(id);
};

let currentLeague = "PL";
let teams = [];
let fixtures = [];




function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (character) => {
      const characters = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      };

      return characters[character];
    }
  );
}


// Generate team initials

function initials(name) {
  return name
    .split(" ")
    .filter((part) => {
      return part.length > 0;
    })
    .map((part) => {
      return part[0];
    })
    .join("")
    .slice(0, 2)
    .toUpperCase();
}


// Generate positions

function ordinal(number) {
  const finalTwoDigits = number % 100;

  if (finalTwoDigits >= 11 && finalTwoDigits <= 13) {
    return `${number}th`;
  }

  switch (number % 10) {
    case 1:
      return `${number}st`;

    case 2:
      return `${number}nd`;

    case 3:
      return `${number}rd`;

    default:
      return `${number}th`;
  }
}


// Convert form using api

function formatForm(form) {
  if (!form || typeof form !== "string") {
    return [];
  }

  return form
    .split(",")
    .map((result) => {
      return result.trim().toUpperCase();
    })
    .filter((result) => {
      return ["W", "D", "L"].includes(result);
    })
    .slice(-5);
}


// Standings

function normaliseTeams(table) {
  return table.map((entry) => {
    return {
      id: entry.team.id,
      position: entry.position,
      name: entry.team.name,
      shortName: entry.team.shortName || entry.team.name,
      crest: entry.team.crest || "",
      played: entry.playedGames,
      won: entry.won,
      draw: entry.draw,
      lost: entry.lost,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      goalDifference: entry.goalDifference,
      points: entry.points,
      form: formatForm(entry.form)
    };
  });
}


// fixtures

function normaliseFixtures(matches) {
  if (!Array.isArray(matches)) {
    return [];
  }

  return matches.map((match) => {
    return {
      id: match.id,
      homeId: match.homeTeam?.id,
      home: match.homeTeam?.name || "Home team",
      awayId: match.awayTeam?.id,
      away: match.awayTeam?.name || "Away team",
      utcDate: match.utcDate,
      status: match.status
    };
  });
}


// Recent form

function createFormIndicators(form) {
  if (!Array.isArray(form) || form.length === 0) {
    return `<span aria-label="Form unavailable">—</span>`;
  }

  return form.map((result) => {
    let description = "Loss";

    if (result === "W") {
      description = "Win";
    }

    if (result === "D") {
      description = "Draw";
    }

    return `
      <span
        class="${result}"
        title="${description}"
        aria-label="${description}"
      >
        ${result}
      </span>
    `;
  }).join("");
}


// rendering the table

function renderStandings() {
  const searchInput = el("team-search");
  const sortSelect = el("sort-select");

  const query = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  const sortBy = sortSelect
    ? sortSelect.value
    : "position";

  const visibleTeams = teams.filter((team) => {
    return team.name.toLowerCase().includes(query);
  });

  visibleTeams.sort((firstTeam, secondTeam) => {
    if (sortBy === "position") {
      return firstTeam.position - secondTeam.position;
    }

    return (
      Number(secondTeam[sortBy]) -
      Number(firstTeam[sortBy])
    );
  });

  el("standings-body").innerHTML = visibleTeams.map((team) => {
    const crest = team.crest
      ? `
        <img
          class="crest-image"
          src="${escapeHtml(team.crest)}"
          alt=""
        >
      `
      : `
        <span class="crest">
          ${escapeHtml(initials(team.name))}
        </span>
      `;

    return `
      <tr>
        <td class="position">
          ${team.position}
        </td>

        <td>
          ${crest}
          ${escapeHtml(team.name)}
        </td>

        <td>${team.played}</td>
        <td>${team.won}</td>
        <td>${team.draw}</td>
        <td>${team.lost}</td>

        <td>
          ${team.goalDifference > 0 ? "+" : ""}
          ${team.goalDifference}
        </td>

        <td class="points">
          ${team.points}
        </td>

        <td>
          <div class="form">
            ${createFormIndicators(team.form)}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  el("empty-state").hidden = visibleTeams.length > 0;
}


// Comparison team selector

function fillTeamSelectors() {
  const options = teams.map((team) => {
    return `
      <option value="${escapeHtml(team.name)}">
        ${escapeHtml(team.name)}
      </option>
    `;
  }).join("");

  el("home-team").innerHTML = options;
  el("away-team").innerHTML = options;

  if (teams.length > 0) {
    el("home-team").selectedIndex = 0;
  }

  if (teams.length > 1) {
    el("away-team").selectedIndex = 1;
  }
}

// Search for a team by name

function findTeam(teamName) {
  return teams.find((team) => {
    return team.name === teamName;
  });
}


// Updating team crest

function renderLargeCrest(elementId, team) {
  const container = el(elementId);

  if (team.crest) {
    container.innerHTML = `
      <img
        src="${escapeHtml(team.crest)}"
        alt="${escapeHtml(team.name)} crest"
      >
    `;
  } else {
    container.textContent = initials(team.name);
  }
}


// finding the fixtures of 2 teams

function findFixture(home, away) {
  return fixtures.find((fixture) => {
    const normalOrder =
      fixture.home === home.name &&
      fixture.away === away.name;

    const reverseOrder =
      fixture.home === away.name &&
      fixture.away === home.name;

    return normalOrder || reverseOrder;
  });
}


// render fixture information

function renderFixture(home, away) {
  const fixture = findFixture(home, away);

  if (!fixture || !fixture.utcDate) {
    el("fixture-date").textContent = "TEAM COMPARISON";

    el("fixture-detail").textContent =
      leagueData[currentLeague].name.toUpperCase();

    return;
  }

  const kickoff = new Date(fixture.utcDate);

  el("fixture-date").textContent = kickoff
    .toLocaleDateString(
      undefined,
      {
        day: "2-digit",
        month: "short"
      }
    )
    .toUpperCase();

  const kickoffTime = kickoff.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );

  el("fixture-detail").textContent =
    `${kickoffTime} • ${leagueData[currentLeague].name.toUpperCase()}`;
}


// render team comparison

function renderComparison() {
  if (teams.length < 2) {
    el("comparison-stats").innerHTML = `
      <div>
        <span>Comparison unavailable</span>
      </div>
    `;

    return;
  }

  const home =
    findTeam(el("home-team").value) ||
    teams[0];

  const away =
    findTeam(el("away-team").value) ||
    teams[1];

  if (!home || !away) {
    return;
  }

  renderLargeCrest("home-crest", home);
  renderLargeCrest("away-crest", away);

  el("home-name").textContent = home.name;
  el("away-name").textContent = away.name;

  el("comparison-stats").innerHTML = `
    <div>
      <strong>${ordinal(home.position)}</strong>
      <span>League position</span>
      <strong>${ordinal(away.position)}</strong>
    </div>

    <div>
      <strong>${home.points}</strong>
      <span>Points</span>
      <strong>${away.points}</strong>
    </div>

    <div>
      <strong>${home.won}</strong>
      <span>Wins</span>
      <strong>${away.won}</strong>
    </div>

    <div>
      <strong class="${home.goalDifference > 0 ? "positive" : ""
    }">
        ${home.goalDifference > 0 ? "+" : ""}
        ${home.goalDifference}
      </strong>

      <span>Goal difference</span>

      <strong class="${away.goalDifference > 0 ? "positive" : ""
    }">
        ${away.goalDifference > 0 ? "+" : ""}
        ${away.goalDifference}
      </strong>
    </div>
  `;

  renderFixture(home, away);
}


//display loading state

function setLoading(isLoading) {
  const refreshButton = el("refresh-button");

  refreshButton.disabled = isLoading;

  refreshButton.textContent = isLoading
    ? "•••"
    : "⌁";

  el("competition").disabled = isLoading;
}


// fetching standings

function fetchLeagueData(leagueCode) {
  const endpoint =
    `/api/football?competition=${
      encodeURIComponent(leagueCode)
    }`;

  return fetch(endpoint)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `API request failed with status ${
            response.status
          }`
        );
      }

      return response.json();
    })
    .then((payload) => {
      if (
        !Array.isArray(payload.teams) ||
        payload.teams.length === 0
      ) {
        throw new Error(
          "The API returned no teams"
        );
      }

      teams = payload.teams;

      fixtures =
        Array.isArray(payload.fixtures)
          ? payload.fixtures
          : [];

      return payload;
    });
}

// fetch success

function handleApiSuccess() {
  el("data-notice").textContent =
    `Live ${leagueData[currentLeague].name} data`;

  renderStandings();
  fillTeamSelectors();
  renderComparison();
}


//fetch failed---------- */

function handleApiError(error) {
  console.error("Football API error:", error);

  teams = [];
  fixtures = [];

  el("standings-body").innerHTML = "";
  el("empty-state").hidden = false;

  el("data-notice").textContent =
    `${leagueData[currentLeague].name} data is currently unavailable`;

  el("home-team").innerHTML = "";
  el("away-team").innerHTML = "";

  el("fixture-date").textContent = "DATA UNAVAILABLE";
  el("fixture-detail").textContent = "TRY REFRESHING";

  el("comparison-stats").innerHTML = `
    <div>
      <span>Team comparison is unavailable</span>
    </div>
  `;
}


// fetch request complete

function handleApiComplete() {
  setLoading(false);
}


//Load selected league

function changeLeague() {
  currentLeague = el("competition").value;

  el("team-search").value = "";

  el("standings-title").textContent =
    `${leagueData[currentLeague].name} standings`;

  el("data-notice").textContent =
    `Loading ${leagueData[currentLeague].name} data...`;

  setLoading(true);

  fetchLeagueData(currentLeague)
    .then(handleApiSuccess)
    .catch(handleApiError)
    .finally(handleApiComplete);
}


//Event listeners

el("competition").addEventListener(
  "change",
  changeLeague
);

el("refresh-button").addEventListener(
  "click",
  changeLeague
);

el("team-search").addEventListener(
  "input",
  renderStandings
);

el("sort-select").addEventListener(
  "change",
  renderStandings
);

el("home-team").addEventListener(
  "change",
  renderComparison
);

el("away-team").addEventListener(
  "change",
  renderComparison
);


//Nav buttons

const navigationTargets = {
  Dashboard: "top",
  Matches: "matches",
  Standings: "standings",
  Compare: "compare"
};

document
  .querySelectorAll("nav button")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const sectionName =
        button.dataset.section;

      const targetId =
        navigationTargets[sectionName];

      const target =
        document.getElementById(targetId);

      if (!target) {
        return;
      }

      document
        .querySelectorAll("nav button")
        .forEach((navigationButton) => {
          navigationButton.classList.remove(
            "active"
          );
        });

      button.classList.add("active");

      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });


changeLeague();