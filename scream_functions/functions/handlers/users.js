const firebase = require('firebase');
const { firebaseConfig } = require('../util/config')
const { admin, db } = require('../util/admin')
const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators')

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
    const noImg = "noImg.jpg";
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
                imgUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
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
            console.error(err)
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
            console.error(err)
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


// add user details
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then(() => {
            return res.status(200).json({
                success: true,
                message: 'user details added'
            })
        }).catch (err => {
            console.error(err)
            res.status(500).json({
                success: false,
                error: err
            })
        })
  
}


//get authenticated user data
exports.getAuthenticatedUser = (req, res) => {

    let userData = {}

    db.doc(`/users/${ req.user.handle }`).get()
        .then(doc => {
            if(doc.exists) {
                 userData.credentials = doc.data();
                 return db.collection('likes').where('userHandle', '==', req.user.handle).get();
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'user handle not found'
                })
            }
        }).then(data => {
            userData.likes = []
            data.forEach(doc => {
                userData.likes.push(doc.data())
            })
            return db.collection('notifications').where('recipient', '==', req.user.handle).orderBy('createdAt', 'desc')
                .limit(10).get();
        }).then(data => {
            userData.notifications = []
            data.forEach(doc => {
                userData.notifications.push(
                    {
                        recipient: doc.data().recipient,
                        sender: doc.data().sender,
                        createdAt: doc.data().createdAt,
                        screamId: doc.data().screamId,
                        type: doc.data().type,
                        read: doc.data().read,
                        notificationId: doc.id,
                    }
                )
            })
            return res.status(200).json({
                success: true,
                data: userData
            })
        }).catch(err => {
            console.error(err)
            res.status(500).json({
                success: false,
                error: err
            })
        })

}


// get user details
exports.getUserDetails = (req, res) => {
    userData = {}
    db.collection('users').where('handle', '==', req.params.handle).get()
    .then(doc => {
        if(doc.exists){
            userData.credentials = doc.data()
        }
        return db.collection('screams').where('userHandle', '==', req.params.handle).orderBy('createdAt', 'desc').get()
    }).then(data => {
        userData.screams = []
        data.forEach(doc => {
            userData.screams.push({
                body: doc.data().body,
                createdAt: doc.data().createdAt,
                userHandle: doc.data().userHandle,
                userImage: doc.data().userImage,
                likeCount: doc.data().likeCount,
                commentCount: doc.data().commentCount,
                screamId: doc.id,
            })
        })
        return res.json({
            success: true,
            data: userData
        })
    }).catch(err => {
        console.error(err)
        return res.status(500).json({
            success: false,
            error: err
        })
    })
}


// add user image
exports.uploadImage = (req, res) => {
    const BusBoy = require("busboy");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");
  
    const busboy = new BusBoy({ headers: req.headers });
  
    let imageToBeUploaded = {};
    let imageFileName;
    // // String for image token
    // let generatedToken = uuid();
  
    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {

      if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
        return res.status(400).json({ error: "Wrong file type submitted" });
      }

      // my.image.png => ['my', 'image', 'png']
      const imageExtension = filename.split(".")[filename.split(".").length - 1];
      
      // 32756238461724837.png
      imageFileName = `${Math.round(
        Math.random() * 1000000000000
      ).toString()}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      
      file.pipe(fs.createWriteStream(filepath));
    });
    
    busboy.on("finish", () => {
      admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype
            //   //Generate token to be appended to imageUrl
            //   firebaseStorageDownloadTokens: generatedToken,
            },
          },
        })
        .then(() => {
          // Append token to url
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
          return db.doc(`/users/${req.user.handle}`).update({ imgUrl: imageUrl });
        })
        .then(() => {
          return res.status(200).json({ success: true, message: "image uploaded successfully" });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ success: false, error: "something went wrong" });
        });
    });
    busboy.end(req.rawBody);
  };



// make notifications read : true on client side
exports.markNotificationsRead = (req, res) => {

    let batch = db.batch();
    req.body.forEach(notificationId => {
        const notification = db.doc(`/notifications/${ notificationId }`);
        batch.update(notification, { read: true })
    })
    batch.commit()
        .then(() => {
            return res.status(200).json({
                success: true,
                message: 'notifications read'
            })
        }).catch(err => {
            console.error(err)
            return res.status(500).json({
                success: true,
                error: err
            })
        })

}