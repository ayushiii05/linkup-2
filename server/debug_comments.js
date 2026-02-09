import mongoose from 'mongoose';
import 'dotenv/config';
import fs from 'fs';
import Post from './models/Post.js';
import User from './models/User.js';
import Comment from './models/Comment.js';

const logFile = 'debug_output.txt';

const debug = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/linkup`);

        const comments = await Comment.find().sort({ createdAt: -1 }).limit(1);
        if (comments.length > 0) {
            const comment = comments[0];
            const rawUser = comment.user;

            // Populate
            await comment.populate('user');
            const populatedUser = comment.user;

            const result = {
                commentId: comment._id,
                rawUserId: rawUser,
                isPopulated: typeof populatedUser === 'object' && populatedUser !== null && populatedUser.username !== undefined,
                populatedUsername: populatedUser?.username,
                populatedId: populatedUser?._id
            };

            fs.writeFileSync(logFile, JSON.stringify(result, null, 2));
        } else {
            fs.writeFileSync(logFile, JSON.stringify({ error: 'No comments' }));
        }

    } catch (e) {
        fs.writeFileSync(logFile, JSON.stringify({ error: e.message }));
    } finally {
        await mongoose.disconnect();
    }
};

debug();
