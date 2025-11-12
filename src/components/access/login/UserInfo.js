import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/App.css';
import { useTranslation } from 'react-i18next';

function UserInfo() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(() => {
        const savedUser = localStorage.getItem('userData');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Закривати меню при кліку поза
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('userData');
        setUserData(null);
        navigate('/'); // переходимо на логін
    };

    return (
        <div className="userInfoContainer" ref={menuRef} style={{ position: 'relative' }}>
            <div className="userAvatar" onClick={() => setMenuOpen(prev => !prev)}>
                <img
                    src={userData?.picture || '/../../materials/guest.png'}
                    alt="userIcon"
                    className="userAvatarImg"
                />
            </div>

            {menuOpen && (
                <div className={`userDropdownMenu ${menuOpen ? 'open' : ''}`}>
                    <div className="menuItem" onClick={() => navigate('/profile')}>{t('header.profile')}</div>
                    <div className="menuItem" onClick={() => navigate('/notifications')}>{t('header.notification')}</div>
                    <div className="menuItem" onClick={() => navigate('/settings')}>{t('header.setting')}</div>
                    <div className="menuItem logout" onClick={handleLogout}>{t('header.logout')}</div>
                </div>
            )}
        </div>
    );
}

export default UserInfo;