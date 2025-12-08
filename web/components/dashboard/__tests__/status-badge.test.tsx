import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../status-badge';

describe('StatusBadge', () => {
  it.each([
    ['pending', 'Pending', 'bg-yellow-100', 'text-yellow-800'],
    ['processing', 'Processing', 'bg-blue-100', 'text-blue-800'],
    ['completed', 'Completed', 'bg-green-100', 'text-green-800'],
    ['failed', 'Failed', 'bg-red-100', 'text-red-800'],
    ['cancelled', 'Cancelled', 'bg-gray-100', 'text-gray-800'],
    ['uploading', 'Uploading', 'bg-blue-100', 'text-blue-800'],
  ])('renders %s status correctly', (status, expectedText, bgClass, textClass) => {
    render(<StatusBadge status={status as 'pending' | 'processing' | 'completed' | 'failed' | 'uploading' | 'cancelled'} />);

    const badge = screen.getByText(expectedText);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(bgClass, textClass);
  });

  it('applies size classes correctly', () => {
    render(<StatusBadge status="completed" size="sm" />);

    const badge = screen.getByText('Completed');
    expect(badge).toHaveClass('px-2', 'py-1', 'text-xs');
  });

  it('defaults to medium size', () => {
    render(<StatusBadge status="completed" />);

    const badge = screen.getByText('Completed');
    expect(badge).toHaveClass('px-2.5', 'py-0.5', 'text-sm');
  });

  it('renders status text correctly', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders different status texts', () => {
    render(<StatusBadge status="processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });
});
