
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, updateUserProfile } from '../api.settings';

function MyProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showSSOPopup, setShowSSOPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const ssoOptions = ['Google', 'Facebook', 'Microsoft'];

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      setError(null);
      try {
        const userData = await getUserProfile();
        setUser(userData);
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  const handleUserChange = (field, value) => setUser(u => ({ ...u, [field]: value }));
  const handleUserSave = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await updateUserProfile(user);
      setSuccessMessage('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };
  const handleSSOChange = provider => {
    setUser(u => ({ ...u, ssoProvider: provider }));
    setShowSSOPopup(false);
  };
  const SSOIconButton = ({ provider, onClick }) => {
    const icon = {
      Google: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g>
            <path d="M21.805 10.023h-9.765v3.977h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.227s2.75-6.227 6.125-6.227c1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.703-1.57-3.906-2.523-6.656-2.523-5.523 0-10 4.477-10 10s4.477 10 10 10c5.75 0 9.547-4.023 9.547-9.695 0-.652-.07-1.148-.156-1.593z" fill="#4285F4"/>
            <path d="M3.153 7.345l3.289 2.412c.898-1.789 2.617-2.977 4.598-2.977 1.125 0 2.125.391 2.914 1.031l2.766-2.695c-1.703-1.57-3.906-2.523-6.656-2.523-3.984 0-7.344 2.672-8.672 6.252z" fill="#34A853"/>
            <path d="M12 22c2.672 0 4.922-.883 6.563-2.406l-3.047-2.492c-.844.57-1.922.914-3.516.914-2.844 0-5.258-1.914-6.125-4.477l-3.289 2.543c1.617 3.523 5.406 5.918 9.414 5.918z" fill="#FBBC05"/>
            <path d="M21.805 10.023h-9.765v3.977h5.617c-.242 1.242-1.484 3.648-5.617 3.648-3.375 0-6.125-2.789-6.125-6.227s2.75-6.227 6.125-6.227c1.922 0 3.211.82 3.953 1.523l2.703-2.633c-1.703-1.57-3.906-2.523-6.656-2.523-5.523 0-10 4.477-10 10s4.477 10 10 10c5.75 0 9.547-4.023 9.547-9.695 0-.652-.07-1.148-.156-1.593z" fill="#EA4335" fillOpacity=".7"/>
          </g>
        </svg>
      ),
      Facebook: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0" fill="#1877f3"/>
        </svg>
      ),
      Microsoft: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="9" height="9" fill="#F35325"/>
          <rect x="13" y="2" width="9" height="9" fill="#81BC06"/>
          <rect x="2" y="13" width="9" height="9" fill="#05A6F0"/>
          <rect x="13" y="13" width="9" height="9" fill="#FFBA08"/>
        </svg>
      ),
    };
    return (
      <button type="button" title={`Connect with ${provider}`} onClick={onClick} style={{
        width: 44, height: 44, background: '#fff', border: '1px solid #ddd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, cursor: 'pointer', margin: 8
      }}>{icon[provider]}</button>
    );
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }
  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{error}</div>;
  }
  if (!user) {
    return <div style={{ padding: 40, textAlign: 'center' }}>No profile found.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
      <div style={{ padding: '32px', maxWidth: '600px', width: '100%', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        {/* Close Button */}
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            position: 'absolute', 
            top: '16px', 
            right: '16px', 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer', 
            color: '#666', 
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            e.target.style.background = '#f0f0f0';
            e.target.style.color = '#333';
          }}
          onMouseLeave={e => {
            e.target.style.background = 'none';
            e.target.style.color = '#666';
          }}
          title="Close"
        >
          ×
        </button>
        <h3>My Profile</h3>
        {successMessage && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: 4, fontSize: 14 }}>
            {successMessage}
          </div>
        )}
        <form style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, width: '100%', alignItems: 'center', margin: '0 auto' }} onSubmit={e => { e.preventDefault(); handleUserSave(); }}>
          <label style={{ width: '100%' }}>First Name
            <input type="text" value={user.firstName || ''} onChange={e => handleUserChange('firstName', e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 4 }} />
          </label>
          <label style={{ width: '100%' }}>Last Name
            <input type="text" value={user.lastName || ''} onChange={e => handleUserChange('lastName', e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 4 }} />
          </label>
          <label style={{ width: '100%' }}>Email
            <input type="email" value={user.email || ''} onChange={e => handleUserChange('email', e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 4 }} />
          </label>
          <label style={{ width: '100%' }}>SSO Provider
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
              <input type="text" value={user.ssoProvider || 'None'} readOnly style={{ flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 4, background: '#f9f9f9' }} />
              <button type="button" onClick={() => setShowSSOPopup(true)} style={{ marginLeft: 8, padding: '8px 12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Change</button>
            </div>
          </label>
          <button type="submit" disabled={loading} style={{ marginTop: 12, background: loading ? '#6c757d' : '#007bff', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 0', fontWeight: 'bold', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
        {/* SSO Selection Popup */}
        {showSSOPopup && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', maxWidth: 350, textAlign: 'center' }}>
              <h4>Choose SSO Provider</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                {ssoOptions.map(provider => (
                  <SSOIconButton key={provider} provider={provider} onClick={() => handleSSOChange(provider)} />
                ))}
              </div>
              <button onClick={() => setShowSSOPopup(false)} style={{ marginTop: 16, background: '#ccc', color: '#333', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyProfile;
