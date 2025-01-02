const express = require('express');
const fileUpload = require('express-fileupload');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Initialize Express App
const app = express();
const PORT = 3000;

// Create Upload Directory if not exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Google Drive API Setup
const KEY_FILE_PATH = './service-account-key.json';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to handle file uploads
app.use(fileUpload({ useTempFiles: true, tempFileDir: uploadDir }));

// Upload Route
app.post('/upload', async (req, res) => {
    if (!req.files || !req.files.file) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const file = req.files.file;
    const folderId = '1CI2NNdnfpDOaVg8JVQBwlTh7uHoP4Ilx'; // Replace with your Google Drive Folder ID

    try {
        const fileMetadata = {
            name: file.name,
            parents: [folderId],
        };

        const media = {
            mimeType: file.mimetype,
            body: fs.createReadStream(file.tempFilePath),
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
        });

        // Clean up temporary file
        fs.unlinkSync(file.tempFilePath);

        res.json({ fileId: response.data.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
