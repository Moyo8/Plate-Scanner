const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

const frontendPath = path.join(__dirname, 'frontend');

// Do not let express.static automatically serve index.html so we can control the root
app.use(express.static(frontendPath, { index: false }));
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'landing-page.html')));

app.listen(PORT, () => console.log(`Frontend server running at http://localhost:${PORT}`));
