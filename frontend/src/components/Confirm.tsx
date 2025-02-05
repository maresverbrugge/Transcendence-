import React, { useEffect, useRef, useState } from 'react';
import { emitter } from './emitter';

const Confirm = () => {
  const confirmBoxRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [onOKFunction, setonOKFunction] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {

    const confirmHandler = ({ message, onOK }: { message: string, onOK: () => void }) => {
      setShowConfirm(true);
      setMessage(message);
      setonOKFunction(() => onOK);
    };

    emitter.on('confirm', confirmHandler);

    return () => {
      emitter.off('confirm', confirmHandler);
    };
  }, []);


  useEffect(() => {
      confirmBoxRef.current?.focus();
    }, [showConfirm]);
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && onOKFunction) {
      setShowConfirm(false);
      onOKFunction();
    } else if (event.key === 'Escape') {
      setShowConfirm(false);
    }
  };

  const handleOkClick = () => {
    if (onOKFunction) {
      onOKFunction();
      setShowConfirm(false);
    }
  };

  return (
    <>
      {showConfirm && message && onOKFunction && (
        <div
          className="d-flex flex-column justify-content-center align-items-center"
          onClick={() => {setShowConfirm(false)}}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9995,
          }}
        >
          <div
            className="alert alert-dismissible alert-warning"
            ref={confirmBoxRef}
            tabIndex={0} // Make the div focusable
            onKeyDown={handleKeyDown}
            style={{
              zIndex: 9996,
              maxWidth: "500px",
              padding: "20px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <h4 className="alert-heading">Alert!</h4>
            <p className="message">{message}</p>
            <button
              type="button"
              className="btn btn-outline-light m-1"
              onClick={() => setShowConfirm(false)}
            >Cancel</button>
            <button
              type="button"
              className="btn btn-outline-light m-1"
              onClick={handleOkClick}
            >OK</button>
          </div>
        </div>
        )}
    </>
  );
};

export default Confirm;