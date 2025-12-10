import React, { useState, useEffect } from 'react';
import '../components/styles/App.css';
import '../components/styles/Main.css';

const ThemeSwitcher = () => {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        document.body.className = theme;
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
    }, []);

    return (
        <div className="theme-switcher" >
            <button onClick={() => setTheme('light')}>
                <img src="/../materials/light.png" alt="light" style={{ width: '30px' }} />
            </button>
            <button onClick={() => setTheme('dark')}>
                <img src="/../materials/dark.png" alt="dark" style={{ width: '30px' }} />
            </button>
        </div>
    );
};

export default ThemeSwitcher;