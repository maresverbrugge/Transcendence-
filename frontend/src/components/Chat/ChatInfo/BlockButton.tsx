import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { emitter } from '../../emitter';

interface BlockButtonProps {
  userID: number;
  blockedUserIDs: number[];
}

const BlockButton = ({ userID, blockedUserIDs }: BlockButtonProps) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const token = localStorage.getItem('authenticationToken');

  useEffect(() => {
    setIsBlocked(blockedUserIDs.includes(userID));
  }, [userID, blockedUserIDs]);

  const handleToggleBlock = async () => {
    const action = isBlocked ? 'unblock' : 'block';
    try {
      await axios.post(`${process.env.REACT_APP_URL_BACKEND}/chat/blockedUser/${token}/${action}`, { userID });
      setIsBlocked(!isBlocked);
    } catch (error) {
      emitter.emit('error', error);
    }
  };

  return <button className='dropdown-item text-primary-emphasis' onClick={handleToggleBlock}>{isBlocked ? 'Unblock' : 'Block'}</button>;
};

export default BlockButton;
