import heuristicsConfig from '../../src/icarus/classifier/packet-heuristics'
import test from 'ava'

test('exports proper heuristics', t => {
  // Only way to do it without rewire getting in the way
  t.is(Object.prototype.toString.call(heuristicsConfig), '[object Map]')

  // Heuristic linter
  for (const [fields, heuristics] of heuristicsConfig) {
    for (const field of fields) t.is(typeof field, 'string')
    for (const heuristic of heuristics) t.is(typeof heuristic, 'function')
  }
})

test('min max heuristic', t => {
  // Detect values within [50,100]
  const minmax = heuristicsConfig.__GetDependency__('minmaxH')
  const runHeuristic = minmax(50, 100)
  t.is(runHeuristic(-51), false)
  t.is(runHeuristic(25), false)
  t.is(runHeuristic(49.99), false)
  t.is(runHeuristic(50), true)
  t.is(runHeuristic(75.1254), true)
  t.is(runHeuristic(100), true)
  t.is(runHeuristic(100.01), false)
  t.is(runHeuristic(120), false)

  const runHeuristic2 = minmax(25, 75)
  t.is(runHeuristic2(-51), false)
  t.is(runHeuristic2(25), true)
  t.is(runHeuristic2(49.99), true)
  t.is(runHeuristic2(50), true)
  t.is(runHeuristic2(75.1254), false)
  t.is(runHeuristic2(100), false)
  t.is(runHeuristic2(100.01), false)
  t.is(runHeuristic2(120), false)
})

test('variation heuristic', t => {
  const variation = heuristicsConfig.__GetDependency__('variationH')

  const runHeuristic = variation(10)
  t.is(runHeuristic(10, 20), true)
  t.is(runHeuristic(20, 10), true)
  t.is(runHeuristic(5, 10), true)
  t.is(runHeuristic(10, 5), true)
  t.is(runHeuristic(10, 10), true)
  t.is(runHeuristic(100, 0), false)
  t.is(runHeuristic(0, 100), false)

  const runHeuristic2 = variation(5)
  t.is(runHeuristic2(10, 20), false)
  t.is(runHeuristic2(20, 10), false)
  t.is(runHeuristic2(5, 10), true)
  t.is(runHeuristic2(10, 5), true)
  t.is(runHeuristic2(10, 10), true)
  t.is(runHeuristic2(100, 0), false)
  t.is(runHeuristic2(0, 100), false)
})
