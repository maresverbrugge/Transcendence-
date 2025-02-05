import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import axios from 'axios';

import { ChannelData } from '../interfaces';
import { emitter } from '../../emitter';

interface ChannelsProps {
  selectedChannelID: number | null;
  socket: Socket;
}

interface ChannelListItemProps {
  key: number;
  channel: ChannelData;
  handleClickChannel: (channelID: number) => void;
  unreadCounts: number;
}

const ChannelListItem = ({ channel, handleClickChannel, unreadCounts}: ChannelListItemProps) => {
  return (
    <li key={channel.ID} className="list-group-item align-items-center p-1">
      <button
        className="btn btn-link text-decoration-none p-1 pt-0 pb-0"
        onClick={() => handleClickChannel(channel.ID)}
      >
        {channel.name || `Channel ${channel.ID}`}
      </button>
      {unreadCounts > 0 && (
        <span className="badge bg-primary rounded-pill">{unreadCounts}</span>
      )}
    </li>
  )
}

const Channels = ({ selectedChannelID, socket }: ChannelsProps) => {
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const token = localStorage.getItem('authenticationToken');

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await axios.get<ChannelData[]>(`${process.env.REACT_APP_URL_BACKEND}/chat/channel/all/${token}`);
        setChannels(response.data);
        if (selectedChannelID && !response.data.some((channel) => channel.ID === selectedChannelID)) {
          emitter.emit('selectChannel', null)
        }
      } catch (error) {
        emitter.emit('error', error);
      }
    };

    fetchChannels();

    socket.on('updateChannel', fetchChannels);

    setUnreadCounts((prevCounts) => {
      if (!selectedChannelID) return prevCounts;
      return {
        ...prevCounts,
        [selectedChannelID]: 0,
      };
    });

    socket.on('newMessage', ({ channelID }: { channelID: number }) => {
      if (channelID !== selectedChannelID) {
        setUnreadCounts((prevCounts) => ({
          ...prevCounts,
          [channelID]: (prevCounts[channelID] || 0) + 1,
        }));
      }
    });

    return () => {
      socket.off('updateChannel', fetchChannels);
      socket.off('newMessage');
    };
  }, [selectedChannelID, socket]);

  const handleClickChannel = (channelID: number) => {
    var channel = channels.find((ch) => ch.ID === channelID);
    if (channelID === selectedChannelID) channel = null;
    if (channel?.passwordEnabled) {
      emitter.emit('showPasswordPrompt', channelID);
    }
    else {
      emitter.emit('selectChannel', channel ? channel.ID : null);
    }
  };

  return (
    <div className="col-12 col-sm-6 col-md-3 card shadow h-100" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-body p-0 pt-3 pb-3" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Top Section */}
        <div className="mb-3 text-center">
          <h2>Available Channels</h2>
        </div>

        {/* Scrollable Lists */}
        <div style={{ flexGrow: 1, overflowY: 'auto'}}>
          {/* Public Channels */}
          {channels.some((channel) => !channel.isPrivate) && (
            <div className="mb-3 text-center">
              <h5>Public Channels</h5>
              <ul className="list-group">
                {channels
                  .filter((channel) => !channel.isPrivate)
                  .map((channel) => (
                    <ChannelListItem
                      key={channel.ID}
                      channel={channel}
                      handleClickChannel={handleClickChannel}
                      unreadCounts={unreadCounts[channel.ID]}
                    />
                  ))}
              </ul>
            </div>
          )}

          {/* Private Channels */}
          {channels.some((channel) => channel.isPrivate && !channel.isDM) && (
            <div className="mb-3 text-center">
              <h5>Private Channels</h5>
              <ul className="list-group">
                {channels
                  .filter((channel) => channel.isPrivate && !channel.isDM)
                  .map((channel) => (
                    <ChannelListItem
                      key={channel.ID}
                      channel={channel}
                      handleClickChannel={handleClickChannel}
                      unreadCounts={unreadCounts[channel.ID]}
                    />
                  ))}
              </ul>
            </div>
          )}

          {/* Direct Messages */}
          {channels.some((channel) => channel.isDM) && (
            <div className="mb-3 text-center">
              <h5>Direct Messages</h5>
              <ul className="list-group">
                {channels
                  .filter((channel) => channel.isDM)
                  .map((channel) => (
                    <ChannelListItem
                      key={channel.ID}
                      channel={channel}
                      handleClickChannel={handleClickChannel}
                      unreadCounts={unreadCounts[channel.ID]}
                    />
                  ))}
              </ul>
            </div>
          )}
        </div>

        {/* Create New Channel Button */}
        <button
          type="button"
          className="btn btn-success"
          style={{ marginTop: 'auto' }}
          onClick={() => emitter.emit('createChannel')}
        >
          New Channel
        </button>
      </div>
    </div>
  )
};

export default Channels;
