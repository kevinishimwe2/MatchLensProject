import http from "node:http";
import { readFile } from "node:fs/promises";
import {
  extname,
  join,
  normalize
} from "node:path";
import { fileURLToPath } from "node:url";

/* READ COMMAND-LINE ARGUMENTS */

const getArgument = (name) => {
  const index = process.argv.indexOf(name);

  return index >= 0
    ? process.argv[index + 1]
    : undefined;
};

/* SERVER PORT */

const port = Number(
  getArgument("--port") ||
  process.env.API_PORT ||
  3000
);

/* SERVER HOST */

const host =
  getArgument("--host") ||
  process.env.API_HOST ||
  "127.0.0.1";

/* PROJECT DIRECTORY */

const projectRoot = fileURLToPath(
  new URL(".", import.meta.url)
);

/* WEBSITE DIRECTORY */

const siteRoot = join(
  projectRoot,
  "site"
);

/* FILE CONTENT TYPES */

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

/* SEND A JSON RESPONSE */

function send(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",

    "Cache-Control":
      status === 200
        ? "public, max-age=300"
        : "no-store"
  });

  response.end(
    JSON.stringify(body)
  );
}

/* CREATE SERVER */

const server = http.createServer(
  async (request, response) => {
    const url = new URL(
      request.url,
      `http://${request.headers.host || "localhost"}`
    );

    /* ALLOW ONLY GET REQUESTS */

    if (request.method !== "GET") {
      return send(response, 405, {
        error: "Method not allowed"
      });
    }

    /* HEALTH ENDPOINT */

    if (url.pathname === "/health") {
      return send(response, 200, {
        status: "ok"
      });
    }

    /* SERVE FRONTEND FILES */

    if (url.pathname !== "/api/football") {
      const requestedPath =
        url.pathname === "/"
          ? "index.html"
          : normalize(url.pathname)
            .replace(/^[/\\]+/, "");

      const allowedFiles = [
        "index.html",
        "styles.css",
        "app.js"
      ];

      if (
        requestedPath.includes("..") ||
        !allowedFiles.includes(requestedPath)
      ) {
        return send(response, 404, {
          error: "File not found"
        });
      }

      try {
        const file = await readFile(
          join(siteRoot, requestedPath)
        );

        const extension =
          extname(requestedPath);

        response.writeHead(200, {
          "Content-Type":
            contentTypes[extension] ||
            "application/octet-stream",

          "Cache-Control": "no-cache"
        });

        return response.end(file);
      } catch {
        return send(response, 404, {
          error: "File not found"
        });
      }
    }

    /* READ API KEY */

    const token =
      process.env.FOOTBALL_DATA_API_KEY;

    /* READ LEAGUE CODE */

    const competition =
      url.searchParams.get("competition") ||
      "PL";

    /* VALIDATE LEAGUE CODE */

    const supportedLeagues = new Set([
      "PL",
      "PD",
      "BL1",
      "SA",
      "FL1"
    ]);

    if (!supportedLeagues.has(competition)) {
      return send(response, 400, {
        error: "Unsupported competition"
      });
    }

    /* CHECK API KEY */

    if (!token) {
      return send(response, 503, {
        error: "API key is not configured"
      });
    }

    /* API REQUEST HEADERS */

    const apiHeaders = {
      "X-Auth-Token": token
    };

    /* API URLS */

    const standingsUrl =
      `https://api.football-data.org/v4/competitions/${encodeURIComponent(competition)
      }/standings`;

    const fixturesUrl =
      `https://api.football-data.org/v4/competitions/${encodeURIComponent(competition)
      }/matches?status=SCHEDULED`;

    /* REQUEST FOOTBALL DATA */

    try {
      const [
        standingsResponse,
        fixturesResponse
      ] = await Promise.all([
        fetch(standingsUrl, {
          headers: apiHeaders
        }),

        fetch(fixturesUrl, {
          headers: apiHeaders
        })
      ]);

      /* CHECK STANDINGS RESPONSE */

      if (!standingsResponse.ok) {
        throw new Error(
          `Standings request failed with status ${standingsResponse.status
          }`
        );
      }

      /* READ STANDINGS DATA */

      const standingsPayload =
        await standingsResponse.json();

      const totalStanding =
        standingsPayload.standings?.find(
          (standing) => {
            return standing.type === "TOTAL";
          }
        );

      if (
        !totalStanding ||
        !Array.isArray(totalStanding.table)
      ) {
        throw new Error(
          "The API did not return a complete league table"
        );
      }

      /* TRANSFORM STANDINGS DATA */

      const apiTeams =
        totalStanding.table.map((entry) => {
          return {
            id: entry.team.id,
            name: entry.team.name,
            crest: entry.team.crest,
            position: entry.position,
            played: entry.playedGames,
            won: entry.won,
            draw: entry.draw,
            lost: entry.lost,
            goalDifference: entry.goalDifference,
            points: entry.points,

            form: entry.form
              ? entry.form.split(",").slice(-5)
              : []
          };
        });

      /* TRANSFORM FIXTURE DATA */

      let apiFixtures = [];

      if (fixturesResponse.ok) {
        const fixturesPayload =
          await fixturesResponse.json();

        const scheduledMatches =
          Array.isArray(
            fixturesPayload.matches
          )
            ? fixturesPayload.matches
            : [];

        apiFixtures = scheduledMatches
          .slice(0, 10)
          .map((match) => {
            return {
              home: match.homeTeam.name,
              away: match.awayTeam.name,
              utcDate: match.utcDate
            };
          });
      }

      /* SEND DATA TO APP.JS */

      return send(response, 200, {
        competition: competition,
        teams: apiTeams,
        fixtures: apiFixtures,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(
        "Football API request failed:",
        error.message
      );

      return send(response, 502, {
        error: "Unable to retrieve football data"
      });
    }
  }
);

/* START SERVER */

server.listen(port, host, () => {
  console.log(
    `MatchLens server running at http://${host}:${port}`
  );
});

/* HANDLE SERVER ERRORS */

server.on("error", (error) => {
  console.error(
    "Unable to start MatchLens server:",
    error.message
  );

  process.exitCode = 1;
});