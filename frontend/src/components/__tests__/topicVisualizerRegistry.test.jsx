import { describe, expect, it } from 'vitest'
import {
  SUPPORTED_VISUALIZER_TOPIC_IDS,
  TopicVisualizer,
  getTopicVisualizer,
  hasTopicVisualizer
} from '../visualizers/topicVisualizerRegistry'

const EXPECTED_SUPPORTED_IDS = [
  'application-layer',
  'concurrency-control',
  'cpu-scheduling',
  'data-link-layer',
  'database-normalization',
  'dbms-indexing',
  'deadlocks',
  'disk-scheduling',
  'distributed-databases-cap',
  'embeddings-vector-db',
  'feature-stores',
  'file-systems',
  'functional-dependencies-keys',
  'ip-subnetting',
  'java-collections-framework',
  'java-execution-pipeline',
  'java-functional-lambdas',
  'java-generics',
  'java-hashmap-internals',
  'java-memory-model',
  'java-multithreading-concurrency',
  'java-oop-pillars',
  'java-static-final-records',
  'java-streams-optional',
  'jpa-hibernate-lifecycle',
  'jvm-gc',
  'llm-parameters',
  'memory-management',
  'model-serving',
  'network-fundamentals',
  'network-performance-qos',
  'osi-model',
  'physical-layer-media',
  'process-management',
  'quartz-scheduler',
  'rag-architecture',
  'recommendation-systems',
  'relational-algebra-calculus',
  'routing-algorithms',
  'spring-batch-lifecycle',
  'spring-bean-lifecycle',
  'spring-mvc-lifecycle',
  'spring-testing-production',
  'synchronization',
  'tcp-congestion',
  'tcp-ip',
  'transport-layer-protocols'
]

const UNSUPPORTED_REGISTERED_IDS = [
  'network-security',
  'sql-querying',
  'java-reflection-exceptions',
  'spring-boot-internals',
  'spring-rest-api-design',
  'spring-security',
  'spring-caching-async',
  'ml-fundamentals',
  'dbms-architecture',
  'dbms-introduction',
  'er-model',
  'query-optimization',
  'storage-raid-indexing',
  'transactions-acid',
  'io-systems',
  'design-patterns-solid'
]

describe('topic visualizer registry', () => {
  it('publishes the exact registered topics with a relevant simulation', () => {
    expect(SUPPORTED_VISUALIZER_TOPIC_IDS).toEqual(EXPECTED_SUPPORTED_IDS)
    expect(Object.isFrozen(SUPPORTED_VISUALIZER_TOPIC_IDS)).toBe(true)
  })

  it.each(UNSUPPORTED_REGISTERED_IDS)('does not route %s to an unrelated fallback', topicId => {
    expect(hasTopicVisualizer(topicId)).toBe(false)
    expect(getTopicVisualizer(topicId)).toBeNull()
    expect(TopicVisualizer({ topicId })).toBeNull()
  })

  it.each(['os', 'networking', 'dbms', 'java-spring', 'aiml', 'java-oop-vtable'])(
    'does not expose the legacy alias %s as a topic simulation',
    topicId => {
      expect(hasTopicVisualizer(topicId)).toBe(false)
    }
  )

  it('keeps hub configuration immutable and stable between reads', () => {
    const first = getTopicVisualizer('dbms-indexing')
    const second = getTopicVisualizer('dbms-indexing')

    expect(first).toBe(second)
    expect(first.props).toEqual({ defaultTopicId: 'dbms-indexing' })
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.props)).toBe(true)
  })

  it.each([
    'java-hashmap-internals',
    'java-multithreading-concurrency',
    'spring-testing-production'
  ])('uses a standalone retained experience for %s', topicId => {
    const config = getTopicVisualizer(topicId)

    expect(config).not.toBeNull()
    expect(config.props).toEqual({})
    expect(TopicVisualizer({ topicId }).type).toBe(config.Visualizer)
  })

  it('passes the exact topic id into a hub renderer', () => {
    const config = getTopicVisualizer('tcp-congestion')
    const element = TopicVisualizer({ topicId: 'tcp-congestion' })

    expect(element.type).toBe(config.Visualizer)
    expect(element.props).toEqual({ defaultTopicId: 'tcp-congestion' })
  })
})
