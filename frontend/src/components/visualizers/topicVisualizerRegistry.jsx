import { lazy } from 'react'

const SchedulingVisualizer = lazy(() => import('./SchedulingVisualizer'))
const ProcessLifecycleVisualizer = lazy(() => import('./ProcessLifecycleVisualizer'))
const MemoryVisualizer = lazy(() => import('./MemoryVisualizer'))
const SynchronizationVisualizer = lazy(() => import('./SynchronizationVisualizer'))
const DeadlockVisualizer = lazy(() => import('./DeadlockVisualizer'))
const NetworkingVisualizer = lazy(() => import('./NetworkingVisualizer'))
const DbmsVisualizer = lazy(() => import('./DbmsVisualizer'))
const AiMlVisualizer = lazy(() => import('./AiMlVisualizer'))
const JavaSpringVisualizer = lazy(() => import('./JavaSpringVisualizer'))
const FileSystemVisualizer = lazy(() => import('./os/FileSystemVisualizer'))
const IoSystemsVisualizer = lazy(() => import('./os/IoSystemsVisualizer'))
const DiskSchedulingVisualizer = lazy(() => import('./os/DiskSchedulingVisualizer'))
const HashMapVisualizer = lazy(() => import('./java/HashMapVisualizer'))
const VirtualThreadsVisualizer = lazy(() => import('./java/VirtualThreadsVisualizer'))
const ConnectionPoolVisualizer = lazy(() => import('./java/ConnectionPoolVisualizer'))

const EMPTY_PROPS = Object.freeze({})

const direct = Visualizer => Object.freeze({ Visualizer, props: EMPTY_PROPS })

const hub = (Visualizer, topicId) => Object.freeze({
  Visualizer,
  props: Object.freeze({ defaultTopicId: topicId })
})

const registry = Object.freeze({
  'process-management': direct(ProcessLifecycleVisualizer),
  'memory-management': direct(MemoryVisualizer),
  'cpu-scheduling': direct(SchedulingVisualizer),
  synchronization: direct(SynchronizationVisualizer),
  deadlocks: direct(DeadlockVisualizer),
  'file-systems': direct(FileSystemVisualizer),
  'io-systems': direct(IoSystemsVisualizer),
  'disk-scheduling': direct(DiskSchedulingVisualizer),

  'network-fundamentals': hub(NetworkingVisualizer, 'network-fundamentals'),
  'physical-layer-media': hub(NetworkingVisualizer, 'physical-layer-media'),
  'osi-model': hub(NetworkingVisualizer, 'osi-model'),
  'data-link-layer': hub(NetworkingVisualizer, 'data-link-layer'),
  'ip-subnetting': hub(NetworkingVisualizer, 'ip-subnetting'),
  'routing-algorithms': hub(NetworkingVisualizer, 'routing-algorithms'),
  'tcp-ip': hub(NetworkingVisualizer, 'tcp-ip'),
  'tcp-congestion': hub(NetworkingVisualizer, 'tcp-congestion'),
  'transport-layer-protocols': hub(NetworkingVisualizer, 'transport-layer-protocols'),
  'application-layer': hub(NetworkingVisualizer, 'application-layer'),
  'network-performance-qos': hub(NetworkingVisualizer, 'network-performance-qos'),

  'relational-algebra-calculus': hub(DbmsVisualizer, 'relational-algebra-calculus'),
  'functional-dependencies-keys': hub(DbmsVisualizer, 'functional-dependencies-keys'),
  'database-normalization': hub(DbmsVisualizer, 'database-normalization'),
  'dbms-indexing': hub(DbmsVisualizer, 'dbms-indexing'),
  'concurrency-control': hub(DbmsVisualizer, 'concurrency-control'),
  // distributed-databases-cap has no dedicated engine of its own; it reuses the retained
  // consistent-hashing engine, the one part of its lesson that materially benefits from
  // an interactive simulation (see P3 audit checkpoint in plan.md).
  'distributed-databases-cap': hub(NetworkingVisualizer, 'distributed-databases-cap'),

  'java-execution-pipeline': hub(JavaSpringVisualizer, 'java-execution-pipeline'),
  'java-memory-model': hub(JavaSpringVisualizer, 'java-memory-model'),
  'java-oop-pillars': hub(JavaSpringVisualizer, 'java-oop-pillars'),
  'java-static-final-records': hub(JavaSpringVisualizer, 'java-static-final-records'),
  'jvm-gc': hub(JavaSpringVisualizer, 'jvm-gc'),
  'java-functional-lambdas': hub(JavaSpringVisualizer, 'java-functional-lambdas'),
  'java-generics': hub(JavaSpringVisualizer, 'java-generics'),
  'java-collections-framework': hub(JavaSpringVisualizer, 'java-collections-framework'),
  'java-hashmap-internals': direct(HashMapVisualizer),
  'java-streams-optional': hub(JavaSpringVisualizer, 'java-streams-optional'),
  'java-multithreading-concurrency': direct(VirtualThreadsVisualizer),
  'spring-bean-lifecycle': hub(JavaSpringVisualizer, 'spring-bean-lifecycle'),
  'spring-mvc-lifecycle': hub(JavaSpringVisualizer, 'spring-mvc-lifecycle'),
  'jpa-hibernate-lifecycle': hub(JavaSpringVisualizer, 'jpa-hibernate-lifecycle'),
  'spring-batch-lifecycle': hub(JavaSpringVisualizer, 'spring-batch-lifecycle'),
  'quartz-scheduler': hub(JavaSpringVisualizer, 'quartz-scheduler'),
  'design-patterns-solid': hub(JavaSpringVisualizer, 'design-patterns-solid'),
  'spring-testing-production': direct(ConnectionPoolVisualizer),

  'embeddings-vector-db': hub(AiMlVisualizer, 'embeddings-vector-db'),
  'rag-architecture': hub(AiMlVisualizer, 'rag-architecture'),
  'model-serving': hub(AiMlVisualizer, 'model-serving'),
  'llm-parameters': hub(AiMlVisualizer, 'llm-parameters'),
  'feature-stores': hub(AiMlVisualizer, 'feature-stores'),
  'recommendation-systems': hub(AiMlVisualizer, 'recommendation-systems')
})

export const SUPPORTED_VISUALIZER_TOPIC_IDS = Object.freeze(Object.keys(registry).sort())

export function hasTopicVisualizer(topicId) {
  return Object.hasOwn(registry, topicId)
}

export function getTopicVisualizer(topicId) {
  return registry[topicId] ?? null
}

export function TopicVisualizer({ topicId }) {
  const config = getTopicVisualizer(topicId)
  if (!config) return null

  const { Visualizer, props } = config
  return <Visualizer {...props} />
}
