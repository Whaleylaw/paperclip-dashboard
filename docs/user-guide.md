# Paperclip Dashboard — Complete User Guide

## What Is Paperclip?

Paperclip is an AI agent management platform — the "backbone of the autonomous economy." It lets you create companies of AI agents, assign them tasks, monitor their work, manage costs, and keep humans in the loop with approvals. Think of it as an HR department, project management tool, and observability platform for AI agents, all in one.

Your fork lives at **github.com/Whaleylaw/paperclip-dashboard**.

---

## Architecture at a Glance

Paperclip is a monorepo with three main pieces:

- **Server** — Express.js API (port 3100)
- **UI** — React + Vite single-page app
- **Database** — PostgreSQL via Drizzle ORM (PGlite for local dev)

Plus supporting packages: shared types, CLI tool (`paperclipai`), and 10+ adapter packages for different AI runtimes.

---

## Getting Started

### Docker (Quickstart)
```
docker compose -f docker/docker-compose.quickstart.yml up
```
Opens at localhost:3100. Uses embedded PGlite — no external database needed.

### Full Stack
```
docker compose -f docker/docker-compose.yml --env-file .env up -d --build
```
Uses PostgreSQL. Frontend on :3100, backend API on :3100/api.

### Local Development
```
docker compose up -d db          # Start Postgres
cd server && pnpm dev            # API on :3100
cd ui && pnpm dev                # UI on :5173 (Vite)
```

### Environment Variables
Copy `.env.example`:
- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — Server port (default 3100)
- `SERVE_UI` — Whether the server serves the UI (default true)
- `BETTER_AUTH_SECRET` — Secret for session auth

---

## Authentication

### Two Deployment Modes

**local_trusted** (default for dev):
- All requests are auto-granted admin access
- No login required
- Great for local development

**authenticated** (production):
- Email + password login via BetterAuth
- Session cookies for the browser
- API keys for agents and external integrations

### Login Screen
- Email and password fields
- Toggle between Sign In and Sign Up
- Decorative ASCII art animation on desktop
- Redirects to your intended page after login

### First-Time Setup (Board Claim)
On first boot, Paperclip generates a one-time claim token. The first user to claim it becomes the instance admin. This is shown at `/board-claim/:token`.

---

## The Dashboard

After logging in, the dashboard is your home screen.

### Sidebar Navigation (Left)

The sidebar has three layers:

**Company Rail** (far left) — Vertical strip of company icons. Click to switch between companies. Each shows a generated pattern icon with the company's brand color.

**Sidebar** (next to rail) — Company-scoped navigation:

| Section | Pages |
|---------|-------|
| **Quick Actions** | New Issue button, Search (Cmd+K) |
| **Overview** | Dashboard, Inbox |
| **Work** | Issues, Routines, Goals |
| **Projects** | Collapsible project list |
| **Agents** | Collapsible agent list with status dots |
| **Company** | Org Chart, Skills, Costs, Activity, Settings |

The sidebar collapses on mobile to a bottom navigation bar.

### Dashboard Metrics
Four summary cards at the top:
- **Agents Enabled** — How many agents are active
- **Tasks In Progress** — Currently running tasks
- **Month Spend** — LLM/API costs this month
- **Pending Approvals** — Items waiting for human review

### Dashboard Charts
- **Run Activity** (14 days) — Bar chart of agent runs over time
- **Issues by Priority** — Distribution of High/Medium/Low
- **Issues by Status** — Breakdown across workflow states
- **Success Rate** — Percentage of successful runs

### Active Agents Panel
Shows currently running agents with live status indicators.

### Budget Incident Alert
Red banner if any agents are paused due to budget breaches.

### Recent Activity
Animated feed of recent events — new entries slide in.

### Recent Tasks
List showing task identifier, title, status icon, assignee avatar, and timestamp.

---

## Companies

Paperclip organizes everything into "Companies" — each company is an independent team of AI agents with its own projects, issues, budgets, and settings.

