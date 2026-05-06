import { config } from 'dotenv'
config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import type { LayoutItem } from '@/types'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client, { schema })

// ── helpers ──────────────────────────────────────────────────────────────────
function isoDate(d: Date) { return d.toISOString().split('T')[0] }

function genHeatmap() {
  const days: { date: string; count: number; sourceBreakdown: Record<string, number> }[] = []
  const today = new Date('2026-05-04T00:00:00')
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dow = d.getDay()
    const recency = 1 - i / 365
    let base = (dow === 0 || dow === 6) ? 0.4 : 1.0
    base *= 0.5 + recency * 0.9
    const seed = (i * 9301 + 49297) % 233280
    const r = seed / 233280
    const noise = r * 1.6 - 0.3
    let count = Math.max(0, Math.round(base * 4 + noise * 3))
    if (i > 200 && i < 215) count = 0
    if (i > 280 && i < 290) count = Math.round(count * 0.3)
    count = Math.min(count, 12)
    days.push({ date: isoDate(d), count, sourceBreakdown: { tw: Math.floor(count * 0.3), ob: Math.floor(count * 0.4), dc: Math.floor(count * 0.2), mn: Math.floor(count * 0.1) } })
  }
  return days
}

// ── workspaces ────────────────────────────────────────────────────────────────
const WORKSPACES: Array<{ name: string; layout: LayoutItem[] }> = [
  {
    name: 'research',
    layout: [
      { id: 'heatmap',   type: 'heatmap',   x: 0, y: 0,  w: 8, h: 7 },
      { id: 'focus',     type: 'focus',     x: 8, y: 0,  w: 4, h: 7 },
      { id: 'feed',      type: 'feed',      x: 0, y: 7,  w: 5, h: 9 },
      { id: 'calendar',  type: 'calendar',  x: 5, y: 7,  w: 7, h: 9 },
      { id: 'funnel',    type: 'funnel',    x: 0, y: 16, w: 7, h: 7 },
      { id: 'reminders', type: 'reminders', x: 7, y: 16, w: 5, h: 7 },
    ],
  },
  {
    name: 'shipping',
    layout: [
      { id: 'focus',     type: 'focus',     x: 0, y: 0,  w: 4, h: 7 },
      { id: 'reminders', type: 'reminders', x: 4, y: 0,  w: 4, h: 7 },
      { id: 'calendar',  type: 'calendar',  x: 8, y: 0,  w: 4, h: 9 },
      { id: 'feed',      type: 'feed',      x: 0, y: 7,  w: 8, h: 8 },
      { id: 'heatmap',   type: 'heatmap',   x: 0, y: 15, w: 8, h: 6 },
      { id: 'funnel',    type: 'funnel',    x: 8, y: 9,  w: 4, h: 12 },
    ],
  },
  {
    name: 'reading',
    layout: [
      { id: 'funnel',    type: 'funnel',    x: 0, y: 0,  w: 7, h: 10 },
      { id: 'feed',      type: 'feed',      x: 7, y: 0,  w: 5, h: 14 },
      { id: 'heatmap',   type: 'heatmap',   x: 0, y: 10, w: 7, h: 6 },
      { id: 'calendar',  type: 'calendar',  x: 0, y: 16, w: 7, h: 8 },
      { id: 'focus',     type: 'focus',     x: 7, y: 14, w: 5, h: 5 },
      { id: 'reminders', type: 'reminders', x: 7, y: 19, w: 5, h: 5 },
    ],
  },
]

// ── calendar events ───────────────────────────────────────────────────────────
const CAL_EVENTS = [
  { title: 'Standup',                 kind: 'meet',   dayOfWeek: 0, startHour: 9.0,  endHour: 9.5,  isCurrent: false },
  { title: 'Deep work — eval harness',kind: 'focus',  dayOfWeek: 0, startHour: 11.0, endHour: 12.0, isCurrent: false },
  { title: 'Pairing w/ Maya',         kind: 'meet',   dayOfWeek: 0, startHour: 14.0, endHour: 15.0, isCurrent: false },
  { title: 'Design review',           kind: 'meet',   dayOfWeek: 1, startHour: 10.0, endHour: 11.5, isCurrent: false },
  { title: 'Writing block',           kind: 'focus',  dayOfWeek: 1, startHour: 15.0, endHour: 17.0, isCurrent: false },
  { title: 'Standup',                 kind: 'meet',   dayOfWeek: 2, startHour: 9.0,  endHour: 9.5,  isCurrent: false },
  { title: 'Reading group',           kind: 'social', dayOfWeek: 2, startHour: 13.0, endHour: 14.0, isCurrent: false },
  { title: 'Agents prototype',        kind: 'focus',  dayOfWeek: 2, startHour: 14.5, endHour: 16.0, isCurrent: true },
  { title: 'Standup',                 kind: 'meet',   dayOfWeek: 3, startHour: 9.0,  endHour: 9.5,  isCurrent: false },
  { title: 'Customer call',           kind: 'meet',   dayOfWeek: 3, startHour: 11.0, endHour: 12.0, isCurrent: false },
  { title: 'Inference benchmarks',    kind: 'focus',  dayOfWeek: 3, startHour: 14.0, endHour: 16.0, isCurrent: false },
  { title: 'Workshop',                kind: 'social', dayOfWeek: 4, startHour: 10.0, endHour: 12.0, isCurrent: false },
  { title: '1:1 w/ Sam',             kind: 'meet',   dayOfWeek: 4, startHour: 13.0, endHour: 14.0, isCurrent: false },
  { title: 'Long run',               kind: 'social', dayOfWeek: 5, startHour: 11.0, endHour: 12.0, isCurrent: false },
  { title: 'Dinner — Alex',          kind: 'social', dayOfWeek: 6, startHour: 19.0, endHour: 21.0, isCurrent: false },
]

