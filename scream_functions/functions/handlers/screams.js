exports.getAllScreams = (req, res)=> {

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

}


exports.postOneScream = (req, res) => {

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

}