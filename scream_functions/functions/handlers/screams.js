const { db } = require("../util/admin");

// get all screams
exports.getAllScreams = (req, res)=> {

    db.collection('screams').orderBy('createdAt', 'desc').get()
        .then(data => {
            let screams = []
            data.forEach(doc => {
                screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    useHandle: doc.data().userHandler,
                    createdAt: doc.data().createdAt ,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    userImage: doc.data().imgUrl
                })
            })
            return res.status(200).json({
                success: true,
                data: screams
            })
        })
        .catch(err => {
            console.error(err)
            res.status(500).json({
                success: false,
                error: err
            })
        })

}


// post one scream
exports.postOneScream = (req, res) => {

    if (req.body.body.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'body must not be empty'
        })
    }

    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        userImage: req.user.imgUrl
    }

    db.collection('screams').add(newScream)
        .then(doc => {
            return res.status(200).json({
                success: true,
                data: doc.id
            })
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({
                success: false,
                error: err
            })
        })    

}


// get a single scream
exports.getScream = (req, res) => {

    screamData = {}

    db.doc(`/screams/${ req.params.screamId }`).get()
        .then(doc => {
            if(!doc.exists){
                res.status(404).json({
                    success: false,
                    error: 'scream not found'
                })
            }
            screamData = doc.data()
            screamData.screamId = doc.id
            return db.collection('comments').where('screamId', '==', req.params.screamId).orderBy('createdAt', 'desc').get()
        }).then(data => {
            screamData.comments = []
            data.forEach(doc => {
                screams.comments.push(doc.data())
            })
            res.status(200).json({
                success: true,
                data: screamData
            })
        }).catch(err => {
            console.error(err)
            res.status(500).json({
                success: false,
                error: err
            })
        })

}


// delete a scream
exports.deleteScream = (req, res) => {

    db.doc(`/screams/${ req.params.screamId }`).get()
        .then(doc => {
            if(!doc.exists){
                res.status(404).json({
                    success: false,
                    error: 'scream not found'
                })
            }
            if(doc.data().userHandle !== req.user.handle){
                res.status(403).json({
                    success: false,
                    error: 'not authorized'
                })
            } else {
                return db.doc(`/screams/${ req.params.screamId }`).delete()
            }
        })
        .then(() => {
            res.status(200).json({
                success: true,
                message: 'scream deleted'
            })
        }).catch(err => {
            console.error(err)
            res.status(500).json({
                success: false,
                error: err
            })
        })

}


// like a scream
exports.likeScream = (req, res) => {

    const likeDoc = db.collection('likes').where('screamId', '==', req.params.screamId)
        .where('userHandle', '==', req.user.handle).limit(1)

    const screamDoc = db.doc(`/screams/${ req.params.screamId }`)

    let screamData

    screamDoc.get()
        .then(doc => {
            if(doc.exists){
                screamData = doc.data()
                screamData.screamId = doc.id;
                return likeDoc.get()
            } else {
                return res.status(404).json({
                    success: false,
                    error: 'scream not found'
                })
            }
        }).then(data => {
            if(data.empty){
                return db.collection('likes').add({
                    screamId: req.params.screamId,
                    userHandle: req.user.handle
                }).then(() => {
                    screamData.likeCount++
                    return screamDoc.update({ likeCount: screamData.likeCount })
                }).then(() => {
                    return res.status(200).json({
                        success: true,
                        message: 'like',
                        data: screamData
                    })
                })
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'already liked'
                })
            }
        }).catch(err => {
            console.error(err)
            res.status(500).json({
                success: false,
                error: err
            })
        })
}


// unlike a scream
exports.unlikeScream = (req, res) => {
    const likeDocument = db
      .collection('likes')
      .where('userHandle', '==', req.user.handle)
      .where('screamId', '==', req.params.screamId)
      .limit(1);
  
    const screamDoc = db.doc(`/screams/${req.params.screamId}`)
  
    let screamData;
  
    screamDoc
      .get()
      .then((doc) => {
        if (doc.exists) {
          screamData = doc.data();
          screamData.screamId = doc.id;
          return likeDocument.get();
        } else {
            return res.status(404).json({
                success: false,
                error: 'scream not found'
            })
        }
      })
      .then((data) => {
        if (data.empty) {
            return res.status(400).json({
                success: false,
                error: 'scream not liked'
            })
        } else {
          return db
            .doc(`/likes/${data.docs[0].id}`)
            .delete()
            .then(() => {
              screamData.likeCount--;
              return screamDoc.update({ likeCount: screamData.likeCount });
            })
            .then(() => {
              return res.status(200).json({
                  success: true,
                  message: 'unlike',
                  data: screamData
              });
            });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err
        });
      });
  };


// comment on a scream
exports.commentOnScream = (req, res) => {

    if(req.body.body.trim() === ''){
        res.status(400).json({
            success: false,
            comment: 'cannot be empty'
        })
    }

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        userHandle: req.user.handle,
        userImage: req.user.imgUrl
    }

    db.doc(`/screams/${ req.params.screamId }`).get()
        .then(doc => {
            if(!doc.exists){
                return res.status(404).json({
                    success: false,
                    error: 'scream not found'
                })
            }
            return doc.ref.update({ commentCount: doc.data().commentCount + 1 })
        }).then(() => {
            db.collection('comments').add(newComment);
        }).then(() => {
            return res.status(200).json({
                success: true,
                message: 'comment added',
                comment: newComment
            })
        }).catch(err => {
            console.error(err)
            return res.status(500).json({
                success: false,
                error: err
            })
        })

}