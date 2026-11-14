import { complexity as sortComplexity, pseudocode as sortPseudocode } from './sorting'
import type { Algorithm } from './sorting'
import { searchComplexity, searchPseudocode } from './searching'
import type { SearchAlgorithm } from './searching'
import { graphComplexity, graphPseudocode } from './graph'
import type { GraphAlgorithm } from './graph'
import { dpComplexity, dpPseudocode } from './dp'
import type { DPAlgorithm } from './dp'

export type Category = 'sorting' | 'searching' | 'graph' | 'dp'
export type ModuleId = Algorithm | SearchAlgorithm | GraphAlgorithm | DPAlgorithm
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type Complexity = { best: string; average: string; worst: string; space: string }

export type ModuleDef = {
  id: ModuleId
  category: Category
  en: string
  zh: string
  tagEn: string
  tagZh: string
  complexity: Complexity
  pseudocode: string[]
  difficulty: Difficulty
}

export const categories: { id: Category; en: string; zh: string }[] = [
  { id: 'sorting', en: 'SORTING', zh: '排序演算法' },
  { id: 'searching', en: 'SEARCHING', zh: '搜尋演算法' },
  { id: 'graph', en: 'GRAPH ALGORITHMS', zh: '圖形演算法' },
  { id: 'dp', en: 'DYNAMIC PROGRAMMING', zh: '動態規劃' }
]

const sort = (id: Algorithm, en: string, zh: string): Omit<ModuleDef, 'difficulty'> =>
  ({ id, category: 'sorting', en, zh, tagEn: 'COMPARISON-BASED SORTING', tagZh: '比較式排序', complexity: sortComplexity[id], pseudocode: sortPseudocode[id] })
const search = (id: SearchAlgorithm, en: string, zh: string, tagEn: string, tagZh: string): Omit<ModuleDef, 'difficulty'> =>
  ({ id, category: 'searching', en, zh, tagEn, tagZh, complexity: searchComplexity[id], pseudocode: searchPseudocode[id] })
const graph = (id: GraphAlgorithm, en: string, zh: string, tagEn: string, tagZh: string): Omit<ModuleDef, 'difficulty'> =>
  ({ id, category: 'graph', en, zh, tagEn, tagZh, complexity: graphComplexity[id], pseudocode: graphPseudocode[id] })
const dp = (id: DPAlgorithm, en: string, zh: string, tagEn: string, tagZh: string): Omit<ModuleDef, 'difficulty'> =>
  ({ id, category: 'dp', en, zh, tagEn, tagZh, complexity: dpComplexity[id], pseudocode: dpPseudocode[id] })

export const difficulties: { id: Difficulty; en: string; zh: string }[] = [
  { id: 'beginner', en: 'BEGINNER', zh: '入門' },
  { id: 'intermediate', en: 'INTERMEDIATE', zh: '中級' },
  { id: 'advanced', en: 'ADVANCED', zh: '進階' }
]

const DIFFICULTY: Record<ModuleId, Difficulty> = {
  bubble: 'beginner', selection: 'beginner', insertion: 'beginner', merge: 'intermediate',
  linear: 'beginner', binary: 'intermediate', jump: 'intermediate',
  bfs: 'intermediate', dfs: 'intermediate', dijkstra: 'advanced',
  fib: 'beginner', knapsack: 'advanced', lcs: 'advanced'
}

const base: Omit<ModuleDef, 'difficulty'>[] = [
  sort('bubble', 'Bubble Sort', '氣泡排序'),
  sort('selection', 'Selection Sort', '選擇排序'),
  sort('insertion', 'Insertion Sort', '插入排序'),
  sort('merge', 'Merge Sort', '合併排序'),
  search('linear', 'Linear Search', '線性搜尋', 'SEQUENTIAL SCAN', '循序掃描'),
  search('binary', 'Binary Search', '二分搜尋', 'DIVIDE AND CONQUER / SORTED', '分治法 / 已排序'),
  search('jump', 'Jump Search', '跳躍搜尋', 'BLOCK JUMP / SORTED', '區塊跳躍 / 已排序'),
  graph('bfs', 'Breadth-First Search', '廣度優先搜尋', 'TRAVERSAL / QUEUE', '走訪 / 佇列'),
  graph('dfs', 'Depth-First Search', '深度優先搜尋', 'TRAVERSAL / RECURSION', '走訪 / 遞迴'),
  graph('dijkstra', "Dijkstra's Shortest Path", 'Dijkstra 最短路徑', 'WEIGHTED / PRIORITY QUEUE', '加權 / 優先佇列'),
  dp('fib', 'Fibonacci (Tabulation)', '費氏數列（表格法）', '1D TABLE', '一維表格'),
  dp('knapsack', '0/1 Knapsack', '0/1 背包問題', '2D TABLE / OPTIMIZATION', '二維表格 / 最佳化'),
  dp('lcs', 'Longest Common Subsequence', '最長共同子序列', '2D TABLE / STRINGS', '二維表格 / 字串')
]

export const modules: ModuleDef[] = base.map(m => ({ ...m, difficulty: DIFFICULTY[m.id] }))

export const byCategory = (c: Category) => modules.filter(m => m.category === c)
export const getModule = (id: ModuleId) => modules.find(m => m.id === id)!
