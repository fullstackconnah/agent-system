import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import ContainerCard from './ContainerCard';
import { renderWithTheme } from '../test/renderWithTheme';

describe('ContainerCard', () => {
  it('should render Active Agents header', () => {
    renderWithTheme(<ContainerCard containers={[]} />);
    expect(screen.getByText('Active Agents')).toBeInTheDocument();
  });

  it('should show empty state when no containers', () => {
    renderWithTheme(<ContainerCard containers={[]} />);
    expect(screen.getByText(/NO ACTIVE AGENTS/)).toBeInTheDocument();
  });

  it('should show container count', () => {
    renderWithTheme(<ContainerCard containers={[]} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should render container items', () => {
    const containers = [
      { id: 'abc123', name: 'agent-task-1', image: 'claude-agent:latest', status: 'Up 5 minutes' },
      { id: 'def456', name: 'agent-task-2', image: 'claude-agent:latest', status: 'Up 2 minutes' },
    ];
    renderWithTheme(<ContainerCard containers={containers} />);

    expect(screen.getByText('agent-task-1')).toBeInTheDocument();
    expect(screen.getByText('agent-task-2')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should display container image and status', () => {
    const containers = [
      { id: 'abc123', name: 'agent-1', image: 'claude-agent:latest', status: 'Up 10 minutes' },
    ];
    renderWithTheme(<ContainerCard containers={containers} />);
    expect(screen.getByText(/claude-agent:latest/)).toBeInTheDocument();
    expect(screen.getByText(/Up 10 minutes/)).toBeInTheDocument();
  });

  it('should show Running indicator for each container', () => {
    const containers = [
      { id: 'abc', name: 'agent-1', image: 'claude-agent:latest', status: 'Up' },
    ];
    renderWithTheme(<ContainerCard containers={containers} />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('should apply animation delay', () => {
    const { container } = renderWithTheme(<ContainerCard containers={[]} delay={0.3} />);
    const card = container.querySelector('.animate-entrance');
    expect(card.style.animationDelay).toBe('0.3s');
  });
});
