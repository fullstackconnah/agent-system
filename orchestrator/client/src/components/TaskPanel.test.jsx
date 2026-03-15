import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import TaskPanel from './TaskPanel';
import { renderWithTheme } from '../test/renderWithTheme';

describe('TaskPanel', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form fields when open', () => {
    renderWithTheme(<TaskPanel {...defaultProps} />);
    expect(screen.getByText(/NEW TASK/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('What needs to be done?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. agent-system')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe the task in detail...')).toBeInTheDocument();
    expect(screen.getByText('[ EXECUTE ]')).toBeInTheDocument();
  });

  it('should be hidden when not open', () => {
    const { container } = renderWithTheme(<TaskPanel {...defaultProps} open={false} />);
    const overlay = container.firstChild;
    expect(overlay.style.visibility).toBe('hidden');
    expect(overlay.style.opacity).toBe('0');
  });

  it('should call onClose when clicking the overlay', () => {
    const onClose = vi.fn();
    const { container } = renderWithTheme(<TaskPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when pressing Escape', () => {
    const onClose = vi.fn();
    renderWithTheme(<TaskPanel {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking the close button', () => {
    const onClose = vi.fn();
    renderWithTheme(<TaskPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('[ ESC ]'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not submit when required fields are empty', async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('[ EXECUTE ]'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should not submit when only title is filled', async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), {
      target: { value: 'My Task' },
    });
    fireEvent.click(screen.getByText('[ EXECUTE ]'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should submit with all fields filled', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithTheme(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), {
      target: { value: 'Fix login bug' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. agent-system'), {
      target: { value: 'MyProject' },
    });
    fireEvent.change(screen.getByPlaceholderText('Describe the task in detail...'), {
      target: { value: 'The login page crashes on mobile' },
    });

    fireEvent.click(screen.getByText('[ EXECUTE ]'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Fix login bug',
        project: 'MyProject',
        priority: 'medium',
        body: 'The login page crashes on mobile',
      });
    });
  });

  it('should show success feedback after submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithTheme(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), {
      target: { value: 'Task' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. agent-system'), {
      target: { value: 'Project' },
    });
    fireEvent.change(screen.getByPlaceholderText('Describe the task in detail...'), {
      target: { value: 'Description' },
    });

    fireEvent.click(screen.getByText('[ EXECUTE ]'));

    await waitFor(() => {
      expect(screen.getByText('[ TASK QUEUED ✓ ]')).toBeInTheDocument();
    });
  });

  it('should reset title and body after submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithTheme(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);

    const titleInput = screen.getByPlaceholderText('What needs to be done?');
    const bodyInput = screen.getByPlaceholderText('Describe the task in detail...');

    fireEvent.change(titleInput, { target: { value: 'Task' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. agent-system'), { target: { value: 'Proj' } });
    fireEvent.change(bodyInput, { target: { value: 'Desc' } });

    fireEvent.click(screen.getByText('[ EXECUTE ]'));

    await waitFor(() => {
      expect(titleInput.value).toBe('');
      expect(bodyInput.value).toBe('');
    });
  });

  it('should reset project and priority after submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithTheme(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);

    const projectInput = screen.getByPlaceholderText('e.g. agent-system');

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), { target: { value: 'Task' } });
    fireEvent.change(projectInput, { target: { value: 'MyProject' } });
    // Click HIGH priority button
    fireEvent.click(screen.getByText('[ HIGH ]'));
    fireEvent.change(screen.getByPlaceholderText('Describe the task in detail...'), { target: { value: 'Desc' } });

    fireEvent.click(screen.getByText('[ EXECUTE ]'));

    await waitFor(() => {
      expect(projectInput.value).toBe('');
    });
  });

  it('should allow selecting priority via buttons', () => {
    renderWithTheme(<TaskPanel {...defaultProps} />);
    // Priority buttons exist as [ HIGH ], [ MEDIUM ], [ LOW ] in signal theme
    expect(screen.getByText('[ HIGH ]')).toBeInTheDocument();
    expect(screen.getByText('[ MEDIUM ]')).toBeInTheDocument();
    expect(screen.getByText('[ LOW ]')).toBeInTheDocument();
  });

  it('should have three priority buttons', () => {
    renderWithTheme(<TaskPanel {...defaultProps} />);
    const buttons = screen.getAllByText(/\[ (HIGH|MEDIUM|LOW) \]/);
    expect(buttons.length).toBe(3);
  });

  it('should not propagate clicks from the panel to the overlay', () => {
    const onClose = vi.fn();
    renderWithTheme(<TaskPanel {...defaultProps} onClose={onClose} />);

    // Click on the panel body (not the overlay)
    fireEvent.click(screen.getByText('[ EXECUTE ]'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
