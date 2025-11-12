import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GitHubOAuthProvider } from './context/GitHubOAuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId='386126537704-4s4rvv86gro96l7h5gbcciqb5rt49oab.apps.googleusercontent.com'>
    <GitHubOAuthProvider 
      clientId='Ov23liOC3UYcEnwFK3Uy' 
      redirectUri='http://localhost:3000'>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </GitHubOAuthProvider>
  </GoogleOAuthProvider>
);

reportWebVitals();