export const fetchUserId = async (email) => {
    try {
        const response = await fetch(`http://localhost:5000/user/email/${email}`);
        if (!response.ok) {
            throw new Error('User not found');
        }
        const data = await response.json();
        return data.userId;
    } catch (error) {
        console.error('Error fetching user ID:', error);
        return null;
    }
};