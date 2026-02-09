import { X, Search, Send, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { dummyUserData } from '../assets/assets';

const ShareModal = ({ isOpen, onClose, post }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { getToken } = useAuth();
    const [sendingMap, setSendingMap] = useState({}); // Track sending state per user

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            setSearchTerm('');
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const { data } = await api.get('/api/user/connections', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                // Combine connections and following, remove duplicates and current user
                // Assuming data returns user objects populated
                const allUsers = [...(data.connections || []), ...(data.following || [])];
                const uniqueUsersMap = new Map();

                allUsers.forEach(u => {
                    if (u && u._id) {
                        uniqueUsersMap.set(u._id, u);
                    }
                });

                setUsers(Array.from(uniqueUsersMap.values()));
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async (user) => {
        if (sendingMap[user._id]) return;

        setSendingMap(prev => ({ ...prev, [user._id]: 'loading' }));
        try {
            const token = await getToken();
            // Note: Update backend to handle 'post_id' or 'postId' consistently. 
            // My previous edit used 'postId' in body and mapped to 'post_id' in DB.
            const { data } = await api.post('/api/message/send', {
                to_user_id: user._id,
                postId: post._id,
                text: `Shared a post` // Optional text
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success) {
                toast.success(`Shared with ${user.username}`);
                setSendingMap(prev => ({ ...prev, [user._id]: 'sent' }));
                // Optional: Close modal after one share? Or keep open for multiple? behavior: keep open
            } else {
                toast.error(data.message);
                setSendingMap(prev => ({ ...prev, [user._id]: 'error' }));
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Share failed');
            setSendingMap(prev => ({ ...prev, [user._id]: 'error' }));
        }
    };

    if (!isOpen) return null;

    const filteredUsers = users.filter(user =>
        (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Share Post</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search people..."
                            className="w-full bg-gray-50 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all border-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredUsers.length > 0 ? (
                        <div className="space-y-1">
                            {filteredUsers.map(user => {
                                const status = sendingMap[user._id];
                                return (
                                    <div key={user._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className='relative'>
                                                <img
                                                    src={user.profile_picture || dummyUserData.profile_picture}
                                                    alt={user.username}
                                                    className="w-10 h-10 rounded-full object-cover border border-gray-100"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900 line-clamp-1">{user.full_name}</p>
                                                <p className="text-xs text-gray-500">@{user.username}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleShare(user)}
                                            disabled={status === 'loading' || status === 'sent'}
                                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 
                                            ${status === 'sent'
                                                    ? 'bg-green-50 text-green-600 border border-green-200'
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                                                } disabled:opacity-70 disabled:cursor-not-allowed`}
                                        >
                                            {status === 'loading' ? 'Sending...' : status === 'sent' ? 'Sent' : 'Send'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <p className="text-sm">No connections found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
