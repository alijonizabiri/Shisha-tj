# SHISHA_TJ

Web application for a shower-cabin manufacturer in Dushanbe, Tajikistan.

Two main parts:
1. **Designer** — generates glass-panel drawings from on-site measurements
2. **CRM + Finances** — Kanban for leads, factory orders, profit tracking

## Stack

- **Backend:** .NET 8 + ASP.NET Core 8 + EF Core 8 + PostgreSQL 16
- **Frontend:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui

## Project structure

```
shisha-tj/
├── backend/                  — .NET solution (4 projects, Clean Architecture)
├── frontend/                 — React app (Vite + TS, feature-based)
├── docs/                     — full specification (read these first!)
├── .claude/commands/         — Claude Code slash commands
├── docker-compose.yml        — local Postgres + Seq
├── CLAUDE.md                 — instructions for Claude Code
└── README.md                 — this file
```

## Working with Claude Code

This project uses an automated workflow with Claude Code. Read `CLAUDE.md` first.

### Slash commands
- `/start` — begin a session, see what's next
- `/done` — finalize a completed step (build + test + commit + progress update)
- `/new-endpoint` — add a backend endpoint
- `/new-feature` — add a frontend feature
- `/migration` — create + apply an EF migration
- `/review` — code review the current diff

### Workflow
1. `/start` to see where we are
2. Claude tells you the next step from `docs/PROGRESS.md`
3. You say "go"
4. Claude implements it
5. `/done` finalizes
6. Repeat

## Local development

### Prerequisites
- .NET 8 SDK
- Node.js 20+
- Docker (for Postgres + Seq)

### First-time setup
```bash
# 1. Start infrastructure
docker compose up -d

# 2. Backend
cd backend
dotnet restore
dotnet ef database update --project src/Shisha.Infrastructure --startup-project src/Shisha.Api
dotnet run --project src/Shisha.Api

# 3. Frontend (in another terminal)
cd frontend
npm install
npm run generate:types   # pulls types from BE Swagger
npm run dev
```

Backend: http://localhost:5000 (Swagger at `/swagger`)
Frontend: http://localhost:5173

### Default admin (development seed)
- email: `admin@shisha.tj`
- password: `Admin123!`

## Documentation

Start with these in order:
1. `docs/Vision.md` — what we're building and why
2. `docs/MVP.md` — phased plan
3. `docs/PROGRESS.md` — where we are now
4. `docs/ArchitectureRules.md` — hard constraints
5. `docs/DesignerLogic.md` — the formulas
6. `docs/Database.md` — schema
7. `docs/Api.md` — endpoints
8. `docs/Frontend.md` — frontend conventions
9. `docs/StateMachines.md` — status transitions
10. `docs/Roles.md` — permissions
