const mongoose = require('mongoose');

async function connectToDatabase() {
    try {
        await mongoose.connect('mongodb+srv://lenoli:passlenoildata@atlascluster.zwnecmj.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster', {
            dbName: 'MasterProjectDB',
        });
        console.log('Connected to database');
    } catch (error) {
        console.error('Error connecting to database:', error);
    }
}

module.exports = connectToDatabase;