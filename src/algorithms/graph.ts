export type GraphAlgorithm = 'bfs' | 'dfs' | 'dijkstra'

export type GraphNode = { id: string; x: number; y: number }
export type GraphEdge = { a: string; b: string; w: number }

export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] }

const PRESET_POS: Record<string, [number, number]> = {
  A: [70, 180], B: [200, 75], C: [200, 285], D: [340, 180], H: [340, 40], E: [480, 75], F: [480, 285], G: [610, 180]
}

export const DEFAULT_GRAPH_TEXT = 'A-B:4, A-C:2, B-C:1, B-H:7, B-D:5, C-D:8, C-F:10, D-E:2, D-F:6, H-E:3, E-G:4, F-G:3'

export function layoutNodes(ids: string[]): GraphNode[] {
  if (ids.every(id => PRESET_POS[id])) return ids.map(id => ({ id, x: PRESET_POS[id][0], y: PRESET_POS[id][1] }))
  const n = ids.length
  return ids.map((id, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2
    return { id, x: Math.round(340 + Math.cos(a) * 270), y: Math.round(170 + Math.sin(a) * 130) }
  })
}

/** Parse "A-B:4, B-C" (weight defaults to 1). Lone names like "Z" add isolated nodes. */
export function parseGraph(text: string): { graph: Graph; error: string | null } {
  const ids: string[] = []
  const edges: GraphEdge[] = []
  let error: string | null = null
  const addId = (id: string) => { if (!ids.includes(id)) ids.push(id) }
  for (const raw of text.split(/[,;\n]+/)) {
    const tok = raw.trim().toUpperCase()
    if (!tok) continue
    const m = tok.match(/^([A-Z0-9]{1,3})\s*(?:-\s*([A-Z0-9]{1,3})\s*(?::\s*(\d{1,3}))?)?$/)
    if (!m) { error = `Could not read "${raw.trim()}". Use A-B:4`; continue }
    const [, a, b, w] = m
    addId(a)
    if (!b) continue
    if (a === b) { error = `Self-loop ${a}-${b} ignored.`; continue }
    addId(b)
    const existing = edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))
    if (existing) existing.w = Number(w ?? 1)
    else edges.push({ a, b, w: Number(w ?? 1) })
  }
  if (ids.length > 12) { error = 'Max 12 nodes; extra nodes dropped.' }
  const keep = ids.slice(0, 12)
  const graph = { nodes: layoutNodes(keep), edges: edges.filter(e => keep.includes(e.a) && keep.includes(e.b)).slice(0, 30) }
  if (!graph.nodes.length) return { graph: { nodes: layoutNodes(['A']), edges: [] }, error: error ?? 'Graph is empty.' }
  return { graph, error }
}

export function graphToText(g: Graph): string {
  const isolated = g.nodes.filter(n => !g.edges.some(e => e.a === n.id || e.b === n.id)).map(n => n.id)
  return [...g.edges.map(e => `${e.a}-${e.b}:${e.w}`), ...isolated].join(', ')
}

export function randomGraphText(): string {
  const n = 6 + Math.floor(Math.random() * 4)
  const ids = 'ABCDEFGHIJ'.slice(0, n).split('')
  const edges: string[] = []
  const has = new Set<string>()
  const add = (a: string, b: string) => {
    const k = [a, b].sort().join('')
    if (a === b || has.has(k)) return
    has.add(k); edges.push(`${a}-${b}:${1 + Math.floor(Math.random() * 9)}`)
  }
  for (let i = 1; i < n; i++) add(ids[i], ids[Math.floor(Math.random() * i)])
  for (let k = 0; k < Math.floor(n / 2) + 1; k++) add(ids[Math.floor(Math.random() * n)], ids[Math.floor(Math.random() * n)])
  return edges.join(', ')
}

export type GraphStep = {
  visited: string[]
  frontier: string[]
  current: string | null
  activeEdge: [string, string] | null
  treeEdges: [string, string][]
  dist: Record<string, number> | null
  order: string[]
  line: number
  description: string
}

export const graphPseudocode: Record<GraphAlgorithm, string[]> = {
  bfs: [
    'queue = [start]; mark start',
    'while queue not empty',
    '  u = queue.dequeue()',
    '  visit(u)',
    '  for each neighbor v of u',
    '    if v not marked: mark v; enqueue(v)'
  ],
  dfs: [
    'dfs(u):',
    '  mark u; visit(u)',
    '  for each neighbor v of u',
    '    if v not marked',
    '      dfs(v)',
    '  return (backtrack)'
  ],
  dijkstra: [
    'dist[*] = ∞; dist[start] = 0',
    'pq = {start}',
    'while pq not empty',
    '  u = extract-min(pq); settle u',
    '  for each edge (u, v, w)',
    '    if dist[u] + w < dist[v]',
    '      dist[v] = dist[u] + w; pq.add(v)'
  ]
}

