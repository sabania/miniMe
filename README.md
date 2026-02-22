<div align="center">

# miniMe

**Claude Code — on WhatsApp.**

miniMe wraps Claude Code in a desktop app and connects it to WhatsApp.
Same tools, same permissions, same configuration — just reachable from your phone.

[English](#quick-start) | [Deutsch](#schnellstart)

</div>

---

# Quick Start

## 1. Install Claude Code

miniMe runs [Claude Code](https://code.claude.com/docs/en/setup) under the hood. Install it first:

**Windows PowerShell:**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**macOS / Linux / WSL:**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Then authenticate:
```bash
claude
```

Sign in with your [Claude Pro/Max](https://claude.ai/pricing) account or [Anthropic API key](https://console.anthropic.com/).

## 2. Install miniMe

Download the latest release:

- **Windows**: `minime-x.x.x-setup.exe`
- **Linux**: `minime-x.x.x-x64.AppImage` or `.deb`

Or build from source:
```bash
git clone https://github.com/sabania/miniMe.git
cd miniMe
npm install
npm run build:win    # or build:linux
```

On first launch, choose your language (Deutsch / English) — this sets the agent's templates and communication style.

## 3. Connect WhatsApp

<p align="center">
  <img src="docs/screenshots/whatsapp.png" width="700" alt="miniMe WhatsApp page — click Connect" />
</p>

Click **Connect** in the WhatsApp tab. A QR code appears in the app.

On your phone: **WhatsApp** > **Linked Devices** > **Link a Device** > scan the QR code.

<p align="center">
  <img src="docs/screenshots/whatsapp-linked-devices.jpg" width="250" alt="WhatsApp — Link a Device" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-qr-login.jpg" width="250" alt="Scan QR code" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-linked-devices-connected.jpg" width="250" alt="miniMe connected" />
</p>

Done. Send a message and the agent responds.

<p align="center">
  <img src="docs/screenshots/whatsapp-agent-response.jpg" width="300" alt="Agent responding via WhatsApp" />
</p>

---

# It's Just Claude Code

miniMe doesn't reinvent anything. It runs the same Claude Code you already use on your terminal — with the same permission system, the same CLAUDE.md files, the same skills, the same settings.

**What miniMe adds:**
- **WhatsApp access** — message your agent from your phone
- **Scheduled tasks** — the agent can work on a schedule (heartbeat checks, nightly consolidation)
- **Persistent sessions** — start on WhatsApp, continue on your PC
- **Desktop app** — manage permissions, sessions, and projects from a UI

**What stays the same:**
- Claude Code's permission system (settings.json, allow/deny rules)
- CLAUDE.md files in your workspace — the agent reads them like any Claude Code session
- Skills in `.claude/skills/` — works exactly like you'd configure on your machine
- All tools (WebSearch, Bash, Read, Write, Edit, etc.) — same as the CLI

You can open the workspace folder, edit CLAUDE.md, add skills, change settings.json — everything works just like configuring Claude Code normally. The agent picks it up on the next run.

---

# What miniMe Adds

## WhatsApp Messaging

Write to the agent from your phone. The Sessions UI shows the full conversation, costs, and status — but WhatsApp is where you talk to it.

<p align="center">
  <img src="docs/screenshots/sessions-chat.png" width="700" alt="Sessions — conversation view" />
</p>

## Permission Control

When the agent wants to use a tool, it asks — via WhatsApp or the desktop UI. You decide.

<p align="center">
  <img src="docs/screenshots/whatsapp-permission-flow.jpg" width="250" alt="Permission request on WhatsApp" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-permission-approve.jpg" width="250" alt="Approve on WhatsApp" />
</p>

<p align="center">
  <img src="docs/screenshots/permission-request.png" width="700" alt="Permission request in the UI" />
</p>

The **Permission Mode** controls how much autonomy the agent has:

| Mode | Behavior |
|------|----------|
| **Ask** | Agent asks before every tool use — full control |
| **Accept Edits** | File edits auto-approved, other tools ask |
| **Bypass** | Fully autonomous — no prompts at all |
| **Plan** | Read-only — agent can only read, not modify |

This is the same permission system Claude Code uses. `Bypass` is like running `claude --dangerously-skip-permissions`. `Ask` is the default interactive mode. You're in control.

## Continue on Your PC

Every session has a working directory and a session ID. Click **Terminal** in the UI and Claude Code opens in a terminal — resuming the exact same session. Click **Code** to open VS Code. Click **Files** to browse the workspace.

Start a task from your phone, sit down at your PC, continue with full context.

## Link Projects

<p align="center">
  <img src="docs/screenshots/projects.png" width="700" alt="Projects — linked directories" />
</p>

Go to **Projects** > **+ Add** and select any folder on your machine. It gets linked into the workspace and the agent can access it — read files, write code, run tests. The agent automatically detects new projects and tracks them in memory.

## Scheduled Tasks

<p align="center">
  <img src="docs/screenshots/scheduler-calendar.png" width="700" alt="Scheduler" />
</p>

Two system tasks run automatically:

| Task | Schedule | Purpose |
|------|----------|---------|
| **Heartbeat** | Every few hours (07:00–23:00) | Agent checks for pending items, new files, deadlines |
| **REM Sleep** | Daily at 03:00 | Nightly memory consolidation and planning |

Create your own with **+ Task**. The agent can also create tasks on its own.

<p align="center">
  <img src="docs/screenshots/scheduler-new-task.png" width="700" alt="New scheduled task" />
</p>

## Memory

The agent builds persistent memory in the workspace — files it can read and update across sessions:

```
workspace/
├── SOUL.md           # Identity and communication style
├── HEARTBEAT.md      # Proactive check instructions
├── memory/
│   ├── CLAUDE.md     # Main index
│   ├── user/         # What it knows about you
│   ├── people/       # People in your life
│   ├── projects/     # Project knowledge
│   └── journal/      # Weekly notes & tasks
└── .claude/skills/   # Skills (same as Claude Code skills)
```

These are regular files. Open the workspace in VS Code, edit them, add your own — the agent picks up changes on the next conversation. It's the same as configuring Claude Code on your machine.

---

# Settings

<p align="center">
  <img src="docs/screenshots/settings.png" width="700" alt="Settings" />
</p>

| Section | Setting | What it does |
|---------|---------|-------------|
| **Agent** | Permission Mode | Ask / Accept Edits / Bypass / Plan |
| **Agent** | Model | Default, Sonnet, or Haiku |
| **WhatsApp** | Auto-Connect | Connect WhatsApp automatically on startup |
| **WhatsApp** | Response Mode | sendMessage (deliberate) or Streaming (real-time) |
| **App** | Minimize to Tray | Close button hides to tray instead of quitting |
| **App** | Start with System | Launch on login |
| **App** | Use Git | Track workspace and project changes with git |

**Danger Zone** (bottom of Settings) lets you reset individual components or everything.

---

# Schnellstart

## 1. Claude Code installieren

miniMe nutzt [Claude Code](https://code.claude.com/docs/en/setup) im Hintergrund. Zuerst installieren:

**Windows PowerShell:**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**macOS / Linux / WSL:**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Dann authentifizieren:
```bash
claude
```

Einloggen mit [Claude Pro/Max](https://claude.ai/pricing) Account oder [Anthropic API Key](https://console.anthropic.com/).

## 2. miniMe installieren

Neuestes Release herunterladen:

- **Windows**: `minime-x.x.x-setup.exe`
- **Linux**: `minime-x.x.x-x64.AppImage` oder `.deb`

Oder selbst bauen:
```bash
git clone https://github.com/sabania/miniMe.git
cd miniMe
npm install
npm run build:win    # oder build:linux
```

Beim ersten Start Sprache waehlen (Deutsch / English) — das legt die Templates und den Kommunikationsstil des Agents fest.

## 3. WhatsApp verbinden

<p align="center">
  <img src="docs/screenshots/whatsapp.png" width="700" alt="miniMe WhatsApp-Seite — Connect klicken" />
</p>

**Connect** im WhatsApp-Tab klicken. QR-Code erscheint.

Auf dem Handy: **WhatsApp** > **Verknuepfte Geraete** > **Geraet verknuepfen** > QR-Code scannen.

<p align="center">
  <img src="docs/screenshots/whatsapp-linked-devices.jpg" width="250" alt="WhatsApp — Geraet verknuepfen" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-qr-login.jpg" width="250" alt="QR-Code scannen" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-linked-devices-connected.jpg" width="250" alt="miniMe verbunden" />
</p>

Fertig. Nachricht schreiben, Agent antwortet.

<p align="center">
  <img src="docs/screenshots/whatsapp-agent-response.jpg" width="300" alt="Agent antwortet via WhatsApp" />
</p>

---

# Es ist einfach Claude Code

miniMe erfindet nichts neu. Es laeuft dasselbe Claude Code das du schon im Terminal nutzt — mit dem gleichen Permission-System, den gleichen CLAUDE.md-Dateien, den gleichen Skills, den gleichen Einstellungen.

**Was miniMe dazu gibt:**
- **WhatsApp-Zugang** — schreib deinem Agent vom Handy
- **Geplante Tasks** — der Agent kann nach Zeitplan arbeiten (Heartbeat, naechtliche Konsolidierung)
- **Persistente Sessions** — auf WhatsApp starten, am PC weitermachen
- **Desktop-App** — Permissions, Sessions und Projekte ueber eine UI verwalten

**Was gleich bleibt:**
- Claude Codes Permission-System (settings.json, Allow/Deny-Rules)
- CLAUDE.md-Dateien im Workspace — der Agent liest sie wie jede Claude Code Session
- Skills in `.claude/skills/` — funktioniert exakt wie auf deinem Rechner konfiguriert
- Alle Tools (WebSearch, Bash, Read, Write, Edit, etc.) — wie in der CLI

Du kannst den Workspace-Ordner oeffnen, CLAUDE.md bearbeiten, Skills hinzufuegen, settings.json aendern — alles funktioniert wie Claude Code normal konfigurieren. Der Agent uebernimmt es beim naechsten Lauf.

---

# Was miniMe dazu gibt

## WhatsApp-Nachrichten

Schreib dem Agent vom Handy. Die Sessions-UI zeigt die komplette Konversation, Kosten und Status — aber WhatsApp ist wo du mit ihm redest.

<p align="center">
  <img src="docs/screenshots/sessions-chat.png" width="700" alt="Sessions — Konversationsansicht" />
</p>

## Permissions steuern

Wenn der Agent ein Tool nutzen will, fragt er — via WhatsApp oder Desktop-UI. Du entscheidest.

<p align="center">
  <img src="docs/screenshots/whatsapp-permission-flow.jpg" width="250" alt="Permission-Anfrage auf WhatsApp" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-permission-approve.jpg" width="250" alt="Auf WhatsApp genehmigen" />
</p>

<p align="center">
  <img src="docs/screenshots/permission-request.png" width="700" alt="Permission-Anfrage in der UI" />
</p>

Der **Permission Mode** steuert wie viel Autonomie der Agent hat:

| Modus | Verhalten |
|-------|-----------|
| **Ask** | Agent fragt vor jeder Tool-Nutzung — volle Kontrolle |
| **Accept Edits** | Datei-Edits auto-genehmigt, andere Tools fragen |
| **Bypass** | Voll autonom — keine Prompts |
| **Plan** | Nur lesen — Agent kann nicht aendern |

Das ist dasselbe Permission-System wie Claude Code. `Bypass` ist wie `claude --dangerously-skip-permissions`. `Ask` ist der Standard-Modus. Du hast die Kontrolle.

## Am PC weitermachen

Jede Session hat ein Arbeitsverzeichnis und eine Session-ID. Klick **Terminal** in der UI und Claude Code oeffnet sich im Terminal — setzt exakt dieselbe Session fort. **Code** oeffnet VS Code. **Files** oeffnet den Workspace.

Starte einen Task vom Handy, setz dich an den PC, mach mit vollem Kontext weiter.

## Projekte einbinden

<p align="center">
  <img src="docs/screenshots/projects.png" width="700" alt="Projekte — verlinkte Verzeichnisse" />
</p>

**Projects** > **+ Add** und einen Ordner waehlen. Er wird in den Workspace verlinkt und der Agent kann darauf zugreifen — Dateien lesen, Code schreiben, Tests ausfuehren. Der Agent erkennt neue Projekte automatisch und trackt sie im Gedaechtnis.

## Geplante Tasks

<p align="center">
  <img src="docs/screenshots/scheduler-calendar.png" width="700" alt="Scheduler" />
</p>

Zwei System-Tasks laufen automatisch:

| Task | Zeitplan | Zweck |
|------|----------|-------|
| **Heartbeat** | Alle paar Stunden (07:00–23:00) | Agent prueft offene Punkte, neue Dateien, Deadlines |
| **REM Sleep** | Taeglich um 03:00 | Naechtliche Konsolidierung und Planung |

Eigene Tasks erstellen mit **+ Task**. Der Agent kann auch selbst Tasks anlegen.

<p align="center">
  <img src="docs/screenshots/scheduler-new-task.png" width="700" alt="Neuen Task erstellen" />
</p>

## Gedaechtnis

Der Agent baut ein persistentes Gedaechtnis im Workspace auf — Dateien die er ueber Sessions hinweg lesen und aktualisieren kann:

```
workspace/
├── SOUL.md           # Identitaet und Kommunikationsstil
├── HEARTBEAT.md      # Anleitung fuer proaktive Checks
├── memory/
│   ├── CLAUDE.md     # Hauptindex
│   ├── user/         # Was er ueber dich weiss
│   ├── people/       # Personen in deinem Leben
│   ├── projects/     # Projekt-Wissen
│   └── journal/      # Woechentliche Notizen & Tasks
└── .claude/skills/   # Skills (wie Claude Code Skills)
```

Das sind ganz normale Dateien. Oeffne den Workspace in VS Code, bearbeite sie, fuege eigene hinzu — der Agent uebernimmt Aenderungen in der naechsten Konversation. Genau wie Claude Code auf deinem Rechner konfigurieren.

---

# Einstellungen

<p align="center">
  <img src="docs/screenshots/settings.png" width="700" alt="Einstellungen" />
</p>

| Bereich | Einstellung | Was es tut |
|---------|-------------|-----------|
| **Agent** | Permission Mode | Ask / Accept Edits / Bypass / Plan |
| **Agent** | Model | Default, Sonnet oder Haiku |
| **WhatsApp** | Auto-Connect | WhatsApp automatisch verbinden beim Start |
| **WhatsApp** | Response Mode | sendMessage (ueberlegt) oder Streaming (Echtzeit) |
| **App** | Minimize to Tray | Schliessen minimiert in den Tray |
| **App** | Start with System | Automatisch starten beim Login |
| **App** | Use Git | Workspace- und Projekt-Aenderungen tracken |

**Danger Zone** (unten in Settings) zum Zuruecksetzen einzelner Komponenten oder alles.
