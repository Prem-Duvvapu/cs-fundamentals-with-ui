export const CATEGORY_METADATA = {
  os: {
    glyph: '◆',
    shortLabel: 'OS',
    label: 'Operating Systems',
    summary: 'Understand processes, memory, scheduling, synchronization, and the kernel services beneath applications.'
  },
  networking: {
    glyph: '⬡',
    shortLabel: 'NET',
    label: 'Computer Networks',
    summary: 'Follow data from local links through routing, transport, and secure application protocols.'
  },
  dbms: {
    glyph: '▤',
    shortLabel: 'DB',
    label: 'Database Management Systems',
    summary: 'Model data, reason about queries and transactions, then study storage and distributed trade-offs.'
  },
  'java-spring': {
    glyph: '◐',
    shortLabel: 'JAVA',
    label: 'Java & Spring',
    summary: 'Start with Java foundations, then build toward concurrency and Spring application architecture.'
  },
  aiml: {
    glyph: '✳',
    shortLabel: 'AI/ML',
    label: 'AI & Machine Learning',
    summary: 'Connect modern ML foundations to retrieval, serving, evaluation, and production operations.'
  },
  devops: {
    glyph: '⚙',
    shortLabel: 'DEVOPS',
    label: 'DevOps & Infrastructure',
    summary: 'Take a working application to production: containers, orchestration, networking, delivery pipelines, and observability.'
  }
}

// The recommended study sequence — Java/Spring first, then the systems and data foundations
// behind it. Distinct from CATEGORY_METADATA's key order, which is not significant.
export const CATEGORY_ORDER = ['java-spring', 'os', 'networking', 'dbms', 'aiml', 'devops']

export const LEVEL_ORDER = { beginner: 0, intermediate: 1, expert: 2 }
export const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' }
export const LEVEL_GLYPHS = { beginner: '●', intermediate: '◐', expert: '◆' }

export const TOPIC_CATEGORY_MAP = {
  'process-management': 'os',
  'memory-management': 'os',
  'cpu-scheduling': 'os',
  synchronization: 'os',
  deadlocks: 'os',
  'file-systems': 'os',
  'io-systems': 'os',
  'disk-scheduling': 'os',
  'network-fundamentals': 'networking',
  'physical-layer-media': 'networking',
  'osi-model': 'networking',
  'data-link-layer': 'networking',
  'ip-subnetting': 'networking',
  'routing-algorithms': 'networking',
  'tcp-ip': 'networking',
  'tcp-congestion': 'networking',
  'transport-layer-protocols': 'networking',
  'application-layer': 'networking',
  'network-security': 'networking',
  'network-performance-qos': 'networking',
  'dbms-introduction': 'dbms',
  'dbms-architecture': 'dbms',
  'er-model': 'dbms',
  'relational-algebra-calculus': 'dbms',
  'sql-querying': 'dbms',
  'functional-dependencies-keys': 'dbms',
  'database-normalization': 'dbms',
  'dbms-indexing': 'dbms',
  'storage-raid-indexing': 'dbms',
  'transactions-acid': 'dbms',
  'concurrency-control': 'dbms',
  'query-optimization': 'dbms',
  'distributed-databases-cap': 'dbms',
  'java-execution-pipeline': 'java-spring',
  'java-memory-model': 'java-spring',
  'java-oop-pillars': 'java-spring',
  'java-static-final-records': 'java-spring',
  'jvm-gc': 'java-spring',
  'java-functional-lambdas': 'java-spring',
  'java-generics': 'java-spring',
  'java-collections-framework': 'java-spring',
  'java-hashmap-internals': 'java-spring',
  'java-streams-optional': 'java-spring',
  'java-reflection-exceptions': 'java-spring',
  'java-multithreading-concurrency': 'java-spring',
  'spring-bean-lifecycle': 'java-spring',
  'spring-mvc-lifecycle': 'java-spring',
  'jpa-hibernate-lifecycle': 'java-spring',
  'spring-data-jpa-repositories': 'java-spring',
  'spring-batch-lifecycle': 'java-spring',
  'quartz-scheduler': 'java-spring',
  'design-patterns-solid': 'java-spring',
  'spring-boot-internals': 'java-spring',
  'spring-rest-api-design': 'java-spring',
  'spring-security': 'java-spring',
  'spring-caching-async': 'java-spring',
  'spring-testing-production': 'java-spring',
  'event-driven-messaging': 'java-spring',
  'microservices-patterns': 'java-spring',
  'ml-fundamentals': 'aiml',
  'embeddings-vector-db': 'aiml',
  'rag-architecture': 'aiml',
  'model-serving': 'aiml',
  'llm-parameters': 'aiml',
  'feature-stores': 'aiml',
  'recommendation-systems': 'aiml',
  'docker-fundamentals': 'devops',
  'kubernetes-fundamentals': 'devops',
  'nginx-reverse-proxy': 'devops',
  'cicd-pipelines-deployment-strategies': 'devops',
  'cloud-native-operations': 'devops'
}

export function getTopicCategory(topicId, fallback = 'os') {
  return TOPIC_CATEGORY_MAP[topicId] || fallback
}
