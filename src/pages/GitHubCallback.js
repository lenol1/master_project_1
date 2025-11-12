import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GitHubCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');

    if (!code) return navigate('/');

    (async () => {
      try {
        console.log('GitHub code received:', code);
        const res = await fetch('http://localhost:5000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ githubData: { code } }),
        });

        const data = await res.json();
        if (res.ok && data.message === 'Login successful') {
          navigate('/home');
        } else {
          console.error('Login failed:', data.message);
          navigate('/');
        }
      } catch (err) {
        console.error(err);
        navigate('/');
      }
    })();
  }, [navigate]);

  return <p>Logging in with GitHub...</p>;
};

export default GitHubCallback;
