import { UserSettings, ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface SettingsResponse extends ApiResponse<UserSettings> {}

export interface SettingsUpdateResponse extends ApiResponse<UserSettings> {}

export interface SettingsResetResponse extends ApiResponse<UserSettings> {}

/**
 * Get user settings from the server
 */
export async function getSettings(): Promise<UserSettings | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: SettingsResponse = await response.json();

    if (result.success && result.data) {
      return result.data;
    }

    console.warn('Settings API returned success but no data:', result);
    return null;
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    throw error;
  }
}

/**
 * Update user settings on the server
 */
export async function updateSettings(settings: UserSettings): Promise<SettingsUpdateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: SettingsUpdateResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to update settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Reset settings to defaults on the server
 */
export async function resetSettings(): Promise<SettingsResetResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: SettingsResetResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to reset settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Sync settings with server (alias for updateSettings)
 */
export async function syncSettings(settings: UserSettings): Promise<boolean> {
  try {
    const result = await updateSettings(settings);
    return result.success;
  } catch (error) {
    console.error('Failed to sync settings:', error);
    return false;
  }
}