### Companies Page
Card grid showing each company with:
- Name (inline editable)
- Status badge
- Agent count and issue count
- Spend vs budget
- Creation date
- Three-dot menu (Rename, Delete)

### Creating a Company
Click "New Company" to launch the **Onboarding Wizard** — a 4-step flow:
1. **Company** — Name your company
2. **Agent** — Configure your first agent (adapter type, model, role)
3. **Task** — Create an initial task
4. **Launch** — Review and launch

### Company Settings
- **General**: Name, description, brand color
- **Logo**: Upload with preview (generated pattern icon as default)
- **Require board approval for new agents** — Toggle
- **Feedback data sharing** — Toggle with terms link
- **Agent connection snippet** — Generate invite URLs for agents to join
- **Import/Export** — Company configuration bundles

---

## Agents

Agents are the AI workers in your company. Each agent has an adapter (runtime), a model, a role, and a set of permissions.

### Agent List
Filterable tabs: **All | Active | Paused | Error**

Two view modes:
- **List View** — Table with status dot, name, role/title, adapter type, last heartbeat, status badge
- **Org Tree View** — Hierarchical view showing reporting structure with indentation

Each agent row shows:
- Status dot (green=active, gray=paused, red=error)
- Live run indicator (pulsing blue dot if currently running, links to the run)
- Name, role, adapter type
- Last heartbeat timestamp

Filters popover with "Show terminated" toggle.

### Creating an Agent
Click "New Agent" to open the creation form:
- **Adapter type** — Which AI runtime to use:
  - `claude_local` — Anthropic Claude Code
  - `codex_local` — OpenAI Codex CLI
  - `cursor` — Cursor IDE
  - `gemini_local` — Google Gemini CLI
  - `hermes_local` — Hermes Agent
  - `opencode_local` — OpenCode
  - `pi_local` — Pi
  - `openclaw_gateway` — OpenClaw
  - `http` — Generic HTTP adapter
  - `process` — Generic process adapter
- **Model** — Which LLM model to use
- **Role** — Agent's role/title in the company
- **Reports To** — Parent agent in the org hierarchy (ReportsToPicker)
- **Skills** — Assign company skills
- **Runtime Config** — Adapter-specific settings

### Agent Detail Page
Tabs across the top: **Dashboard | Instructions | Configuration | Skills | Runs | Budget**

**Dashboard Tab:**
- Agent status and overview
- Charts: Run Activity, Priority breakdown, Status breakdown, Success Rate
- Recent runs list

**Instructions Tab:**
- Full markdown editor for agent instructions
- Autosave with visual indicator
- This is what the agent reads as its "personality" / mission brief

**Configuration Tab:**
- Complete AgentConfigForm
- Adapter type, model, runtime config
- Environment variables editor (key-value pairs)
- Working directory settings

**Skills Tab:**
- Manage which company skills this agent has access to
- Toggle skills on/off per agent

**Runs Tab:**
- List of heartbeat runs with:
  - Status icons (success/failure/running)
  - Token counts and costs
  - Duration
  - Click to expand run detail

**Run Detail View:**
- **RunInvocationCard** — Shows adapter type, working directory, prompt, env vars
- **RunTranscriptView** — Real-time log viewer (stdout/stderr streaming)
- Workspace operation logs

**Budget Tab:**
- Agent-level BudgetPolicyCard
- Set spending limits per agent

### Agent Actions
- **Run** button — Trigger an immediate agent execution
- **Pause/Resume** — Toggle agent activity
- **API Key Management** — Create, reveal, and delete API keys for programmatic access
- **Claude/Codex Subscription Panels** — Adapter-specific subscription management
- **Agent Icon Picker** — Choose an emoji/icon for the agent
- **Inline Name/Title Editors** — Click to edit

---

## Issues (Tasks)

Issues are the work items that agents execute. They follow a workflow lifecycle and support rich collaboration.

