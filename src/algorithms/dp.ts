export type DPAlgorithm = 'fib' | 'knapsack' | 'lcs'

export type Cell = number | null
export type DPStep = {
  table: Cell[][]
  rowLabels: string[]
  colLabels: string[]
  active: [number, number] | null
  deps: [number, number][]
  line: number
  description: string
}

export const dpPseudocode: Record<DPAlgorithm, string[]> = {
  fib: [
    'F[0] = a, F[1] = b',
    'for i = 2 to n',
    '  F[i] = F[i-1] + F[i-2]',
    'return F[n]'
  ],
  knapsack: [
    'K[0][*] = 0, K[*][0] = 0',
    'for i = 1 to n',
    '  for w = 1 to W',
    '    if wt[i] > w: K[i][w] = K[i-1][w]',
    '    else: K[i][w] = max(K[i-1][w],',
    '              val[i] + K[i-1][w-wt[i]])',
    'return K[n][W]'
  ],
  lcs: [
    'L[i][0] = L[0][j] = 0',
    'for i = 1 to m',
    '  for j = 1 to n',
    '    if X[i] == Y[j]: L[i][j] = L[i-1][j-1] + 1',
    '    else: L[i][j] = max(L[i-1][j], L[i][j-1])',
    'return L[m][n]'
  ]
}

export const dpComplexity: Record<DPAlgorithm, { best: string; average: string; worst: string; space: string }> = {
  fib: { best: 'O(n)', average: 'O(n)', worst: 'O(n)', space: 'O(n)' },
  knapsack: { best: 'O(nW)', average: 'O(nW)', worst: 'O(nW)', space: 'O(nW)' },
  lcs: { best: 'O(mn)', average: 'O(mn)', worst: 'O(mn)', space: 'O(mn)' }
}

export type Item = { w: number; v: number }

export const DP_LIMITS = { fibMax: 30, items: 8, capacity: 20, str: 12 }
export const DEFAULT_ITEMS: Item[] = [{ w: 1, v: 1 }, { w: 3, v: 4 }, { w: 4, v: 5 }, { w: 5, v: 7 }]

export const randomItems = (): Item[] =>
  Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => ({ w: 1 + Math.floor(Math.random() * 6), v: 1 + Math.floor(Math.random() * 12) }))

export const randomString = (len: number, alphabet = 'ABCD') =>
  Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')

export function generateDPSteps(algorithm: DPAlgorithm, opts: { n: number; f0: number; f1: number; items: Item[]; capacity: number; x: string; y: string }): DPStep[] {
  const steps: DPStep[] = []
  let table: Cell[][] = []
  let rowLabels: string[] = [], colLabels: string[] = []
  const push = (active: [number, number] | null, deps: [number, number][], line: number, description: string) =>
    steps.push({ table: table.map(r => [...r]), rowLabels, colLabels, active, deps, line, description })

  if (algorithm === 'fib') {
    const n = Math.max(2, Math.min(DP_LIMITS.fibMax, Math.floor(opts.n)))
    table = [Array(n + 1).fill(null)]
    rowLabels = ['F']; colLabels = Array.from({ length: n + 1 }, (_, i) => String(i))
    table[0][0] = opts.f0; table[0][1] = opts.f1
    push([0, 1], [[0, 0]], 0, `Base cases: F[0] = ${opts.f0}, F[1] = ${opts.f1}.`)
    for (let i = 2; i <= n; i++) {
      push([0, i], [[0, i - 1], [0, i - 2]], 1, `i = ${i}: look up F[${i - 1}] and F[${i - 2}].`)
      table[0][i] = table[0][i - 1]! + table[0][i - 2]!
      push([0, i], [[0, i - 1], [0, i - 2]], 2, `F[${i}] = ${table[0][i - 1]} + ${table[0][i - 2]} = ${table[0][i]}.`)
    }
    push([0, n], [], 3, `Result: F[${n}] = ${table[0][n]}.`)
    return steps
  }

  if (algorithm === 'knapsack') {
    const items = (opts.items.length ? opts.items : [{ w: 1, v: 1 }]).slice(0, DP_LIMITS.items).map(it => ({ w: Math.max(1, Math.floor(it.w) || 1), v: Math.max(0, Math.floor(it.v) || 0) }))
    const W = Math.max(1, Math.min(DP_LIMITS.capacity, Math.floor(opts.capacity)))
    const n = items.length
    table = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: W + 1 }, (_, w) => (i === 0 || w === 0 ? 0 : null)))
    rowLabels = ['∅', ...items.map((it, i) => `#${i + 1} ${it.w}:${it.v}`)]
    colLabels = Array.from({ length: W + 1 }, (_, w) => String(w))
    push(null, [], 0, `Row 0 and column 0 start at 0. Capacity W = ${W}.`)
    for (let i = 1; i <= n; i++) {
      const { w: wt, v: val } = items[i - 1]
      push(null, [], 1, `Consider item ${i} (weight ${wt}, value ${val}).`)
      for (let w = 1; w <= W; w++) {
        if (wt > w) {
          table[i][w] = table[i - 1][w]
          push([i, w], [[i - 1, w]], 3, `w = ${w}: item too heavy, copy ${table[i][w]} from above.`)
        } else {
          const skip = table[i - 1][w]!, take = val + table[i - 1][w - wt]!
          table[i][w] = Math.max(skip, take)
          push([i, w], [[i - 1, w], [i - 1, w - wt]], 4, `w = ${w}: max(skip ${skip}, take ${val} + ${table[i - 1][w - wt]} = ${take}) = ${table[i][w]}.`)
        }
      }
    }
    push([n, W], [], 6, `Best value with capacity ${W}: ${table[n][W]}.`)
    return steps
  }

  const X = (opts.x || 'A').toUpperCase().slice(0, DP_LIMITS.str), Y = (opts.y || 'B').toUpperCase().slice(0, DP_LIMITS.str)
  const m = X.length, n = Y.length
  table = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : null)))
  rowLabels = ['∅', ...X.split('')]; colLabels = ['∅', ...Y.split('')]
  push(null, [], 0, 'First row and column are 0 (empty prefix).')
  for (let i = 1; i <= m; i++) {
    push(null, [], 1, `Row ${i}: prefix X[1..${i}] = "${X.slice(0, i)}".`)
    for (let j = 1; j <= n; j++) {
      if (X[i - 1] === Y[j - 1]) {
        table[i][j] = table[i - 1][j - 1]! + 1
        push([i, j], [[i - 1, j - 1]], 3, `${X[i - 1]} == ${Y[j - 1]}: diagonal + 1 = ${table[i][j]}.`)
      } else {
        table[i][j] = Math.max(table[i - 1][j]!, table[i][j - 1]!)
        push([i, j], [[i - 1, j], [i, j - 1]], 4, `${X[i - 1]} ≠ ${Y[j - 1]}: max(up ${table[i - 1][j]}, left ${table[i][j - 1]}) = ${table[i][j]}.`)
      }
    }
  }
  push([m, n], [], 5, `LCS length of "${X}" and "${Y}" is ${table[m][n]}.`)
  return steps
}
