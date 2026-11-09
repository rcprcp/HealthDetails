# HealthDetails

A read-only Java 25 + Quarkus 3.40.1 application for the JSON-backed health
views in the `j2208` PostgreSQL schema. The UI is React + Vite + Mantine.

The schema stores raw band records in `history.payload` (JSONB). These views
project the useful fields:

| View       | Banner label | Contents                                            |
| ---------- | ------------ | --------------------------------------------------- |
| `v_hr`     | Heartrate    | `payload->>'value'` for `type = 'hr'`               |
| `v_spo2`   | SpO2         | `payload->>'value'` for `type = 'spo2_auto'`        |
| `v_hrv`    | HRV          | `hrv`, `hr`, `stress`, `bp_sys`, `bp_dia`           |
| `v_temp`   | Temperature  | `payload->>'value'` for `type = 'temp_axil'`        |
| `v_steps`  | Steps        | step count, calories, distance, step series         |
| `v_sleep`  | Sleep        | deep/light/rem/awake totals and stage series        |

`v_hr`, `v_spo2`, `v_hrv`, `v_temp`, `v_steps` and `v_sleep` render a chart
above the table. Every view renders a paginated table with the same fetched
rows. The Steps chart is cumulative: steps accumulate on the left axis and
calories on the right axis. The Sleep chart is a hypnogram-style step chart
built from the per-minute `stages` array, so the line changes level when a
deep, light, REM or awake phase starts or ends. The Heartrate, SpO2, HRV and
Temperature charts overlay an overall-average line and a 5-period moving
average.

The header shows the total `distance_km` for the Steps view, plus the latest
`j2208.battery` percentage, immediately left of the schema badge. Battery
refreshes every 60 seconds.

The header also has **1 min** and **2 hr** monitor buttons. Selecting one
schedules a Quarkus cron job and immediately invokes the collector stub. The
real Python collector entrypoint lives in the separate collector project, so
`CollectorService` currently logs the intended invocation instead of launching
a process.

## Requirements

- Java 25
- Maven 3.9+
- Node.js 20.19+ and npm (for the Vite dev server)

## Database configuration

The app reads the same environment variables as the J2208 collector. The
password is never stored in the repository.

```bash
export J2208_DB_BACKEND=postgres
export J2208_PG_SCHEMA=j2208
export J2208_PG_DATABASE=bob
export J2208_PG_USER=bob
export J2208_PG_HOST=127.0.0.1
export J2208_PG_PORT=5432
export J2208_PG_SSLMODE=prefer
export J2208_PG_PASSWORD='...'
```

The JDBC URL is built from these variables:

```text
jdbc:postgresql://$J2208_PG_HOST:$J2208_PG_PORT/$J2208_PG_DATABASE?currentSchema=$J2208_PG_SCHEMA&sslmode=$J2208_PG_SSLMODE
```

`healthdetails.schema` (also `J2208_PG_SCHEMA`) is validated as a SQL
identifier before it is quoted in generated SQL.

## Development

Terminal 1 — Quarkus API on `http://localhost:8080`:

```bash
mvn quarkus:dev
```

Terminal 2 — Vite UI on `http://localhost:5173`:

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to Quarkus, so no CORS setup is needed. Open
`http://localhost:5173`.

## Production build

Build the UI and package it inside the Quarkus application:

```bash
mvn -Pui package
java -jar target/quarkus-app/quarkus-run.jar
```

Open `http://localhost:8080`. The `ui` profile uses `frontend-maven-plugin` to
install a local Node runtime, run `npm ci`, build the Vite app, and copy
`frontend/dist` into `META-INF/resources`.

The UI uses a hash router (`/#/view/v_hr`) so the packaged Quarkus app does not
need an SPA fallback route.

## API

| Method | Path                     | Description                                      |
| ------ | ------------------------ | ------------------------------------------------ |
| `GET`  | `/api/views`             | Banner metadata for the six views               |
| `GET`  | `/api/views/{name}`      | Columns, rows, total count and chart spec        |
| `GET`  | `/api/battery`           | Latest battery percentage, timestamp and mode    |
| `GET`  | `/api/monitor`           | Current monitor interval and schedule status     |
| `POST` | `/api/monitor/interval`  | Schedule the collector with `?value=1m` or `2h`  |
| `GET`  | `/q/health`              | Quarkus/Agroal health check                      |

Query parameters for `/api/views/{name}`:

- `limit` — 1 to 5000, default 5000
- `offset` — zero or greater, default 0

The UI requests `limit=5000` so a chart and its table use exactly the same
dataset.

## Tests

```bash
mvn test
cd frontend && npm run typecheck && npm run build
```

The backend tests cover the view allow-list, chart metadata, SQL identifier
validation, and the `/api/views` resource. Live data access requires the
database environment variables above.

## Safety notes

- Only the six explicitly catalogued views can be queried; relation names are
  never taken directly from a request.
- The application opens read-only `SELECT` statements.
- `history.raw` is not exposed. The views only project the typed JSON fields.
