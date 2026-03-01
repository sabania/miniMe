import { spawn } from 'child_process'
import { join } from 'path'

// ─── Interface ───────────────────────────────────────────────

export interface Platform {
  /** Open a terminal at `cwd` and run `claude` with args. Env should already have CLAUDECODE removed. */
  openTerminal(cwd: string, args: string[], env: NodeJS.ProcessEnv): void

  /** Ordered candidate paths where the `claude` executable might be installed. */
  claudeExecutableCandidates(home: string): string[]

  /** Command to locate an executable via PATH (e.g. 'which claude' or 'where.exe claude'). */
  whichCommand(executable: string): string

  /** Decode a Claude Code project slug back to an absolute path. */
  decodeProjectSlug(slug: string): string
}

// ─── Windows ─────────────────────────────────────────────────

const win32Platform: Platform = {
  openTerminal(cwd, args, env) {
    const claudeArgs = ['claude', ...args]
    const wtProcess = spawn('wt', ['-d', cwd, '--', ...claudeArgs], {
      detached: true,
      stdio: 'ignore',
      env
    })
    wtProcess.on('error', () => {
      spawn('cmd.exe', ['/c', 'start', '', '/D', cwd, ...claudeArgs], {
        detached: true,
        stdio: 'ignore',
        shell: true,
        env
      }).unref()
    })
    wtProcess.unref()
  },

  claudeExecutableCandidates(home) {
    return [
      join(home, '.local', 'bin', 'claude.exe'),
      join(process.env.APPDATA ?? '', 'npm', 'claude.cmd'),
      join(process.env.APPDATA ?? '', 'npm', 'claude')
    ]
  },

  whichCommand(executable) {
    return `where.exe ${executable}`
  },

  decodeProjectSlug(slug) {
    const driveMatch = slug.match(/^([A-Z])--(.*)/i)
    if (driveMatch) {
      const drive = driveMatch[1]
      const rest = driveMatch[2].replace(/-/g, '\\')
      return `${drive}:\\${rest}`
    }
    return slug.replace(/-/g, '\\')
  }
}

// ─── macOS ───────────────────────────────────────────────────

const darwinPlatform: Platform = {
  openTerminal(cwd, args, env) {
    // Single-quote the shell arguments to prevent $() and backtick expansion
    const sq = (s: string): string => "'" + s.replace(/'/g, "'\\''") + "'"
    const claudeCmd = ['claude', ...args].map(sq).join(' ')
    const shellCmd = `cd ${sq(cwd)} && ${claudeCmd}`
    // Escape for AppleScript double-quoted string
    const asEscaped = shellCmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

    const script = [
      'tell application "Terminal"',
      '  activate',
      `  do script "${asEscaped}"`,
      'end tell'
    ].join('\n')

    spawn('osascript', ['-e', script], {
      detached: true,
      stdio: 'ignore',
      env
    }).unref()
  },

  claudeExecutableCandidates(home) {
    return [
      join(home, '.local', 'bin', 'claude'),
      '/opt/homebrew/bin/claude',
      '/usr/local/bin/claude',
      '/usr/bin/claude'
    ]
  },

  whichCommand(executable) {
    return `which ${executable}`
  },

  decodeProjectSlug(slug) {
    return slug.replace(/-/g, '/')
  }
}

// ─── Linux ───────────────────────────────────────────────────

const linuxPlatform: Platform = {
  openTerminal(cwd, args, env) {
    const claudeArgs = ['-e', 'claude', ...args]
    const terminals = ['x-terminal-emulator', 'gnome-terminal', 'konsole', 'xterm']
    const tryTerminal = (idx: number): void => {
      if (idx >= terminals.length) return
      const p = spawn(terminals[idx], claudeArgs, {
        detached: true,
        stdio: 'ignore',
        cwd,
        env
      })
      p.on('error', () => tryTerminal(idx + 1))
      p.unref()
    }
    tryTerminal(0)
  },

  claudeExecutableCandidates(home) {
    return [
      join(home, '.local', 'bin', 'claude'),
      '/usr/local/bin/claude',
      '/usr/bin/claude'
    ]
  },

  whichCommand(executable) {
    return `which ${executable}`
  },

  decodeProjectSlug(slug) {
    return slug.replace(/-/g, '/')
  }
}

// ─── Factory ─────────────────────────────────────────────────

function createPlatform(): Platform {
  switch (process.platform) {
    case 'win32':
      return win32Platform
    case 'darwin':
      return darwinPlatform
    default:
      return linuxPlatform
  }
}

/** Platform singleton — resolved once at module load time. */
export const platform: Platform = createPlatform()
