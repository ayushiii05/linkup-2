import { BadgeCheck, X, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const StoryViewer = ({ viewStory, setViewStory, onStoryDeleted }) => {
    const [progress, setProgress] = useState(0)
    const { getToken } = useAuth();
    const { user: currentUser } = useUser();
    const [deleting, setDeleting] = useState(false);

    const handleDeleteStory = async () => {
        if (deleting) return;

        const confirmed = window.confirm('Are you sure you want to delete this story?');
        if (!confirmed) return;

        setDeleting(true);
        try {
            const token = await getToken();
            const { data } = await api.post('/api/story/delete',
                { storyId: viewStory._id },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (data.success) {
                toast.success('Story deleted');
                setViewStory(null);
                if (onStoryDeleted) onStoryDeleted();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete story');
        } finally {
            setDeleting(false);
        }
    };

    const isOwnStory = currentUser?.id === viewStory?.user?._id;

    useEffect(() => {
        let timer, progressInterval;
        if (viewStory && viewStory.media_type !== 'video') {
            setProgress(0)
            const duration = 10000;
            const setTime = 100;
            let elapsed = 0;

            progressInterval = setInterval(() => {
                elapsed += setTime;
                setProgress((elapsed / duration) * 100)
            }, setTime);
            timer = setTimeout(() => {
                setViewStory(null)
            }, duration)
        }
        return () => {
            clearTimeout(timer);
            clearInterval(progressInterval)
        }
    }, [viewStory, setViewStory])
    const handleClose = () => {
        setViewStory(null);
    }

    if (!viewStory) return null

    const renderContent = () => {
        switch (viewStory.media_type) {
            case 'image':
                return (
                    <img src={viewStory.media_url} alt="story" className='max-h-[90vh] max-w-[90vw] object-contain' />
                );
            case 'video':
                return (
                    <video onEnded={() => setViewStory(null)} src={viewStory.media_url} className='max-h-[90vh] max-w-[90vw]' controls autoPlay />
                );
            case 'text':
                return (
                    <div className='p-6 text-white text-2xl sm:text-4xl font-medium text-center' style={{ backgroundColor: viewStory.background_color }}>
                        {viewStory.content}
                    </div>
                );

            default:
                return null;
        }
    }
    return (
        <div className='fixed inset-0 h-screen bg-black bg-opacity-90 z-110 flex items-center justify-center'
            style={{ backgroundColor: viewStory.media_type === 'text' ? viewStory.background_color : 'rgba(0,0,0,0.9)' }}>

            {/* progress bar*/}
            <div className='absolute top-0 left-0 w-full h-1 bg-gray-700'>
                <div className='h-full bg-white transition-all duration-100 linear' style={{ width: `${progress}%` }}>
                </div>
            </div>
            {/* user info */}
            <div className='absolute top-4 left-4 flex items-center space-x-3 p-2 px-4 
 sm:p-4 sm:px-8 backdrop-blur-2xl rounded bg-black/50'>
                <img src={viewStory.user?.profile_picture} alt='' className='size-7 sm:size-8 rounded-full object-cover border border-white' />
                <div className='text-white font-medium flex items-center gap-1.5'>
                    <span>{viewStory.user?.full_name}</span>
                    <BadgeCheck size={18} />
                </div>
            </div>

            {/* Action buttons */}
            <div className='absolute top-4 right-4 flex items-center gap-3'>
                {/* Delete button - only show for own stories */}
                {isOwnStory && (
                    <button
                        onClick={handleDeleteStory}
                        disabled={deleting}
                        className='text-white p-2 rounded-full bg-red-500/70 hover:bg-red-600 transition focus:outline-none disabled:opacity-50'
                    >
                        <Trash2 className='w-5 h-5' />
                    </button>
                )}
                {/* Close button */}
                <button onClick={handleClose} className='text-white text-3xl font-bold focus:outline-none'>
                    <X className='w-8 h-8 hover:scale-110 transition cursor-pointer' />
                </button>
            </div>

            {/* story content */}

            <div className='max-w-[90vw] max-h-[90vh] flex items-center justify-center'>
                {renderContent()}
            </div>

        </div>
    )
}
export default StoryViewer;