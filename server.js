import express from 'express';
import path from 'path';

const app = express();
const port = process.env.PORT || 8080;

// Serve the Vite build folder
app.use(express.static(path.join(process.cwd(), 'dist')));

// For React Router: serve index.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
