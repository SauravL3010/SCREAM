const { db, admin } = require("./admin");



// firebase authentication middleware
module.exports = (req, res, next) => {
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
        req.user.imgUrl = data.docs[0].data().imgUrl;
        next()
    })
    .catch(err => {
        console.error(err)
        res.status(403).json({
            success: false,
            message: 'could not verify token',
            error: err
        })
    })
} 