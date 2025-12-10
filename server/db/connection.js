const mongoose = require('mongoose');

async function connectToDatabase() {
    try {
        await mongoose.connect('mongodb+srv://username:password@atlascluster.zwnecmj.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster', {
            dbName: 'MasterProjectDB',
        });
        console.log('Connected to database');
    } catch (error) {
        console.error('Error connecting to database:', error);
    }
}

module.exports = connectToDatabase;