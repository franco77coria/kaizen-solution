// TheriVerse Design Tokens
// Dual theme support: light + dark

export const LightTheme = {
  primary: '#7B2FBE',
  primaryLight: '#9B59D0',
  primaryDark: '#5A1F8E',
  secondary: '#00D4AA',
  accent: '#FF6B35',

  bg: '#F8F7FC',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EEF6',
  card: '#FFFFFF',

  text: '#1A1A2E',
  textSec: '#6B6B80',
  textMut: '#9B9BAF',
  onPrimary: '#FFFFFF',

  border: '#E8E6F0',
  borderLight: '#F0EEF6',
  divider: '#E8E6F0',
  icon: '#6B6B80',
  tabDefault: '#9B9BAF',
  tabActive: '#7B2FBE',

  success: '#00C853',
  warning: '#FFB300',
  error: '#FF3D57',
  info: '#2196F3',

  shadow: 'rgba(123, 47, 190, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.12)',

  statusBar: 'dark' as const,
};

export const DarkTheme = {
  primary: '#A66DE8',
  primaryLight: '#BF8FF0',
  primaryDark: '#7B2FBE',
  secondary: '#00E6B8',
  accent: '#FF8A5C',

  bg: '#0D0D14',
  surface: '#1A1A28',
  surfaceAlt: '#24243A',
  card: '#1A1A28',

  text: '#EEEEF2',
  textSec: '#A0A0B8',
  textMut: '#6B6B80',
  onPrimary: '#FFFFFF',

  border: '#2E2E42',
  borderLight: '#24243A',
  divider: '#2E2E42',
  icon: '#A0A0B8',
  tabDefault: '#6B6B80',
  tabActive: '#A66DE8',

  success: '#00E676',
  warning: '#FFCA28',
  error: '#FF5252',
  info: '#42A5F5',

  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',

  statusBar: 'light' as const,
};

export type ThemeColors = Omit<typeof LightTheme, 'statusBar'> & { statusBar: 'dark' | 'light' };
