import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import Header from './Header';
import { renderWithTheme } from '../test/renderWithTheme';

describe('Header', () => {
  it('should render the NEXUS branding', () => {
    renderWithTheme(<Header online={true} />);
    expect(screen.getByText('NEXUS')).toBeInTheDocument();
    expect(screen.getByText('Agent Orchestrator')).toBeInTheDocument();
  });

  it('should show SYS:ONLINE when online is true', () => {
    renderWithTheme(<Header online={true} />);
    expect(screen.getByText('SYS:ONLINE')).toBeInTheDocument();
  });

  it('should show SYS:OFFLINE when online is false', () => {
    renderWithTheme(<Header online={false} />);
    expect(screen.getByText('SYS:OFFLINE')).toBeInTheDocument();
  });

  it('should render the text logo mark', () => {
    renderWithTheme(<Header online={true} />);
    expect(screen.getByText('■')).toBeInTheDocument();
  });

  it('should not have an SVG logo', () => {
    const { container } = renderWithTheme(<Header online={true} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });
});
