import React, { useState } from 'react';
import FacebookComment from './FacebookComment';

const CommentsSection = ({ 
  comments = [], 
  motionId, 
  userId, 
  onAddComment, 
  onEditComment, 
  onDeleteComment, 
  onReplyToComment 
}) => {
  const [newComment, setNewComment] = useState('');

  const handleAddComment = async () => {
    if (newComment.trim()) {
      await onAddComment(newComment);
      setNewComment('');
    }
  };

  const handleReply = async (parentId, text) => {
    await onReplyToComment(parentId, text);
  };

  const handleEdit = async (commentId, text) => {
    await onEditComment(commentId, text);
  };

  const handleDelete = async (commentId) => {
    await onDeleteComment(commentId);
  };

  // Filter top-level comments (no parentId)
  const topLevelComments = comments.filter(comment => !comment.parentId);

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ 
        fontSize: 16, 
        fontWeight: 600, 
        marginBottom: 16,
        color: '#050505'
      }}>
        Comments ({comments.length})
      </h3>
      
      {/* Add New Comment */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        alignItems: 'flex-start',
        marginBottom: 20,
        padding: '8px 12px',
        backgroundColor: '#f0f2f5',
        borderRadius: 16
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: '#1877f2',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          flexShrink: 0
        }}>
          You
        </div>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          style={{
            flex: 1,
            border: 'none',
            borderRadius: 16,
            padding: '8px 12px',
            fontSize: 14,
            outline: 'none',
            backgroundColor: 'white'
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
        />
        <button
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          style={{
            backgroundColor: newComment.trim() ? '#1877f2' : '#e4e6ea',
            color: newComment.trim() ? 'white' : '#65676b',
            border: 'none',
            borderRadius: 16,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: newComment.trim() ? 'pointer' : 'default'
          }}
        >
          Post
        </button>
      </div>
      
      {/* Comments List */}
      <div>
        {topLevelComments.length > 0 ? (
          topLevelComments.map(comment => (
            <FacebookComment
              key={comment.id}
              comment={comment}
              level={0}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              currentUserId={userId}
              allComments={comments}
            />
          ))
        ) : (
          <div style={{ 
            textAlign: 'center', 
            color: '#65676b', 
            fontStyle: 'italic',
            padding: 20 
          }}>
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsSection;