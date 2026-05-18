require('dotenv').config({ path: '.env.local' });
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const chatRouter = require('./backend/chatRouter');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/api', chatRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

module.exports = app;
