/**
 * Java Execution Pipeline Simulation Engine
 * Simulates compilation (javac), ClassLoader Parent Delegation, Bytecode Verifier, and Interpreter/JIT execution.
 */

export class JavaExecutionEngine {
  constructor(sourceCode = 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello Java!");\n  }\n}') {
    this.sourceCode = sourceCode
    this.bytecode = [
      '0: getstatic     #2 // Field java/lang/System.out:Ljava/io/PrintStream;',
      '3: ldc           #3 // String Hello Java!',
      '5: invokevirtual #4 // Method java/io/PrintStream.println:(Ljava/lang/String;)V',
      '8: return'
    ]
    this.classLoaders = [
      { name: 'Application ClassLoader', status: 'DELEGATING_UP', level: 3 },
      { name: 'Platform ClassLoader', status: 'DELEGATING_UP', level: 2 },
      { name: 'Bootstrap ClassLoader', status: 'LOADING_CORE_CLASSES', level: 1 }
    ]
    this.hotspotCount = 0
    this.isJitCompiled = false
    this.output = ''
  }

  cloneState() {
    return {
      sourceCode: this.sourceCode,
      bytecode: [...this.bytecode],
      classLoaders: this.classLoaders.map(c => ({ ...c })),
      hotspotCount: this.hotspotCount,
      isJitCompiled: this.isJitCompiled,
      output: this.output
    }
  }

  getExecutionSteps() {
    const steps = []

    // Step 1: Source Code
    steps.push({
      stage: 'SOURCE',
      title: '1. Java Source Code (.java)',
      description: 'Human-readable Java code written in editor.',
      state: { ...this.cloneState(), output: '' }
    })

    // Step 2: Javac Compilation
    steps.push({
      stage: 'COMPILATION',
      title: '2. javac Compiler (Bytecode Generation)',
      description: 'javac converts high-level Java syntax into JVM-understandable Bytecode (.class file).',
      state: { ...this.cloneState(), output: 'Compiled successfully to Main.class' }
    })

    // Step 3: ClassLoader Delegation
    const loadersDelegating = [
      { name: 'Application ClassLoader', status: 'DELEGATE -> Platform', level: 3 },
      { name: 'Platform ClassLoader', status: 'DELEGATE -> Bootstrap', level: 2 },
      { name: 'Bootstrap ClassLoader', status: 'LOADED java.lang.Object & System', level: 1 }
    ]
    steps.push({
      stage: 'CLASSLOADER',
      title: '3. ClassLoader Parent Delegation Model',
      description: 'Application ClassLoader delegates parent-first to Platform and Bootstrap ClassLoaders before loading Main.class.',
      state: { ...this.cloneState(), classLoaders: loadersDelegating, output: 'Main.class loaded into JVM Metaspace' }
    })

    // Step 4: Bytecode Verification & Memory Initialization
    steps.push({
      stage: 'VERIFIER',
      title: '4. Bytecode Verifier & Runtime Data Area',
      description: 'JVM Bytecode Verifier checks type safety, stack bounds, and memory references. Allocates Metaspace & Stack frame.',
      state: { ...this.cloneState(), output: 'Bytecode verified. Main.main() stack frame pushed.' }
    })

    // Step 5: Execution Engine (Interpreter + JIT)
    steps.push({
      stage: 'EXECUTION',
      title: '5. Execution Engine (Interpreter -> JIT Compiler)',
      description: 'Interpreter executes bytecode instructions sequentially. Hotspot loops (count > 10,000) get JIT compiled to native machine code.',
      state: { ...this.cloneState(), hotspotCount: 10001, isJitCompiled: true, output: 'Hello Java!' }
    })

    return steps
  }
}