### Issues List
Full-featured list with multiple capabilities:

**Views:**
- **List View** — Traditional list with configurable columns
- **Board/Kanban View** — Drag-and-drop kanban board by status

**Search & Filter:**
- Search bar (synced to URL `?q=` parameter)
- Filters popover: status, priority, assignee, project, labels
- Routine visibility filter

**Columns** (configurable via column picker):
- Status, Priority, Assignee, Project, Labels, Created, Updated

**Inline Editing:**
- Change status or assignee directly from the list without opening the issue
- Live run indicators on issues with active runs (pulsing blue dot)

### Creating an Issue
Click "New Issue" (or press `C`) to open the dialog:
- Title and description
- Priority (High/Medium/Low)
- Status
- Assignee (agent or user)
- Project
- Labels
- Goal

### Issue Detail Page
The most feature-rich page in the app. Three main areas:

**Left: Chat Thread (IssueChatThread)**
Chronological conversation merging comments and agent run transcripts:

- **Comments** — Markdown-rendered messages from humans and agents
- **Agent Run Transcripts** — Embedded real-time log output from agent executions
- **Composer** — Rich markdown editor with:
  - @mention autocomplete (agents and users)
  - File upload (drag & drop)
  - Image paste support
  - Enter to send, Shift+Enter for newline
- **Feedback Buttons** — Thumbs up/down on agent outputs
- **Reassignment** — Reassign from comments
- **Scroll-to-Bottom** — Floating button during live runs
- **Image Gallery Modal** — Full-screen image viewer for attachments

**Right: Properties Panel (IssueProperties)**
Side panel showing and editing issue metadata:
- **Status** — Workflow state selector
- **Priority** — High/Medium/Low
- **Assignee** — Agent or user picker
- **Project** — Project selector
- **Goal** — Goal selector
- **Labels** — Multi-select label chips
- **Execution Workspace** — Card showing the workspace this issue runs in
- **Parent/Child Relations** — Issue hierarchy
- **Documents Section** — Structured documents (plan, spec, etc.) with:
  - Revision history
  - Diff modal (side-by-side comparison between revisions)
  - Restore previous revision

**Top: Approval Cards**
If the issue has pending approvals, they appear at the top with approve/reject buttons.

**Keyboard Navigation:**
- `j`/`k` — Navigate issues in inbox context
- Copy issue ID/URL
- Plugin slot outlets for extensions

---

## Projects

Projects group related issues and provide shared configuration.

### Projects List
Entity rows showing name, description, target date, and status badge.

### Project Detail
Tabs: **Overview | Issues | Workspaces | Configuration | Budget**

**Overview:**
- Editable description
- Status selector
- Target date picker
- Color picker for project color

**Issues Tab:**
Project-scoped issues list (same features as global issues list).

**Workspaces Tab:**
Execution workspace summaries with live run counts. Each workspace represents a git repo or working directory.

**Configuration:**
Project-level settings form.

**Budget:**
Project-level BudgetPolicyCard.

### Execution Workspaces
Workspaces define where agent code runs:
- **Name** — Friendly identifier
- **CWD** — Working directory path
- **Repo URL** — Git repository
- **Base Ref / Branch** — Git references
- **Provision/Teardown Commands** — Setup and cleanup scripts
- **Runtime Services** — Start/stop/restart service processes
- **Close Workspace** — Archive when done

---

## Routines

Routines are scheduled or triggered automations — recurring tasks that agents execute on a cadence.

### Routines List
Two tabs: **Routines | Runs**

Grouping options: by none, by project, by assignee.

Each routine card shows:
- Name and schedule description
- Assigned agent
- Last run time
- Enabled/disabled toggle

### Creating a Routine
- **Name** — What this routine does
- **Body** — Markdown instructions for the agent
- **Schedule** — Cron expression or interval (visual ScheduleEditor)
- **Variables** — Typed variables with defaults (RoutineVariablesEditor)
- **Assignee** — Which agent runs it
- **Project** — Associated project
- **Concurrency Policy** — What happens if a run overlaps with the previous one
- **Catch-up Policy** — What happens for missed runs

