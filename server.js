const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // allow frontend
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.post('/run-node', (req, res) => {
  const code = req.body.code;
  const tempFile = `/tmp/tempNodeCode.js`;

  fs.writeFileSync(tempFile, code);

  exec(`node ${tempFile}`, (error, stdout, stderr) => {
    fs.unlinkSync(tempFile);
    if (error || stderr) return res.json({ error: stderr || error.message });
    return res.json({ output: stdout });
  });
});

app.listen(port, () => console.log(`Node backend running on port ${port}`));
