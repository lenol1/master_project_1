import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GoogleLoginButton from './GoogleLoginButton';
import GitHubLoginButton from './GitHubLoginButton';

const Login = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [googleData, setGoogleData] = useState(null);
    const [gitData, setGitData] = useState(null);

    const handleLogin = useCallback(async (e) => {
        if (e) e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/login', {
                method: "POST",
                body: JSON.stringify({ login, password, googleData, gitData }),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            console.log('Login result:', result);
            if (response.ok) {
                const user = {
                    email: result.email,
                    username: result.username || result.name || result.login,
                    picture: result.picture
                };
                localStorage.setItem('userData', JSON.stringify(user));
                navigate('/home');
            }
            else setErrorMessage(result.message);
        } catch (error) {
            console.error(error);
            setErrorMessage(t('login.internalServerError'));
        }
    }, [login, password, googleData, gitData, navigate, t]);

    useEffect(() => {
        if (googleData || gitData) handleLogin();
    }, [googleData, gitData, handleLogin]);

    return (
        <div id="main"><br /><br />
            <h1 id='title'>{t('login.title')}</h1><br />
            <form name="regForm">
                <div className="input-container">
                    <input type="text" name="login" id="regforms" value={login} onChange={(e) => setLogin(e.target.value)} required placeholder="" />
                    <label htmlFor="login" className="labelL">{t('login.emailOrUsername')}</label>
                </div><br /> <div className="input-container">
                    <input type="password" name="password_" id="regforms" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="" />
                    <label htmlFor="password_" className="labelL">{t('login.password')}</label>
                </div><br />
                <button type='submit' id="regforms" onClick={handleLogin}>{t('login.confirm')}</button><br />
                <h3>{t('login.or')}</h3><br />
                <div className="social-login-wrapper" id="regforms" style={{ display: 'flex', gap: '10px', flexDirection: 'row' }}>

                    <GoogleLoginButton
                        onLoginSuccess={setGoogleData}
                        onLoginFailure={() => console.log(t('login.loginFailed'))}
                    />
                    <GitHubLoginButton
                        onLoginSuccess={setGitData}
                    />
                </div>
                <div style={{ minHeight: '20px', textAlign: 'center', marginTop: '5px' }}>
                    {errorMessage && <p className="error-message">{errorMessage}</p>}
                </div>
            </form>
        </div>
    );
};

export default Login;