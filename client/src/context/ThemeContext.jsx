import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Theme references COLOR (carbon, blue, red)
    const validThemes = ['theme-orange', 'theme-green', 'theme-blue', 'theme-red', 'theme-black'];
    const storedTheme = localStorage.getItem('app-theme');
    // If stored theme is valid use it, otherwise default to theme-orange
    const initialTheme = (storedTheme && validThemes.includes(storedTheme)) ? storedTheme : 'theme-orange';

    const [theme, setTheme] = useState(initialTheme);

    // Mode references BRIGHTNESS (dark, light)
    // Default to dark as per original design
    const [mode, setMode] = useState(localStorage.getItem('app-mode') || 'dark');

    // Show Alerts state - defaults to false until activated in Settings
    const [showAlerts, setShowAlerts] = useState(localStorage.getItem('app-show-alerts') === 'true');

    useEffect(() => {
        const root = document.documentElement;
        const isPublicPage = window.location.pathname === '/' || window.location.pathname === '/login';
        const hasUser = !!localStorage.getItem('bunker_user');

        // Remove all potential theme/mode classes
        root.classList.remove(...validThemes);
        root.classList.remove('mode-dark', 'mode-light');

        if (hasUser && !isPublicPage) {
            // Dentro del sistema: Aplica el tema y modo (claro/oscuro) elegido
            root.classList.add(theme);
            root.classList.add(`mode-${mode}`);
        } else {
            // Fuera del sistema (Landing Page y Login): SIEMPRE modo oscuro nativo
            root.classList.add('theme-orange');
            root.classList.add('mode-dark');
        }

        // Persist
        localStorage.setItem('app-theme', theme);
        localStorage.setItem('app-mode', mode);
        localStorage.setItem('app-show-alerts', showAlerts);
    }, [theme, mode, showAlerts]);

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
        <ThemeContext.Provider value={{ theme, mode, changeTheme, toggleMode, toggleTheme, showAlerts, setShowAlerts }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
