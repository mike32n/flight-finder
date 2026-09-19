const path = require("path");
const express = require("express");
const { router: searchRoutes } = require("./routes/searchRoutes");
const configRoutes = require("./routes/configRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.get("/verify/:token", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "verify.html"));
});

app.get("/reset-password/:token", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reset-password.html"));
});

app.use("/", searchRoutes);
app.use("/config", configRoutes);
app.use("/api/auth", authRoutes);

module.exports = app;
