/**
 * Tests for ParsingQualityChecklistComponent
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParsingQualityChecklistComponent } from '../parsing-quality-checklist';

const mockChecklist = {
  overall: {
    score: 85,
    status: 'good',
    criticalFieldsMissing: 1,
    totalFields: 9,
    extractedFields: 8
  },
  fields: {
    orderNumber: {
      status: 'extracted',
      confidence: 100,
      value: '123-4567890-1234567',
      critical: true,
      category: 'order'
    },
    orderDate: {
      status: 'extracted',
      confidence: 95,
      value: '2025-01-01',
      critical: true,
      category: 'order'
    },
    subtotal: {
      status: 'missing',
      confidence: 0,
      value: null,
      critical: true,
      category: 'financial'
    }
  },
  recommendations: [
    'Manual data entry required for critical fields: subtotal',
    'Verify financial calculations if needed for accounting'
  ]
};

describe('ParsingQualityChecklistComponent', () => {
  it('renders overall quality score and status', () => {
    render(<ParsingQualityChecklistComponent checklist={mockChecklist} />);

    expect(screen.getByText('Parsing Quality')).toBeInTheDocument();
    expect(screen.getByText('85% - Good')).toBeInTheDocument();
  });

  it('displays summary statistics', () => {
    render(<ParsingQualityChecklistComponent checklist={mockChecklist} />);

    expect(screen.getByText('8')).toBeInTheDocument(); // extracted fields
    expect(screen.getByText('1')).toBeInTheDocument(); // critical missing
    expect(screen.getByText('9')).toBeInTheDocument(); // total fields
  });

  it('shows recommendations when present', () => {
    render(<ParsingQualityChecklistComponent checklist={mockChecklist} />);

    expect(screen.getByText('Recommendations:')).toBeInTheDocument();
    expect(screen.getByText('Manual data entry required for critical fields: subtotal')).toBeInTheDocument();
  });

  it('expands to show detailed field breakdown', () => {
    render(<ParsingQualityChecklistComponent checklist={mockChecklist} />);

    const expandButton = screen.getByText('Show Details');
    fireEvent.click(expandButton);

    expect(screen.getByText('Critical Fields')).toBeInTheDocument();
    expect(screen.getByText('Order Number')).toBeInTheDocument();
    expect(screen.getByText('Order Date')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
  });

  it('displays field status indicators correctly', () => {
    render(<ParsingQualityChecklistComponent checklist={mockChecklist} />);

    const expandButton = screen.getByText('Show Details');
    fireEvent.click(expandButton);

    // Check that extracted fields show green status
    const extractedStatus = screen.getAllByText('extracted');
    expect(extractedStatus.length).toBeGreaterThan(0);

    // Check that missing fields show red status
    const missingStatus = screen.getByText('missing');
    expect(missingStatus).toBeInTheDocument();
  });

  it('displays confidence scores for each field', () => {
    render(<ParsingQualityChecklistComponent checklist={mockChecklist} />);

    const expandButton = screen.getByText('Show Details');
    fireEvent.click(expandButton);

    expect(screen.getByText('100%')).toBeInTheDocument(); // order number confidence
    expect(screen.getByText('95%')).toBeInTheDocument(); // order date confidence
    expect(screen.getByText('0%')).toBeInTheDocument(); // subtotal confidence
  });

  it('shows correct status colors', () => {
    render(<ParsingQualityChecklistComponent checklist={mockChecklist} />);

    // Check for good status color classes
    const statusBadge = screen.getByText('85% - Good');
    expect(statusBadge).toHaveClass('text-blue-600');
    expect(statusBadge).toHaveClass('bg-blue-50');
  });

  it('handles critical status correctly', () => {
    const criticalChecklist = {
      ...mockChecklist,
      overall: {
        ...mockChecklist.overall,
        score: 25,
        status: 'critical',
        criticalFieldsMissing: 5
      }
    };

    render(<ParsingQualityChecklistComponent checklist={criticalChecklist} />);

    expect(screen.getByText('25% - Critical')).toBeInTheDocument();
  });

  it('handles empty recommendations gracefully', () => {
    const noRecommendationsChecklist = {
      ...mockChecklist,
      recommendations: []
    };

    render(<ParsingQualityChecklistComponent checklist={noRecommendationsChecklist} />);

    expect(screen.queryByText('Recommendations:')).not.toBeInTheDocument();
  });
});