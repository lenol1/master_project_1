import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import {jwtDecode} from 'jwt-decode';

const GoogleLoginButton = ({ onLoginSuccess, onLoginFailure }) => {
  const handleSuccess = (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    onLoginSuccess({ provider: 'google', ...decoded });
  };

  return (
    <GoogleLogin
      theme="filled_black"
      shape="circle"
      width="50%"
      type='standard'
      size='large'
      onSuccess={handleSuccess}
      onError={onLoginFailure}
    />
  );
};

export default GoogleLoginButton;
