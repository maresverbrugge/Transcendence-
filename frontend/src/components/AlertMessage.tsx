import React, { useEffect, useRef } from 'react';

interface AlertMessageProps {
  message: string;
  onClose: () => void;
}

const AlertMessage = ({ message, onClose }: AlertMessageProps) => {
  const alertBoxRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    // Focus the alert box when it mounts
    alertBoxRef.current?.focus();
  }, [alertBoxRef]);

  return (
    <>
      {message && (
        <>
          <div
            className="d-flex flex-column justify-content-center align-items-center"
            onClick={onClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 9999,
            }}
          >
            <div
              className="alert alert-dismissible alert-warning"
              onKeyDown={handleKeyDown}
              ref={alertBoxRef}
              tabIndex={0} // Make the div focusable
              style={{
                zIndex: 10000,
                maxWidth: "500px",
                padding: "20px",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              />
              <h4 className="alert-heading">Alert!</h4>
              <p className="mb-0">{message}</p>
            </div>
          </div>

        </>
      )}
    </>
  );
  
};

export default AlertMessage;
