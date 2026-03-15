import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import TaskCard from './TaskCard';
import { renderWithTheme } from '../test/renderWithTheme';

describe('TaskCard', () => {
  it('should render the title and count', () => {
    renderWithTheme(<TaskCard title="Pending Tasks" status="pending" tasks={[]} count={0} />);
    expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should show empty state when no tasks', () => {
    renderWithTheme(<TaskCard title="Pending Tasks" status="pending" tasks={[]} count={0} />);
    expect(screen.getByText(/NO PENDING TASKS/)).toBeInTheDocument();
  });

  it('should render task items', () => {
    const tasks = [
      { filename: '2024-01-01-fix-login.md', project: 'MyApp', priority: 'high' },
      { filename: '2024-01-02-add-search.md', project: 'MyApp', priority: 'medium' },
    ];
    renderWithTheme(<TaskCard title="Pending Tasks" status="pending" tasks={tasks} count={2} />);

    expect(screen.getByText('fix-login')).toBeInTheDocument();
    expect(screen.getByText('add-search')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should display at most 5 tasks', () => {
    const tasks = Array.from({ length: 8 }, (_, i) => ({
      filename: `2024-01-0${i + 1}-task-${i}.md`,
      project: 'Test',
      priority: 'low',
    }));
    renderWithTheme(<TaskCard title="All" status="pending" tasks={tasks} count={8} />);

    // Should show 5 task items + count badge shows 8
    const items = screen.getAllByText(/task-/);
    expect(items.length).toBe(5);
  });

  it('should strip date prefix and .md extension from filename', () => {
    const tasks = [{ filename: '2024-03-14-implement-auth.md', project: 'App' }];
    renderWithTheme(<TaskCard title="Tasks" status="done" tasks={tasks} count={1} />);
    expect(screen.getByText('implement-auth')).toBeInTheDocument();
  });

  it('should fallback to task.id when filename is missing', () => {
    const tasks = [{ id: 'task-abc', project: 'App' }];
    renderWithTheme(<TaskCard title="Tasks" status="done" tasks={tasks} count={1} />);
    expect(screen.getByText('task-abc')).toBeInTheDocument();
  });

  it('should display project and priority', () => {
    const tasks = [{ filename: '2024-01-01-test.md', project: 'ProjectX', priority: 'high' }];
    renderWithTheme(<TaskCard title="Tasks" status="pending" tasks={tasks} count={1} />);
    expect(screen.getByText('ProjectX')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('should default priority to medium when not specified', () => {
    const tasks = [{ filename: '2024-01-01-test.md', project: 'App' }];
    renderWithTheme(<TaskCard title="Tasks" status="pending" tasks={tasks} count={1} />);
    expect(screen.getByText('MED')).toBeInTheDocument();
  });
});
