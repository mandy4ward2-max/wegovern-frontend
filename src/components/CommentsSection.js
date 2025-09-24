import React, { useState } from 'react';
import FacebookComment from './FacebookComment';
import MentionInput from './MentionInput';

const CommentsSection = ({ 
  comments = [], 
  motionId, 
  userId, 
  onAddComment, 
  onEditComment, 
  onDeleteComment, 
  onReplyToComment,
  users = [] // Array of organization users for mentions
}) => {
  const [newComment, setNewComment] = useState('');
  const [taggedUserIds, setTaggedUserIds] = useState([]);

  const handleAddComment = async () => {
    if (newComment.trim()) {
      await onAddComment(newComment, taggedUserIds);
      setNewComment('');
      setTaggedUserIds([]);
    }
  };

  const handleCommentChange = (text, mentionedUserIds) => {
    setNewComment(text);
    setTaggedUserIds(mentionedUserIds || []);
  };

  const handleReply = async (parentId, text) => {
    // Extract mentions from reply text as IDs for backend tagging
    const tagRegex = /@\[[^\]]+\]\(([^)]+)\)/g;
    const ids = [];
    let m;
    while ((m = tagRegex.exec(text)) !== null) {
      if (m[1]) ids.push(m[1]);
    }
    await onReplyToComment(parentId, text, ids);
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
        marginBottom: 20,
        padding: '8px 12px',
        backgroundColor: '#f0f2f5',
        borderRadius: 16
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start'
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
          <div style={{
            width: 'calc(100% - 100px)'
          }}>
            <MentionInput
              value={newComment}
              onChange={handleCommentChange}
              onSubmit={handleAddComment}
              placeholder="Write a comment..."
              users={users}
              // Explicitly force LTR for safety across browsers
              styleOverrides={{ direction: 'ltr', textAlign: 'left' }}
            />
          </div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 8
        }}>
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            style={{
              backgroundColor: newComment.trim() ? '#1877f2' : '#e4e6ea',
              color: newComment.trim() ? 'white' : '#65676b',
              border: 'none',
              borderRadius: 12,
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 600,
              cursor: newComment.trim() ? 'pointer' : 'default'
            }}
          >
            Post
          </button>
        </div>
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