### Routine Triggers
Three trigger types:
- **Schedule** — Cron or interval
- **Webhook** — External HTTP trigger (with secret rotation)
- **API** — Programmatic trigger

### Running a Routine
Click "Run" to trigger immediately. If the routine has variables, a dialog prompts for values before execution.

### Routine Detail
Full configuration editor plus run history with live run widget.

---

## Goals

Goals provide high-level objectives that issues and projects ladder up to.

### Goals Page
**GoalTree** — Hierarchical tree visualization showing goal relationships.

### Goal Detail
- Editable title and description (InlineEditor)
- **Properties**: Status, owner, parent goal, linked projects
- Sub-goals tree
- Linked projects list

---

## Approvals

The approval system keeps humans in control of agent decisions.

### Approvals Page
Two tabs: **Pending** (with badge count) | **All**

Grid of ApprovalCards showing:
- Approval type
- Requesting agent
- Payload details
- Approve / Reject buttons

### Approval Detail
- Full payload rendering
- Comment thread
- Action buttons (Approve / Reject)
- Linked issues

### How It Works
1. An agent creates an approval request when it needs human sign-off
2. The approval appears in the Pending tab and on linked issues
3. You review the details and approve or reject
4. On approval, the agent is automatically woken up to continue
5. On rejection, the agent receives the rejection and adjusts

---

## Costs & Budgets

Comprehensive cost tracking and budget management for your AI fleet.

### Costs Page
Multiple tabs with date range picker (presets: today, this week, this month, etc.)

**Summary Metrics:**
- Debits (total spend)
- Credits
- Net cost
- Estimated (projected)

**Breakdown Views:**
- **By Provider/Model** — Which LLM providers are costing what
- **By Biller** — Cost by billing entity
- **By Agent/Model** — Per-agent cost breakdown
- **By Project** — Project-level cost allocation

**Finance Ledger:**
- Timeline card — Cost over time
- Biller card — Per-biller breakdown
- Kind card — Cost categorization

**Provider Quotas:**
- ProviderQuotaCard with QuotaBar visualization
- Shows API rate limit usage

### Budget Policies
Set spending limits at multiple levels:
- **Company-level** — Total monthly budget
- **Agent-level** — Per-agent spending cap
- **Project-level** — Per-project budget

### Budget Incidents
When an agent exceeds its budget:
1. A **BudgetIncidentCard** appears (red alert)
2. The agent is **automatically paused**
3. Dashboard shows a budget incident banner
4. You can **resolve** the incident to unpause the agent
5. Or adjust the budget policy

---

## Inbox

The inbox is your personal work queue — issues needing attention, failed runs, pending approvals, and join requests.

### Inbox Tabs
**Mine | Recent | Unread | All**

### Features
- **Grouped sections** — Items organized by type/priority
- **Expandable items** — Click to preview, Enter to open full detail
- **Swipe to Archive** — Mobile gesture support
- **Keyboard Navigation**:
  - `j`/`k` — Move up/down
  - `Enter` — Open selected
  - `e` — Archive item
- **Column picker** — Customize visible columns
- **Search** — Live filtering
- **Nesting toggle** — Flat vs grouped view
- **Read/Unread tracking** — Visual indicators
- **Bulk dismiss/archive**
- **Failed runs alert** — Badge on sidebar

---

## Activity Feed

Global chronological log of everything happening across your company.

Each ActivityRow shows:
- **Actor** — Who did it (agent or user)
- **Action** — What happened
- **Entity** — What it happened to (linked)
- **Timestamp**

Filterable by entity type.

---

## Skills

Company-level skill definitions that agents can use.

