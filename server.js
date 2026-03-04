const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// POST /run → execute Node.js code
app.post("/run", (req, res) => {
  const { code } = req.body;

  const id = crypto.randomBytes(6).toString("hex");
  const dir = path.join("/tmp", id);
  fs.mkdirSync(dir);

  const file = "index.js";
  fs.writeFileSync(path.join(dir, file), code);

  exec(`node ${file}`, { cwd: dir, timeout: 8000 }, (err, stdout, stderr) => {
    fs.rmSync(dir, { recursive: true, force: true });

    if (err || stderr) return res.json({ error: stderr || err.message });

    res.json({ output: stdout });
  });
});

// Optional GET /run → sanity check
app.get("/run", (req, res) => {
  res.send("Node backend is working! Use POST /run to execute code.");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running...");
});
