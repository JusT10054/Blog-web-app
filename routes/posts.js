const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { isLoggedIn } = require('../middleware/authMiddleware');

const router = express.Router();

// File paths
const postsFilePath = path.join(__dirname, '..', 'data', 'posts.json');
const usersFilePath = path.join(__dirname, '..', 'data', 'users.json');

// Data helper functions
const readData = async (filePath) => {
    try {
        const dataJson = await fs.readFile(filePath);
        return JSON.parse(dataJson);
    } catch (error) {
        return [];
    }
};
const writeData = async (filePath, data) => await fs.writeFile(filePath, JSON.stringify(data, null, 2));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// INDEX - Display all posts
router.get('/', async (req, res) => {
    const posts = await readData(postsFilePath);
    const users = await readData(usersFilePath);

    // Map author username to each post
    const postsWithAuthors = posts.map(post => {
        const author = users.find(user => user.id === post.authorId);
        return { ...post, authorName: author ? author.username : 'Unknown' };
    });

    res.render('index', { posts: postsWithAuthors.reverse() });
});

// NEW - Show form to create a new post
router.get('/new', isLoggedIn, (req, res) => {
    res.render('new-post');
});

// CREATE - Add a new post
router.post('/', isLoggedIn, upload.single('media'), async (req, res) => {
    const { title, content } = req.body;
    const posts = await readData(postsFilePath);
    
    const newPost = {
        id: crypto.randomUUID(),
        title,
        content,
        authorId: req.session.user.id,
        createdAt: new Date().toISOString(),
        mediaPath: req.file ? `/uploads/${req.file.filename}` : null,
    };

    posts.push(newPost);
    await writeData(postsFilePath, posts);
    res.redirect('/posts');
});

// SHOW - Display a single post
router.get('/:id', async (req, res) => {
    const posts = await readData(postsFilePath);
    const users = await readData(usersFilePath);
    const post = posts.find(p => p.id === req.params.id);

    if (!post) return res.status(404).send('Post not found');

    const author = users.find(u => u.id === post.authorId);
    post.authorName = author ? author.username : 'Unknown';

    res.render('post', { post });
});

// EDIT - Show form to edit a post
router.get('/:id/edit', isLoggedIn, async (req, res) => {
    const posts = await readData(postsFilePath);
    const post = posts.find(p => p.id === req.params.id);

    if (!post || post.authorId !== req.session.user.id) {
        return res.status(403).send('Forbidden');
    }
    res.render('edit-post', { post });
});

// UPDATE - Update a post
router.put('/:id', isLoggedIn, upload.single('media'), async (req, res) => {
    const posts = await readData(postsFilePath);
    const postIndex = posts.findIndex(p => p.id === req.params.id);

    if (postIndex === -1 || posts[postIndex].authorId !== req.session.user.id) {
        return res.status(403).send('Forbidden');
    }
    
    posts[postIndex].title = req.body.title;
    posts[postIndex].content = req.body.content;
    if (req.file) {
        posts[postIndex].mediaPath = `/uploads/${req.file.filename}`;
    }

    await writeData(postsFilePath, posts);
    res.redirect(`/posts/${req.params.id}`);
});

// DELETE - Remove a post
router.delete('/:id', isLoggedIn, async (req, res) => {
    let posts = await readData(postsFilePath);
    const postToDelete = posts.find(p => p.id === req.params.id);

    if (!postToDelete || postToDelete.authorId !== req.session.user.id) {
        return res.status(403).send('Forbidden');
    }

    posts = posts.filter(p => p.id !== req.params.id);
    await writeData(postsFilePath, posts);
    res.redirect('/posts');
});

module.exports = router;