const functions = require("firebase-functions");
const FBauth = require('./util/FBauth')

//express app
const express = require('express');
const app = express();

const { getAllScreams, postOneScream } = require('./handlers/screams');
const { login, signup } = require('./handlers/users');

//screams route
app.get('/screams', getAllScreams)
app.post('/screams', FBauth, postOneScream)

//users route
app.post('/signup', signup)
app.post('/login', login)


exports.api = functions.region('asia-south1').https.onRequest(app);
