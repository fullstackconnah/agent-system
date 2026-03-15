import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../ThemeContext';

export function renderWithTheme(ui, options = {}) {
  const Wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;
  return render(ui, { wrapper: Wrapper, ...options });
}
