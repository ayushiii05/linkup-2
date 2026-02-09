import Post from '../models/Post.js';
import imageKit from '../configs/imageKit.js';
import User from '../models/User.js';
import Comment from '../models/Comment.js';

//add post

export const addPost = async (req, res) => {
    try {
        const { userId } = req.auth;

        const { content, post_type } = req.body;
        const images = req.files;

        let image_urls = [];
        if (images.length > 0) {
            image_urls = await Promise.all(images.map(async (image) => {
                const response = await imageKit.upload({
                    file: image.buffer,
                    fileName: image.originalname,
                    folder: 'posts',
                });
                const url = imageKit.url({
                    path: response.filePath,
                    transformation: [
                        { quality: 'auto' },
                        { format: 'webp' },
                        { width: '1280' }
                    ]
                });
                return url;
            })
            )
        }
        await Post.create({
            user: userId,
            content,
            image_urls,
            post_type,
        })
        res.json({ success: true, message: "Post created successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }

}

//get posts

export const getFeedPosts = async (req, res) => {
    try {
        console.log('getFeedPosts called');
        const { userId } = req.auth;
        console.log('User ID:', userId);
        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found');
            return res.json({ success: false, message: 'User not found' });
        }
        //user connections and followings
        const userIds = [userId, ...user.connections, ...user.following]
        console.log('Fetching posts for users:', userIds);
        // Debug: Check raw comments before populate
        const rawPosts = await Post.find({ user: { $in: userIds } }).sort({ createdAt: -1 });
        if (rawPosts.length > 0 && rawPosts[0].comments.length > 0) {
            console.log('Raw first post comment IDs:', rawPosts[0].comments);
        }

        const posts = await Post.find({ user: { $in: userIds } })
            .populate('user')
            .populate({ path: 'comments', populate: { path: 'user' } })
            .sort({ createdAt: -1 });
        console.log('Posts fetched:', posts.length);
        if (posts.length > 0 && posts[0].comments.length > 0) {
            console.log('First comment user:', posts[0].comments[0].user);
        }
        res.json({ success: true, posts });

    } catch (error) {
        console.log('Error in getFeedPosts:', error);
        res.json({ success: false, message: error.message });
    }
}


// like post
export const likePost = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { postId } = req.body;
        const post = await Post.findById(postId);

        if (post.likes_count.includes(userId)) {
            post.likes_count = post.likes_count.filter(user => user !== userId)
            await post.save();
            res.json({ success: true, message: 'post unliked' })
        } else {
            post.likes_count.push(userId);
            await post.save();
            res.json({ success: true, message: 'post liked' })
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// add comment
export const addComment = async (req, res) => {
    try {
        const { userId } = req.auth;
        console.log('addComment userId:', userId); // Check this log!
        const { postId, text } = req.body;
        const post = await Post.findById(postId);
        if (!post) {
            return res.json({ success: false, message: 'Post not found' });
        }
        const comment = await Comment.create({
            user: userId,
            post: postId,
            text
        });
        post.comments.push(comment._id);
        await post.save();
        await comment.populate('user', 'username profile_picture full_name');
        res.json({ success: true, message: 'Comment added', comment });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// delete post
export const deletePost = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { postId } = req.body;

        const post = await Post.findById(postId);
        if (!post) {
            return res.json({ success: false, message: 'Post not found' });
        }

        // Check if user owns the post
        if (post.user.toString() !== userId) {
            return res.json({ success: false, message: 'Not authorized to delete this post' });
        }

        // Delete associated comments
        await Comment.deleteMany({ post: postId });

        // Delete the post
        await Post.findByIdAndDelete(postId);
        res.json({ success: true, message: 'Post deleted successfully' });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// edit post
export const editPost = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { postId, content } = req.body;

        const post = await Post.findById(postId);
        if (!post) {
            return res.json({ success: false, message: 'Post not found' });
        }

        // Check if user owns the post
        if (post.user.toString() !== userId) {
            return res.json({ success: false, message: 'Not authorized to edit this post' });
        }

        post.content = content;
        await post.save();

        // Return updated post with populated user
        const updatedPost = await Post.findById(postId)
            .populate('user')
            .populate({ path: 'comments', populate: { path: 'user' } });

        res.json({ success: true, message: 'Post updated successfully', post: updatedPost });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}