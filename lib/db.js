var low = require('lowdb');
var FileSync = require('../node_modules/lowdb/adapters/FileSync');
var adapter = new FileSync('db.json');
var db = low(adapter);
db.defaults({
    users: [],
    topics: []
}).write();
module.exports = db;