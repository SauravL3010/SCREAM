const functions = require("firebase-functions");
const FBauth = require('./util/FBauth')
const { db } = require("./util/admin");

//express app
const express = require('express');
const app = express();

const { getAllScreams, postOneScream, getScream, deleteScream, likeScream, unlikeScream, commentOnScream } = require('./handlers/screams');
const { login, signup, uploadImage, addUserDetails, getAuthenticatedUser, getUserDetails, markNotificationsRead } = require('./handlers/users');

//screams route
app.get('/screams', getAllScreams)
app.post('/scream', FBauth, postOneScream)
app.get('/scream/:screamId', getScream)
app.delete('/scream/:screamId', FBauth, deleteScream)
app.get('/scream/:screamId/like', FBauth, likeScream)
app.get('/scream/:screamId/unlike', FBauth, unlikeScream)
app.post('/scream/:screamId/comment', FBauth, commentOnScream)

//users route
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', FBauth, uploadImage)
app.post('/user', FBauth, addUserDetails)
app.get('/user', FBauth, getAuthenticatedUser)
app.get('/user/:handle', getUserDetails)
app.post('/notifications', FBauth, markNotificationsRead)


exports.api = functions.region('asia-south1').https.onRequest(app)


// Triggers
// notify on like
exports.createNotificationOnLike = functions.region('asia-south1').firestore.document('likes/{id}')
    .onCreate(snapshot => {
        return db.doc(`/screams/${ snapshot.data().screamId }`).get()
            .then(doc => {
                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    return db.doc(`/notifications/${ snapshot.id }`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        screamId: doc.id
                    })
                }
            }).catch(err => {
                console.error(err)
            })
    })


// del notify on unlike
exports.deleteNotificationOnUnLike = functions.region('asia-south1').firestore.document('likes/{id}')
    .onDelete(snapshot => {
        return db.doc(`/notifications/${ snapshot.id }`)
            .delete()
            .catch(err => {
                console.error(err)
            })
    })

// notify on comment
exports.createNotificationOnComment = functions.region('asia-south1').firestore.document('comments/{id}')
    .onCreate(snapshot => {
        return db.doc(`/screams/${ snapshot.data().screamId }`).get()
            .then(doc => {
                if(doc.exists && doc.data().userHandle !== snapshot.data().userhandle){
                    return db.doc(`/notifications/${ snapshot.id }`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'comment',
                        read: false,
                        screamId: doc.id
                    })
                }
            }).catch(err => {
                console.error(err)
            })
    })


// notify on image change
exports.onUserImageChange = functions.region('asia-south1').firestore.document('users/{userId}')
  .onUpdate((change) => {
    if (change.before.data().imgUrl !== change.after.data().imgUrl) {
      console.log('image has changed')
      const batch = db.batch()
      return db
        .collection('screams')
        .where('userHandle', '==', change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach(doc => {
            const scream = db.doc(`/screams/${ doc.id }`)
            batch.update(scream, { userImage: change.after.data().imgUrl })
          })
          return batch.commit()
        })
    } else return true
  })

// notify on scream delete
exports.onScreamDelete = functions.region('asia-south1').firestore.document('screams/{screamId}')
  .onDelete((snapshot, context) => {
    const screamId = context.params.screamId
    const batch = db.batch()
    return db.collection('comments').where('screamId', '==', screamId).get()
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/comments/${ doc.id }`))
        })
        return db.collection('likes').where('screamId', '==', screamId).get()
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/likes/${ doc.id }`))
        })
        return db.collection('notifications').where('screamId', '==', screamId).get();
      })
      .then((data) => {
        data.forEach(doc => {
          batch.delete(db.doc(`/notifications/${ doc.id }`))
        })
        return batch.commit()
      })
      .catch(err => console.error(err))
  })

