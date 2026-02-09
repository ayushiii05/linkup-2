
import imagekit from '../configs/imageKit.js';
//import { format } from 'path/posix';
import Message from '../models/Message.js';
import Post from '../models/Post.js';
import ScheduledMessage from '../models/ScheduledMessage.js';
import schedule from 'node-schedule';

//create an empty object to store ss event connection
const connections = {};

//controller function for the sse endpoint
export const sseController = (req, res) => {
    const { userId } = req.params
    console.log('🔗 SSE client connected:', userId)
    console.log('   Total connections:', Object.keys(connections).length + 1)

    //set sse headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // add the client's response object to the connections object
    connections[userId] = res
    //send an initial event to the client
    res.write('log: Connected to SSE stream\n\n')
    //handle client disconnection
    req.on('close', () => {
        delete connections[userId];
        console.log('❌ SSE client disconnected:', userId);
        console.log('   Remaining connections:', Object.keys(connections).length)
    })
}

// Export connections for use
export { connections };

//send message
export const sendMessage = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { to_user_id, text, postId } = req.body;
        const image = req.file;
        let media_url = '';
        let message_type = image ? 'image' : (postId ? 'post' : 'text');

        if (message_type === 'image') {
            const response = await imagekit.upload({
                file: image.buffer,
                fileName: image.originalname,
            });
            media_url = imagekit.url({
                path: response.filePath,
                transformation: [
                    {
                        quality: 'auto'
                    },
                    { format: 'webp' },
                    { width: '1280' },


                ]

            })
        }
        const message = await Message.create({
            from_user_id: userId,
            to_user_id,
            text,
            message_type,
            media_url,
            post_id: postId
        })

        if (postId) {
            await Post.findByIdAndUpdate(postId, { $addToSet: { shares: userId } });
        }

        res.json({ success: true, message });
        // send message to to_user_id using ssb
        const messageWithUserData = await Message.findById(message._id)
            .populate('from_user_id')
            .populate({ path: 'post_id', populate: { path: 'user' } });

        if (connections[to_user_id]) {
            connections[to_user_id].write(`data: ${JSON.stringify(messageWithUserData)}\n\n`)
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}
// get chat messages
export const getChatMessages = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { to_user_id } = req.body;
        const messages = await Message.find({
            $or: [
                { from_user_id: userId, to_user_id },
                { from_user_id: to_user_id, to_user_id: userId },
            ]
        })
            .populate('from_user_id to_user_id')
            .populate({ path: 'post_id', populate: { path: 'user' } })
            .sort({ createdAt: -1 })
        //mark messsage as seen
        await Message.updateMany({ from_user_id: to_user_id, to_user_id: userId }, { seen: true })
        res.json({ success: true, messages });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const getUserRecentMessages = async (req, res) => {
    try {
        const { userId } = req.auth;
        const messages = await Message.find({ to_user_id: userId })
            .populate('from_user_id to_user_id')
            .populate({ path: 'post_id', populate: { path: 'user' } })
            .sort({ createdAt: -1 });

        res.json({ success: true, messages });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Schedule a message for later using node-schedule
export const scheduleMessage = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { to_user_id, text, scheduled_time } = req.body;

        if (!scheduled_time) {
            return res.json({ success: false, message: 'Scheduled time is required' });
        }

        const scheduledTime = new Date(scheduled_time);
        if (scheduledTime <= new Date()) {
            return res.json({ success: false, message: 'Scheduled time must be in the future' });
        }

        const scheduledMessage = await ScheduledMessage.create({
            from_user_id: userId,
            to_user_id,
            text,
            scheduled_time: scheduledTime,
            status: 'pending'
        });

        // Schedule the job using node-schedule
        const job = schedule.scheduleJob(scheduledTime, async () => {
            try {
                // Check if still pending
                const msg = await ScheduledMessage.findById(scheduledMessage._id);
                if (!msg || msg.status !== 'pending') {
                    console.log('Scheduled message cancelled or already sent');
                    return;
                }

                // Create the actual message
                const message = await Message.create({
                    from_user_id: msg.from_user_id,
                    to_user_id: msg.to_user_id,
                    text: msg.text,
                    message_type: 'text',
                    media_url: ''
                });

                // Mark scheduled message as sent
                msg.status = 'sent';
                await msg.save();

                console.log(`✅ Scheduled message sent! ID: ${message._id}`);
                console.log(`   From: ${msg.from_user_id} To: ${msg.to_user_id}`);
                console.log(`   Active connections: ${Object.keys(connections).join(', ') || 'none'}`);

                // Send via SSE if user is connected
                const messageWithUserData = await Message.findById(message._id)
                    .populate('from_user_id');

                if (connections[msg.to_user_id]) {
                    console.log(`   📤 Sending SSE to ${msg.to_user_id}`);
                    connections[msg.to_user_id].write(`data: ${JSON.stringify(messageWithUserData)}\n\n`);
                } else {
                    console.log(`   ⚠️ Recipient ${msg.to_user_id} not connected via SSE`);
                }

            } catch (error) {
                console.error('Error sending scheduled message:', error);
            }
        });

        console.log(`Scheduled message ${scheduledMessage._id} for ${scheduledTime}`);
        res.json({ success: true, message: 'Message scheduled successfully', scheduledMessage });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// Get user's scheduled messages
export const getScheduledMessages = async (req, res) => {
    try {
        const { userId } = req.auth;
        const scheduledMessages = await ScheduledMessage.find({
            from_user_id: userId,
            status: 'pending'
        })
            .populate('to_user_id')
            .sort({ scheduled_time: 1 });

        res.json({ success: true, scheduledMessages });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Cancel a scheduled message
export const cancelScheduledMessage = async (req, res) => {
    try {
        const { userId } = req.auth;
        const { scheduledMessageId } = req.body;

        const scheduledMessage = await ScheduledMessage.findById(scheduledMessageId);
        if (!scheduledMessage) {
            return res.json({ success: false, message: 'Scheduled message not found' });
        }

        if (scheduledMessage.from_user_id !== userId) {
            return res.json({ success: false, message: 'Not authorized' });
        }

        if (scheduledMessage.status !== 'pending') {
            return res.json({ success: false, message: 'Message has already been sent or cancelled' });
        }

        scheduledMessage.status = 'cancelled';
        await scheduledMessage.save();

        res.json({ success: true, message: 'Scheduled message cancelled' });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}