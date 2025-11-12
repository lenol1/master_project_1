const { LocalStorage } = require('node-localstorage');
const localStorage = new LocalStorage('./scratch');

const save_objectId = (ObjectId) => {
    localStorage.setItem('objectId',ObjectId);
}

const get_objectId = () => {
    return localStorage.getItem('objectId');
}
module.exports = {save_objectId, get_objectId}