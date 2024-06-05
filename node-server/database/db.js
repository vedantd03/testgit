const express = require('express');
const mongoose = require('mongoose');

const connectDB = async (req, res) => {
    try{
        console.log("Trying to connect to MongoDB...".green);
        mongoose.set("strictQuery", false);
        await mongoose.connect(process.env.MONGO_URL);

        console.log("Connected to Database Successfully".brightGreen.bold);
    } catch (err) {
        console.log(`Error: ${err.message}`.red.underline);
    }
}

module.exports = connectDB;