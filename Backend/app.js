require("dotenv").config();

const express = require("express");
const app = express();
const connectToSocket = require("./controllers/socketManager.js");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const authRoute = require("./routes/user.js");
const http = require("http");
const server = http.createServer(app);
const io = connectToSocket(server);

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbUrl = process.env.ATLAS_URL;

main()
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(dbUrl);
}

app.get("/home", (req, res) => {
  res.send("hello world");
});

app.use("/", authRoute);

// Start server with correct instance
server.listen(8080, () => {
  console.log("Server listening on port 8080");
});
