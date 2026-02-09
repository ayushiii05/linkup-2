import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Connect to MongoDB
mongoose.connect(`${process.env.MONGODB_URL}/linkup`).then(() => {
    console.log('Connected to MongoDB');
    cleanupDuplicates();
}).catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
});

async function cleanupDuplicates() {
    try {
        const User = mongoose.model('User', new mongoose.Schema({
            _id: { type: String },
            connections: [{ type: String, ref: 'User' }],
            followers: [{ type: String, ref: 'User' }],
            following: [{ type: String, ref: 'User' }],
        }, { strict: false }));

        const users = await User.find({});
        console.log(`Found ${users.length} users to check`);

        let totalDuplicatesRemoved = 0;

        for (const user of users) {
            const originalConnections = user.connections || [];
            const originalFollowers = user.followers || [];
            const originalFollowing = user.following || [];

            // Remove duplicates using Set
            const uniqueConnections = [...new Set(originalConnections)];
            const uniqueFollowers = [...new Set(originalFollowers)];
            const uniqueFollowing = [...new Set(originalFollowing)];

            const connectionsRemoved = originalConnections.length - uniqueConnections.length;
            const followersRemoved = originalFollowers.length - uniqueFollowers.length;
            const followingRemoved = originalFollowing.length - uniqueFollowing.length;

            if (connectionsRemoved > 0 || followersRemoved > 0 || followingRemoved > 0) {
                console.log(`User ${user._id}:`);
                if (connectionsRemoved > 0) console.log(`  - Removed ${connectionsRemoved} duplicate connections`);
                if (followersRemoved > 0) console.log(`  - Removed ${followersRemoved} duplicate followers`);
                if (followingRemoved > 0) console.log(`  - Removed ${followingRemoved} duplicate following`);

                user.connections = uniqueConnections;
                user.followers = uniqueFollowers;
                user.following = uniqueFollowing;
                await user.save();

                totalDuplicatesRemoved += connectionsRemoved + followersRemoved + followingRemoved;
            }
        }

        console.log(`\nCleanup complete! Removed ${totalDuplicatesRemoved} total duplicates.`);
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}
