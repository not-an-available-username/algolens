export type Step = {
  array: number[]
  comparing: number[]
  swapped: number[]
  sorted: number[]
  line: number
  description: string
}

export type Algorithm = 'bubble' | 'selection' | 'insertion' | 'merge'

export const pseudocode: Record<Algorithm, string[]> = {
  bubble: [
    'for i = 0 to n - 1',
    '  for j = 0 to n - i - 2',
    '    if A[j] > A[j + 1]',
    '      swap(A[j], A[j + 1])',
    'return A'
  ],
  selection: [
    'for i = 0 to n - 1',
    '  min = i',
    '  for j = i + 1 to n - 1',
    '    if A[j] < A[min]: min = j',
    '  swap(A[i], A[min])',
    'return A'
  ],
  insertion: [
    'for i = 1 to n - 1',
    '  key = A[i]',
    '  j = i - 1',
    '  while j >= 0 and A[j] > key',
    '    A[j + 1] = A[j]; j--',
    '  A[j + 1] = key',
    'return A'
  ],
  merge: [
    'split array into halves',
    'sort left half recursively',
    'sort right half recursively',
    'merge both sorted halves',
    'return merged array'
  ]
}

export function generateSteps(input: number[], algorithm: Algorithm): Step[] {
  const a = [...input]
  const steps: Step[] = []
  const sorted: number[] = []
  const push = (comparing: number[], swapped: number[], line: number, description: string) =>
    steps.push({ array: [...a], comparing, swapped, sorted: [...sorted], line, description })

  push([], [], 0, 'Initial array loaded. Ready to execute.')
  if (algorithm === 'bubble') {
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a.length - i - 1; j++) {
        push([j, j + 1], [], 2, `Compare ${a[j]} and ${a[j + 1]}.`)
        if (a[j] > a[j + 1]) {
          ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
          push([j, j + 1], [j, j + 1], 3, `Swap: ${a[j + 1]} and ${a[j]}.`)
        }
      }
      sorted.unshift(a.length - i - 1)
      push([], [], 1, `${a[a.length - i - 1]} is now in its final position.`)
    }
  } else if (algorithm === 'selection') {
    for (let i = 0; i < a.length; i++) {
      let min = i
      push([i], [], 1, `Assume ${a[min]} is the minimum.`)
      for (let j = i + 1; j < a.length; j++) {
        push([j, min], [], 3, `Compare ${a[j]} with current minimum ${a[min]}.`)
        if (a[j] < a[min]) { min = j; push([min], [], 3, `${a[min]} is the new minimum.`) }
      }
      if (min !== i) {
        ;[a[i], a[min]] = [a[min], a[i]]
        push([i, min], [i, min], 4, `Place ${a[i]} into position ${i}.`)
      }
      sorted.push(i)
    }
  } else if (algorithm === 'insertion') {
    for (let i = 1; i < a.length; i++) {
      const key = a[i]
      let j = i - 1
      push([i], [], 1, `Store ${key} as the key.`)
      while (j >= 0 && a[j] > key) {
        push([j, j + 1], [], 3, `Shift ${a[j]} one position to the right.`)
        a[j + 1] = a[j]
        push([j, j + 1], [j, j + 1], 4, `Move ${a[j + 1]} to index ${j + 1}.`)
        j--
      }
      a[j + 1] = key
      push([j + 1], [j + 1], 5, `Insert ${key} at index ${j + 1}.`)
    }
    for (let i = 0; i < a.length; i++) sorted.push(i)
  } else {
    const mergeSort = (lo: number, hi: number): void => {
      if (hi - lo <= 1) return
      const mid = Math.floor((lo + hi) / 2)
      mergeSort(lo, mid); mergeSort(mid, hi)
      const left = a.slice(lo, mid), right = a.slice(mid, hi)
      let i = 0, j = 0, k = lo
      while (i < left.length && j < right.length) {
        push([lo + i, mid + j], [], 3, `Compare ${left[i]} and ${right[j]}.`)
        a[k++] = left[i] <= right[j] ? left[i++] : right[j++]
        push([k - 1], [k - 1], 3, `Write ${a[k - 1]} into the merged range.`)
      }
      while (i < left.length) { a[k++] = left[i++]; push([k - 1], [k - 1], 3, `Copy remaining value ${a[k - 1]}.`) }
      while (j < right.length) { a[k++] = right[j++]; push([k - 1], [k - 1], 3, `Copy remaining value ${a[k - 1]}.`) }
    }
    mergeSort(0, a.length)
    for (let i = 0; i < a.length; i++) sorted.push(i)
  }
  push([], [], 0, 'Execution complete. The array is sorted.')
  return steps
}

export const complexity: Record<Algorithm, { best: string; average: string; worst: string; space: string }> = {
  bubble: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  selection: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  insertion: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  merge: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' }
}