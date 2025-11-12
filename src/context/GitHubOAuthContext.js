import React, { createContext, useContext } from 'react';

const GitHubOAuthContext = createContext();

export const GitHubOAuthProvider = ({ clientId, redirectUri, children }) => {
  return (
    <GitHubOAuthContext.Provider value={{ clientId, redirectUri }}>
      {children}
    </GitHubOAuthContext.Provider>
  );
};

export const useGitHubOAuth = () => useContext(GitHubOAuthContext);
