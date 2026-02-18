const express = require("express");
const searchRoutes = require("./routes/searchRoutes");
const configRoutes = require("./routes/configRoutes");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.use("/", searchRoutes);
app.use("/config", configRoutes);

module.exports = app;
