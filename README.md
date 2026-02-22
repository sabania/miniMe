<div align="center">

# miniMe

**Your autonomous personal AI assistant — powered by Claude Code**

Self-hosted, private, always-on. Talk to your agent via WhatsApp or the built-in UI.
It learns, remembers, and acts proactively on your behalf.

[English](#quick-start) | [Deutsch](#schnellstart)

</div>

---

# Quick Start

Get up and running in 3 steps.

## 1. Install Claude Code

miniMe needs [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed on your machine.

```bash
npm install -g @anthropic-ai/claude-code
claude  # follow the auth flow
```

Make sure your [Anthropic API key](https://console.anthropic.com/) is set as `ANTHROPIC_API_KEY` environment variable, or that you're authenticated via Claude Code's built-in auth.

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

On first launch, choose your language (Deutsch / English). This sets the agent's personality, memory structure, and communication style.

## 3. Connect WhatsApp

<p align="center">
  <img src="docs/screenshots/whatsapp.png" width="700" alt="miniMe WhatsApp page — click Connect" />
</p>

Click **Connect** in the WhatsApp tab. A QR code appears in the app.

On your phone, open **WhatsApp** > **Linked Devices** > **Link a Device** and scan the QR code:

<p align="center">
  <img src="docs/screenshots/whatsapp-linked-devices.jpg" width="250" alt="WhatsApp — Link a Device" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-qr-login.jpg" width="250" alt="Scan QR code" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-linked-devices-connected.jpg" width="250" alt="miniMe connected" />
</p>

Once connected, **miniMe** appears as a linked device. You're ready to go — just send a message.

<p align="center">
  <img src="docs/screenshots/whatsapp-agent-response.jpg" width="300" alt="Agent responding via WhatsApp" />
</p>

---

# What You Can Do

## Chat from Anywhere

Send a message via WhatsApp or the built-in Sessions UI — they share the same conversation. The agent uses Claude Code under the hood, so it can search the web, read/write files, run commands, and more.

<p align="center">
  <img src="docs/screenshots/sessions-chat.png" width="700" alt="Sessions — chat view" />
</p>

## Control Permissions

When the agent wants to use a tool, it asks for permission. You can approve or deny from **WhatsApp** or from the **UI** — whichever is more convenient.

<p align="center">
  <img src="docs/screenshots/whatsapp-permission-flow.jpg" width="250" alt="Permission request on WhatsApp" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-permission-approve.jpg" width="250" alt="Approve permission on WhatsApp" />
</p>

<p align="center">
  <img src="docs/screenshots/permission-request.png" width="700" alt="Permission request in the UI" />
</p>

Don't want to approve every action? Change the **Permission Mode** in Settings:

| Mode | What it means |
|------|--------------|
| **Ask** | Agent asks before every tool use — full control |
| **Accept Edits** | File edits are auto-approved, other tools ask |
| **Bypass** | Fully autonomous — no prompts at all |
| **Plan** | Read-only mode — agent can only read, not modify |

Set it to **Bypass** and the agent works completely on its own. Set it to **Ask** when you want to stay in the loop.

## Continue Locally

Every session has a working directory and a session ID. You can pick up the same session on your local machine:

- **Terminal** — opens Claude Code in a terminal, resuming the exact same session
- **Code** — opens VS Code in the session's working directory
- **Files** — opens the workspace folder

This means you can start a task from your phone via WhatsApp, then sit down at your PC and continue in VS Code or Claude Code with full context.

## Link Projects

Go to **Projects** > **+ Project** and select any folder on your machine. The agent can then access it — read files, write code, run tests, execute commands.

Each linked project appears as a junction inside the workspace, so the agent can navigate between projects.

## Schedule Tasks

<p align="center">
  <img src="docs/screenshots/scheduler-calendar.png" width="700" alt="Scheduler — calendar view" />
</p>

Two system tasks run automatically:

| Task | Schedule | Purpose |
|------|----------|---------|
| **Heartbeat** | Every few hours (07:00–23:00) | Agent checks for pending items, new files, deadlines |
| **REM Sleep** | Daily at 03:00 | Nightly memory consolidation — deduplicate, clean up, plan ahead |

You can create your own scheduled tasks with **+ Task**:

<p align="center">
  <img src="docs/screenshots/scheduler-new-task.png" width="700" alt="Create a new scheduled task" />
</p>

The agent can also create tasks on its own via the scheduler MCP tool.

## How the Agent Learns

miniMe uses a **Second Brain** architecture. Everything the agent learns is stored in the workspace:

```
workspace/
├── SOUL.md              # Agent identity and communication style
├── HEARTBEAT.md         # Instructions for proactive checks
├── memory/
│   ├── CLAUDE.md        # Main index — routing table for all knowledge
│   ├── user/            # What it knows about you
│   ├── people/          # People in your life
│   ├── projects/        # Project knowledge
│   ├── decisions/       # Decision log
│   ├── ideas/           # Ideas & notes inbox
│   └── journal/         # Weekly notes & tasks
└── .claude/skills/      # Built-in skills (memory, contacts, tasks, etc.)
```

The agent updates its memory continuously — during conversations, before context compression (PreCompact), and during nightly consolidation (REM Sleep). All changes are git-tracked.

---

# Settings

<p align="center">
  <img src="docs/screenshots/settings.png" width="700" alt="Settings page" />
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

## Danger Zone

Reset individual components or perform a full reset:

| Reset | What it clears |
|-------|---------------|
| **Settings** | All config back to defaults |
| **Conversations** | All chat history and messages |
| **Scheduler** | All tasks (system tasks are re-created) |
| **Workspace** | Memory, templates — language dialog reappears |
| **WhatsApp** | Disconnect + delete credentials |

---

# Schnellstart

In 3 Schritten startklar.

## 1. Claude Code installieren

miniMe braucht [Claude Code](https://docs.anthropic.com/en/docs/claude-code) auf deinem Rechner.

```bash
npm install -g @anthropic-ai/claude-code
claude  # Authentifizierung durchlaufen
```

Stelle sicher, dass dein [Anthropic API Key](https://console.anthropic.com/) als `ANTHROPIC_API_KEY` Umgebungsvariable gesetzt ist, oder dass du ueber die eingebaute Auth von Claude Code authentifiziert bist.

## 2. miniMe installieren

Lade das neueste Release herunter:

- **Windows**: `minime-x.x.x-setup.exe`
- **Linux**: `minime-x.x.x-x64.AppImage` oder `.deb`

Oder selbst bauen:
```bash
git clone https://github.com/sabania/miniMe.git
cd miniMe
npm install
npm run build:win    # oder build:linux
```

Beim ersten Start waehlst du die Sprache (Deutsch / English). Das legt die Persoenlichkeit, Memory-Struktur und den Kommunikationsstil des Agents fest.

## 3. WhatsApp verbinden

<p align="center">
  <img src="docs/screenshots/whatsapp.png" width="700" alt="miniMe WhatsApp-Seite — Connect klicken" />
</p>

Klicke **Connect** im WhatsApp-Tab. Ein QR-Code erscheint in der App.

Auf dem Handy: **WhatsApp** > **Verknuepfte Geraete** > **Geraet verknuepfen** und QR-Code scannen:

<p align="center">
  <img src="docs/screenshots/whatsapp-linked-devices.jpg" width="250" alt="WhatsApp — Geraet verknuepfen" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-qr-login.jpg" width="250" alt="QR-Code scannen" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-linked-devices-connected.jpg" width="250" alt="miniMe verbunden" />
</p>

Sobald verbunden, erscheint **miniMe** als verknuepftes Geraet. Fertig — einfach eine Nachricht schreiben.

<p align="center">
  <img src="docs/screenshots/whatsapp-agent-response.jpg" width="300" alt="Agent antwortet via WhatsApp" />
</p>

---

# Was du damit machen kannst

## Von ueberall chatten

Schreib eine Nachricht via WhatsApp oder in der eingebauten Sessions-UI — beide teilen sich dieselbe Konversation. Der Agent nutzt Claude Code im Hintergrund und kann im Web suchen, Dateien lesen/schreiben, Befehle ausfuehren und mehr.

<p align="center">
  <img src="docs/screenshots/sessions-chat.png" width="700" alt="Sessions — Chat-Ansicht" />
</p>

## Permissions steuern

Wenn der Agent ein Tool nutzen will, fragt er um Erlaubnis. Du kannst von **WhatsApp** oder der **UI** aus genehmigen oder ablehnen — was gerade praktischer ist.

<p align="center">
  <img src="docs/screenshots/whatsapp-permission-flow.jpg" width="250" alt="Permission-Anfrage auf WhatsApp" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/whatsapp-permission-approve.jpg" width="250" alt="Permission auf WhatsApp genehmigen" />
</p>

<p align="center">
  <img src="docs/screenshots/permission-request.png" width="700" alt="Permission-Anfrage in der UI" />
</p>

Keine Lust jede Aktion zu genehmigen? Aendere den **Permission Mode** in den Settings:

| Modus | Was es bedeutet |
|-------|----------------|
| **Ask** | Agent fragt vor jeder Tool-Nutzung — volle Kontrolle |
| **Accept Edits** | Datei-Edits auto-genehmigt, andere Tools fragen |
| **Bypass** | Voll autonom — keine Prompts |
| **Plan** | Nur-Lesen-Modus — Agent kann nur lesen, nicht aendern |

Auf **Bypass** gestellt arbeitet der Agent komplett eigenstaendig. Auf **Ask** bleibst du bei jedem Schritt informiert.

## Lokal weitermachen

Jede Session hat ein Arbeitsverzeichnis und eine Session-ID. Du kannst dieselbe Session auf deinem lokalen Rechner fortsetzen:

- **Terminal** — oeffnet Claude Code im Terminal, setzt exakt dieselbe Session fort
- **Code** — oeffnet VS Code im Arbeitsverzeichnis der Session
- **Files** — oeffnet den Workspace-Ordner

Das heisst: du kannst einen Task vom Handy via WhatsApp starten, dich dann an den PC setzen und in VS Code oder Claude Code mit vollem Kontext weitermachen.

## Projekte einbinden

Gehe zu **Projects** > **+ Project** und waehle einen Ordner auf deinem Rechner. Der Agent kann dann darauf zugreifen — Dateien lesen, Code schreiben, Tests ausfuehren, Befehle starten.

Jedes verlinkte Projekt erscheint als Junction im Workspace, sodass der Agent zwischen Projekten navigieren kann.

## Tasks planen

<p align="center">
  <img src="docs/screenshots/scheduler-calendar.png" width="700" alt="Scheduler — Kalenderansicht" />
</p>

Zwei System-Tasks laufen automatisch:

| Task | Zeitplan | Zweck |
|------|----------|-------|
| **Heartbeat** | Alle paar Stunden (07:00–23:00) | Agent prueft offene Punkte, neue Dateien, Deadlines |
| **REM Sleep** | Taeglich um 03:00 | Naechtliche Memory-Konsolidierung — deduplizieren, aufraeumen, vorausplanen |

Eigene Tasks erstellst du mit **+ Task**:

<p align="center">
  <img src="docs/screenshots/scheduler-new-task.png" width="700" alt="Neuen Task erstellen" />
</p>

Der Agent kann auch selbst Tasks ueber das Scheduler-MCP-Tool erstellen.

## Wie der Agent lernt

miniMe nutzt eine **Second Brain**-Architektur. Alles was der Agent lernt wird im Workspace gespeichert:

```
workspace/
├── SOUL.md              # Agent-Identitaet und Kommunikationsstil
├── HEARTBEAT.md         # Anleitung fuer proaktive Checks
├── memory/
│   ├── CLAUDE.md        # Hauptindex — Routing-Tabelle fuer alles Wissen
│   ├── user/            # Was er ueber dich weiss
│   ├── people/          # Personen in deinem Leben
│   ├── projects/        # Projekt-Wissen
│   ├── decisions/       # Entscheidungs-Log
│   ├── ideas/           # Ideen & Notizen Inbox
│   └── journal/         # Woechentliche Notizen & Tasks
└── .claude/skills/      # Eingebaute Skills (Memory, Kontakte, Tasks, etc.)
```

Der Agent aktualisiert sein Gedaechtnis kontinuierlich — waehrend Konversationen, vor Context-Kompression (PreCompact) und bei der naechtlichen Konsolidierung (REM Sleep). Alle Aenderungen sind git-getrackt.

---

# Einstellungen

<p align="center">
  <img src="docs/screenshots/settings.png" width="700" alt="Settings-Seite" />
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

## Danger Zone

Einzelne Komponenten oder alles zuruecksetzen:

| Reset | Was geloescht wird |
|-------|--------------------|
| **Settings** | Alle Einstellungen auf Defaults |
| **Conversations** | Gesamter Chat-Verlauf und Nachrichten |
| **Scheduler** | Alle Tasks (System-Tasks werden neu erstellt) |
| **Workspace** | Memory, Templates — Sprachwahl-Dialog erscheint erneut |
| **WhatsApp** | Trennen + Credentials loeschen |
