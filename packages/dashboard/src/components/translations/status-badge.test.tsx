import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('renders "Approved" with green styling for approved status', () => {
    render(<StatusBadge status="approved" />);
    const badge = screen.getByText('Approved');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('green');
  });

  it('renders "Draft" with yellow/warning styling for draft status', () => {
    render(<StatusBadge status="draft" />);
    const badge = screen.getByText('Draft');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('yellow');
  });

  it('renders "Review" with purple/info styling for review status', () => {
    render(<StatusBadge status="review" />);
    const badge = screen.getByText('Review');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('purple');
  });

  it('renders "Outdated" with red/danger styling for outdated status', () => {
    render(<StatusBadge status="outdated" />);
    const badge = screen.getByText('Outdated');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('red');
  });

  it('renders all four statuses as distinct labels', () => {
    const { rerender } = render(<StatusBadge status="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();

    rerender(<StatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(<StatusBadge status="review" />);
    expect(screen.getByText('Review')).toBeInTheDocument();

    rerender(<StatusBadge status="outdated" />);
    expect(screen.getByText('Outdated')).toBeInTheDocument();
  });
});
