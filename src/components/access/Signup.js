import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/SignUp.css';

const Signup = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [firstname, setFirstName] = useState("");
    const [lastname, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match");
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/register', {
                method: "post",
                body: JSON.stringify({ firstname, lastname, username, email, password }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            console.warn(result);
            if (response.ok) {
                navigate('/home');
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            setErrorMessage(t("Internal server error"));
        }
    }
    return (
        <div id="main"><br /> <br />
            <h1 id='title'>{t('signup.title')}</h1><br /><br />
            <form onSubmit={handleSignUp} name="regForm" class="form-container">
                <div class="columns">
                    <div className='column'>
                        <div className="input-container">
                            <input type="text" name="firstName" id="regforms_" value={firstname}
                                onChange={(e) => setFirstName(e.target.value)} placeholder="" />
                            <label htmlFor="firstName" class="labelS">{t('signup.firstname')}</label>
                        </div><br />
                        <div className="input-container">
                            <input type="text" name="lastName" id="regforms_"
                                placeholder="" value={lastname}
                                onChange={(e) => setLastName(e.target.value)} />
                            <label for="lastName" class="labelS">{t('signup.lastname')}</label>
                        </div>
                        <br />
                        <div className="input-container">
                            <input type="text" name="username" id="regforms_"
                                placeholder="" value={username}
                                onChange={(e) => setUsername(e.target.value)} required />
                            <label for="username" class="labelS">{t('signup.username')}</label>
                        </div> <br />
                    </div>
                    <div className='column'>
                        <div className="input-container">
                            <input type="email" name="email" id="regforms_" value={email}
                                onChange={(e) => setEmail(e.target.value)} required placeholder="" />
                            <label htmlFor="email" class="labelS">{t('signup.email')}</label>
                        </div><br />
                        <div className="input-container">
                            <input type="password" name="password_" id="regforms_" value={password}
                                onChange={(e) => setPassword(e.target.value)} required placeholder="" />
                            <label for="password_" class="labelS">{t('signup.password')}</label>
                        </div><br />
                        <div className="input-container">
                            <input type="password" name="confirmPassword" id="regforms_" value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="" />
                            <label for="confirmPassword" class="labelS">{t('signup.confirmpassword')}</label>
                        </div>
                    </div>
                </div>
                <div style={{ minHeight: '20px', textAlign: 'center' }}>
                    {errorMessage && <p className="error-message">{errorMessage}</p>}
                </div><br />
                <button id="regforms" type='submit'>{t('signup.confirm')}</button> <br />
            </form>
        </div>
    );
};

export default Signup;