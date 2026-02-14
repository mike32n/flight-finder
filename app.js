const express = require("express");
const searchRoutes = require("./routes/searchRoutes");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.use("/", searchRoutes);

module.exports = app;
