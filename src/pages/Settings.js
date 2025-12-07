import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [currency, setCurrency] = useState(localStorage.getItem('defaultCurrency') || 'USD');
  const [useFx, setUseFx] = useState(localStorage.getItem('useFxConversion') === 'true');

  useEffect(() => {
    // keep local state in sync with localStorage in case other UI changes it
    const onCurrencyChanged = () => {
      setCurrency(localStorage.getItem('defaultCurrency') || 'USD');
      setUseFx(localStorage.getItem('useFxConversion') === 'true');
    };
    window.addEventListener('currencyChanged', onCurrencyChanged);
    return () => window.removeEventListener('currencyChanged', onCurrencyChanged);
  }, []);

  const save = () => {
    localStorage.setItem('defaultCurrency', currency);
    localStorage.setItem('useFxConversion', useFx ? 'true' : 'false');
    // notify other components
    window.dispatchEvent(new Event('currencyChanged'));
    navigate('/home');
  };

  return (
    <div style={{ padding: 24 }} className="homePage">
      <h2>{t('settings.title', 'Settings')}</h2>

      <div style={{ maxWidth: 600, marginTop: 18 }}>
        <label style={{ display: 'contents', marginBottom: 6 }}>{t('settings.defaultCurrency', 'Default currency')}</label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ padding: 8, borderRadius: 6, minWidth: 140 }}>
          <option value="USD">USD</option>
          <option value="UAH">UAH</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>

        <div style={{ marginTop: 12, marginLeft:'-200px'}}>
          <label style={{ display: 'contents', alignItems: 'center'}}>
            <input type="checkbox" style={{padding:'5px'}} checked={useFx} onChange={(e) => setUseFx(e.target.checked)} />
            <span style={{marginLeft:'-190px'}}>{t('settings.useFx', 'Enable FX conversion')}</span>
          </label>
        </div>

        <div style={{ marginTop: 22, display: 'flex', gap: 12 }}>
          <button className="budget-btn" onClick={save} style={{ minWidth: 120 }}>{t('settings.save', 'Save')}</button>
          <button className="secondary-btn" onClick={() => navigate(-1)} style={{ minWidth: 120 }}>{t('settings.cancel', 'Cancel')}</button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
