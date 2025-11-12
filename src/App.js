import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./components/styles/App.css";
import Login from "./components/access/login/Login.js";
import Signup from "./components/access/Signup.js";
//import Report from "./components/home/Report.js";
//import Home from "./components/home/Main.js";
import Header from "./components/navigation/Header.js";
import GitHubCallback from './pages/GitHubCallback.js';
import Home from "./pages/Home.js";
import Transactions from "./pages/Transactions.js";
import Budgets from "./pages/Budgets.js";
import FinancialGoals from "./pages/FinancialGoals.js";
import Analytics from "./pages/Analytics.js";
import './i18n';
import ThemeSwitcher from "./context/ThemeSwitcher.js";

function App() {
  return (
    <Router>
      <ThemeSwitcher />
      <div>
        <Routes>
          <Route path="/" element={<Header variant="login/signup" />} />
          <Route path="/signup" element={<Header variant="login/signup" />} />
          <Route path="/home" element={<Header variant="home" />} />
          <Route path="/transactions" element={<Header variant="home" />} />
          <Route path="/budgets" element={<Header variant="home" />} />
          <Route path="/financial-goals" element={<Header variant="home" />} />
          <Route path="/analytics" element={<Header variant="home" />} />
          {/* інші маршрути */}
        </Routes>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/home" element={<Home />} />
          <Route path="/github-callback" element={<GitHubCallback onLoginSuccess={() => { }} />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/financial-goals" element={<FinancialGoals />} />
          <Route path="/analytics" element={<Analytics />} />
          {/* інші маршрути */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;