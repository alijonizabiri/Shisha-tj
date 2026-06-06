import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LeadCombobox } from './LeadCombobox'

// Mock the api module — LeadCombobox calls useDesignerLeads internally
vi.mock('../api', () => ({
  useDesignerLeads: vi.fn(),
}))

import { useDesignerLeads } from '../api'

const mockLeads = [
  { id: '1', name: 'Davron Karimov',  phone: '909909091', status: 'Measurement' },
  { id: '2', name: 'Alisher Nazarov', phone: '938123456', status: 'Buying' },
  { id: '3', name: 'Zara Toshmatova', phone: '900001111', status: 'GlassArrived' },
]

beforeEach(() => {
  vi.mocked(useDesignerLeads).mockReturnValue({
    data: mockLeads,
    isLoading: false,
    isFetching: false,
  } as ReturnType<typeof useDesignerLeads>)
})

describe('LeadCombobox', () => {
  it('filters options by name on input', () => {
    render(<LeadCombobox value="" onChange={vi.fn()} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Davr' } })
    expect(screen.getByText('Davron Karimov')).toBeTruthy()
    expect(screen.queryByText('Alisher Nazarov')).toBeNull()
  })

  it('filters options by phone digits', () => {
    render(<LeadCombobox value="" onChange={vi.fn()} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '938' } })
    expect(screen.getByText('Alisher Nazarov')).toBeTruthy()
    expect(screen.queryByText('Davron Karimov')).toBeNull()
  })

  it('calls onChange with lead id when option is selected', () => {
    const onChange = vi.fn()
    render(<LeadCombobox value="" onChange={onChange} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    // mouseDown fires handleSelect (preventDefault keeps input focused before onChange)
    const option = screen.getAllByRole('option')[0]
    fireEvent.mouseDown(option)
    expect(onChange).toHaveBeenCalledWith('1')
  })

  it('is disabled when disabled prop is true', () => {
    render(<LeadCombobox value="" onChange={vi.fn()} disabled />)
    expect((screen.getByRole('combobox') as HTMLInputElement).disabled).toBe(true)
  })

  it('shows ineligible text when disabled with unknown value', () => {
    render(<LeadCombobox value="unknown-id" onChange={vi.fn()} disabled />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    expect(input.value).toContain('недоступен')
  })
})
