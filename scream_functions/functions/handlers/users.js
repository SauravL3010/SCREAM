const firebase = require('firebase');
const { firebaseConfig } = require('../util/config')
const { admin, db } = require('../util/admin')
const { validateSignupData, validateLoginData } = require('../util/validators')

firebase.initializeApp(firebaseConfig);

//signup
exports.signup = (req, res)=>{

    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    const { errors, valid } = validateSignupData(newUser)

    if (!valid) { res.status(400).json({
        success: false,
        error: errors
    })}

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
}

//login
exports.login = (req, res)=>{
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    const { errors, valid } = validateLoginData(user)

    if (!valid) {
        return res.status(400).json({
            success: false,
            error: errors
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
}