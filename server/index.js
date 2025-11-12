const express = require('express');
const cors = require('cors');
const connectToDatabase = require('./db/connection');
const loginRoutes = require('./routes/login');
const registerRoutes = require('./routes/register');
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const financialGoalRoutes = require('./routes/financialGoalRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

connectToDatabase().then(() => {
    app.use(express.json());
    app.use(cors({
        origin: 'http://localhost:3000',
        methods: ['GET','POST','PUT','DELETE','OPTIONS'],
        allowedHeaders: ['Content-Type'],
    }));

    app.get("/", (req, res) => {
        res.send("App is Working");
    });

    app.use("/login", loginRoutes);
    app.use("/register", registerRoutes);

    app.use("/accounts", accountRoutes);
    app.use("/transactions", transactionRoutes);
    app.use("/budgets", budgetRoutes);
    app.use("/financial-goals", financialGoalRoutes);
    app.use("/categories", categoryRoutes);

    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}).catch((error) => {
    console.error('Error connecting to database:', error);
});