import mongoose from "mongoose";

const scheduledMessageSchema = new mongoose.Schema({
    from_user_id: { type: String, ref: 'User', required: true },
    to_user_id: { type: String, ref: 'User', required: true },
    text: { type: String, trim: true },
    media_url: { type: String },
    scheduled_time: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'sent', 'cancelled'], default: 'pending' }
}, { timestamps: true })

const ScheduledMessage = mongoose.model('ScheduledMessage', scheduledMessageSchema)

export default ScheduledMessage;
