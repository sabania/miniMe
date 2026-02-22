/**
 * In-process MCP server that gives the Agent access to scheduled task management.
 *
 * Tools: list_tasks, add_task, update_task, remove_task
 * The server runs in the same Node.js process and accesses the DB directly.
 *
 * NOTE: Server is NOT cached — recreated per query so tool descriptions
 * include the current local time (prevents UTC/local timezone confusion).
 */
import { randomUUID } from 'crypto'
import * as db from './db'
import { syncScheduledTasks } from './scheduler'
import { sendToRenderer } from './ipc-handlers'

function tasksJson(): { content: Array<{ type: string; text: string }> } {
  const tasks = db.getScheduledTasks()
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(tasks, null, 2)
    }]
  }
}

/** Notify renderer UI that tasks changed */
function notifyTasksChanged(): void {
  sendToRenderer('scheduledTasks:changed', db.getScheduledTasks())
}

/** Current local time info for tool descriptions (so agent knows what time it is) */
function localTimeInfo(): string {
  const now = new Date()
  const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return `Current local time: ${time} (${tz})`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createSchedulerMcpServer(): Promise<any> {
  const { createSdkMcpServer, tool } = await import('@anthropic-ai/claude-agent-sdk')
  const { z } = await import('zod')

  const server = createSdkMcpServer({
    name: 'scheduler',
    version: '1.0.0',
    tools: [
      tool(
        'list_tasks',
        'List all scheduled tasks with their id, name, prompt, cronExpr, enabled, oneShot, startDate, lastRunAt, createdAt',
        {},
        async () => tasksJson()
      ),

      tool(
        'add_task',
        `Create a new scheduled task. CRITICAL: All cron times MUST be in LOCAL time, NOT UTC. ${localTimeInfo()}. node-cron runs in local time. If user says "in 2 minutes" and local time is 16:40, use "42 16 * * *" (hour 16), NOT "42 15 * * *". Use standard 5-part cron (min hour dom month dow). Examples: "0 9 * * *" = daily 9:00, "0 9 * * 1,3,5" = Mon/Wed/Fri 9:00, "*/30 * * * *" = every 30min. Set oneShot=true for one-time tasks.`,
        {
          name: z.string().describe('Short descriptive name for the task'),
          prompt: z.string().describe('The prompt/instruction the agent will execute'),
          cronExpr: z.string().describe('Cron expression (5-part: min hour dom month dow) — hours in LOCAL time, NOT UTC'),
          oneShot: z.boolean().optional().describe('If true, task auto-disables after first run'),
          startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (task skipped before this date)')
        },
        async (args) => {
          const id = randomUUID()
          db.addScheduledTask(
            id,
            args.name,
            args.prompt,
            args.cronExpr,
            args.oneShot ?? false,
            args.startDate ?? null,
            'agent'
          )
          syncScheduledTasks()
          notifyTasksChanged()
          return tasksJson()
        }
      ),

      tool(
        'update_task',
        `Update an existing scheduled task. Only provide fields you want to change. Use list_tasks first to get task IDs. CRITICAL: cron hours in LOCAL time, NOT UTC. ${localTimeInfo()}.`,
        {
          id: z.string().describe('Task ID to update'),
          name: z.string().optional().describe('New name'),
          prompt: z.string().optional().describe('New prompt'),
          cronExpr: z.string().optional().describe('New cron expression — hours in LOCAL time'),
          enabled: z.boolean().optional().describe('Enable or disable the task'),
          oneShot: z.boolean().optional().describe('Set one-shot behavior'),
          startDate: z.string().optional().describe('New start date (YYYY-MM-DD) or empty string to clear'),
          type: z.enum(['system', 'agent', 'user']).optional().describe('Task type: system (managed by app), agent (created by agent), user (created by user)')
        },
        async (args) => {
          const { id, ...updates } = args
          const cleanUpdates: Record<string, unknown> = {}
          if (updates.name !== undefined) cleanUpdates.name = updates.name
          if (updates.prompt !== undefined) cleanUpdates.prompt = updates.prompt
          if (updates.cronExpr !== undefined) cleanUpdates.cronExpr = updates.cronExpr
          if (updates.enabled !== undefined) cleanUpdates.enabled = updates.enabled
          if (updates.oneShot !== undefined) cleanUpdates.oneShot = updates.oneShot
          if (updates.startDate !== undefined) cleanUpdates.startDate = updates.startDate || null
          if (updates.type !== undefined) cleanUpdates.type = updates.type

          db.updateScheduledTask(id, cleanUpdates)
          syncScheduledTasks()
          notifyTasksChanged()
          return tasksJson()
        }
      ),

      tool(
        'remove_task',
        'Permanently delete a scheduled task by its ID. Use list_tasks first to find the task ID.',
        {
          id: z.string().describe('Task ID to remove')
        },
        async (args) => {
          db.removeScheduledTask(args.id)
          syncScheduledTasks()
          notifyTasksChanged()
          return tasksJson()
        }
      )
    ]
  })

  console.log(`[mcp-scheduler] MCP server created — ${localTimeInfo()}`)
  return server
}
