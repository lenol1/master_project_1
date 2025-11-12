const axios = require('axios');

// Monobank API integration
async function getMonobankTransactions(token) {
    try {
        const response = await axios.get('https://api.monobank.ua/personal/statement/0/0', {
            headers: {
                'X-Token': token
            }
        });
        return response.data;
    } catch (error) {
        console.error('Monobank API error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { getMonobankTransactions };
