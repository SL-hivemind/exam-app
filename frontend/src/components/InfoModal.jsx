import React from 'react';
import Modal from 'react-modal';

// Basic styling for the modal
// Styling for the modal with responsive fixes
const customStyles = {
  content: {
    top: '55%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    border: 'none',
    
    // --- RESPONSIVE FIXES ---
    maxHeight: '90vh', // 1. Limit the height to 90% of the viewport height
    overflowY: 'auto', // 2. Add a scrollbar if content is too tall
    
    // Original styles
    maxWidth: '500px',
    width: '90%',
    textAlign: 'center',
    padding: '30px',
    borderRadius: '10px',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 1000 // 3. Ensure the overlay is on top of everything (like your navbar)
  }
};

// Bind the modal to your app element for accessibility
Modal.setAppElement('#root');

function InfoModal({ isOpen, onClose, title, imageUrl, children }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel="Info Modal"
    >
      <h2>{title}</h2>
      {imageUrl && <img src={imageUrl} alt={title} style={{ maxWidth: '100%', height: 'auto', margin: '20px 0' }} />}
      <div>{children}</div>
      <button onClick={onClose} style={{ marginTop: '20px', padding: '10px 20px' }}>
        Got it!
      </button>
    </Modal>
  );
}

export default InfoModal;