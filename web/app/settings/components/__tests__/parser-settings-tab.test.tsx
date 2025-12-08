import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParserSettingsTab } from '../parser-settings-tab';

// Mock the settings store
jest.mock('../../../../stores', () => ({
  useSettingsStore: jest.fn(),
}));

import { useSettingsStore } from '../../../../stores';

const mockUseSettingsStore = useSettingsStore as jest.MockedFunction<typeof useSettingsStore>;

describe('ParserSettingsTab', () => {
  const mockSettings = {
    parser: {
      defaultRegion: 'us' as const,
      currency: 'USD' as const,
      dateFormat: 'MM/DD/YYYY' as const,
      language: 'en' as const,
      validation: {
        strictMode: false,
        confidenceThreshold: 0.7,
      },
    },
    ui: {
      theme: 'system' as const,
      language: 'en' as const,
      itemsPerPage: 25 as const,
      autoRefresh: true,
      showConfidenceScores: true,
      tableDensity: 'comfortable' as const,
    },
    export: {
      defaultFormat: 'json' as const,
      includeValidation: true,
      includeMetadata: true,
      csvDelimiter: ',' as const,
    },
  };

  const mockUpdateParserSettings = jest.fn();

  beforeEach(() => {
    mockUseSettingsStore.mockReturnValue({
      settings: mockSettings,
      updateParserSettings: mockUpdateParserSettings,
      getValidationErrors: jest.fn().mockReturnValue({}),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all parser settings controls', () => {
    render(<ParserSettingsTab />);

    expect(screen.getByLabelText(/Default Parser Region/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Default Currency/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date Format/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Parser Language/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Strict validation mode/)).toBeInTheDocument();
    expect(screen.getByText(/Confidence Threshold/)).toBeInTheDocument();
  });

  it('displays current settings values', () => {
    render(<ParserSettingsTab />);

    expect(screen.getByDisplayValue('United States')).toBeInTheDocument();
    expect(screen.getByDisplayValue('US Dollar ($)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MM/DD/YYYY (US)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('English')).toBeInTheDocument();
  });

  it('updates default region when selection changes', () => {
    render(<ParserSettingsTab />);

    const regionSelect = screen.getByLabelText(/Default Parser Region/);
    fireEvent.change(regionSelect, { target: { value: 'eu' } });

    expect(mockUpdateParserSettings).toHaveBeenCalledWith({ defaultRegion: 'eu' });
  });

  it('updates currency when selection changes', () => {
    render(<ParserSettingsTab />);

    const currencySelect = screen.getByLabelText(/Default Currency/);
    fireEvent.change(currencySelect, { target: { value: 'EUR' } });

    expect(mockUpdateParserSettings).toHaveBeenCalledWith({ currency: 'EUR' });
  });

  it('updates date format when selection changes', () => {
    render(<ParserSettingsTab />);

    const dateFormatSelect = screen.getByLabelText(/Date Format/);
    fireEvent.change(dateFormatSelect, { target: { value: 'DD/MM/YYYY' } });

    expect(mockUpdateParserSettings).toHaveBeenCalledWith({ dateFormat: 'DD/MM/YYYY' });
  });

  it('updates language when selection changes', () => {
    render(<ParserSettingsTab />);

    const languageSelect = screen.getByLabelText(/Parser Language/);
    fireEvent.change(languageSelect, { target: { value: 'de' } });

    expect(mockUpdateParserSettings).toHaveBeenCalledWith({ language: 'de' });
  });

  it('updates strict mode when checkbox is toggled', () => {
    render(<ParserSettingsTab />);

    const strictModeCheckbox = screen.getByLabelText(/Strict validation mode/);
    fireEvent.click(strictModeCheckbox);

    expect(mockUpdateParserSettings).toHaveBeenCalledWith({
      validation: {
        strictMode: true,
        confidenceThreshold: 0.7,
      },
    });
  });

  it('updates confidence threshold when slider changes', () => {
    render(<ParserSettingsTab />);

    const confidenceSlider = screen.getByLabelText(/Confidence Threshold/);
    fireEvent.change(confidenceSlider, { target: { value: '0.8' } });

    expect(mockUpdateParserSettings).toHaveBeenCalledWith({
      validation: {
        strictMode: false,
        confidenceThreshold: 0.8,
      },
    });
  });

  it('displays confidence threshold percentage', () => {
    render(<ParserSettingsTab />);

    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<ParserSettingsTab />);

    const regionSelect = screen.getByLabelText(/Default Parser Region/);
    expect(regionSelect).toHaveAttribute('aria-describedby', 'default-region-description');

    const description = screen.getByText(/Choose the default region for invoice parsing/);
    expect(description).toHaveAttribute('id', 'default-region-description');
  });

  it('displays section headings', () => {
    render(<ParserSettingsTab />);

    expect(screen.getByText('Parser Configuration')).toBeInTheDocument();
    expect(screen.getByText('Validation Settings')).toBeInTheDocument();
  });

  it('displays helpful descriptions', () => {
    render(<ParserSettingsTab />);

    expect(screen.getByText(/Choose the default region for invoice parsing/)).toBeInTheDocument();
    expect(screen.getByText(/Default currency for parsed amounts/)).toBeInTheDocument();
    expect(screen.getByText(/When enabled, parsing will fail on any validation warnings/)).toBeInTheDocument();
    expect(screen.getByText(/Minimum confidence score required for extracted data/)).toBeInTheDocument();
  });
});