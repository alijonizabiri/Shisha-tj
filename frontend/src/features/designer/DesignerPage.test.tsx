import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DesignerPage } from './DesignerPage'

describe('DesignerPage', () => {
  it('renders all form fields', () => {
    render(<DesignerPage />)
    expect(screen.getByLabelText('Ширина проёма (мм)')).toBeTruthy()
    expect(screen.getByLabelText('Высота (мм)')).toBeTruthy()
    expect(screen.getByLabelText('Цвет стекла')).toBeTruthy()
    expect(screen.getByLabelText('Цвет фурнитуры')).toBeTruthy()
    expect(screen.getByLabelText('ФИО')).toBeTruthy()
    expect(screen.getByLabelText('Телефон')).toBeTruthy()
  })

  it('hides canvas when measure is empty', () => {
    const { container } = render(<DesignerPage />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('shows canvas after entering a valid measureMm', () => {
    const { container } = render(<DesignerPage />)
    fireEvent.change(screen.getByLabelText('Ширина проёма (мм)'), {
      target: { value: '1560' },
    })
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('warns when TwoGlass fixed panel exceeds 1500 mm', () => {
    render(<DesignerPage />)
    // measureMm=2500 → totalWidth=2540 → fixedMm=1740 > 1500
    fireEvent.change(screen.getByLabelText('Ширина проёма (мм)'), {
      target: { value: '2500' },
    })
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText(/очень широкая/i)).toBeTruthy()
  })

  it('shows no warning for normal TwoGlass width', () => {
    render(<DesignerPage />)
    fireEvent.change(screen.getByLabelText('Ширина проёма (мм)'), {
      target: { value: '1560' },
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders 3 rects after switching to ThreeGlass', async () => {
    const user = userEvent.setup()
    const { container } = render(<DesignerPage />)
    fireEvent.change(screen.getByLabelText('Ширина проёма (мм)'), {
      target: { value: '1800' },
    })
    // userEvent.click on the label span properly triggers the radio change
    await user.click(screen.getByText('3 стекла'))
    // 1800+40=1840 → sides=520, door=800 → 3 panels
    expect(container.querySelectorAll('rect').length).toBe(3)
  })
})
