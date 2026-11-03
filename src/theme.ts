export const theme = {
  colors: {
    background: '#F4F9FF',
    card: '#FFFFFF',
    primary: '#0369A1',
    primaryDark: '#075985',
    accent: '#E6F4FE',
    text: '#0F172A',
    muted: '#64748B',
    border: '#DCE9F5',
    income: '#15803D',
    expense: '#DC2626',
    warning: '#D97706',
    warningBg: '#FEF3C7',
    danger: '#DC2626',
    dangerBg: '#FEE2E2',
    goodBg: '#DCFCE7',
    infoBg: '#E6F4FE',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radius: 12,
  fontSize: {
    small: 13,
    body: 15,
    title: 17,
    large: 22,
    hero: 30,
  },
} as const;

export type Theme = typeof theme;
