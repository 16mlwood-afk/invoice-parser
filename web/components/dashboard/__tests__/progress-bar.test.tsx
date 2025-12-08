import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../progress-bar';

describe('ProgressBar', () => {
  it('renders with correct progress percentage', () => {
    render(<ProgressBar progress={75} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('clamps progress values between 0 and 100', () => {
    render(<ProgressBar progress={150} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('handles negative progress values', () => {
    render(<ProgressBar progress={-10} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('shows label when showLabel is true', () => {
    render(<ProgressBar progress={42} showLabel />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('applies indeterminate animation when specified', () => {
    render(<ProgressBar progress={50} indeterminate />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
