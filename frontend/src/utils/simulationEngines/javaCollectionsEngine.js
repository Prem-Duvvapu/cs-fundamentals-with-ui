/**
 * Java Collections Framework & PriorityQueue Heap Internals Engine
 * Simulates ArrayList 1.5x growth, LinkedList nodes, HashSet dummy values, ArrayDeque ring buffer, and PriorityQueue Min-Heap sift operations.
 */

export class JavaCollectionsEngine {
  constructor() {
    this.arrayListState = { capacity: 4, size: 4, elements: ['A', 'B', 'C', 'D'], isResizing: false }
    this.linkedListState = [
      { id: 'node0', item: 'A', prev: 'null', next: 'node1' },
      { id: 'node1', item: 'B', prev: 'node0', next: 'node2' },
      { id: 'node2', item: 'C', prev: 'node1', next: 'null' }
    ]
    this.minHeapState = [10, 25, 15, 30, 40, 50]
    this.auditLog = ''
  }

  cloneState() {
    return {
      arrayListState: { ...this.arrayListState, elements: [...this.arrayListState.elements] },
      linkedListState: this.linkedListState.map(n => ({ ...n })),
      minHeapState: [...this.minHeapState],
      auditLog: this.auditLog
    }
  }

  getExecutionSteps() {
    const steps = []

    // Step 1: ArrayList 1.5x Dynamic Growth
    steps.push({
      stepNumber: 1,
      stage: 'ARRAYLIST_CAPACITY_GROWTH',
      title: '1. ArrayList Dynamic Array 1.5x Growth (Arrays.copyOf)',
      command: 'list.add("E"); // Current size == capacity (4) -> grow(minCapacity)',
      artifact: 'Formula: newCapacity = oldCapacity + (oldCapacity >> 1) = 4 + 2 = 6',
      description: 'When an ArrayList exceeds its internal Object[] elementData capacity, the JVM allocates a brand new contiguous array scaled by 1.5x (oldCapacity + (oldCapacity >> 1)) and copies elements via System.arraycopy().',
      state: { ...this.cloneState(), arrayListState: { capacity: 6, size: 5, elements: ['A', 'B', 'C', 'D', 'E'], isResizing: true }, auditLog: 'ArrayList capacity expanded from 4 to 6.' }
    })

    // Step 2: LinkedList Doubly-Linked Node Pointers
    steps.push({
      stepNumber: 2,
      stage: 'LINKEDLIST_NODES',
      title: '2. LinkedList Doubly-Linked Node Layout',
      command: 'linkedList.addFirst("X"); // O(1) pointer adjustment',
      artifact: 'Node<E>: prev (8B) + item (8B) + next (8B) + Object Header (16B) = 40B per node',
      description: 'LinkedList consists of isolated heap Node objects linked via prev and next pointers. Insertion/deletion at ends is O(1), but memory overhead is heavy (40+ bytes per element) with poor CPU cache locality compared to contiguous arrays.',
      state: { ...this.cloneState(), auditLog: 'Prepended Node("X") with prev=null and next=node0.' }
    })

    // Step 3: HashSet Backed by HashMap
    steps.push({
      stepNumber: 3,
      stage: 'HASHSET_MAP_BACKING',
      title: '3. HashSet Backed by HashMap (Dummy PRESENT Value)',
      command: 'set.add("Apple"); // map.put("Apple", PRESENT) == null',
      artifact: 'Internal Field: private static final Object PRESENT = new Object();',
      description: 'HashSet does not implement hashing directly; it delegates all operations to an internal HashMap<E, Object> instance where set elements are stored as HashMap Keys and the value is always a shared static dummy Object (PRESENT).',
      state: { ...this.cloneState(), auditLog: 'HashSet stored key "Apple" pointing to static PRESENT dummy object.' }
    })

    // Step 4: ArrayDeque Ring Buffer Bitwise Indexing
    steps.push({
      stepNumber: 4,
      stage: 'ARRAYDEQUE_RING_BUFFER',
      title: '4. ArrayDeque Circular Ring Buffer (Bitwise Modulo)',
      command: 'deque.addFirst("Head"); // head = (head - 1) & (elements.length - 1)',
      artifact: 'Circular Indexing: Bitwise AND replaces expensive modulo operator',
      description: 'ArrayDeque operates as a circular ring buffer without node allocations. Because array capacity is always a power of 2, head and tail pointers wrap around instantly using bitwise AND ((head - 1) & mask), outperforming LinkedList as both a Stack and a Queue.',
      state: { ...this.cloneState(), auditLog: 'ArrayDeque head pointer updated circularly via bitwise mask.' }
    })

    // Step 5: PriorityQueue Binary Min-Heap Sift-Up
    this.minHeapState.push(5) // Insert 5 at end, will sift up to root!
    steps.push({
      stepNumber: 5,
      stage: 'PRIORITY_QUEUE_HEAP',
      title: '5. PriorityQueue Binary Min-Heap (siftUp / siftDown)',
      command: 'pq.offer(5); // Sifts up from index 6 to root index 0',
      artifact: 'Min-Heap Invariant: parentIndex = (k - 1) >>> 1; elements[parent] <= elements[child]',
      description: 'PriorityQueue stores elements in a contiguous array representing a Complete Binary Tree. Offering a new element places it at the tail and executes siftUp() with O(log N) comparisons until the Min-Heap property (parent <= child) is restored.',
      state: { ...this.cloneState(), minHeapState: [5, 25, 10, 30, 40, 50, 15], auditLog: 'Element 5 sifted up to root position (index 0).' }
    })

    return steps
  }
}