// ── notes ─────────────────────────────────────────────────────────────────────
const NOTES_DATA = [
  {
    item: { kind: 'note', src: 'tw', author: '@karpathy', starred: true, tags: ['ml', 'agents'], createdAt: new Date('2026-05-04T14:18:00') },
    messages: [
      { who: 'src', messageKind: 'quote', body: 'small models trained on filtered code outperform 10x larger generalist models on agentic tasks. quality of substrate > scale.' },
      { who: 'me',  messageKind: null,    body: 'this matches what we saw on the eval harness rebuild — dataset hygiene > param count', reactions: [{ e: '💯', n: 1 }] },
      { who: 'me',  messageKind: null,    body: 'TODO: pull the filtered-code paper, see if their filter is reproducible' },
      { who: 'me',  messageKind: 'link',  body: 'https://arxiv.org/abs/2026.04812', linkMeta: { title: 'Substrate Quality in Code Pretraining', site: 'arxiv.org', desc: '… we show a 7B model on the filtered substrate matching a 70B baseline…' } },
    ],
  },
  {
    item: { kind: 'note', src: 'ob', author: 'research/agents', starred: false, tags: ['hypothesis', 'agents'], createdAt: new Date('2026-05-04T13:55:00') },
    messages: [
      { who: 'src', messageKind: null, body: 'Hypothesis: tool-use latency dominates wall-clock for any agent loop > 4 steps. Worth measuring before adding more tools.' },
      { who: 'me',  messageKind: null, body: 'maya is +1 on this. she has numbers from the retrieval pipeline already' },
    ],
  },
  {
    item: { kind: 'note', src: 'dc', author: '#paper-club', starred: false, tags: ['rg', 'papers'], createdAt: new Date('2026-05-04T13:42:00') },
    messages: [
      { who: 'src', messageKind: null, body: 'reading group on Thursday — "Inference-Time Scaling Laws". jeff sent the pdf in #papers, ~26pp.' },
      { who: 'me',  messageKind: null, body: 'will read tonight', reactions: [{ e: '👀', n: 2 }] },
    ],
  },
  {
    item: { kind: 'note', src: 'mn', author: 'iPhone Notes', starred: false, tags: ['product'], createdAt: new Date('2026-05-04T13:01:00') },
    messages: [
      { who: 'src', messageKind: null, body: 'Idea: surface the cost of every agent call inline next to the response. Per-token, not per-request.' },
    ],
  },
  {
    item: { kind: 'note', src: 'tw', author: '@simonw', starred: false, tags: ['tools'], createdAt: new Date('2026-05-04T12:47:00') },
    messages: [
      { who: 'src', messageKind: null, body: 'datasette plugin for parquet finally landed. ~3x faster than the SQLite shim on cold reads.' },
      { who: 'me',  messageKind: null, body: 'finally. swap in for the agents-eval pipeline next week' },
    ],
  },
  {
    item: { kind: 'note', src: 'ob', author: 'daily/2026-05-04', starred: false, tags: ['craft'], createdAt: new Date('2026-05-04T12:30:00') },
    messages: [
      { who: 'src', messageKind: null, body: 'Re-read Brooks "Plan to throw one away" — applies to every prompt I have written this month.' },
    ],
  },
  {
    item: { kind: 'note', src: 'rd', author: 'r/MachineLearning', starred: false, tags: ['eval'], createdAt: new Date('2026-05-04T11:58:00') },
    messages: [
      { who: 'src', messageKind: null, body: '"What\'s your team\'s eval setup?" — top comment thread mentions running golden-set + canary against every PR.' },
    ],
  },
  {
    item: { kind: 'note', src: 'dc', author: '#shipping-log', starred: false, tags: ['ship'], createdAt: new Date('2026-05-04T11:22:00') },
    messages: [
      { who: 'src', messageKind: null, body: 'shipped: rate-limit retry with jitter. follow-up: surface backoff state in the UI so users stop refreshing.', reactions: [{ e: '🚀', n: 4 }, { e: '🎉', n: 2 }] },
    ],
  },
  {
    item: { kind: 'note', src: 'tw', author: '@swyx', starred: false, tags: ['takes'], createdAt: new Date('2026-05-04T10:50:00') },
    messages: [
      { who: 'src', messageKind: null, body: 'the 2026 stack is: structured outputs, tool use, eval harness, observability. everything else is a wrapper.' },
    ],
  },
  {
    item: { kind: 'note', src: 'ob', author: 'inbox/quick', starred: true, tags: ['writing', 'todo'], createdAt: new Date('2026-05-04T10:31:00') },
    messages: [
      { who: 'src',  messageKind: null,   body: 'TODO: write up the eval-set-as-code pattern. notes scattered across 4 files.' },
      { who: 'me',   messageKind: null,   body: 'files to merge: agents/eval.md, projects/polychamber/eval.md, daily/2026-04-29.md, inbox/quick.md' },
      { who: 'me',   messageKind: 'task', body: 'draft the post', done: false },
      { who: 'me',   messageKind: 'task', body: 'find a venue (substack? blog?)', done: false },
    ],
  },
  {
    item: { kind: 'note', src: 'mn', author: 'iPhone Notes', starred: false, tags: ['agents'], createdAt: new Date('2026-05-04T09:48:00') },
    messages: [
      { who: 'src', messageKind: null, body: 'walking thought: caching != memoization in agent loops, because side-effects in tool calls.' },
    ],
  },
  {
    item: { kind: 'note', src: 'dc', author: '@maya', starred: false, tags: ['bug'], createdAt: new Date('2026-05-04T09:30:00') },
    messages: [
      { who: 'src', messageKind: null, body: 'pairing on the retrieval bug at 3pm? I have a repro that survives a server restart.' },
      { who: 'me',  messageKind: null, body: 'in. send a calendar hold' },
    ],
  },
  {
    item: { kind: 'note', src: 'tw', author: '@geoffreyhinton', starred: false, tags: ['ml'], createdAt: new Date('2026-05-04T09:11:00') },
    messages: [{ who: 'src', messageKind: null, body: 'analog computation revisited — the Mortal Computer paper finally has a working physical prototype.' }],
  },
  {
    item: { kind: 'note', src: 'ob', author: 'projects/polychamber', starred: false, tags: ['design'], createdAt: new Date('2026-05-04T08:45:00') },
    messages: [{ who: 'src', messageKind: null, body: 'design req: drag-to-rearrange must persist per workspace, not globally. layouts are workspace-scoped.' }],
  },
  {
    item: { kind: 'note', src: 'rd', author: 'r/LocalLLaMA', starred: false, tags: ['models'], createdAt: new Date('2026-05-04T08:12:00') },
    messages: [{ who: 'src', messageKind: null, body: 'Q4 quants of the new 14B are within 2% on MMLU vs fp16. shipping in production this week.' }],
  },
]