### Skills Page
- **Skill tree browser** — File/folder navigation
- **Create new skill** — Dialog with name and markdown body
- **Skill detail** — Markdown editor for skill content
- **File inventory** — All files in the skill with syntax-highlighted preview
- **Project scan** — Auto-detect skills from project workspaces
- **Source badges** — Paperclip, GitHub, Vercel origins
- **Edit/Delete** — Full CRUD

Skills are assigned to agents via the agent's Skills tab.

---

## Org Chart

Interactive visualization of your company's agent hierarchy.

### Features
- **SVG-based** interactive org chart
- **Pan** — Drag to move around
- **Zoom** — Scroll wheel, plus zoom in/out/fit buttons
- **Agent cards** showing:
  - Icon and name
  - Role/title
  - Adapter type
  - Capabilities
  - Status dot (green/gray/red)
  - Connection lines to parent/child agents
- **Click any agent** to navigate to their detail page
- **Import/Export** buttons for company configuration

---

## Company Export / Import

### Export
- File tree preview (PackageFileTree) with checkboxes
- Select which agents, projects, tasks, and config to include
- Frontmatter preview per file
- Download as ZIP archive
- Search within file tree
- README preview

### Import
- Upload a ZIP file
- Preview and confirm before applying
- Imports company configuration, agents, projects, and issues

---

## Instance Settings

Global settings that apply across all companies.

### General Settings
- **Censor username in logs** — Privacy toggle
- **Keyboard shortcuts** — Enable/disable global shortcuts
- **Feedback data sharing** — Opt-in preference
- **Backup retention policy** — Daily/weekly/monthly presets
- **Sign out** button

### Heartbeats
- Instance-wide heartbeat scheduler overview
- Per-agent heartbeat enable/disable toggles
- "Disable all" bulk action
- Shows last heartbeat timestamps and cron expressions

### Experimental
- Feature flags for experimental functionality

### Plugins
- List installed plugins with status, version, category badges
- **Install** by npm package name
- Per-plugin: enable/disable, settings, uninstall with confirmation
- Error state display

### Plugin Settings
Per-plugin configuration form driven by JSON schema.

### Adapters
- List all adapters (built-in + external) with type badges
- **Install external** by npm package name or local path
- Per-adapter: enable/disable (hide from UI menus), remove with confirmation
- Reload/reinstall for external adapters
- Override detection (external overriding built-in)

---

## Real-Time Features

Paperclip uses WebSocket connections for live updates:

- **Issue updates** — Status changes, new comments, assignment changes
- **Agent status** — Online/offline/error transitions
- **Run progress** — Live streaming of agent execution output
- **Approval updates** — New approvals, resolutions
- **Comment additions** — Real-time chat threading

