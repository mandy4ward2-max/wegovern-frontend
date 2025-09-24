import React, { useState, useRef, useEffect } from 'react';
import MentionPicker from './MentionPicker';

const MentionInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Write a comment...',
  users = [],
  disabled = false,
  styleOverrides = {}
}) => {
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [taggedUsers, setTaggedUsers] = useState([]);
  
  const inputRef = useRef(null);
  // Track whether the latest value change came from user typing vs programmatic updates
  const lastChangeSource = useRef('init'); // 'user' | 'mention' | 'external' | 'init'
  const mentionPickerRef = useRef(null);

  // Parse mentions from text (format: @[UserName](userId))
  const parseMentionsFromText = (text) => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push({
        id: match[2],
        name: match[1],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    return mentions;
  };



  // Get tagged user IDs from text
  const getTaggedUserIds = (text) => {
    const mentions = parseMentionsFromText(text);
    return mentions.map(mention => mention.id === 'everyone' ? 'everyone' : mention.id);
  };

  // Render mentions with styled tags for contentEditable
  const renderMentionText = (text) => {
    if (!text) return '';
    
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let result = text;
    
    result = result.replace(mentionRegex, (match, name, id) => {
      return `<span class="mention-tag" contenteditable="false" data-mention-id="${id}" style="color: #1877f2; font-weight: 600; background-color: rgba(24, 119, 242, 0.1); padding: 2px 6px; border-radius: 4px; margin: 0 1px; display: inline-block; cursor: pointer;">@${name}</span>`;
    });
    
    return result;
  };

  const handleInputChange = (e) => {
    // Mark this change as coming from the user so we don't overwrite caret position
    lastChangeSource.current = 'user';
    const htmlContent = e.target.innerHTML;
    const textContent = e.target.textContent || '';
    
  // Convert HTML back to our mention format
    let newValue = htmlContent;
    
    // Replace mention spans back to markup format
    newValue = newValue.replace(/<span[^>]*class="mention-tag"[^>]*data-mention-id="([^"]*)"[^>]*>@([^<]*)<\/span>/g, '@[$2]($1)');
    
    // Remove any other HTML tags
    newValue = newValue.replace(/<[^>]*>/g, '');
    // Decode common HTML entities that contentEditable may emit
    newValue = newValue
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Get absolute cursor position within the entire contentEditable
    const getCaretCharacterOffsetWithin = (element) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return 0;
      const range = sel.getRangeAt(0);
      const preRange = range.cloneRange();
      preRange.selectNodeContents(element);
      preRange.setEnd(range.endContainer, range.endOffset);
      return preRange.toString().length;
    };
    const cursorPos = getCaretCharacterOffsetWithin(inputRef.current);
    setCursorPosition(cursorPos);
    
    // Check if user typed @ to trigger mention picker
  const textBeforeCursor = textContent.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Check if there's a space or other special character after @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStartIndex(lastAtIndex);
        setMentionSearchQuery(textAfterAt);
        
        // Calculate position for mention picker - position it below the input
        const inputRect = inputRef.current.getBoundingClientRect();
        setMentionPosition({
          top: inputRect.bottom + 4,
          left: inputRect.left
        });
        
        setShowMentionPicker(true);
      } else {
        setShowMentionPicker(false);
      }
    } else {
      setShowMentionPicker(false);
    }
    
    onChange(newValue, getTaggedUserIds(newValue));
  };

  const handleKeyDown = (e) => {
    // Handle Enter key
    if (e.key === 'Enter' && !showMentionPicker) {
      e.preventDefault();
      onSubmit();
      return;
    }

    // Handle mention deletion with backspace/delete
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        
        // Check if we're about to delete a mention tag
        let mentionElement = null;
        if (startContainer.nodeType === Node.TEXT_NODE) {
          mentionElement = startContainer.parentElement;
        } else {
          mentionElement = startContainer;
        }
        
        if (mentionElement && mentionElement.classList && mentionElement.classList.contains('mention-tag')) {
          e.preventDefault();
          mentionElement.remove();
          
          // Update the value after deletion
          setTimeout(() => {
            const htmlContent = inputRef.current.innerHTML;
            let newValue = htmlContent.replace(/<span[^>]*class="mention-tag"[^>]*data-mention-id="([^"]*)"[^>]*>@([^<]*)<\/span>/g, '@[$2]($1)');
            newValue = newValue.replace(/<[^>]*>/g, '');
            onChange(newValue, getTaggedUserIds(newValue));
          }, 0);
        }
      }
    }
  };

  const handleMentionSelect = (user) => {
    if (mentionStartIndex === -1) return;

    const displayName = user.id === 'everyone'
      ? 'Everyone'
      : (user.fullName || user.email?.split('@')[0] || 'User');
    const markup = user.id === 'everyone'
      ? '@[Everyone](everyone)'
      : `@[${displayName}](${user.id})`;

    // Replace the typed @query (from mentionStartIndex to cursorPosition) in the DOM with a non-editable span
    const el = inputRef.current;
    if (!el) return;

    // Helper to locate a DOM position by absolute text offset
    const locate = (element, target) => {
      let node = element.firstChild;
      let count = 0;
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const len = node.textContent.length;
          if (count + len >= target) {
            return { node, offset: target - count };
          }
          count += len;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const len = node.textContent.length;
          if (count + len >= target) {
            // Descend into element
            return locate(node, target - count);
          }
          count += len;
        }
        node = node.nextSibling;
      }
      // Fallback to end
      return { node: element, offset: element.childNodes.length };
    };

    const startPos = locate(el, mentionStartIndex);
    const endPos = locate(el, cursorPosition);
    const range = document.createRange();
    try {
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);
    } catch (_) {
      // If invalid, bail out gracefully
      return;
    }

    // Create the mention span
    const span = document.createElement('span');
    span.className = 'mention-tag';
    span.setAttribute('contenteditable', 'false');
    span.setAttribute('data-mention-id', user.id);
    span.style.color = '#1877f2';
    span.style.fontWeight = '600';
    span.style.backgroundColor = 'rgba(24, 119, 242, 0.1)';
    span.style.padding = '2px 6px';
    span.style.borderRadius = '4px';
    span.style.margin = '0 1px';
    span.style.display = 'inline-block';
    span.style.cursor = 'pointer';
    span.textContent = `@${displayName}`;

    // Replace range with the mention span and a trailing space
    range.deleteContents();
    range.insertNode(span);
    const space = document.createTextNode(' ');
    span.after(space);

    // Update value from DOM by converting spans back to markup
    const htmlContent = el.innerHTML;
    let newValue = htmlContent.replace(/<span[^>]*class="mention-tag"[^>]*data-mention-id="([^"]*)"[^>]*>@([^<]*)<\/span>/g, '@[$2]($1)');
    newValue = newValue.replace(/<[^>]*>/g, '');
    // Decode common HTML entities
    newValue = newValue
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    lastChangeSource.current = 'mention';
    onChange(newValue, getTaggedUserIds(newValue));

    // Move caret after the inserted space
    const placeCaret = () => {
      const sel = window.getSelection();
      if (!sel) return;
      sel.removeAllRanges();
      const afterRange = document.createRange();
      afterRange.setStart(space, 1);
      afterRange.collapse(true);
      sel.addRange(afterRange);
      // Ensure focus remains
      if (document.activeElement !== el) el.focus();
    };
    // Try twice to survive re-render
    requestAnimationFrame(() => {
      placeCaret();
      requestAnimationFrame(placeCaret);
    });

    setShowMentionPicker(false);
    setMentionStartIndex(-1);
    setMentionSearchQuery('');
  };



  const handleClickOutside = (e) => {
    // Don't close if clicking on the input
    if (inputRef.current && inputRef.current.contains(e.target)) {
      return;
    }
    
    // Don't close if clicking on the mention picker
    if (mentionPickerRef.current && mentionPickerRef.current.contains(e.target)) {
      return;
    }
    
    // Close the picker if clicking elsewhere
    setShowMentionPicker(false);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep the DOM in sync when value changes externally (e.g., cleared after submit or mention inserted)
  useEffect(() => {
    if (!inputRef.current) return;
    // For normal typing, do not reset innerHTML to preserve caret and typing direction
    const shouldSync = lastChangeSource.current !== 'user' || value === '';
    if (!shouldSync) return;
    const desired = renderMentionText(value);
    if (inputRef.current.innerHTML !== desired) {
      inputRef.current.innerHTML = desired;
    }
  }, [value]);

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div
        ref={inputRef}
        contentEditable
        suppressContentEditableWarning={true}
        onInput={handleInputChange}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        disabled={disabled}
        dir="ltr"
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 16,
          padding: '8px 12px',
          fontSize: 14,
          outline: 'none',
          backgroundColor: 'white',
          minHeight: '20px',
          cursor: 'text',
          direction: 'ltr',
          textAlign: 'left',
          unicodeBidi: 'plaintext',
          ...styleOverrides
        }}
      />
      
      <MentionPicker
        ref={mentionPickerRef}
        users={users}
        isVisible={showMentionPicker}
        position={mentionPosition}
        searchQuery={mentionSearchQuery}
        onSelect={handleMentionSelect}
        onClose={() => setShowMentionPicker(false)}
      />
    </div>
  );
};

export default MentionInput;