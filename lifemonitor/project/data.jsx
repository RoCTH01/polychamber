// data.jsx — Sample data for LifeMonitor (knowledge-worker tone)

const NOW = new Date('2026-05-04T14:32:00');

// Notes: aggregated from Twitter / Discord / Obsidian / Apple Notes / Reddit
// Each note is a THREAD with a timeline of messages. The first message is the
// origin (clipped from the source); subsequent messages are user follow-ups.
const NOTES = [
  { id: 'n01', src: 'tw', author: '@karpathy', t: '14:18', tags: ['ml', 'agents'], starred: true,
    messages: [
      { id: 'm1', who: 'src', t: '14:18', kind: 'quote', body: 'small models trained on filtered code outperform 10x larger generalist models on agentic tasks. quality of substrate > scale.' },
      { id: 'm2', who: 'me', t: '14:21', body: 'this matches what we saw on the eval harness rebuild — dataset hygiene > param count', reactions: [{ e: '💯', n: 1 }] },
      { id: 'm3', who: 'me', t: '14:24', body: 'TODO: pull the filtered-code paper, see if their filter is reproducible' },
      { id: 'm4', who: 'me', t: '14:29', kind: 'link', body: 'https://arxiv.org/abs/2026.04812', meta: { title: 'Substrate Quality in Code Pretraining', site: 'arxiv.org', desc: '… we show a 7B model on the filtered substrate matching a 70B baseline…' } },
    ] },
  { id: 'n02', src: 'ob', author: 'research/agents', t: '13:55', tags: ['hypothesis', 'agents'],
    messages: [
      { id: 'm1', who: 'src', t: '13:55', body: 'Hypothesis: tool-use latency dominates wall-clock for any agent loop > 4 steps. Worth measuring before adding more tools.' },
      { id: 'm2', who: 'me', t: '14:02', body: 'maya is +1 on this. she has numbers from the retrieval pipeline already' },
    ] },
  { id: 'n03', src: 'dc', author: '#paper-club', t: '13:42', tags: ['rg', 'papers'],
    messages: [
      { id: 'm1', who: 'src', t: '13:42', body: 'reading group on Thursday — "Inference-Time Scaling Laws". jeff sent the pdf in #papers, ~26pp.' },
      { id: 'm2', who: 'me', t: '13:43', body: 'will read tonight', reactions: [{ e: '👀', n: 2 }] },
    ] },
  { id: 'n04', src: 'mn', author: 'iPhone Notes', t: '13:01', tags: ['product'],
    messages: [
      { id: 'm1', who: 'src', t: '13:01', body: 'Idea: surface the cost of every agent call inline next to the response. Per-token, not per-request.' },
    ] },
  { id: 'n05', src: 'tw', author: '@simonw', t: '12:47', tags: ['tools'],
    messages: [
      { id: 'm1', who: 'src', t: '12:47', body: 'datasette plugin for parquet finally landed. ~3x faster than the SQLite shim on cold reads.' },
      { id: 'm2', who: 'me', t: '12:50', body: 'finally. swap in for the agents-eval pipeline next week' },
    ] },
  { id: 'n06', src: 'ob', author: 'daily/2026-05-04', t: '12:30', tags: ['craft'],
    messages: [
      { id: 'm1', who: 'src', t: '12:30', body: 'Re-read Brooks "Plan to throw one away" — applies to every prompt I have written this month.' },
    ] },
  { id: 'n07', src: 'rd', author: 'r/MachineLearning', t: '11:58', tags: ['eval'],
    messages: [
      { id: 'm1', who: 'src', t: '11:58', body: '"What\'s your team\'s eval setup?" — top comment thread mentions running golden-set + canary against every PR.' },
    ] },
  { id: 'n08', src: 'dc', author: '#shipping-log', t: '11:22', tags: ['ship'],
    messages: [
      { id: 'm1', who: 'src', t: '11:22', body: 'shipped: rate-limit retry with jitter. follow-up: surface backoff state in the UI so users stop refreshing.', reactions: [{ e: '🚀', n: 4 }, { e: '🎉', n: 2 }] },
    ] },
  { id: 'n09', src: 'tw', author: '@swyx', t: '10:50', tags: ['takes'],
    messages: [
      { id: 'm1', who: 'src', t: '10:50', body: 'the 2026 stack is: structured outputs, tool use, eval harness, observability. everything else is a wrapper.' },
    ] },
  { id: 'n10', src: 'ob', author: 'inbox/quick', t: '10:31', tags: ['writing', 'todo'], starred: true,
    messages: [
      { id: 'm1', who: 'src', t: '10:31', body: 'TODO: write up the eval-set-as-code pattern. notes scattered across 4 files.' },
      { id: 'm2', who: 'me', t: '10:33', body: 'files to merge: agents/eval.md, projects/lifemonitor/eval.md, daily/2026-04-29.md, inbox/quick.md' },
      { id: 'm3', who: 'me', t: '11:14', kind: 'task', body: 'draft the post', done: false },
      { id: 'm4', who: 'me', t: '11:14', kind: 'task', body: 'find a venue (substack? blog?)', done: false },
    ] },
  { id: 'n11', src: 'mn', author: 'iPhone Notes', t: '09:48', tags: ['agents'],
    messages: [
      { id: 'm1', who: 'src', t: '09:48', body: 'walking thought: caching != memoization in agent loops, because side-effects in tool calls.' },
    ] },
  { id: 'n12', src: 'dc', author: '@maya', t: '09:30', tags: ['bug'],
    messages: [
      { id: 'm1', who: 'src', t: '09:30', body: 'pairing on the retrieval bug at 3pm? I have a repro that survives a server restart.' },
      { id: 'm2', who: 'me', t: '09:31', body: 'in. send a calendar hold' },
    ] },
  { id: 'n13', src: 'tw', author: '@geoffreyhinton', t: '09:11', tags: ['ml'],
    messages: [{ id: 'm1', who: 'src', t: '09:11', body: 'analog computation revisited — the Mortal Computer paper finally has a working physical prototype.' }] },
  { id: 'n14', src: 'ob', author: 'projects/lifemonitor', t: '08:45', tags: ['design'],
    messages: [{ id: 'm1', who: 'src', t: '08:45', body: 'design req: drag-to-rearrange must persist per workspace, not globally. layouts are workspace-scoped.' }] },
  { id: 'n15', src: 'rd', author: 'r/LocalLLaMA', t: '08:12', tags: ['models'],
    messages: [{ id: 'm1', who: 'src', t: '08:12', body: 'Q4 quants of the new 14B are within 2% on MMLU vs fp16. shipping in production this week.' }] },
];