const FUNNEL_DATA = [
  { kind: 'funnel_item', body: 'Inference-Time Scaling Laws',             src: null, author: null, tags: [], starred: false, funnel: { mediaKind: 'paper',   source: 'arxiv.org',         est: '26 min', queueTag: 'next' } },
  { kind: 'funnel_item', body: 'Karpathy — State of GPT 2026',            src: null, author: null, tags: [], starred: false, funnel: { mediaKind: 'video',   source: 'youtube',           est: '47 min', queueTag: 'next' } },
  { kind: 'funnel_item', body: 'Why your evals are lying to you',          src: null, author: null, tags: [], starred: false, funnel: { mediaKind: 'article', source: 'eugeneyan.com',      est: '12 min', queueTag: 'next' } },
  { kind: 'funnel_item', body: 'Mortal Computers: A Physical Prototype',   src: null, author: null, tags: [], starred: false, funnel: { mediaKind: 'paper',   source: 'nature.com',        est: '34 min', queueTag: 'soon' } },
  { kind: 'funnel_item', body: '@simonw on prompt injection in 2026',      src: null, author: null, tags: [], starred: false, funnel: { mediaKind: 'thread',  source: 'twitter',           est: '6 min',  queueTag: 'soon' } },
  { kind: 'funnel_item', body: 'Distributed systems for ML inference',     src: null, author: null, tags: [], starred: false, funnel: { mediaKind: 'video',   source: 'youtube',           est: '1h 12m', queueTag: 'soon' } },
  { kind: 'funnel_item', body: 'The taste gap in code generation',         src: null, author: null, tags: [], starred: false, funnel: { mediaKind: 'article', source: 'martinfowler.com',  est: '18 min', queueTag: 'soon' } },
  { kind: 'funnel_item', body: 'RAG-as-Memory: Long-horizon retrieval',    src: null, author: null, tags: [], starred: false, funnel: { mediaKind: 'paper',   source: 'arxiv.org',         est: '31 min', queueTag: 'later' } },
  { kind: 'funnel_item', body: 'On writing software that lasts',           src: null, author: null, tags: [], starred: false, funnel: { mediaKind: 'article', source: 'jvns.ca',           est: '9 min',  queueTag: 'later' } },
]

