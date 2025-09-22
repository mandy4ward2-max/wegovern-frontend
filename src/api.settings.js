// User and Organization API functions for Settings and MyProfile
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

export async function getUserProfile() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function updateUserProfile(profile) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profile)
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function getOrganization() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/orgs/organization`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function getUserOrganizations() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/orgs/user-organizations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export async function updateOrganization(org) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/orgs/${org.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(org)
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function deleteOrganization(orgId) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/orgs/${orgId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function getOrganizationUsers() {
  try {
    const token = localStorage.getItem('token');
    // First get current user's organization
    const orgRes = await fetch(`${API_BASE_URL}/orgs/organization`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orgData = await orgRes.json();
    
    if (orgData.error || !orgData.id) {
      return [];
    }
    
    // Then get users for that organization
    const res = await fetch(`${API_BASE_URL}/orgs/${orgData.id}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export async function updateUserRole(userId, role) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role })
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function deleteUser(userId) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}
