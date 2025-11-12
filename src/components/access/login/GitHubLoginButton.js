import React from 'react';
import { useGitHubOAuth } from '../../../context/GitHubOAuthContext';
import { GithubLoginButton } from 'react-social-login-buttons';

const GitHubLoginButton = ({ onLoginSuccess }) => {
  const { clientId, redirectUri } = useGitHubOAuth();

  const handleLogin = () => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}/github-callback&scope=user`;
    window.location.href = githubAuthUrl;
  };

  return <GithubLoginButton onClick={handleLogin} 
          style={{ width: '250px', height: '40px', fontSize: '0.9rem', borderRadius:'20px', marginTop:'0px' }}/>;
};

export default GitHubLoginButton;