// Convenience: a flat preview body for the feed list
NOTES.forEach(n => { n.body = n.messages[0].body; });

// Heatmap: 365 days of activity, GitHub-style. Higher counts on weekdays + recent days.
function genHeatmap() {
  const days = [];
  const today = new Date(NOW);
  today.setHours(0, 0, 0, 0);
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const recency = 1 - (i / 365);
    let base = (dow === 0 || dow === 6) ? 0.4 : 1.0;
    base *= 0.5 + recency * 0.9;
    // some randomness, deterministic by day index
    const seed = (i * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const noise = (r * 1.6) - 0.3;
    let count = Math.max(0, Math.round(base * 4 + noise * 3));
    // a few dead zones
    if (i > 200 && i < 215) count = 0;
    if (i > 280 && i < 290) count = Math.round(count * 0.3);
    days.push({ date: d, count: Math.min(count, 12) });
  }
  return days;
}

// Calendar — current week, with events & inline notes
const CAL_EVENTS = [
  { day: 0, start: 9.0,  end: 9.5,  title: 'Standup',           kind: 'meet' },
  { day: 0, start: 11.0, end: 12.0, title: 'Deep work — eval harness', kind: 'focus' },
  { day: 0, start: 14.0, end: 15.0, title: 'Pairing w/ Maya',   kind: 'meet' },
  { day: 1, start: 10.0, end: 11.5, title: 'Design review',     kind: 'meet' },
  { day: 1, start: 15.0, end: 17.0, title: 'Writing block',     kind: 'focus' },
  { day: 2, start: 9.0,  end: 9.5,  title: 'Standup',           kind: 'meet' },
  { day: 2, start: 13.0, end: 14.0, title: 'Reading group',     kind: 'social' },
  { day: 2, start: 14.5, end: 16.0, title: 'Agents prototype',  kind: 'focus', current: true },
  { day: 3, start: 9.0,  end: 9.5,  title: 'Standup',           kind: 'meet' },
  { day: 3, start: 11.0, end: 12.0, title: 'Customer call',     kind: 'meet' },
  { day: 3, start: 14.0, end: 16.0, title: 'Inference benchmarks', kind: 'focus' },
  { day: 4, start: 10.0, end: 12.0, title: 'Workshop',          kind: 'social' },
  { day: 4, start: 13.0, end: 14.0, title: '1:1 w/ Sam',        kind: 'meet' },
  { day: 5, start: 11.0, end: 12.0, title: 'Long run',          kind: 'social' },
  { day: 6, start: 19.0, end: 21.0, title: 'Dinner — Alex',     kind: 'social' },
];

