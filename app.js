const express = require("express");
const { router: searchRoutes } = require("./routes/searchRoutes");
const configRoutes = require("./routes/configRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.use("/", searchRoutes);
app.use("/config", configRoutes);
app.use("/api/auth", authRoutes);

module.exports = app;
