
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();

  // Generic login function that accepts a user ID
  const loginWithUserId = async (userId, provider) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api'}/auth/login-by-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        // Store user profile in localStorage
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        console.log(`Logged in as ${data.user.firstName} ${data.user.lastName} via ${provider}`);
        navigate('/motions');
      } else {
        alert(data.error || 'Login failed.');
      }
    } catch (e) {
      console.error('Login error:', e);
      alert('Login failed. Please check your connection.');
    }
  };

  // Google login - User ID 1 (John Mayor)
  const handleGoogleLogin = () => {
    loginWithUserId(1, 'Google');
  };

  // Facebook login - User ID 2 (Jane Smith)
  const handleFacebookLogin = () => {
    loginWithUserId(2, 'Facebook');
  };

  // Microsoft login - User ID 3 (Bob Wilson)
  const handleMicrosoftLogin = () => {
    loginWithUserId(3, 'Microsoft');
  };

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f6fa'
      }}>
        <div style={{
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <h2 style={{ textAlign: 'center', width: '100%' }}>WEGovern</h2>
          <p style={{ textAlign: 'center', width: '100%' }}>Enhancing Governance through Better Workflows.</p>
          <p style={{ textAlign: 'center', width: '100%', marginBottom: '24px' }}>
            Sign in to WeGovern using your Google, Facebook, or Microsoft account. 
          </p>
          <div style={{ width: '100%', margin: '20px 0', display: 'flex', flexDirection: 'row', gap: '16px', justifyContent: 'center' }}>
            <button type="button" title="Login with Google" onClick={handleGoogleLogin} style={{
              width: '44px',
              height: '44px',
              backgroundColor: '#fff',
              color: '#4285F4',
              border: '1px solid #ddd',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g>
                  <path d="M21.805 10.023h-9.765v3.977h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.227s2.75-6.227 6.125-6.227c1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.703-1.57-3.906-2.523-6.656-2.523-5.523 0-10 4.477-10 10s4.477 10 10 10c5.75 0 9.547-4.023 9.547-9.695 0-.652-.07-1.148-.156-1.593z" fill="#4285F4"/>
                  <path d="M3.153 7.345l3.289 2.412c.898-1.789 2.617-2.977 4.598-2.977 1.125 0 2.125.391 2.914 1.031l2.766-2.695c-1.703-1.57-3.906-2.523-6.656-2.523-3.984 0-7.344 2.672-8.672 6.252z" fill="#34A853"/>
                  <path d="M12 22c2.672 0 4.922-.883 6.563-2.406l-3.047-2.492c-.844.57-1.922.914-3.516.914-2.844 0-5.258-1.914-6.125-4.477l-3.289 2.543c1.617 3.523 5.406 5.918 9.414 5.918z" fill="#FBBC05"/>
                  <path d="M21.805 10.023h-9.765v3.977h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.227s2.75-6.227 6.125-6.227c1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.703-1.57-3.906-2.523-6.656-2.523-5.523 0-10 4.477-10 10s4.477 10 10 10c5.75 0 9.547-4.023 9.547-9.695 0-.652-.07-1.148-.156-1.593z" fill="#EA4335" fillOpacity=".7"/>
                </g>
              </svg>
            </button>
            <button type="button" title="Login with Facebook" onClick={handleFacebookLogin} style={{
              width: '44px',
              height: '44px',
              backgroundColor: '#1877f3',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0" fill="#fff"/>
              </svg>
            </button>
            <button type="button" title="Login with Microsoft" onClick={handleMicrosoftLogin} style={{
              width: '44px',
              height: '44px',
              backgroundColor: '#fff',
              color: '#2F2F2F',
              border: '1px solid #ddd',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="9" height="9" fill="#F35325"/>
                <rect x="13" y="2" width="9" height="9" fill="#81BC06"/>
                <rect x="2" y="13" width="9" height="9" fill="#05A6F0"/>
                <rect x="13" y="13" width="9" height="9" fill="#FFBA08"/>
              </svg>
            </button>
          </div>
          {/* No forgot password for SSO-only login */}
          <div style={{ marginTop: '1rem', textAlign: 'center', width: '100%' }}>
            <p>Don't have an account? <Link to="/signup" style={{ color: '#007bff', textDecoration: 'underline' }}>Sign Up here</Link></p>
          </div>
        </div>
      </div>
    );
}

export default Login;