export const graphComplexity: Record<GraphAlgorithm, { best: string; average: string; worst: string; space: string }> = {
  bfs: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)' },
  dfs: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)' },
  dijkstra: { best: 'O(E log V)', average: 'O(E log V)', worst: 'O(E log V)', space: 'O(V)' }
}

export function neighbors(graph: Graph, id: string): { v: string; w: number }[] {
  return graph.edges
    .filter(e => e.a === id || e.b === id)
    .map(e => ({ v: e.a === id ? e.b : e.a, w: e.w }))
    .sort((x, y) => x.v.localeCompare(y.v))
}

export function generateGraphSteps(graph: Graph, start: string, algorithm: GraphAlgorithm): GraphStep[] {
  const steps: GraphStep[] = []
  const visited: string[] = []
  const order: string[] = []
  const tree: [string, string][] = []
  let dist: Record<string, number> | null = null
  const push = (frontier: string[], current: string | null, activeEdge: [string, string] | null, line: number, description: string) =>
    steps.push({ visited: [...visited], frontier: [...frontier], current, activeEdge, treeEdges: [...tree], dist: dist ? { ...dist } : null, order: [...order], line, description })

  if (algorithm === 'bfs') {
    const marked = new Set([start])
    const queue = [start]
    push(queue, null, null, 0, `Enqueue start node ${start}.`)
    while (queue.length) {
      push(queue, null, null, 1, `Queue: [${queue.join(', ')}].`)
      const u = queue.shift()!
      push(queue, u, null, 2, `Dequeue ${u}.`)
      visited.push(u); order.push(u)
      push(queue, u, null, 3, `Visit ${u}.`)
      for (const { v } of neighbors(graph, u)) {
        push(queue, u, [u, v], 4, `Inspect edge ${u} — ${v}.`)
        if (!marked.has(v)) {
          marked.add(v); queue.push(v); tree.push([u, v])
          push(queue, u, [u, v], 5, `${v} is new: mark it and enqueue.`)
        }
      }
    }
    push([], null, null, 1, `Queue empty. BFS order: ${order.join(' → ')}.`)
    return steps
  }

  if (algorithm === 'dfs') {
    const marked = new Set<string>()
    const stack: string[] = []
    const dfs = (u: string, parent: string | null) => {
      stack.push(u); marked.add(u); visited.push(u); order.push(u)
      if (parent) tree.push([parent, u])
      push(stack, u, parent ? [parent, u] : null, 1, `Enter ${u}: mark and visit.`)
      for (const { v } of neighbors(graph, u)) {
        push(stack, u, [u, v], 2, `Inspect edge ${u} — ${v}.`)
        if (!marked.has(v)) {
          push(stack, u, [u, v], 4, `${v} is unvisited: recurse into ${v}.`)
          dfs(v, u)
        } else push(stack, u, [u, v], 3, `${v} already visited. Skip.`)
      }
      stack.pop()
      push(stack, stack[stack.length - 1] ?? null, null, 5, `${u} finished. Backtrack.`)
    }
    push([], null, null, 0, `Call dfs(${start}).`)
    dfs(start, null)
    push([], null, null, 5, `DFS order: ${order.join(' → ')}.`)
    return steps
  }

  dist = Object.fromEntries(graph.nodes.map(n => [n.id, Infinity]))
  dist[start] = 0
  const parent: Record<string, string> = {}
  const pq = new Set([start])
  push([...pq], null, null, 0, `All distances ∞ except ${start} = 0.`)
  push([...pq], null, null, 1, `Priority queue: {${start}}.`)
  while (pq.size) {
    push([...pq], null, null, 2, `Queue: {${[...pq].map(v => `${v}:${dist![v]}`).join(', ')}}.`)
    const u = [...pq].reduce((m, v) => (dist![v] < dist![m] ? v : m))
    pq.delete(u)
    visited.push(u); order.push(u)
    if (parent[u]) tree.push([parent[u], u])
    push([...pq], u, parent[u] ? [parent[u], u] : null, 3, `Extract ${u} (dist ${dist[u]}). It is now settled.`)
    for (const { v, w } of neighbors(graph, u)) {
      if (visited.includes(v)) continue
      push([...pq], u, [u, v], 4, `Edge ${u} → ${v}, weight ${w}.`)
      const cand = dist[u] + w
      if (cand < dist[v]) {
        const old = dist[v]
        dist[v] = cand; parent[v] = u; pq.add(v)
        push([...pq], u, [u, v], 6, `${dist[u]} + ${w} = ${cand} < ${old === Infinity ? '∞' : old}: update dist[${v}].`)
      } else push([...pq], u, [u, v], 5, `${dist[u]} + ${w} = ${cand} ≥ ${dist[v]}: no improvement.`)
    }
  }
  push([], null, null, 2, `Done. Shortest distances from ${start} are final.`)
  return steps
}
