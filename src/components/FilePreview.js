
import React from "react";

export default function FilePreview({ url, name }) {
  const ext = (name || url || "").split(".").pop().toLowerCase();
  // Always use backend base URL for relative paths
  const backendBase = 'http://localhost:3000';
  const isAbsolute = url?.startsWith('http://') || url?.startsWith('https://');
  const fullUrl = isAbsolute ? url : backendBase + (url?.startsWith('/') ? url : '/' + url);
  const [text, setText] = React.useState(null);
  React.useEffect(() => {
    if (["txt","md","csv","log"].includes(ext)) {
      fetch(fullUrl).then(r => r.text()).then(setText);
    }
  }, [fullUrl, ext]);

  // Images
  if (["png","jpg","jpeg","gif","bmp","webp","svg"].includes(ext)) {
    return <img src={fullUrl} alt={name} style={{ maxWidth: "70vw", maxHeight: "60vh", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />;
  }
  // Audio
  if (["mp3","wav","ogg","aac","flac","m4a"].includes(ext)) {
    return <audio controls src={fullUrl} style={{ width: "100%" }} />;
  }
  // Video
  if (["mp4","webm","ogg","mov","avi","mkv"].includes(ext)) {
    return <video controls src={fullUrl} style={{ maxWidth: "70vw", maxHeight: "60vh" }} />;
  }
  // PDF and Office and all other non-text/csv files: download link only
  if (["pdf","doc","docx","xls","xlsx","ppt","pptx"].includes(ext)) {
    return (
      <div style={{textAlign: 'center'}}>
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline', fontWeight: 'bold', fontSize: 18 }}>View file</a>
        <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>(No inline preview available)</div>
      </div>
    );
  }
  // Text/CSV
  if (["txt","md","csv","log"].includes(ext)) {
    return <pre style={{ width: '70vw', maxHeight: '60vh', overflow: 'auto', background: '#fafbfc', borderRadius: 8, padding: 12 }}>{text || 'Loading...'}</pre>;
  }
  // Fallback: download link for all other types
  return <div style={{ textAlign: 'center' }}>
    <div style={{ color: '#888', marginBottom: 12 }}>Preview not available for this file type.</div>
    <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}>Download</a>
  </div>;
}
