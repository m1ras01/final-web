const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = 'mongodb://localhost:27017/films';
    
    try {
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;