Auto-reconnect with suppress window. Toast notifications for new events. Live run indicators (pulsing blue dots) throughout the UI. Automatic React Query cache invalidation on relevant events.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+K` | Command palette (global search) |
| `C` | New issue |
| `/` | Focus search or open command palette |
| `[` | Toggle sidebar |
| `]` | Toggle properties panel |
| `?` | Show keyboard shortcuts cheatsheet |
| `j` / `k` | Navigate issue list (inbox) |
| `Enter` | Open selected item |
| `e` | Archive inbox item |
| `g` then `d` | Go to Dashboard |
| `g` then `i` | Go to Issues |
| `g` then `a` | Go to Agents |
| `g` then `p` | Go to Projects |
| `g` then `c` | Go to Costs |
| `g` then `o` | Go to Org Chart |

---

## Command Palette (Cmd+K)

Global search and navigation:
- Search for issues by title or identifier
- Search for agents by name
- Search for projects by name
- Quick actions (new issue, new agent, etc.)
- Navigate to any page instantly

---

## Webhooks & Triggers

### Routine Webhooks
Each routine can have webhook triggers:
- External services POST to the trigger URL
- Secret-based authentication with rotation
- Triggers a routine run with optional payload

### API Triggers
Routines can also be triggered programmatically via the API.

---

## Secrets Management

Company-level secret storage for API keys, tokens, and credentials.

- **Create secrets** — Name, value, description
- **Rotate** — Generate new value while keeping metadata
- **Agent access** — Agents can reference secrets by name
- **Encrypted at rest** — Local encrypted provider with master key

---

## API Access (for Integrations)

Full REST API under `/api`:

### Authentication
- **Board API Key** — Bearer token for human operators
- **Agent API Key** — Bearer token for agent access
- **Agent JWT** — Short-lived tokens for agent runs
- **Session Cookie** — Browser-based auth

### Key Endpoints
- `GET /api/companies` — List companies
- `POST /api/companies/:id/issues` — Create issue
- `PATCH /api/issues/:id` — Update issue
- `POST /api/issues/:id/comments` — Add comment
- `GET /api/companies/:id/agents` — List agents
- `POST /api/agents/:id/wake` — Wake an agent
- `POST /api/companies/:id/approvals` — Create approval
- `POST /api/approvals/:id/approve` — Approve
- `GET /api/companies/:id/costs/summary` — Cost summary
- `GET /api/health` — Server health check

### Rate Limits
Configurable per deployment. Budget-based auto-pause for agents.

### WebSocket
Real-time events at `/api/companies/:companyId/events/ws`

---

## The Agent's Perspective

Agents interact with Paperclip through the API using their agent API key or JWT.

### Agent Lifecycle
1. Agent is created (or joins via invite)
2. Agent receives an API key
3. Agent performs **heartbeat runs** on a schedule
4. During each run, the agent:
   - Checks its inbox for assigned issues
   - Checks out an issue (atomic lock)
   - Executes the work
   - Posts comments with progress
   - Completes or updates the issue
   - Reports costs
5. Agent can create approvals when it needs human sign-off
6. Agent can be paused/resumed by humans
7. Agent can be terminated

### Agent Permissions
Fine-grained permission system:
- `tasks:assign` — Can assign issues
- `agents:create` — Can create other agents
- `projects:create` — Can create projects
- And more...

CEO agents (top of org chart) have expanded branding and hire permissions.

### Adapter System
Each adapter type handles the mechanics of running an AI:
- **claude_local** — Spawns Claude Code CLI
- **codex_local** — Spawns OpenAI Codex CLI
- **hermes_local** — Connects to Hermes Agent
- **openclaw_gateway** — Routes through OpenClaw gateway
- **http** — Generic HTTP adapter for custom runtimes
- **process** — Generic process adapter

External adapters can be installed from npm or local paths and hot-reloaded.

---

## Plugin System

Paperclip has a full plugin system for extending functionality.

### Plugin Capabilities
- **UI Slots** — Inject widgets into dashboard, sidebar, issue detail
- **Launchers** — Plugin-initiated actions
- **Tools** — Plugin-contributed tools that agents can use
- **Jobs** — Scheduled background jobs
- **Webhooks** — Receive external events
- **State** — Persistent plugin state
- **Secrets** — Access company secrets

### Plugin Management
- Install from npm or local path
- Enable/disable per plugin
- Per-plugin configuration (JSON schema forms)
- Health checks and logs
- Hot reload in development
- Worker process isolation

---

## Troubleshooting Quick Reference

| Symptom | Check |
|---------|-------|
| Agent stuck in "error" | Check agent's Runs tab for error output |
| Agent not running | Verify heartbeat schedule in Instance Settings |
| Budget paused agent | Check Costs → Budget Incidents, resolve or adjust |
| Login not working | Verify BETTER_AUTH_SECRET and deployment mode |
| No agents showing | Check adapter is installed and enabled |
| Approval stuck | Check Approvals tab, approve/reject to unblock agent |
| Slow UI updates | Verify WebSocket connection in browser dev tools |
| Import failed | Check export format matches current schema version |
| Agent can't access secret | Verify agent has company membership and secret exists |
| Adapter test fails | Check adapter config, env vars, and runtime availability |
