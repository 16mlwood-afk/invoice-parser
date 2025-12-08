import React from 'react';
import { render, screen } from '@testing-library/react';
import { ComparisonSummary } from '../comparison-summary';
import { ComparisonReport } from '@/stores/comparison-store';

describe('ComparisonSummary', () => {
  const mockComparison: ComparisonReport = {
    jobIds: ['job1', 'job2', 'job3'],
    results: [],
    summary: {
      totalFields: 10,
      fieldsWithDifferences: 3,
      totalIssues: 5,
      averageConfidence: 0.85,
    },
    generatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  it('should render summary statistics', () => {
    render(<ComparisonSummary comparison={mockComparison} />);

    expect(screen.getByText('Comparison Summary')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Invoices compared
    expect(screen.getByText('10')).toBeInTheDocument(); // Fields compared
    expect(screen.getByText('3')).toBeInTheDocument(); // Fields with differences
    expect(screen.getByText('85.0%')).toBeInTheDocument(); // Average confidence
  });

  it('should show difference percentage', () => {
    render(<ComparisonSummary comparison={mockComparison} />);

    expect(screen.getByText('Fields with Differences (30.0%)')).toBeInTheDocument();
  });

  it('should display issues when present', () => {
    render(<ComparisonSummary comparison={mockComparison} />);

    expect(screen.getByText('5 Issues')).toBeInTheDocument();
  });

  it('should not show issues section when no issues', () => {
    const noIssuesComparison: ComparisonReport = {
      ...mockComparison,
      summary: {
        ...mockComparison.summary,
        totalIssues: 0,
      },
    };

    render(<ComparisonSummary comparison={noIssuesComparison} />);

    expect(screen.queryByText('Issues Found:')).not.toBeInTheDocument();
    expect(screen.getByText('No Issues')).toBeInTheDocument();
  });

  it('should display job IDs', () => {
    render(<ComparisonSummary comparison={mockComparison} />);

    expect(screen.getByText('Compared Job IDs')).toBeInTheDocument();
    expect(screen.getByText('Invoice 1: job1')).toBeInTheDocument();
    expect(screen.getByText('Invoice 2: job2')).toBeInTheDocument();
    expect(screen.getByText('Invoice 3: job3')).toBeInTheDocument();
  });

  it('should format generation timestamp', () => {
    render(<ComparisonSummary comparison={mockComparison} />);

    expect(screen.getByText(/Generated 1\/1\/2024/)).toBeInTheDocument();
  });

  it('should apply correct color coding for confidence', () => {
    render(<ComparisonSummary comparison={mockComparison} />);

    // 85% should be green (high confidence)
    const confidenceElement = screen.getByText('85.0%');
    expect(confidenceElement).toHaveClass('text-green-600');
  });

  it('should apply correct color coding for differences', () => {
    render(<ComparisonSummary comparison={mockComparison} />);

    // Fields with differences should be red
    const differencesElement = screen.getAllByText('3')[1]; // Second occurrence
    expect(differencesElement).toHaveClass('text-red-600');
  });

  it('should handle zero differences', () => {
    const noDifferencesComparison: ComparisonReport = {
      ...mockComparison,
      summary: {
        ...mockComparison.summary,
        fieldsWithDifferences: 0,
      },
    };

    render(<ComparisonSummary comparison={noDifferencesComparison} />);

    const differencesElement = screen.getAllByText('0')[1];
    expect(differencesElement).toHaveClass('text-green-600');
  });

  it('should display export information', () => {
    render(<ComparisonSummary comparison={mockComparison} />);

    expect(screen.getByText('Export includes:')).toBeInTheDocument();
    expect(screen.getByText('Field-by-field comparison results')).toBeInTheDocument();
    expect(screen.getByText('Difference analysis and severity levels')).toBeInTheDocument();
    expect(screen.getByText('Confidence scores and validation issues')).toBeInTheDocument();
  });
});