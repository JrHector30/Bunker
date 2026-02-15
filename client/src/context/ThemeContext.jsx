import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Theme references COLOR (carbon, blue, red)
    const validThemes = ['theme-green', 'theme-blue', 'theme-red', 'theme-carbon'];
    const storedTheme = localStorage.getItem('app-theme');
    // If stored theme is valid use it, otherwise default to theme-green
    const initialTheme = (storedTheme && validThemes.includes(storedTheme)) ? storedTheme : 'theme-green';

    const [theme, setTheme] = useState(initialTheme);

    // Mode references BRIGHTNESS (dark, light)
    // Default to dark as per original design
    const [mode, setMode] = useState(localStorage.getItem('app-mode') || 'dark');

    useEffect(() => {
        const root = document.documentElement;

        // Remove all potential theme/mode classes
        // Remove all potential theme/mode classes
        root.classList.remove('theme-carbon', 'theme-green', 'theme-red', 'theme-blue');
        root.classList.remove('mode-dark', 'mode-light'); // If we decide to use classes for both

        // Add current theme and mode
        root.classList.add(theme);
        root.classList.add(`mode-${mode}`);

        // Persist
        localStorage.setItem('app-theme', theme);
        localStorage.setItem('app-mode', mode);
    }, [theme, mode]);

    const changeTheme = (newTheme) => {
        setTheme(newTheme);
    };

    const toggleMode = () => {
        setMode(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // Keeping toggleTheme for backward compat or just redirecting it
    // But conceptually we want to expose toggleMode now
    const toggleTheme = () => {
        toggleMode();
    };

    return (
        <ThemeContext.Provider value={{ theme, mode, changeTheme, toggleMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
