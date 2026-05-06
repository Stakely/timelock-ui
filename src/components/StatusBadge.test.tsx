import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'
import { OperationState } from '../lib/timelock'

describe('<StatusBadge />', () => {
  it('renders the label "Unset"', () => {
    render(<StatusBadge state={OperationState.Unset} />)
    expect(screen.getByText('Unset')).toBeInTheDocument()
  })

  it('renders the label "Waiting"', () => {
    render(<StatusBadge state={OperationState.Waiting} />)
    expect(screen.getByText('Waiting')).toBeInTheDocument()
  })

  it('renders the label "Ready"', () => {
    render(<StatusBadge state={OperationState.Ready} />)
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('renders the label "Done"', () => {
    render(<StatusBadge state={OperationState.Done} />)
    expect(screen.getByText('Done')).toBeInTheDocument()
  })
})
