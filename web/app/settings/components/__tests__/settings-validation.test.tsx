import React from 'react';
import { render, screen } from '@testing-library/react';
import { ValidationErrors, ValidationSummary } from '../settings-validation';

// Mock the settings store
jest.mock('../../../../stores', () => ({
  useSettingsStore: jest.fn(),
}));

import { useSettingsStore } from '../../../../stores';

const mockUseSettingsStore = useSettingsStore as jest.MockedFunction<typeof useSettingsStore>;

describe('Settings Validation Components', () => {
  beforeEach(() => {
    mockUseSettingsStore.mockReturnValue({
      getValidationErrors: jest.fn().mockReturnValue({}),
    } as any);
  });

  describe('ValidationErrors', () => {
    it('renders nothing when there are no errors', () => {

      const { container } = render(<ValidationErrors tab="parser" />);
      expect(container.firstChild).toBeNull();
    });

    it('renders parser errors when they exist', () => {
      (mockUseSettingsStore as jest.Mock).mockReturnValue({
        getValidationErrors: jest.fn().mockReturnValue({
          parser: ['Region is required', 'Currency is invalid'],
        }),
      });

      render(<ValidationErrors tab="parser" />);

      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
      expect(screen.getByText('Region is required')).toBeInTheDocument();
      expect(screen.getByText('Currency is invalid')).toBeInTheDocument();
    });

    it('renders UI errors when they exist', () => {
      (mockUseSettingsStore as jest.Mock).mockReturnValue({
        getValidationErrors: jest.fn().mockReturnValue({
          ui: ['Theme is required'],
        }),
      });

      render(<ValidationErrors tab="ui" />);

      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
      expect(screen.getByText('Theme is required')).toBeInTheDocument();
    });

    it('renders export errors when they exist', () => {
      (mockUseSettingsStore as jest.Mock).mockReturnValue({
        getValidationErrors: jest.fn().mockReturnValue({
          export: ['Format is required'],
        }),
      });

      render(<ValidationErrors tab="export" />);

      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
      expect(screen.getByText('Format is required')).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
      (mockUseSettingsStore as jest.Mock).mockReturnValue({
        getValidationErrors: jest.fn().mockReturnValue({
          parser: ['Error message'],
        }),
      });

      render(<ValidationErrors tab="parser" />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('renders error IDs for accessibility', () => {
      (mockUseSettingsStore as jest.Mock).mockReturnValue({
        getValidationErrors: jest.fn().mockReturnValue({
          parser: ['First error', 'Second error'],
        }),
      });

      render(<ValidationErrors tab="parser" />);

      expect(screen.getByText('First error')).toHaveAttribute('id', 'error-parser-0');
      expect(screen.getByText('Second error')).toHaveAttribute('id', 'error-parser-1');
    });

    it('renders error icon', () => {
      (mockUseSettingsStore as jest.Mock).mockReturnValue({
        getValidationErrors: jest.fn().mockReturnValue({
          parser: ['Error'],
        }),
      });

      render(<ValidationErrors tab="parser" />);

      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('ValidationSummary', () => {
    it('renders nothing when there are no errors', () => {

      const { container } = render(<ValidationSummary />);
      expect(container.firstChild).toBeNull();
    });

    it('renders summary with single error', () => {
      (mockUseSettingsStore as jest.Mock).mockReturnValue({
        getValidationErrors: jest.fn().mockReturnValue({
          parser: ['Error message'],
        }),
      });

      render(<ValidationSummary />);

      expect(screen.getByText('1 validation error found in: parser')).toBeInTheDocument();
    });

    it('renders summary with multiple errors across tabs', () => {
      (mockUseSettingsStore as jest.Mock).mockReturnValue({
        getValidationErrors: jest.fn().mockReturnValue({
          parser: ['Error 1', 'Error 2'],
          ui: ['Error 3'],
          export: ['Error 4', 'Error 5'],
        }),
      });

      render(<ValidationSummary />);

      expect(screen.getByText('5 validation errors found in: parser, ui, export')).toBeInTheDocument();
    });

    it('renders warning icon', () => {
      (mockUseSettingsStore as jest.Mock).mockReturnValue({
        getValidationErrors: jest.fn().mockReturnValue({
          parser: ['Error'],
        }),
      });

      render(<ValidationSummary />);

      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('applies custom className', () => {
      mockUseSettingsStore.mockReturnValue({
        getValidationErrors: jest.fn().mockReturnValue({
          parser: ['Error'],
        }),
      } as any);

      const { container } = render(<ValidationSummary className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('handles pluralization correctly', () => {
      (mockUseSettingsStore as jest.Mock).mockReturnValue({
        getValidationErrors: jest.fn().mockReturnValue({
          parser: ['Error 1', 'Error 2'],
        }),
      });

      render(<ValidationSummary />);

      expect(screen.getByText('2 validation errors found in: parser')).toBeInTheDocument();
    });
  });
});