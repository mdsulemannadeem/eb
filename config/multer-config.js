const multer = require('multer');

const storage = multer.memoryStorage();

// Configure multer with larger file size limits
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB per file (increased from 50MB)
        files: 5, // Maximum 5 files
        fieldSize: 100 * 1024 * 1024, // 100MB field size
        fieldNameSize: 100, // Max field name size
        fields: 20, // Max number of fields
        parts: 25 // Max number of parts
    },
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

module.exports = upload;