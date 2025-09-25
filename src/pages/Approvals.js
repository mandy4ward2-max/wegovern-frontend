import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApprovals, processApproval, getUsers } from '../api';
import { useWebSocket } from '../WebSocketContext';

function Approvals() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const { socket } = useWebSocket();

  // Filter states
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    submittedBy: 'all',
    dateFrom: '',
    dateTo: ''
  });

  // Processing modal state
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [processingAction, setProcessingAction] = useState('');
  const [processingComments, setProcessingComments] = useState('');

  // Get current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      
      // Check if user has permission to view approvals
      if (!['SuperUser', 'Owner'].includes(user.role)) {
        navigate('/');
        return;
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        const [approvalsData, usersData] = await Promise.all([
          getApprovals(filters),
          getUsers('all')
        ]);
        
        setApprovals(Array.isArray(approvalsData) ? approvalsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error('Error fetching approvals:', error);
        setApprovals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, filters]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      type: 'all',
      status: 'all',
      submittedBy: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  // Open processing modal
  const openProcessModal = (approval, action) => {
    setSelectedApproval(approval);
    setProcessingAction(action);
    setProcessingComments('');
    setShowProcessModal(true);
  };

  // Close processing modal
  const closeProcessModal = () => {
    setShowProcessModal(false);
    setSelectedApproval(null);
    setProcessingAction('');
    setProcessingComments('');
  };

  // Handle approval processing
  const handleProcessApproval = async () => {
    if (!selectedApproval) return;

    try {
      const result = await processApproval(selectedApproval.id, {
        action: processingAction,
        comments: processingComments
      });

      // Update the approval in the list
      setApprovals(prev => prev.map(approval => 
        approval.id === selectedApproval.id ? result : approval
      ));

      closeProcessModal();
      
      // Show success message
      alert(`Approval ${processingAction}d successfully!`);
    } catch (error) {
      console.error('Error processing approval:', error);
      alert(`Failed to ${processingAction} approval. Please try again.`);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get approval type display name
  const getApprovalTypeDisplay = (type) => {
    const typeMap = {
      'user_registration': 'User Registration',
      'motion_approval': 'Motion Approval',
      'task_approval': 'Task Approval'
    };
    return typeMap[type] || type;
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning text-dark';
      case 'approved':
        return 'bg-success text-white';
      case 'rejected':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary text-white';
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Outstanding Approvals Report</h2>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Filters</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-2">
              <label className="form-label">Approval Type</label>
              <select
                className="form-select"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="user_registration">User Registration</option>
                <option value="motion_approval">Motion Approval</option>
                <option value="task_approval">Task Approval</option>
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">Submitted By</label>
              <select
                className="form-select"
                value={filters.submittedBy}
                onChange={(e) => handleFilterChange('submittedBy', e.target.value)}
              >
                <option value="all">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">Date From</label>
              <input
                type="date"
                className="form-control"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Date To</label>
              <input
                type="date"
                className="form-control"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Approvals ({approvals.length})</h5>
        </div>
        <div className="card-body">
          {approvals.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No approvals found matching the current filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Date Submitted</th>
                    <th>Submitted By</th>
                    <th>Date Processed</th>
                    <th>Processed By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((approval) => (
                    <tr key={approval.id}>
                      <td>
                        <span className="badge bg-primary">
                          {getApprovalTypeDisplay(approval.type)}
                        </span>
                      </td>
                      <td>
                        <div className="text-truncate" style={{maxWidth: '200px'}}>
                          {approval.description || 'No description'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(approval.status)}`}>
                          {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                        </span>
                      </td>
                      <td>{formatDate(approval.dateSubmitted)}</td>
                      <td>{approval.submittedBy.fullName}</td>
                      <td>
                        {approval.dateProcessed ? formatDate(approval.dateProcessed) : '-'}
                      </td>
                      <td>
                        {approval.approvedBy ? approval.approvedBy.fullName : '-'}
                      </td>
                      <td>
                        {approval.status === 'pending' && (
                          <div className="btn-group btn-group-sm" role="group">
                            <button
                              className="btn btn-success"
                              onClick={() => openProcessModal(approval, 'approve')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => openProcessModal(approval, 'reject')}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Processing Modal */}
      {showProcessModal && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {processingAction.charAt(0).toUpperCase() + processingAction.slice(1)} Approval
                </h5>
                <button type="button" className="btn-close" onClick={closeProcessModal}></button>
              </div>
              <div className="modal-body">
                {selectedApproval && (
                  <div>
                    <div className="mb-3">
                      <strong>Type:</strong> {getApprovalTypeDisplay(selectedApproval.type)}
                    </div>
                    <div className="mb-3">
                      <strong>Description:</strong> {selectedApproval.description || 'No description'}
                    </div>
                    <div className="mb-3">
                      <strong>Submitted by:</strong> {selectedApproval.submittedBy.fullName}
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Comments (optional):</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={processingComments}
                        onChange={(e) => setProcessingComments(e.target.value)}
                        placeholder="Add any comments about this decision..."
                      ></textarea>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeProcessModal}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={`btn ${processingAction === 'approve' ? 'btn-success' : 'btn-danger'}`}
                  onClick={handleProcessApproval}
                >
                  {processingAction.charAt(0).toUpperCase() + processingAction.slice(1)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal backdrop */}
      {showProcessModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}

export default Approvals;