// Funnel — read/watch later
const FUNNEL = [
  { id: 'f01', kind: 'paper',   title: 'Inference-Time Scaling Laws',                source: 'arxiv.org', est: '26 min', added: '2d', tag: 'next' },
  { id: 'f02', kind: 'video',   title: 'Karpathy — State of GPT 2026',               source: 'youtube',   est: '47 min', added: '3h', tag: 'next' },
  { id: 'f03', kind: 'article', title: 'Why your evals are lying to you',            source: 'eugeneyan.com', est: '12 min', added: '5h', tag: 'next' },
  { id: 'f04', kind: 'paper',   title: 'Mortal Computers: A Physical Prototype',     source: 'nature.com', est: '34 min', added: '1d', tag: 'soon' },
  { id: 'f05', kind: 'thread',  title: '@simonw on prompt injection in 2026',        source: 'twitter',   est: '6 min',  added: '6h', tag: 'soon' },
  { id: 'f06', kind: 'video',   title: 'Distributed systems for ML inference',       source: 'youtube',   est: '1h 12m', added: '2d', tag: 'soon' },
  { id: 'f07', kind: 'article', title: 'The taste gap in code generation',           source: 'martinfowler.com', est: '18 min', added: '4d', tag: 'soon' },
  { id: 'f08', kind: 'paper',   title: 'RAG-as-Memory: Long-horizon retrieval',      source: 'arxiv.org', est: '31 min', added: '1w', tag: 'later' },
  { id: 'f09', kind: 'article', title: 'On writing software that lasts',             source: 'jvns.ca',   est: '9 min',  added: '1w', tag: 'later' },
];

// Reminders
const REMINDERS = [
  { id: 'r1', body: 'Write up eval-set-as-code pattern',  due: 'today',    pri: 1, done: false },
  { id: 'r2', body: 'Reply to Sam re: Q3 roadmap',         due: 'today',    pri: 2, done: false },
  { id: 'r3', body: 'Renew domain — lifemonitor.so',       due: 'tomorrow', pri: 2, done: false },
  { id: 'r4', body: 'Move agents/ notes to projects vault', due: 'this wk', pri: 3, done: false },
  { id: 'r5', body: 'Cancel that one subscription',         due: 'this wk', pri: 3, done: true  },
  { id: 'r6', body: 'Book physical',                        due: 'next wk', pri: 3, done: false },
];

// Now-playing / focus
const FOCUS_SESSIONS_TODAY = [
  { label: 'Eval harness',    minutes: 92 },
  { label: 'Reading',         minutes: 34 },
  { label: 'Agents prototype',minutes: 48 },
];

// Source breakdown (analytics ribbon for heatmap header)
const SOURCE_BREAKDOWN = [
  { src: 'tw', count: 312, label: 'Twitter' },
  { src: 'ob', count: 489, label: 'Obsidian' },
  { src: 'dc', count: 198, label: 'Discord' },
  { src: 'mn', count: 84,  label: 'Notes' },
  { src: 'rd', count: 67,  label: 'Reddit' },
];

const SRC_LABEL = { tw: 'TW', dc: 'DC', ob: 'OB', mn: 'MN', rd: 'RD' };
const SRC_NAME  = { tw: 'Twitter', dc: 'Discord', ob: 'Obsidian', mn: 'Notes', rd: 'Reddit' };

Object.assign(window, {
  NOW, NOTES, genHeatmap, CAL_EVENTS, FUNNEL, REMINDERS,
  FOCUS_SESSIONS_TODAY, SOURCE_BREAKDOWN, SRC_LABEL, SRC_NAME,
});
