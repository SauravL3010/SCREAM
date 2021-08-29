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



exports.validateSignupData = (data) => {

    // handle client errors
    let errors = {}
    if (isEmpty(data.email)) {
        errors.email = 'cannot be empty'
    } else if (!validEmail(data.email)) {
        errors.email = 'invalid email'
    } 

    if (isEmpty(data.password)) {
        errors.password = 'connot be empty'
    }
    if (data.password !== data.confirmPassword) {errors.password = 'password must match'}

    if (isEmpty(data.handle)) {errors.handle = 'cannot be empty'}


    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }

}

exports.validateLoginData = (data) => {

    let errors = {}
    if (isEmpty(data.email)) { errors.email = 'cannot be empty' }
    if (isEmpty(data.password)) {errors.password = 'cannot be empty'}

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }

}

exports.reduceUserDetails = (data) => {

    let userDetails = {}

    // bio, website and location
    if (!isEmpty(data.bio.trim())) { userDetails.bio = data.bio }
    if (!isEmpty(data.location.trim())) { userDetails.location = data.location }
    if (!isEmpty(data.website.trim())) {
        if (data.website.trim().substring(0, 4) !== 'http'){
            userDetails.website = `http://${data.website.trim()}`
        } else {
            userDetails.website = data.website
        }
    }

    return userDetails

}