import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import UserInfo from '../access/login/UserInfo';
import Footer from './Footer.js';


function Header({ variant }) {
  const { t, i18n } = useTranslation();
  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  let headerContent;
  let headerClass = "";

  switch (variant) {
    case "login/signup":
      headerClass = "loginSignupHeader";
      headerContent = (
        <div className="loginSignupInner">
          <Link to="/" id="link"><h2>{t('header.login')}</h2></Link>
          <Link to="/signup" id="link"><h2>{t('header.signup')}</h2></Link>
        </div>
      );
      break;

    case "home":
      headerClass = "homeHeader";
      headerContent = (
        <div className="homeInner">
          <div className="headerGroup">
            <NavLink to="/home"><img src="/../materials/home.png" alt="home" /><h4>{t('header.home')}</h4></NavLink>
            <NavLink to="/transactions"><img src="/../materials/transaction.png" alt="transactions" /><h4>{t('header.transaction')}</h4></NavLink>
            <NavLink to="/budgets"><img src="/../materials/budget.png" alt="budgets" /><h4>{t('header.budgets')}</h4></NavLink>
            <NavLink to="/financial-goals"><img src="/../materials/financialGoal.png" alt="financial-goals" /><h4>{t('header.financialGoals')}</h4></NavLink>
            <NavLink to="/analytics"><img src="/../materials/analytic.png" alt="analytics" /><h4>{t('header.analytics')}</h4></NavLink>
          </div>

          <div className="headerRight">
            <UserInfo />
            <div className="language-buttons">
              <button onClick={() => changeLanguage('en')}>EN</button>
              <button onClick={() => changeLanguage('uk')}>UA</button>
            </div>
          </div>
        </div>
      );
      break;

    default:
      headerContent = null;
  }

  return (
    <div className={`headerBase ${headerClass}`}>
      {headerContent}
      <Footer variant={`${headerClass}`} />
    </div>
  );
}


export default Header;