import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home'; // Will rename to Motions
import TasksPage from './pages/TasksKanban';
import NewMotion from './pages/NewMotion';
import MotionPage from './pages/MotionPage';
import CompletedMotionPage from './pages/CompletedMotionPage';
import Settings from './pages/Settings';
import MyProfile from './pages/MyProfile';
import { MotionsProvider } from './MotionsContext';
import { WebSocketProvider } from './WebSocketContext';
import { getUserProfile, getUserOrganizations } from './api.settings';

function MainLayout() {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [orgDropdown, setOrgDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Fetch user data and organizations on mount
  useEffect(() => {
    async function fetchUserData() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }
        
        // Fetch user profile and organizations in parallel
        const [userData, userOrgs] = await Promise.all([
          getUserProfile(),
          getUserOrganizations()
        ]);
        
        if (userData && !userData.error) {
          setUser(userData);
          
          // Set organizations
          if (userOrgs && userOrgs.length > 0) {
            setOrganizations(userOrgs);
            // Set the primary organization as current, or first one if no primary
            const primaryOrg = userOrgs.find(org => org.isPrimary) || userOrgs[0];
            setCurrentOrg(primaryOrg);
          } else if (userData.org) {
            // Fallback to user's org from profile if no organizations found
            const userOrg = { ...userData.org, isPrimary: true };
            setCurrentOrg(userOrg);
            setOrganizations([userOrg]);
          }
        } else {
          // If user data fetch fails, redirect to login
          navigate('/');
        }
      } catch (error) {
        navigate('/');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, [navigate]);

  // Hide layout for login/signup
  if (["/", "/signup"].includes(location.pathname)) return <Outlet />;
  
  // Show loading state while fetching user data
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#1565c0', fontSize: '18px', fontWeight: 'bold' }}>Loading...</div>
      </div>
    );
  }
  
  // If no user data, redirect to login
  if (!user || !currentOrg) {
    navigate('/');
    return null;
  }
  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{ height: 60, background: '#1565c0', color: '#fff', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(21,101,192,0.08)' }}>
        {/* Left section - flexible width for org name */}
        <div style={{ minWidth: 210, background: '#1565c0', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 16px', height: '100%', gap: 8, flex: '0 0 auto' }}>
          <span style={{ fontWeight: 'bold', fontSize: 22, letterSpacing: 1, color: '#fff', whiteSpace: 'nowrap', overflow: 'visible' }}>{currentOrg.name}</span>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <button onClick={() => setOrgDropdown(v => !v)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}>▼</button>
            {orgDropdown && (
              <div style={{ position: 'absolute', top: 32, left: -70, background: '#fff', color: '#1565c0', borderRadius: 6, boxShadow: '0 2px 8px rgba(21,101,192,0.18)', minWidth: 140, zIndex: 10 }}>
                {organizations.map(org => (
                  <div 
                    key={org.id} 
                    onClick={() => { setCurrentOrg(org); setOrgDropdown(false); }} 
                    style={{ 
                      padding: '10px 18px', 
                      cursor: 'pointer', 
                      fontWeight: org.id === currentOrg.id ? 'bold' : 'normal', 
                      background: org.id === currentOrg.id ? '#e3f2fd' : '#fff' 
                    }}
                  >
                    {org.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Right section - user menu */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 32px' }}>
        {/* User menu */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 'bold', fontSize: 16 }}>
            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
          </span>
          <button onClick={() => setUserDropdown(v => !v)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>▼</button>
          {userDropdown && (
            <div style={{ position: 'absolute', top: 32, right: 0, background: '#fff', color: '#1565c0', borderRadius: 6, boxShadow: '0 2px 8px rgba(21,101,192,0.18)', minWidth: 140, zIndex: 10 }}>
              <div onClick={() => { setUserDropdown(false); navigate('/my-profile'); }} style={{ padding: '10px 18px', cursor: 'pointer' }}>My Profile</div>
              <div onClick={() => { 
                setUserDropdown(false); 
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/'); 
              }} style={{ padding: '10px 18px', cursor: 'pointer' }}>Logout</div>
            </div>
          )}
        </div>
        </div>
      </div>
      {/* Main content with sidebar */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ width: 210, background: '#1976d2', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '32px 0', minHeight: 'calc(100vh - 60px)' }}>
          <div style={{ width: '100%' }}>
            <Link to="/motions" style={{ display: 'block', color: location.pathname === '/motions' ? '#fff' : '#bbdefb', background: location.pathname === '/motions' ? '#1565c0' : 'none', fontWeight: 'bold', padding: '14px 32px', textDecoration: 'none', borderLeft: location.pathname === '/motions' ? '4px solid #fff' : '4px solid transparent' }}>Motions</Link>
            <Link to="/tasks" style={{ display: 'block', color: location.pathname === '/tasks' ? '#fff' : '#bbdefb', background: location.pathname === '/tasks' ? '#1565c0' : 'none', fontWeight: 'bold', padding: '14px 32px', textDecoration: 'none', borderLeft: location.pathname === '/tasks' ? '4px solid #fff' : '4px solid transparent' }}>Tasks</Link>
            <Link to="/settings" style={{ display: 'block', color: location.pathname === '/settings' ? '#fff' : '#bbdefb', background: location.pathname === '/settings' ? '#1565c0' : 'none', fontWeight: 'bold', padding: '14px 32px', textDecoration: 'none', borderLeft: location.pathname === '/settings' ? '4px solid #fff' : '4px solid transparent' }}>Settings</Link>
          </div>
        </div>
        {/* Main routed content */}
        <div style={{ flex: 1, minWidth: 0, padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f5f6fa' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <WebSocketProvider>
      <MotionsProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route element={<MainLayout />}>
              <Route path="/motions" element={<Home />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/new-motion" element={<NewMotion />} />
              <Route path="/motion/:id" element={<MotionPage />} />
              <Route path="/completed-motion/:id" element={<CompletedMotionPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/my-profile" element={<MyProfile />} />
            </Route>
          </Routes>
        </Router>
      </MotionsProvider>
    </WebSocketProvider>
  );
}

export default App;
