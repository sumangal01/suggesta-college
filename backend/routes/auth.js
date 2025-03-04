const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
    handleUserSignup, 
    handleUserLogin, 
    handleUserEdit, 
    verifyEmail,
    handleUserLogout,
    checkAuthStatus,
    requestPasswordReset
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const checkVerificationToken = require('../middleware/checkVerificationToken');

// Configure multer for profile images
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './public/uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.'));
        }
    }
});

// Auth Routes - API focused
router.post('/signup', upload.single('profileImage'), handleUserSignup);
router.post('/login', handleUserLogin);
router.post('/logout', handleUserLogout);
router.get('/status', checkAuthStatus);
router.get('/verify/:token', checkVerificationToken, verifyEmail);
router.put('/user', authMiddleware, upload.single('profileImage'), handleUserEdit);
router.post('/reset-password', requestPasswordReset);

module.exports = router;