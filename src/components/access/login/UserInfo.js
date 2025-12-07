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
                    <div className='menuItem' onClick={() => navigate('/categories')}> {t('header.categories')} </div>
                    <div className="menuItem" onClick={() => navigate('/notifications')}>{t('header.notification')}</div>
                    <div className="menuItem" onClick={() => navigate('/settings')}>{t('header.setting')}</div>
                    <div className="menuItem logout" onClick={handleLogout}>{t('header.logout')}</div>
                </div>
            )}

            {/* User Profile Card (visible on /profile) */}
            {window.location.pathname === '/profile' && userData && (
                <div className="profileCard" style={{ marginTop: '2em', background: '#232b3a', borderRadius: '12px', padding: '2em', maxWidth: '400px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', color: '#fff', textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
                    <img src={userData.picture || '/../../materials/guest.png'} alt="userIcon" style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '1em', objectFit: 'cover', background: '#1a2233' }} />
                    <h2 style={{ marginBottom: '0.5em' }}>{userData.name || t('profile.guest')}</h2>
                    <p style={{ marginBottom: '0.5em', fontSize: '1.1em' }}>{userData.email || t('profile.noEmail')}</p>
                    <div style={{ marginBottom: '1em', fontSize: '0.95em', opacity: 0.8 }}>
                        {userData.role ? `${t('profile.role')}: ${userData.role}` : t('profile.noRole')}
                    </div>
                    <button className="budget-btn" style={{ minWidth: '120px', padding: '8px 18px', marginTop: '1em' }} onClick={handleLogout}>{t('header.logout')}</button>
                </div>
            )}
        </div>
    );
}

export default UserInfo;