const REMINDERS_DATA = [
  { body: 'Write up eval-set-as-code pattern',   due: 'today',    priority: 1, done: false },
  { body: 'Reply to Sam re: Q3 roadmap',          due: 'today',    priority: 2, done: false },
  { body: 'Renew domain — polychamber.so',        due: 'tomorrow', priority: 2, done: false },
  { body: 'Move agents/ notes to projects vault', due: 'this wk', priority: 3, done: false },
  { body: 'Cancel that one subscription',         due: 'this wk', priority: 3, done: true  },
  { body: 'Book physical',                        due: 'next wk', priority: 3, done: false },
]

// ── main ──────────────────────────────────────────────────────────────────────
async function seed() {
  // Idempotency check
  const existing = await db.select().from(schema.workspaces).limit(1)
  if (existing.length > 0) {
    console.log('DB already seeded — skipping')
    await client.end()
    return
  }

  console.log('Seeding database…')

  // Workspaces
  for (const ws of WORKSPACES) {
    await db.insert(schema.workspaces).values(ws)
  }

  // Calendar events — use current ISO week start
  const now = new Date('2026-05-04T14:32:00')
  const dow = (now.getDay() + 6) % 7
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dow)
  weekStart.setHours(0, 0, 0, 0)
  const weekStartStr = isoDate(weekStart)

  for (const ev of CAL_EVENTS) {
    await db.insert(schema.calendarEvents).values({
      ...ev,
      weekStart:  weekStartStr,
      startHour:  String(ev.startHour),
      endHour:    String(ev.endHour),
    })
  }

  // Notes + their thread messages
  for (const { item, messages } of NOTES_DATA) {
    const [root] = await db.insert(schema.items).values({
      kind: item.kind,
      body: messages[0].body,
      src: item.src,
      author: item.author,
      starred: item.starred,
      tags: item.tags,
      createdAt: item.createdAt,
    }).returning()

    // First message as item_message for the root
    await db.insert(schema.itemMessage).values({
      itemId: root.id,
      who: messages[0].who as 'src' | 'me',
      messageKind: messages[0].messageKind ?? null,
      reactions: (messages[0] as any).reactions ?? null,
      linkMeta: (messages[0] as any).linkMeta ?? null,
      done: (messages[0] as any).done ?? null,
    })

    // Subsequent messages as child items
    for (let i = 1; i < messages.length; i++) {
      const msg = messages[i]
      const offset = i * 3 // approximate minutes apart
      const createdAt = new Date(item.createdAt.getTime() + offset * 60000)
      const [child] = await db.insert(schema.items).values({
        kind: 'note',
        body: msg.body,
        src: null,
        author: null,
        parentId: root.id,
        starred: false,
        tags: [],
        createdAt,
      }).returning()
      await db.insert(schema.itemMessage).values({
        itemId: child.id,
        who: msg.who as 'src' | 'me',
        messageKind: msg.messageKind ?? null,
        reactions: (msg as any).reactions ?? null,
        linkMeta: (msg as any).linkMeta ?? null,
        done: (msg as any).done ?? null,
      })
    }
  }

  // Funnel items
  for (const f of FUNNEL_DATA) {
    const [item] = await db.insert(schema.items).values({
      kind: 'funnel_item', body: f.body, src: null, author: null,
      starred: false, tags: [],
    }).returning()
    await db.insert(schema.itemFunnel).values({ itemId: item.id, ...f.funnel })
  }

  // Reminders
  for (const r of REMINDERS_DATA) {
    const [item] = await db.insert(schema.items).values({
      kind: 'reminder', body: r.body, src: null, author: null,
      starred: false, tags: [],
    }).returning()
    await db.insert(schema.itemReminder).values({ itemId: item.id, due: r.due, priority: r.priority, done: r.done })
  }

  // Activity heatmap
  const heatmapDays = genHeatmap()
  for (const day of heatmapDays) {
    if (day.count > 0) {
      await db.insert(schema.activity).values(day).onConflictDoNothing()
    }
  }

  console.log('Seed complete ✓')
  await client.end()
}

seed().catch((e) => { console.error(e); process.exit(1) })
