const multer = require("multer");
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const path = require("path");
const { exec } = require("child_process");
const bodyParser = require("body-parser");

const app = express();
const port = 3000;

const dbUrl = "mongodb+srv://NewUser:Mmc6SjGGqkHZYb5u@blockchain-project.nrskyjw.mongodb.net/?retryWrites=true&w=majority";

const connectionParams = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}

// Connect to MongoDB
mongoose.connect(dbUrl , connectionParams)
.then(() =>{
  console.info("Connected to DB");
})
.catch((e) => {
  console.log("Error : " , e);
});

function startFabricScript() {
  const scriptPath = "./startFabric.sh";

  // Execute the script
  exec(scriptPath, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing ${scriptPath}: ${error}`);
      return;
    }
    console.log("stdout:", stdout);
    console.log(`Script ${scriptPath} executed successfully.`);
  });
}

function handleSigint() {
  const scriptPath = "./networkDown.sh";
  exec(scriptPath, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing ${scriptPath}: ${error}`);
      return;
    }
    console.log("stdout:", stdout);
    console.log(`Script ${scriptPath} executed successfully.`);
    process.exit();
  });
}

startFabricScript();

process.on("SIGINT", handleSigint);

app.use(express.json());

app.post("/registerUser", (req, res) => {
  const { username } = req.body;

  const scriptPath = `${__dirname}/javascript/registerUser.js`;
  const command = `node ${scriptPath} ${username}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing ${scriptPath}: ${error}`);
      console.error("Script stdout:", stdout);
      console.error("Script stderr:", stderr);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    console.log(`Script ${command} executed successfully.`);
    console.log("Script stdout:", stdout);

    //res.status(200).json({ message: "User registered successfully!" });
    res.status(200).json({ message: stdout });
  });
});

app.post("/uploadHash", (req, res) => {
  const { username } = req.body;
  const { idofdoc } = req.body;
  const { hashofdoc } = req.body;

  const scriptPath = `${__dirname}/javascript/invoke.js`;
  const command = `node ${scriptPath} UploadHash ${username} ${idofdoc} ${hashofdoc}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing ${scriptPath}: ${error}`);
      console.error("Script stdout:", stdout);
      console.error("Script stderr:", stderr);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    console.log(`Script ${command} executed successfully.`);
    console.log("Script stdout:", stdout);
    // console.error('Script stderr:', stderr);

    res.status(200).json({ message: stdout });
  });
});

app.post("/queryLedger", (req, res) => {
  const { qid } = req.body;
  const { un } = req.body;

  const scriptPath = `${__dirname}/javascript/query.js`;
  const command = `node ${scriptPath} ${qid} ${un}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing ${scriptPath}: ${error}`);
      console.error("Script stdout:", stdout);
      console.error("Script stderr:", stderr);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    console.log(`Script ${command} executed successfully.`);
    console.log("Script stdout:", stdout);
    // console.error('Script stderr:', stderr);

    res.status(200).json({ message: stdout });
  });
});

// Create a schema for storing file information
const fileSchema = new mongoose.Schema({
  filename: String,
  hash: String,
  contentType: String,
  buffer: Buffer,
});

const File = mongoose.model("File", fileSchema);

// Multer setup for handling file uploads
const storage = multer.memoryStorage(); // Uses memory storage.
const upload = multer({ storage: storage });

// Use body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve HTML form for file upload
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const { originalname, buffer } = req.file;

  const hash = calculateHash(buffer);

  const newFile = new File({
    filename: originalname,
    contentType: req.file.mimetype,
    buffer: buffer, // Store the binary content
    hash,
  });

  await newFile.save();
  const fileId = newFile._id; // MongoDB generated ID

  res.send(`File uploaded to database! SHA-256 Hash: ${hash} , ${fileId}`);
});

app.post("/getfile", async (req, res) => {
  try {
    const fileId = req.body.fileId;

    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).send("File not found");
    }

    // Set appropriate headers for file download
    res.set("Content-Type", file.contentType);
    res.set("Content-Disposition", "attachment; filename=" + file.filename);

    // Send the file data
    res.send(file.buffer);
  } catch (error) {
    res.status(500).send("Error retrieving file: " + error.message);
  }
});

// Function to calculate SHA-256 hash
function calculateHash(buffer) {
  const hash = crypto.createHash("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}

app.listen(port, () => {
  console.log(
    `Server side of the application is running on http://localhost:${port} . Please wait while the network is starting..`
  );
});
