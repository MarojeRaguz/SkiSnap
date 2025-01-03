require('dotenv').config();

const express = require('express');
const fileUpload = require('express-fileupload');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Initialize Express App
const app = express();
const PORT = 3000;

// Create Upload Directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Decode and Parse Google Credentials from Environment Variable
const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString('utf-8')
);

// Google Drive API Setup
const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
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
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID; // Replace with your Drive folder ID

    try {
        // Prepare metadata and media for upload
        const fileMetadata = {
            name: file.name,
            parents: [folderId],
        };

        const media = {
            mimeType: file.mimetype,
            body: fs.createReadStream(file.tempFilePath),
        };

        // Upload file to Google Drive
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
        });

        // Clean up temporary file
        fs.unlinkSync(file.tempFilePath);

        res.json({
            message: 'File uploaded successfully!',
            fileId: response.data.id,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test Route
app.get('/', (req, res) => {
    res.send('File Upload Service Running...');
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
