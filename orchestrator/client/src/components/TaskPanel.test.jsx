import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskPanel from './TaskPanel';

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
    render(<TaskPanel {...defaultProps} />);
    expect(screen.getByText('New Task')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('What needs to be done?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. TripCore')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe the task in detail...')).toBeInTheDocument();
    expect(screen.getByText('Submit Task')).toBeInTheDocument();
  });

  it('should be hidden when not open', () => {
    const { container } = render(<TaskPanel {...defaultProps} open={false} />);
    const overlay = container.firstChild;
    expect(overlay.style.visibility).toBe('hidden');
    expect(overlay.style.opacity).toBe('0');
  });

  it('should call onClose when clicking the overlay', () => {
    const onClose = vi.fn();
    const { container } = render(<TaskPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when pressing Escape', () => {
    const onClose = vi.fn();
    render(<TaskPanel {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking the close button', () => {
    const onClose = vi.fn();
    render(<TaskPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not submit when required fields are empty', async () => {
    const onSubmit = vi.fn();
    render(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Submit Task'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should not submit when only title is filled', async () => {
    const onSubmit = vi.fn();
    render(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), {
      target: { value: 'My Task' },
    });
    fireEvent.click(screen.getByText('Submit Task'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should submit with all fields filled', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), {
      target: { value: 'Fix login bug' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. TripCore'), {
      target: { value: 'MyProject' },
    });
    fireEvent.change(screen.getByPlaceholderText('Describe the task in detail...'), {
      target: { value: 'The login page crashes on mobile' },
    });

    fireEvent.click(screen.getByText('Submit Task'));

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
    render(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), {
      target: { value: 'Task' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. TripCore'), {
      target: { value: 'Project' },
    });
    fireEvent.change(screen.getByPlaceholderText('Describe the task in detail...'), {
      target: { value: 'Description' },
    });

    fireEvent.click(screen.getByText('Submit Task'));

    await waitFor(() => {
      expect(screen.getByText('✓ Task queued successfully')).toBeInTheDocument();
    });
  });

  it('should reset title and body after submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);

    const titleInput = screen.getByPlaceholderText('What needs to be done?');
    const bodyInput = screen.getByPlaceholderText('Describe the task in detail...');

    fireEvent.change(titleInput, { target: { value: 'Task' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. TripCore'), { target: { value: 'Proj' } });
    fireEvent.change(bodyInput, { target: { value: 'Desc' } });

    fireEvent.click(screen.getByText('Submit Task'));

    await waitFor(() => {
      expect(titleInput.value).toBe('');
      expect(bodyInput.value).toBe('');
    });
  });

  it('should reset project and priority after submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskPanel {...defaultProps} onSubmit={onSubmit} />);

    const projectInput = screen.getByPlaceholderText('e.g. TripCore');
    const prioritySelect = screen.getByDisplayValue('Medium');

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), { target: { value: 'Task' } });
    fireEvent.change(projectInput, { target: { value: 'MyProject' } });
    fireEvent.change(prioritySelect, { target: { value: 'high' } });
    fireEvent.change(screen.getByPlaceholderText('Describe the task in detail...'), { target: { value: 'Desc' } });

    fireEvent.click(screen.getByText('Submit Task'));

    await waitFor(() => {
      expect(projectInput.value).toBe('');
      expect(prioritySelect.value).toBe('medium');
    });
  });

  it('should allow selecting priority', () => {
    render(<TaskPanel {...defaultProps} />);
    const select = screen.getByDisplayValue('Medium');
    fireEvent.change(select, { target: { value: 'high' } });
    expect(select.value).toBe('high');
  });

  it('should have three priority options', () => {
    render(<TaskPanel {...defaultProps} />);
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.value)).toEqual(['high', 'medium', 'low']);
  });

  it('should not propagate clicks from the panel to the overlay', () => {
    const onClose = vi.fn();
    render(<TaskPanel {...defaultProps} onClose={onClose} />);

    // Click on the panel body (not the overlay)
    fireEvent.click(screen.getByText('Submit Task'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
