import React, { useEffect, useRef, useState } from 'react';
import { dummyUserData } from '../assets/assets';
import { ImageIcon, SendHorizonal, Clock, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { addMessage, fetchMessages, resetMessages } from '../features/messages/messagesSlice';
import toast from 'react-hot-toast';
import { useAuth } from '@clerk/clerk-react';

const ChatBox = () => {
  // ✅ Ensure messages is always an array
  const messages = useSelector((state) => state.messages.messages) || [];
  const connections = useSelector((state) => state.connections.connections) || [];

  const { userId } = useParams();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [user, setUser] = useState(dummyUserData);
  const messagesEndRef = useRef(null);

  // Schedule message state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // ✅ Fetch messages
  const fetchUserMessages = async () => {
    try {
      const token = await getToken();
      dispatch(fetchMessages({ token, userId }));
    } catch (error) {
      toast.error(error.message || 'Failed to fetch messages');
    }
  };

  // ✅ Send message handler
  const sendMessage = async () => {
    try {
      if (!text && !image) return;

      const token = await getToken();
      const formData = new FormData();
      formData.append('to_user_id', userId);
      formData.append('text', text);
      if (image) formData.append('image', image);

      const { data } = await api.post('/api/message/send', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setText('');
        setImage(null);
        dispatch(addMessage(data.message));
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to send message');
    }
  };

  // Schedule message handler
  const scheduleMessage = async () => {
    try {
      if (!text || !scheduledTime) {
        toast.error('Please enter a message and select a time');
        return;
      }

      setScheduling(true);
      const token = await getToken();

      const { data } = await api.post('/api/message/schedule', {
        to_user_id: userId,
        text: text,
        scheduled_time: scheduledTime
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        toast.success('Message scheduled!');
        setText('');
        setScheduledTime('');
        setShowScheduleModal(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to schedule message');
    } finally {
      setScheduling(false);
    }
  };

  // ✅ Load messages when user changes + poll every 5 seconds
  useEffect(() => {
    fetchUserMessages();

    // Poll for new messages every 5 seconds (for scheduled messages)
    const pollInterval = setInterval(() => {
      fetchUserMessages();
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      dispatch(resetMessages());
    };
  }, [userId]);

  // ✅ Set the user for chat
  useEffect(() => {
    if (connections.length > 0) {
      const foundUser = connections.find((c) => c._id === userId);
      if (foundUser) setUser(foundUser);
    }
  }, [userId, connections]);

  // ✅ Auto scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get minimum datetime (now + 1 minute)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  // ✅ Safe sort (no .toSorted)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  return (
    user && (
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center gap-2 p-2 md:px-10 xl:pl-42 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-300">
          <img src={user.profile_picture} alt="" className="size-8 rounded-full" />
          <div>
            <p className="font-medium">{user.full_name}</p>
            <p className="text-sm text-gray-500 -mt-1.5">@{user.username}</p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="p-5 md:px-10 h-full overflow-y-scroll">
          <div className="space-y-4 max-w-4xl mx-auto">
            {sortedMessages.map((message) => (
              <div
                key={message._id || message.id || `${message.createdAt}-${Math.random()}`}
                className={`flex flex-col ${message.to_user_id !== user._id ? 'items-start' : 'items-end'
                  }`}
              >
                <div
                  className={`p-2 text-sm max-w-sm bg-white text-slate-700 rounded-lg shadow ${message.to_user_id !== user._id ? 'rounded-bl-none' : 'rounded-br-none'
                    }`}
                >
                  {message.message_type === 'image' && (
                    <img
                      src={message.media_url}
                      alt=""
                      className="w-full max-w-sm rounded-lg mb-1"
                    />
                  )}
                  {message.message_type === 'post' && message.post_id && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden mb-2 bg-gray-50">
                      {/* Shared post header */}
                      <div className="flex items-center gap-2 p-2 bg-indigo-50">
                        <img
                          src={message.post_id.user?.profile_picture || dummyUserData.profile_picture}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-xs font-medium text-gray-700">
                          {message.post_id.user?.full_name || 'User'}
                        </span>
                      </div>
                      {/* Post content */}
                      {message.post_id.content && (
                        <p className="px-2 py-1 text-xs text-gray-600 line-clamp-3">{message.post_id.content}</p>
                      )}
                      {/* Post image */}
                      {message.post_id.image_urls?.length > 0 && (
                        <img
                          src={message.post_id.image_urls[0]}
                          alt=""
                          className="w-full h-32 object-cover"
                        />
                      )}
                    </div>
                  )}
                  {message.text && <p>{message.text}</p>}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="px-4">
          <div className="flex items-center gap-3 pl-5 p-1.5 bg-white w-full max-w-xl mx-auto border border-gray-200 shadow rounded-full mb-5">
            <input
              type="text"
              className="flex-1 outline-none text-slate-700"
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              onChange={(e) => setText(e.target.value)}
              value={text}
            />

            <label htmlFor="image">
              {image ? (
                <img src={URL.createObjectURL(image)} alt="" className="h-8 rounded" />
              ) : (
                <ImageIcon className="size-7 text-gray-400 cursor-pointer" />
              )}
              <input
                type="file"
                id="image"
                accept="image/*"
                hidden
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </label>

            {/* Schedule button */}
            <button
              onClick={() => setShowScheduleModal(true)}
              className="text-gray-400 hover:text-indigo-500 p-1 transition-colors"
              title="Schedule message"
            >
              <Clock size={22} />
            </button>

            <button
              onClick={sendMessage}
              className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-800 active:scale-95 cursor-pointer text-white p-2 rounded-full"
            >
              <SendHorizonal size={18} />
            </button>
          </div>
        </div>

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Schedule Message</h2>
                <button onClick={() => setShowScheduleModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Message</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-indigo-500 resize-none h-20"
                    placeholder="Type your message..."
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Send at</label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    min={getMinDateTime()}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={scheduleMessage}
                  disabled={scheduling || !text || !scheduledTime}
                  className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors disabled:opacity-50"
                >
                  {scheduling ? 'Scheduling...' : 'Schedule Message'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  );
};

export default ChatBox;