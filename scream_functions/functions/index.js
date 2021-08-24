// requirements
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require('express');

//express app
const app = express();

// initialize firebase app
admin.initializeApp();

// dbs
db = admin.firestore();

//authentication
let firebaseConfig = {
    apiKey: "AIzaSyB09IYf-_iHXHrb-4vtSCrmEg_RXpWnF7U",
    authDomain: "sream-4e9d7.firebaseapp.com",
    projectId: "sream-4e9d7",
    storageBucket: "sream-4e9d7.appspot.com",
    messagingSenderId: "969195244507",
    appId: "1:969195244507:web:1ca41928271cafa95bb5fe",
    measurementId: "G-ZH1CNZ3K6L"
  };

const firebase = require('firebase');
const { user } = require("firebase-functions/v1/auth");
firebase.initializeApp(firebaseConfig);

app.get('/screams', (req, res)=> {

    db.collection('screams').orderBy('createdAt', 'desc').get()
        .then(data => {
            let screams = []
            data.forEach(doc => {
                screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    useHandler: doc.data().userHandler,
                    createdAt: doc.data().createdAt ,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount
                })
            })
            return res.status(200).json({
                success: true,
                data: screams
            })
        })
        .catch(err => {
            res.status(500).json({
                success: false,
                error: err
            })
        });

})

// firebase authentication middleware
const FBauth = (req, res, next) => {
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        idToken = req.headers.authorization.split('Bearer ')[1]
    } else {
        res.status(403).json({
            success: false,
            error: 'Unauthorized scream'
        })
    }

    admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
        req.user = decodedToken;
        return db.collection('users')
            .where('userId', '==', req.user.uid)
            .limit(1)
            .get()
    })
    .then(data => {
        req.user.handle = data.docs[0].data().handle;
        next()
    })
    .catch(err => {
        console.log(err)
        res.status(403).json({
            success: false,
            message: 'could not verify token',
            error: err
        })
    })

} 

app.post('/screams', FBauth, (req, res)=>{

    if (req.body.body.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'body must not be empty'
        })
    }

    const newScream = {
        body: req.body.body,
        userHandler: req.user.handle,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    }

    db.collection('screams').add(newScream)
        .then(doc => {
            return res.status(200).json({
                success: true,
                data: doc.id
            })
        })
        .catch(err => {
            return res.status(500).json({
                success: false,
                error: err
            })
        })    

})


// authentication route

//aunthentication helper functions
const isEmpty = (val) => {
    if (val.trim() === "") return true
    else return false 
}

const validEmail = (val) => {
    regEx = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (val.match(regEx)) return true
    else return false 
}

app.post('/signup', (req, res)=>{

    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    // handle client errors
    let errors = {}
    if (isEmpty(newUser.email)) {
        errors.email = 'cannot be empty'
    } else if (!validEmail(newUser.email)) {
        errors.email = 'invalid email'
    } 

    if (isEmpty(newUser.password)) {
        errors.password = 'connot be empty'
    }
    if (newUser.password !== newUser.confirmPassword) {errors.password = 'password must match'}

    if (isEmpty(newUser.handle)) {errors.handle = 'cannot be empty'}

    if (Object.keys(errors).length > 0) { return res.status(400).json({
        success : false,
        errors
    }) }

    // TODO validate here
    let userId;
    let token;
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if(doc.exists){
                return res.status(400).json({
                    success: false,
                    handle: "this handle already exists"
                })
            } else {
                return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then(data => {
            userId = data.user.uid;
            return data.user.getIdToken()
        })
        .then(tok => {
            token = tok;
            
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId
            }

            return db.doc(`/users/${newUser.handle}`).set(userCredentials)
        })
        .then(() => {
            return res.status(201).json({
                success: true,
                data: token
            })
        })
        .catch(err => {
            if (err.code === "auth/email-already-in-use"){
                return res.status(400).json({
                    success: false,
                    email: 'email already in use'
                })
            }

            return res.status(500).json({
                success: false,
                error: err
            })
        })

})


app.post('/login', (req, res)=>{
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    let errors = {}
    if (isEmpty(user.email)) { errors.email = 'cannot be empty' }
    if (isEmpty(user.password)) {errors.password = 'cannot be empty'}

    if (Object.keys(errors).length > 0) {
        return res.status(500).json({
            success : false,
            errors
        })
    }

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken()
        })
        .then(token => {
            return res.status(200).json({
                success: true,
                data: token
            })
        })
        .catch(err => {

            if(err.code === 'auth/invalid-email' || err.code === 'auth/wrong-password') {
                return res.status(403).json({
                    success: false,
                    error: 'invalid email or password'
                })
            }

            return res.status(500).json({
                success: false,
                error: err
            })
        })

})


exports.api = functions.region('asia-south1').https.onRequest(app);
