import User from "../models/User.js";
import imagekit from "../configs/imageKit.js";
import Connection from "../models/Connection.js";
import Post from "../models/Post.js";
//import User from "../models/User.js";
//import { inngest } from "inngest/index.js";
import { inngest } from "../inngest/index.js";



//get user data usind userid
export const getUserData = async (req, res) => {
    try {
        const { userId } = req.auth
        const user = await User.findById(userId)
        if (!user) {
            return res.json({ success: false, message: "User not found" })
        }
        res.json({ success: true, user })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}
//update user data using userid


export const updateUserData = async (req, res) => {
    try {
        const { userId } = req.auth
        let { username, bio, location, full_name } = req.body;

        const tempUser = await User.findById(userId)
        !username && (username = tempUser.username)

        if (tempUser.username !== username) {

            const user = await User.findOne({ username })
            if (user) {
                username = tempUser.username
            }
        }


        const updatedData = {
            username,
            bio,
            location,
            full_name
        }
        const profile = req.files?.profile && req.files.profile[0]
        const cover = req.files?.cover && req.files.cover[0]
        if (profile) {
            const response = await imagekit.upload({
                file: profile.buffer,
                fileName: profile.originalname,
            })
            const url = imagekit.url({
                path: response.filePath,
                transformation: [
                    { quality: 'auto' },
                    { format: 'webp' },
                    { width: '512' }
                ]
            })
            updatedData.profile_picture = url;
        }

        if (cover) {
            const response = await imagekit.upload({
                file: cover.buffer,
                fileName: cover.originalname,
            })
            const url = imagekit.url({
                path: response.filePath,
                transformation: [
                    { quality: 'auto' },
                    { format: 'webp' },
                    { width: '1280' }
                ]
            })
            updatedData.cover_photo = url;
        }
        const user = await User.findByIdAndUpdate(userId, updatedData, { new: true })
        res.json({ success: true, user, message: 'profile updated successfully' })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}


// find users using username , email, location

export const discoverUsers = async (req, res) => {
    try {
        const { userId } = req.auth
        const { input } = req.body;

        const allUsers = await User.find({
            $or: [
                {
                    username: new RegExp(input, "i")
                },
                {
                    email: new RegExp(input, "i")
                },
                {
                    full_name: new RegExp(input, "i")
                },
                {
                    location: new RegExp(input, "i")
                },

            ]
        })
        const filteredUsers = allUsers.filter(user => user._id !== userId);
        res.json({ success: true, users: filteredUsers })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//follow uaers

export const followUser = async (req, res) => {
    try {
        const { userId } = req.auth
        const { id } = req.body;

        const user = await User.findById(userId)
        if (user.following.includes(id)) {
            return res.json({ success: false, message: "You are already following this user" })
        }
        user.following.push(id);
        await user.save();
        const toUser = await User.findById(id)
        toUser.followers.push(userId)
        await toUser.save();
        res.json({ success: true, message: "User followed successfully" })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//unfollow user

export const unfollowUser = async (req, res) => {
    try {
        const { userId } = req.auth
        const { id } = req.body;

        const user = await User.findById(userId)
        user.following = user.following.filter(user => user !== id);
        await user.save();
        const toUser = await User.findById(id)
        toUser.followers = toUser.followers.filter(user => user !== userId);
        await toUser.save()

        res.json({ success: true, message: "User unfollowed successfully" })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//send connection request

export const sendConnectionRequest = async (req, res) => {
    try {
        const { userId } = req.auth
        const { id } = req.body;

        // Prevent sending request to self
        if (userId === id) {
            return res.json({ success: false, message: "You cannot send a connection request to yourself" })
        }

        //check if user has sent more than 20 requests today
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const connectionRequests = await Connection.find({ from_user_id: userId, createdAt: { $gt: last24Hours } })
        if (connectionRequests.length >= 20) {
            return res.json({ success: false, message: "You have reached the limit of 20 connection requests per day" })
        }

        // Check if already connected
        const user = await User.findById(userId);
        if (user.connections.includes(id)) {
            return res.json({ success: false, message: "You are already connected with this user" })
        }

        // check if connection request already exists (pending or accepted)
        const connection = await Connection.findOne({
            $or: [
                { from_user_id: userId, to_user_id: id },
                { from_user_id: id, to_user_id: userId },
            ]
        })

        if (connection) {
            if (connection.status === 'accepted') {
                return res.json({ success: false, message: "You are already connected with this user" })
            } else if (connection.status === 'pending') {
                return res.json({ success: false, message: "Connection request already pending" })
            }
        }

        // Create new connection request
        const newConnection = await Connection.create({
            from_user_id: userId,
            to_user_id: id,
        })

        await inngest.send({
            name: 'app/connection-request',
            data: { connectionId: newConnection._id }
        })

        return res.json({ success: true, message: "Connection request sent successfully" })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//get user connections


export const getUserConnections = async (req, res) => {
    try {
        const { userId } = req.auth
        const user = await User.findById(userId).populate('connections followers following')

        const connections = user.connections;
        const followers = user.followers;
        const following = user.following;

        const pendingConnections = (await Connection.find({ to_user_id: userId, status: 'pending' }).
            populate('from_user_id')).map(connection => connection.from_user_id)
        res.json({ success: true, connections, followers, following, pendingConnections })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//accept connection request
export const acceptConnectionRequest = async (req, res) => {
    try {
        const { userId } = req.auth
        const { id } = req.body;

        const connection = await Connection.findOne({ from_user_id: id, to_user_id: userId })
        if (!connection) {
            return res.json({ success: false, message: 'Connection request not found' });
        }

        // Check if already accepted
        if (connection.status === 'accepted') {
            return res.json({ success: false, message: 'Connection already accepted' });
        }

        const user = await User.findById(userId);
        const toUser = await User.findById(id);

        // Check if already in connections array (double safety)
        if (user.connections.includes(id)) {
            // Update connection status anyway to keep data consistent
            connection.status = 'accepted';
            await connection.save();
            return res.json({ success: false, message: 'Already connected with this user' });
        }

        // Add to connections if not already present
        user.connections.push(id);
        await user.save()

        if (!toUser.connections.includes(userId)) {
            toUser.connections.push(userId);
            await toUser.save()
        }

        connection.status = 'accepted';
        await connection.save()
        res.json({ success: true, message: 'Connection accepted successfully' });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// get user profile
//get user profiles
export const getUserProfiles = async (req, res) => {
    try {
        const { profileId } = req.body;
        const profile = await User.findById(profileId)
        if (!profile) {
            return res.json({ success: false, message: "Profile not found" });
        }
        const posts = await Post.find({ user: profileId }).populate('user')

        res.json({ success: true, profile, posts })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// get liked posts
export const getLikedPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`[getLikedPosts] Fetching likes for user: ${userId}`);

        const likedPosts = await Post.find({
            likes_count: userId,
            user: { $ne: userId } // Exclude posts authored by the user
        }).populate('user', 'username full_name profile_picture')
            .sort({ createdAt: -1 });

        res.json({ success: true, posts: likedPosts });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}
