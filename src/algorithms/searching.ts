export type SearchAlgorithm = 'linear' | 'binary' | 'jump'

export type SearchStep = {
  array: number[]
  checking: number[]
  range: [number, number] | null
  eliminated: number[]
  found: number | null
  line: number
  description: string
}

export const searchPseudocode: Record<SearchAlgorithm, string[]> = {
  linear: [
    'for i = 0 to n - 1',
    '  if A[i] == target',
    '    return i',
    'return -1'
  ],
  binary: [
    'lo = 0, hi = n - 1',
    'while lo <= hi',
    '  mid = (lo + hi) / 2',
    '  if A[mid] == target: return mid',
    '  if A[mid] < target: lo = mid + 1',
    '  else: hi = mid - 1',
    'return -1'
  ],
  jump: [
    'step = √n, prev = 0',
    'while A[min(step, n) - 1] < target',
    '  prev = step; step += √n',
    '  if prev >= n: return -1',
    'for i = prev to min(step, n) - 1',
    '  if A[i] == target: return i',
    'return -1'
  ]
}

export const searchComplexity: Record<SearchAlgorithm, { best: string; average: string; worst: string; space: string }> = {
  linear: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)' },
  binary: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
  jump: { best: 'O(1)', average: 'O(√n)', worst: 'O(√n)', space: 'O(1)' }
}

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i)

export function generateSearchSteps(input: number[], target: number, algorithm: SearchAlgorithm): SearchStep[] {
  const a = algorithm === 'linear' ? [...input] : [...input].sort((x, y) => x - y)
  const n = a.length
  const steps: SearchStep[] = []
  let eliminated: number[] = []
  const push = (checking: number[], r: [number, number] | null, line: number, description: string, found: number | null = null) =>
    steps.push({ array: a, checking, range: r, eliminated: [...eliminated], found, line, description })

  push([], null, 0, algorithm === 'linear'
    ? `Searching for ${target}. Linear search works on unsorted data.`
    : `Array sorted (required for ${algorithm} search). Searching for ${target}.`)

  if (algorithm === 'linear') {
    for (let i = 0; i < n; i++) {
      push([i], null, 1, `Check A[${i}] = ${a[i]}.`)
      if (a[i] === target) { push([i], null, 2, `Found ${target} at index ${i}.`, i); return steps }
      eliminated.push(i)
    }
    push([], null, 3, `${target} is not in the array. Return -1.`)
    return steps
  }

  if (algorithm === 'binary') {
    let lo = 0, hi = n - 1
    while (lo <= hi) {
      push([], [lo, hi], 1, `Search window is [${lo}, ${hi}].`)
      const mid = Math.floor((lo + hi) / 2)
      push([mid], [lo, hi], 2, `mid = ${mid}, A[mid] = ${a[mid]}.`)
      if (a[mid] === target) { push([mid], [lo, hi], 3, `Found ${target} at index ${mid}.`, mid); return steps }
      if (a[mid] < target) {
        eliminated = [...eliminated, ...range(lo, mid + 1)]
        lo = mid + 1
        push([mid], [lo, hi], 4, `${a[mid]} < ${target}: discard the left half, lo = ${lo}.`)
      } else {
        eliminated = [...eliminated, ...range(mid, hi + 1)]
        hi = mid - 1
        push([mid], [lo, hi], 5, `${a[mid]} > ${target}: discard the right half, hi = ${hi}.`)
      }
    }
    push([], null, 6, `Window is empty. ${target} is not in the array.`)
    return steps
  }

  const jump = Math.max(1, Math.floor(Math.sqrt(n)))
  let prev = 0, stepEnd = jump
  push([], [0, Math.min(stepEnd, n) - 1], 0, `Block size = ⌊√${n}⌋ = ${jump}.`)
  while (a[Math.min(stepEnd, n) - 1] < target) {
    const probe = Math.min(stepEnd, n) - 1
    push([probe], [prev, probe], 1, `A[${probe}] = ${a[probe]} < ${target}: jump to the next block.`)
    eliminated = [...eliminated, ...range(prev, probe + 1)]
    prev = stepEnd; stepEnd += jump
    if (prev >= n) { push([], null, 3, `Ran past the end. ${target} is not in the array.`); return steps }
    push([], [prev, Math.min(stepEnd, n) - 1], 2, `Next block is [${prev}, ${Math.min(stepEnd, n) - 1}].`)
  }
  const end = Math.min(stepEnd, n)
  push([end - 1], [prev, end - 1], 1, `A[${end - 1}] = ${a[end - 1]} ≥ ${target}: target must be in this block.`)
  for (let i = prev; i < end; i++) {
    push([i], [prev, end - 1], 5, `Linear scan: check A[${i}] = ${a[i]}.`)
    if (a[i] === target) { push([i], [prev, end - 1], 5, `Found ${target} at index ${i}.`, i); return steps }
    eliminated.push(i)
  }
  push([], null, 6, `${target} is not in the array. Return -1.`)
  return steps
}
