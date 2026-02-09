import express from "express";

import { addPost, getFeedPosts, likePost, addComment, deletePost, editPost } from "../controllers/postController.js";
import { protect } from "../middlewares/auth.js";
import { upload } from "../configs/multer.js";

const postRouter = express.Router();

postRouter.post('/add', upload.array('images', 4), protect, addPost)
postRouter.get('/feed', protect, getFeedPosts)
postRouter.post('/like', protect, likePost)
postRouter.post('/comment', protect, addComment)
postRouter.post('/delete', protect, deletePost)
postRouter.post('/edit', protect, editPost)

export default postRouter;