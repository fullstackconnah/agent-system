import { describe, it, expect } from 'vitest';
import { screen, act } from '@testing-library/react';
import StatCard from './StatCard';
import { renderWithTheme } from '../test/renderWithTheme';

describe('StatCard', () => {
  it('should render the zero-padded value and label', () => {
    renderWithTheme(<StatCard type="pending" value={5} label="Pending" />);
    expect(screen.getByText('05')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('should render pending icon', () => {
    renderWithTheme(<StatCard type="pending" value={0} label="Pending" />);
    expect(screen.getByText('▪')).toBeInTheDocument();
  });

  it('should render running icon', () => {
    renderWithTheme(<StatCard type="running" value={0} label="Running" />);
    expect(screen.getByText('●')).toBeInTheDocument();
  });

  it('should render done icon', () => {
    renderWithTheme(<StatCard type="done" value={0} label="Done" />);
    expect(screen.getByText('◆')).toBeInTheDocument();
  });

  it('should render failed icon', () => {
    renderWithTheme(<StatCard type="failed" value={0} label="Failed" />);
    expect(screen.getByText('▲')).toBeInTheDocument();
  });

  it('should apply counter-pop class when value changes', () => {
    const { rerender } = renderWithTheme(<StatCard type="done" value={3} label="Done" />);

    rerender(
      <StatCard type="done" value={4} label="Done" />
    );

    const counter = screen.getByText('04');
    expect(counter.className).toContain('counter-pop');
  });

  it('should not apply counter-pop class when value stays the same', () => {
    const { rerender } = renderWithTheme(<StatCard type="done" value={3} label="Done" />);

    rerender(
      <StatCard type="done" value={3} label="Done" />
    );

    const counter = screen.getByText('03');
    expect(counter.className).not.toContain('counter-pop');
  });

  it('should apply animation delay', () => {
    const { container } = renderWithTheme(<StatCard type="pending" value={0} label="Pending" delay={0.5} />);
    // The ThemeProvider wrapper means container.firstChild is the provider div,
    // so query by class name instead
    const card = container.querySelector('.animate-entrance');
    expect(card).toBeInTheDocument();
    expect(card.style.animationDelay).toBe('0.5s');
  });
});
