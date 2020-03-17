/****************************
 MODULE INITIALISATION
 ****************************/
const   common          = require('./env/configs'),
        config          = common.config(),
        mongoose        = require('mongoose'),
        Authentication  = require('../app/models/users.server.model').Authentication,
        Promise         = require('bluebird'),
        co              = require('co'),
        nodemailer      = require('nodemailer'),
        User            = require('../app/models/users.server.model').user;


/*************
Purpose: Grenerate Token using JWT
Parameter: {
	logindetails: It accept username and password of user
}
Return: String
****************/
exports.getToken = getToken;
function getToken(logindetails) {
    return new Promise(function(resolve, reject){
        co(function*(){
            // Generate Token
            var token = jwt.sign({
                id: logindetails.id,
                algorithm: "HS256",
                exp: Math.floor(new Date().getTime() / 1000) + config.tokenExpiry
            }, config.securityToken);
        
            var params = { userId: logindetails.id, token: token};
        
            // API call to find user and update the token in db
            yield Authentication.findOneAndUpdate({ userId: logindetails.id }, params, { upsert: true }).exec();
            resolve(token);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}


/*************
Purpose: It check token expiration
Parameter: {
	token: Token generated for a user.
}
Return: Boolean
****************/
function checkExpiration(token) {
    // Check Expiration
    var decoded = jwt.decode(token);
    let now = parseInt(new Date().getTime() / 1000);
    let expTime = decoded.exp

    if (now > expTime) {
        return false;
    } else {
        return true;
    }
}


/*************
 Purpose: It check token expiration
 Parameter: {
	token: Token generated for a user.
}
 Return: Boolean
 ****************/
function checkTokenInDB(token) {
    return new Promise(function(resolve, reject){
        co(function*(){
            // Initialisation of variables
            var decoded = jwt.decode(token);
            let userId = decoded.id;
            var authToken = yield Authentication.findOne({userId:userId, token: token}).exec();
            if(authToken) return resolve(true);
            resolve(false);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}


/*************
 Purpose: It is created to check the useris suthorised or not
 Parameter: {
	token: Token generated for a user.
}
 Return: Number/Object
 ******************/
 exports.isAuthorised = function(req, res, next) {
    co(function*(){
        // Initialisation of variables
        var tokenReq = req.headers.authorization || req.body.token || req.query.token || req.headers['x-access-token'];

        if(!tokenReq) return res.status(401).json({status: 2, message: 'No token provided.', data: [] });

        var decoded = jwt.decode(tokenReq);
        let userId = decoded.id;
        let incomingUserId = req.params.userId || req.query.user_id || req.query.userId || req.body.userId; 
        // Checking whether the user requested resource is authenticated user or not from his token
    
        if (incomingUserId && userId !== incomingUserId) return res.status(401).json({status: 2, message: 'Unauthorized user.', data: [] });

        // Validating token
        if(tokenReq) {
            var status = yield checkTokenInDB(tokenReq);
            if(status) {
                if (!checkExpiration(tokenReq)) {
                    // Generate Token and set on headers
                    var token = yield getToken({id: userId});
                    req.headers.authorization = token;
                    next();
                } else {
                    // Valid Token
                    next();
                }
            } else {
                res.status(401).json({status: 2, message: 'No such token exists.', data: [] });
            }  
        } else {
            return res.status(401).json({status: 2, message: 'No token provided.', data: [] });
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

/*************
 Purpose: It is created to check that whether session is expired or not
 Return: status 1 if session expired, else returns 0
 ******************/
exports.checkForSessionPersistance = function(req, res) {
    co(function*(){
        var tokenReq = req.headers.authorization;
        if(!tokenReq) return res.status(401).json({status: 2, message: 'No token provided.', data: [] });

        var decoded = jwt.decode(tokenReq);
        var userId = decoded.id;
        var incomingUserId = req.params.userId; 
        // Checking whether the user requested resource is authenticated user or not from his token
        if(userId !== incomingUserId) return res.status(401).json({status: 2, message: 'Unauthorized user.', data: [] });

        var status = yield checkTokenInDB(tokenReq);
        if(!status) return res.status(401).json({status: 2, message: 'No such token exists.', data: [] });

        var userDeleted = yield isUserDeleted(req.body.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var sessionPersists = checkExpiration(tokenReq);
        if(sessionPersists) {
            return res.status(200).json({status: 1, message: 'Session persisted.', data: [] });
        } else {
            return res.status(200).json({status: 0, message: 'Session expired.', data: [] });
        }
    }).catch(function(err){
        return res.status(500).json({status: 0, message: err, data: [] });
    });
}

exports.sendMail = function(mailObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
                // create reusable transporter object using the default SMTP transport
                let transporter = nodemailer.createTransport({
                    host: 'mail.hover.com',
                    port: 465,
                    secure: true, // true for 465, false for other ports
                    auth: {
                        user: "support@memium.app", // generated ethereal user
                        pass: "06$cY7kAbd6!" // generated ethereal password
                    }
                });           
            
                let mailOptions = {
                    from: 'Memium <support@memium.app>', // sender address
                    to: mailObj.to, // list of receivers comma separated
                    subject: mailObj.subject, // Subject line
                    //text: 'Hello world?', // plain text body
                    html: mailObj.message // html body
                };           
            
                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        return reject(error);
                    }
                    console.log('Message sent: %s', info.messageId);
                    return resolve(1);
                });
        }).catch(function(err){
            var error = err ? err : {errorCode: 500, errorMessage: 'Error while sending mail'};
            return reject(err);
        })
    });
}

exports.sendMailWithAttachments = function (mailObj) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            console.log('inside send mail with attachement function --- ', mailObj)
            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                host: 'mail.hover.com',
                port: 465,
                secure: true, // true for 465, false for other ports
                auth: {
                    user: "support@memium.app", // generated ethereal user
                    pass: "06$cY7kAbd6!" // generated ethereal password
                }
            });

            let mailOptions = {
                from: 'Memium <support@memium.app>', // sender address
                to: mailObj.to, // list of receivers comma separated
                subject: mailObj.subject, // Subject line
                //text: 'Hello world?', // plain text body
                html: mailObj.message, // html body
                attachments: [{
                    filename: mailObj.attachmentName,
                    content: mailObj.attachmentData
                }],
            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    return reject(error);
                }
                console.log('Message sent: %s', info.messageId);
                return resolve(1);
            });
        }).catch(function (err) {
            var error = err ? err : { errorCode: 500, errorMessage: 'Error while sending mail' };
            return reject(err);
        })
    });
}

exports.checkWhetherUserIsDeleted = function (userId) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var user = yield User.findOne({_id: ObjectId(userId)},{deleteStatus: 1}).exec();
            // if(user && user.deleteStatus) return resolve('Your account/contact details is been removed by admin - please contact at "support@memium.app"');
            if (user && user.deleteStatus) return resolve('User is not found.');
            return resolve(0);
        }).catch(function(err){
            var error = err ? err : {errorCode: 500, errorMessage: 'Something went wrong.'};
            return reject(error);
        });
    });
}