import React from 'react';

const CloseButton = ({ onClick, title = "Cerrar", className = "", style, ...props }) => {
  return (
    <div className={`close-button-container ${className}`} style={style}>
      <button className="button" onClick={onClick} title={title} type="button" {...props}>
        <span className="X" />
        <span className="Y" />

      </button>
    </div>
  );
}

export { CloseButton };
export default CloseButton;
