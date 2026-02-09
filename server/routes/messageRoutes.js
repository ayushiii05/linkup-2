import express from 'express'
import { getChatMessages, sendMessage, sseController, scheduleMessage, getScheduledMessages, cancelScheduledMessage } from '../controllers/messageController.js';
import { upload } from '../configs/multer.js';
import { protect } from '../middlewares/auth.js';

const messageRouter = express.Router();

messageRouter.get('/:userId', sseController)
messageRouter.post('/send', upload.single('image'), protect, sendMessage)
messageRouter.post('/get', protect, getChatMessages)
messageRouter.post('/schedule', protect, scheduleMessage)
messageRouter.get('/scheduled', protect, getScheduledMessages)
messageRouter.post('/cancel-scheduled', protect, cancelScheduledMessage)

export default messageRouter