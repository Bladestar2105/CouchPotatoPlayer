import { getTheme, themeOptions, ThemeMode } from '../theme';

describe('theme utils', () => {
  describe('getTheme', () => {
    it('should return dark theme for "dark" mode', () => {
      const theme = getTheme('dark');
      expect(theme.mode).toBe('dark');
      expect(theme.colors.background).toBe('#121212');
    });

    it('should return oled theme for "oled" mode', () => {
      const theme = getTheme('oled');
      expect(theme.mode).toBe('oled');
      expect(theme.colors.background).toBe('#000000');
    });

    it('should return light theme for "light" mode', () => {
      const theme = getTheme('light');
      expect(theme.mode).toBe('light');
      expect(theme.colors.background).toBe('#F2F2F7');
    });

    it('should fallback to dark theme for invalid mode', () => {
      const theme = getTheme('invalid' as any);
      expect(theme.mode).toBe('dark');
      expect(theme.colors.background).toBe('#121212');
    });
  });

  describe('themeOptions', () => {
    it('should have 3 theme options', () => {
      expect(themeOptions).toHaveLength(3);
    });

    it('should contain dark, oled, and light options', () => {
      const values = themeOptions.map(opt => opt.value);
      expect(values).toContain('dark');
      expect(values).toContain('oled');
      expect(values).toContain('light');
    });

    it('should have correct labels and descriptions', () => {
      themeOptions.forEach(option => {
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('emoji');
        expect(option).toHaveProperty('description');
      });
    });
  });
});
