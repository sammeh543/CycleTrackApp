import React, { createContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of the context
interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
}

// Create the context with a default value
export const ThemeContext = createContext<ThemeContextType>({
  theme: 'original',
  setTheme: () => {},
});

// ThemeProvider component
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'original');

  useEffect(() => {
    document.body.classList.remove(
      'theme-original',
      'theme-starry',
      'theme-nebula',
      'theme-pinkwhite',
      'theme-beach',
      'theme-galaxy',
      'theme-aurora',
      'theme-lunar',
      'theme-moon'
    );
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
