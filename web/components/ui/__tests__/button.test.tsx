import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByText('Primary');
    expect(button).toHaveClass('bg-primary');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const button = screen.getByText('Click Me');
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
