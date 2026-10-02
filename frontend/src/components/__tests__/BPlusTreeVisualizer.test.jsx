import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BPlusTreeVisualizer from '../visualizers/dbms/BPlusTreeVisualizer'
import legacy from '../../data/dbms-concepts-bplus-tree.json'

vi.mock('../shared/ConceptModuleShell', () => ({
  default: ({ subtitle, theoryData, quizData, simulationComponent }) => <>
    <p>{subtitle}</p><p>{theoryData.interviewQA[2].a}</p>
    {quizData.map(item => <div key={item.question}><p>{item.question}</p><p>{item.answer}</p></div>)}
    {simulationComponent}
  </>
}))
afterEach(cleanup)

describe('B+ tree teaching boundaries', () => {
  it('distinguishes logical visits, coverage and the toy split model while preserving legacy provenance', () => {
    render(<BPlusTreeVisualizer />)
    expect(screen.getByText(/database pages, MVCC and device latency are not simulated/)).toBeInTheDocument()
    expect(screen.getByText(/index-only scans can therefore report heap fetches/)).toBeInTheDocument()
    expect(screen.getByText(/Separator 25 is copied into the parent/)).toBeInTheDocument()
    expect(screen.getByText(/device-read count can be zero/)).toBeInTheDocument()
    expect(screen.getByText('Why can random UUIDv4 primary keys hurt an InnoDB index workload?')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Tree order' })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Tree key' })).toBeInTheDocument()
    expect(legacy.bplusTree.quizData[1].question).toContain('sequential random')
  })
})
