const admin = require("firebase-admin");

// initialize firebase app
admin.initializeApp();

// dbs
db = admin.firestore();

module.exports = { admin, db }