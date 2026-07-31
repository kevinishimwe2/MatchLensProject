# MatchLens

MatchLens is a responsive football intelligence dashboard built with vanilla HTML, CSS, and JavaScript. It retrieves live football data through a small Node.js server, allowing users to explore league standings, search and sort teams, view upcoming fixtures, and compare club performance.

## Features

- Live standings for Europe’s top five leagues
- Full league tables with positions, points, wins, draws, losses, and goal difference
- Official club logos supplied by the football data API
- Team search and standings sorting
- Side-by-side team comparison
- Upcoming fixture information
- Responsive desktop and mobile layout
- Secure server-side API-key handling
- Loading states and controlled API error messages

## Supported leagues

| Code | League | Country |
| --- | --- | --- |
| `PL` | Premier League | England |
| `PD` | La Liga | Spain |
| `BL1` | Bundesliga | Germany |
| `SA` | Serie A | Italy |
| `FL1` | Ligue 1 | France |

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- football-data.org API
- Nginx (optional for deployment)

No frontend framework is used.

## Project structure

```text
MatchLens-project/
├── site/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── api-server.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## How the application works

The browser does not contact football-data.org directly. Instead, `app.js` requests data from the local `/api/football` endpoint. `api-server.js` securely adds the private API key, retrieves the external data, simplifies the response, and returns it to the browser.

```text
Browser → MatchLens Node server → football-data.org
Browser ← formatted JSON data ← MatchLens Node server
```

This keeps the API key out of the public frontend files.

## Requirements

- Node.js 18 or newer
- npm
- A football-data.org API key

Check your installed versions:

```bash
node --version
npm --version
```

## Getting an API key

1. Visit [football-data.org](https://www.football-data.org/).
2. Register for an account.
3. Copy the API key provided in your account or registration email.
4. Keep the key private.

Never place the real key in `site/app.js`, `.env.example`, or a GitHub commit.

## Running on Windows PowerShell

Open PowerShell and move into the project folder:

```powershell
cd "C:\path\to\MatchLens-project"
```

Set the API key for the current PowerShell session:

```powershell
$env:FOOTBALL_DATA_API_KEY="YOUR_API_KEY"
```

Start the application:

```powershell
npm start
```

If npm is unavailable but Node.js is installed, run:

```powershell
node .\api-server.js
```

## Running on Linux or macOS

Move into the project folder:

```bash
cd /path/to/MatchLens-project
```

Start the application with the API key:

```bash
FOOTBALL_DATA_API_KEY="YOUR_API_KEY" npm start
```

## Open the dashboard

After the server starts, open:

```text
http://127.0.0.1:3000
```

Do not open `index.html` directly with a `file:///` address. The page must run through the Node.js server so that `/api/football` is available.

## Available commands

```bash
npm start
```

Starts the server normally.

```bash
npm run dev
```

Starts the server in watch mode and restarts it when server files change.

## Server configuration

The following environment variables are supported:

| Variable | Purpose | Default |
| --- | --- | --- |
| `FOOTBALL_DATA_API_KEY` | Private football-data.org API key | Required |
| `API_PORT` | Local server port | `3000` |
| `API_HOST` | Server host address | `127.0.0.1` |

You can also supply the host and port as command-line arguments:

```bash
node api-server.js --host 0.0.0.0 --port 3000
```

## API endpoints

### Health check

```text
GET /health
```

Example response:

```json
{
  "status": "ok"
}
```

### Football data

```text
GET /api/football?competition=PL
```

Change `PL` to another supported competition code to retrieve a different league.

The response contains:

- `competition`: selected league code
- `teams`: transformed standings data
- `fixtures`: upcoming scheduled matches
- `updatedAt`: time the server generated the response

## Using Nginx

When deploying with Nginx, forward requests to the Node.js server:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Test and reload Nginx after changing its configuration:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

### API key is not configured

Set `FOOTBALL_DATA_API_KEY` in the same terminal window before starting the server. Environment variables set in one terminal are not automatically available in another.

### The page loads but live data does not appear

Open this address directly:

```text
http://127.0.0.1:3000/api/football?competition=PL
```

If it returns football JSON, the backend is working. Check the browser Console and Network panels for a frontend error.

### JavaScript file downloads instead of running

Ensure the server returns JavaScript with this content type:

```text
text/javascript; charset=utf-8
```

### Missing recent-form indicators

Some API plans or responses do not include recent form. The application handles this by displaying an empty form state.

### Club logos do not appear

Confirm that every team in the `/api/football` response contains a `crest` URL, then check the browser Network panel for blocked or failed image requests.

## Security

- The API key is read only by `api-server.js`.
- The API accepts only the five supported competition codes.
- Only required frontend files are publicly served.
- Values inserted into generated HTML are escaped.
- API errors return controlled messages without exposing the private key.

## Future improvements

- Add dedicated Matches and Compare views
- Display recent results when supported by the API
- Add team detail pages
- Save favourite teams locally
- Add league statistics and charts
- Improve keyboard navigation and screen-reader announcements
## Docker and Nginx Deployment

MatchLens uses Docker Compose to simulate a three-server deployment:

```text
                         ┌─────────────┐
User ── localhost:8081 ─▶│ lb01: Nginx │
                         └──────┬──────┘
                          ┌─────┴─────┐
                          ▼           ▼
                  ┌─────────────┐ ┌─────────────┐
                  │ web01       │ │ web02       │
                  │ Nginx + Node│ │ Nginx + Node│
                  └─────────────┘ └─────────────┘
```

- `lb01` distributes requests using Nginx `least_conn`.
- `web01` and `web02` serve the frontend and proxy `/api/` requests to Node.
- The API key is loaded from `/etc/matchlens.env` and is never included in the Docker image or Git repository.
- Container health checks ensure the load balancer starts only after both web servers are available.

### Start the deployment

```bash
docker compose build
docker compose up -d
```

Open MatchLens at:

```text
http://localhost:8081
```

### Check container health

```bash
docker compose ps
curl http://localhost:8081/health
```

### View logs

```bash
docker compose logs --tail=50
```

Follow live logs:

```bash
docker compose logs -f
```

Press `Ctrl+C` to stop following the logs.

### Stop the deployment

```bash
docker compose down
```

### Start it again

```bash
docker compose up -d
```

The containers use `restart: unless-stopped`, allowing them to recover automatically after Docker restarts.
## Data source

Football data and club crests are provided by [football-data.org](https://www.football-data.org/).

Demo Video Link:
Website Link:
