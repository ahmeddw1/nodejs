// server.js — Multi-Language Executor (Node + Python)
const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "10mb" }));

// POST /run
// Accepts { tasks: [{ language: "node"|"python", code: "...", dependencies: [...] }] }
app.post("/run", async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks || !Array.isArray(tasks)) return res.json({ error: "Missing tasks array" });

    const results = [];

    for (const task of tasks) {
      const { language, code, dependencies } = task;
      if (!language || !code) {
        results.push({ error: "Missing language or code" });
        continue;
      }

      // Create temp folder
      const id = crypto.randomBytes(6).toString("hex");
      const dir = path.join("/tmp", id);
      fs.mkdirSync(dir);

      try {
        let file, runCmd;

        if (language === "node") {
          file = path.join(dir, "index.js");
          fs.writeFileSync(file, code);

          if (dependencies && dependencies.length > 0) {
            const pkgJson = { dependencies: Object.fromEntries(dependencies.map(d => [d, "latest"])) };
            fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkgJson));
            await new Promise((r, j) =>
              exec("npm install --omit=dev", { cwd: dir }, (err, stdout, stderr) => err ? j(stderr) : r(stdout))
            );
          }

          runCmd = `node ${file}`;
        } else if (language === "python") {
          file = path.join(dir, "main.py");
          fs.writeFileSync(file, code);

          if (dependencies && dependencies.length > 0) {
            await new Promise((r, j) =>
              exec(`pip install ${dependencies.join(" ")}`, { cwd: dir }, (err, stdout, stderr) => err ? j(stderr) : r(stdout))
            );
          }

          runCmd = `python3 ${file}`;
        } else {
          results.push({ error: "Unsupported language" });
          fs.rmSync(dir, { recursive: true, force: true });
          continue;
        }

        // Execute
        const output = await new Promise((resolve, reject) => {
          exec(runCmd, { cwd: dir, timeout: 10000 }, (err, stdout, stderr) => {
            fs.rmSync(dir, { recursive: true, force: true });
            if (err || stderr) reject(stderr || err.message);
            else resolve(stdout);
          });
        });

        results.push({ output });

      } catch (err) {
        fs.rmSync(dir, { recursive: true, force: true });
        results.push({ error: err.toString() });
      }
    }

    res.json({ results });

  } catch (e) {
    res.json({ error: e.toString() });
  }
});

// GET /run → sanity check
app.get("/run", (req, res) => {
  res.send("✅ Backend running! Use POST /run with tasks array to execute multiple codes.");
});

app.listen(process.env.PORT || 3000, () => console.log("Server running..."));
