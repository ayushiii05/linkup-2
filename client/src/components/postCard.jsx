import { BadgeCheck, Heart, MessageCircle, Share2, Send, X, MoreVertical, Trash2, Pencil } from 'lucide-react';
import React from 'react';
import moment from 'moment';
import { dummyUserData } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import api from '../api/axios';
import ShareModal from './ShareModal';



const PostCard = ({ post, onUpdate }) => {

  const postWithHastags = post.content.replace(/(#\w+)/g, '<span class = "text-indigo-600">$1</span>')
  const [likes, setLikes] = useState(post.likes_count);
  const currentUser = useSelector((state) => state.user.value)

  const { getToken } = useAuth();

  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Three-dot menu state
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const isOwnPost = currentUser?._id === post.user?._id;

  const handleLike = async () => {
    try {
      const { data } = await api.post(`/api/post/like`, { postId: post._id }, { headers: { Authorization: `Bearer ${await getToken()}` } })
      if (data.success) {
        toast.success(data.message)
        setLikes(prev => {
          if (prev.includes(currentUser._id)) {
            return prev.filter((id) => id !== currentUser._id)
          } else {
            return [...prev, currentUser._id]
          }
        })
      } else {
        toast(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleComment = async () => {
    if (!comment.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/post/comment', { postId: post._id, text: comment }, { headers: { Authorization: `Bearer ${await getToken()}` } })
      if (data.success) {
        setComments(prev => [data.comment, ...prev]);
        setComment('');
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    if (deleting) return;
    const confirmed = window.confirm('Are you sure you want to delete this post?');
    if (!confirmed) return;

    setDeleting(true);
    try {
      const token = await getToken();
      const { data } = await api.post('/api/post/delete', { postId: post._id }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        toast.success('Post deleted');
        if (onUpdate) onUpdate();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
      setShowMenu(false);
    }
  }

  const handleEdit = async () => {
    if (editing || !editContent.trim()) return;
    setEditing(true);
    try {
      const token = await getToken();
      const { data } = await api.post('/api/post/edit', { postId: post._id, content: editContent }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        toast.success('Post updated');
        if (onUpdate) onUpdate();
        setShowEditModal(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEditing(false);
    }
  }

  const navigate = useNavigate();
  return (
    <div onClick={() => navigate('/profile/' + post.user._id)} className='bg-white rounded-xl shadow p-4 space-y-4
    w-full max-w-2xl relative'>
      {/* user info */}
      <div className='flex items-center justify-between'>
        <div className='inline-flex items-center gap-3 cursor-pointer'>
          <img src={post.user.profile_picture} alt='' className='w-10 h-10 rounded-full shadow' />
          <div className='flex items-center space-x-1'>
            <span>{post.user.full_name}</span>
            <BadgeCheck className='w-4 h-4 text-blue-500' />
          </div>
          <div className='text-gray-500 text-sm'>@{post.user.username} . {moment(post.createdAt).fromNow()}</div>
        </div>

        {/* Three-dot menu - only show for own posts */}
        {isOwnPost && (
          <div className='relative' onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className='p-2 hover:bg-gray-100 rounded-full transition-colors'
            >
              <MoreVertical className='w-5 h-5 text-gray-500' />
            </button>

            {showMenu && (
              <div className='absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20 min-w-32'>
                <button
                  onClick={() => { setShowEditModal(true); setShowMenu(false); }}
                  className='flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors'
                >
                  <Pencil className='w-4 h-4' />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className='flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50'
                >
                  <Trash2 className='w-4 h-4' />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* post content */}
      {post.content && <div className='text-gray-800 text-sm
whitespace-pre-line' dangerouslySetInnerHTML={{ __html: postWithHastags }} />}
      {/* post media */}
      <div className='grid grid-cols-2 gap-2'>
        {post.image_urls.map((img, index) => (
          <img src={img} key={index} className={post.image_urls.length === 1 ? 'col-span-2 max-h-80 w-auto mx-auto rounded-lg' : 'w-full h-48 object-cover rounded-lg'} alt="" />))}
      </div>
      {/* post actions */}
      <div className='flex items-center gap-4 text-gray-600 text-sm pt-2 border-t border-gray-300'>
        <div className='flex items-center gap-1'>
          <Heart className={`w-4 h-4 cursor-pointer ${likes.includes(currentUser._id) && 'fill-red-500 text-red-500'}`} onClick={(e) => { e.stopPropagation(); handleLike(); }} />
          <span>
            {likes.length}
          </span>

        </div>
        <div className='flex items-center gap-1 cursor-pointer' onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}>
          <MessageCircle className='w-4 h-4' />
          <span>{comments.length}</span>

        </div>
        <div className='flex items-center gap-1 cursor-pointer' onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}>
          <Share2 className="w-4 h-4" />
          <span>{post.shares?.length || 0}</span>
        </div>
      </div>

      {showComments && (
        <div className='mt-4 pt-4 border-t border-gray-100' onClick={(e) => e.stopPropagation()}>
          <div className='flex items-center gap-2'>
            <input
              type="text"
              placeholder="Write a comment..."
              className='flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-indigo-500 bg-gray-50'
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleComment(); }}
              disabled={loading || !comment.trim()}
              className='text-indigo-600 p-2 hover:bg-indigo-50 rounded-full disabled:opacity-50 transition-colors'
            >
              <Send className='w-5 h-5' />
            </button>
          </div>

          <div className='mt-4 space-y-4 max-h-64 overflow-y-auto scrollbar-hide'>
            {comments.length > 0 ? comments.map((c, i) => (
              <div key={i} className='flex gap-3 items-start group'>
                <img src={c.user?.profile_picture || dummyUserData.profile_picture} alt="" className='w-8 h-8 rounded-full object-cover flex-shrink-0' />
                <div className='flex-1'>
                  <div className='bg-gray-100 rounded-2xl p-2 px-3 inline-block'>
                    <p className='font-semibold text-xs text-gray-900'>{c.user?.username || c.user?.full_name || 'Unknown User'}</p>
                    <p className='text-sm text-gray-700'>{c.text}</p>
                  </div>
                  <p className='text-[10px] text-gray-500 mt-1 ml-1'>{moment(c.createdAt).fromNow()}</p>
                </div>
              </div>
            )) : <p className='text-center text-gray-500 text-sm py-2'>No comments yet.</p>}
          </div>
        </div>
      )}

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} post={post} />

      {/* Edit Modal */}
      {showEditModal && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4' onClick={(e) => { e.stopPropagation(); setShowEditModal(false); }}>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-lg p-6' onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-semibold'>Edit Post</h2>
              <button onClick={() => setShowEditModal(false)} className='p-2 hover:bg-gray-100 rounded-full'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className='w-full h-32 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-indigo-500 resize-none'
              placeholder='What do you want to share?'
            />
            <div className='flex justify-end gap-3 mt-4'>
              <button
                onClick={() => setShowEditModal(false)}
                className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={editing || !editContent.trim()}
                className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50'
              >
                {editing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>)
}
export default PostCard;