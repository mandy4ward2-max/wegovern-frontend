// Get all votes for a motion (with user info)
export async function getVotesByMotion(motionId) {
  const token = localStorage.getItem('token');
  const url = `${API_BASE_URL}/votes?motionId=${motionId}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await res.json();
}
// Voting API
export async function getVoteTally(motionId, userId) {
  const token = localStorage.getItem('token');
  const url = `${API_BASE_URL}/votes/tally?motionId=${motionId}${userId ? `&userId=${userId}` : ''}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await res.json();
}

export async function createVote(motionId, userId, voteType) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/votes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ motionId, userId, voteType })
  });
  return await res.json();
}
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

export async function login(email, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function register(user) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function getMotions({ orgId, status } = {}) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { error: true, message: 'No token provided' };
    }
    let url = `${API_BASE_URL}/motions`;
    const params = [];
    if (orgId) params.push(`orgId=${encodeURIComponent(orgId)}`);
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (params.length) url += `?${params.join('&')}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function logout() {
  localStorage.removeItem('token');
}

export async function getTasks(status) {
  try {
    const token = localStorage.getItem('token');
    console.log('getTasks - token exists:', !!token);
    let url = `${API_BASE_URL}/tasks`;
    
    // Only add status parameter if it's not 'all'
    if (status && status !== 'all') {
      url += `?status=${status}`;
    }
    
    console.log('getTasks - URL:', url);
    
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('getTasks - response status:', res.status);
    
    const data = await res.json();
    console.log('getTasks - response data:', data);
    
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('getTasks - error:', e);
    return [];
  }
}

export async function completeTask(taskId, comment, dateCompleted) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ completed: true, completeComment: comment, dateCompleted })
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function getComments(motionId, issueId, taskId) {
  // Using fetch API as requested
  const token = localStorage.getItem('token');
  let url = `${API_BASE_URL}/comments?`;
  
  if (motionId) url += `motionId=${motionId}`;
  else if (issueId) url += `issueId=${issueId}`;
  else if (taskId) url += `taskId=${taskId}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const comments = await response.json();
  return Array.isArray(comments) ? comments : [];
}

export async function addComment(text, { motionId, issueId, taskId }, parentId = null, taggedUserIds = []) {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let userId = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user.id;
      } catch {}
    }
    
    const payload = { text, parentId, userId, taggedUserIds };
    if (motionId) payload.motionId = Number(motionId);
    else if (issueId) payload.issueId = Number(issueId);
    else if (taskId) payload.taskId = Number(taskId);
    
    const res = await fetch(`${API_BASE_URL}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    return result;
  } catch (e) {
    console.error('🔗 Error in addComment:', e);
    return { error: true, message: e.message };
  }
}

export async function editComment(commentId, text) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function deleteComment(commentId) {
  try {
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (e) {
    // fail silently
  }
}

export async function getMotionById(id) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/motions/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

// Email Notifications API
export async function sendTestEmail(to, subject, message) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/notifications/test-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, subject, message })
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

// Issues API
export async function getIssues(orgId) {
  try {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/issues?orgId=${orgId}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function getIssueById(id) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/issues/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function createIssue(title, description, status, priority, assignedToId) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, description, status, priority, assignedToId })
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function updateIssue(id, updates) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/issues/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function closeIssue(id, dataOrResolution) {
  try {
    const token = localStorage.getItem('token');
    // Simplify - just send resolution or simple payload
    const payload = typeof dataOrResolution === 'string'
      ? { resolution: dataOrResolution }
      : dataOrResolution;
    const res = await fetch(`${API_BASE_URL}/issues/${id}/close`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function deleteIssue(id) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/issues/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function getIssueStats(orgId) {
  try {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/issues/stats?orgId=${orgId}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

export async function getUsers() {
  try {
    const token = localStorage.getItem('token');
    console.log('🔍 getUsers: Making API call to /users/org/all with timestamp:', Date.now());
    const res = await fetch(`${API_BASE_URL}/users/org/all?t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('🔍 getUsers: Received data:', data);
    return data;
  } catch (e) {
    console.log('🔍 getUsers: Error:', e);
    return { error: true, message: e.message };
  }
}

// Convenience functions for issue comments
export async function getIssueComments(issueId) {
  return getComments(null, issueId, null);
}

export async function addIssueComment(issueId, text, parentId = null, taggedUserIds = []) {
  return addComment(text, { issueId }, parentId, taggedUserIds);
}

// Convenience functions for task comments
export async function getTaskComments(taskId) {
  return getComments(null, null, taskId);
}

export async function addTaskComment(taskId, text, parentId = null, taggedUserIds = []) {
  return addComment(text, { taskId }, parentId, taggedUserIds);
}
