const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv').config({path: "./config.env"});
const http = require('http');
const colors = require('colors');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const socket = require("socket.io");

const corsOptions = require('./config/corsOptions');
const router = require('./routes/router');
const connectDB = require('./database/db');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(cookieParser());
app.use('/', express.static(path.join(__dirname, '/public')));
app.use('/imgs', express.static(path.join(__dirname, 'imgs')));
app.use('/api/v1', router)

connectDB();

const PORT = process.env.PORT || 8080

const httpServer = http.createServer(app);

httpServer.listen(PORT, (req, res) => {
    console.log(`Server running on Port ${PORT} with HTTP`.yellow.bold)
});

// const io = socket(httpServer);

// io.on("connection", (socket) => {
//     console.log("Made socket connection".cyan);
  
//     socket.on("disconnect", () => {
//       console.log("Disconnected socket".red);
//     });
  
//     socket.on("send-notification", (data) => {
//       io.emit("new-notification", data);
//     });
  
// });