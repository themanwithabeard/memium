/**********************
 MODULE INITIALISTAION
 **********************/
const   globals         = require('../../configs/globals'),
        Authentication  = require('../models/users.server.model').Authentication,
        ObjectId        = require('mongodb').ObjectID,
        //nodemailer    = require('nodemailer'),
        //ses           = require('nodemailer-ses-transport'),
        mongoose        = require('mongoose'),
        bcrypt          = require('bcryptjs'),
        User            = mongoose.model('users'),
        path            = require('path'),
        crypto          = require('crypto'),
        s3              = require('../../configs/aws').s3,
        request         = require('request'),
        fs              = require('fs'),
        im              = require('imagemagick'),
        Promise         = require('bluebird'),
        co              = require('co'),
        isUserDeleted = require('../../configs/globals').checkWhetherUserIsDeleted;


/**************************
 S3 UPLOAD
 **************************/
exports.bucketUpload = bucketUpload;
function bucketUpload(requestObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            fs.readFile(requestObj.newFilename, function (err, data) {
                if (err) return reject({errorCode: 500, errorMessage: err});
        
                const params = {
                    Bucket: 'glyphoto',
                    Key: requestObj.fileNewName,
                    ACL: "public-read",
                    ContentType: requestObj.fileType,
                    Body: data
                };
        
                s3.putObject(params, function(err, data) {
                    if (err) {        
                        return reject({errorCode: 500, errorMessage: err});      
                    } else {        
                        var thumbnailUrl = 'https://glyphoto.s3-us-west-1.amazonaws.com/'+ requestObj.fileNewName;
                        fs.unlink(requestObj.newFilename, function (err) {
                            if (err) {
                                return reject({errorCode: 500, errorMessage: err});
                            }
                            var thumbnailResponseObject = {
                                "thumbnailUrl": thumbnailUrl,
                                "etag": data.ETag
                            };
                            return resolve(thumbnailResponseObject)
                        });        
                    }        
                });        
            });
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**************************
 FETCH Glyph API METHOD
 **************************/
exports.generateThumbnail = generateThumbnail;
function generateThumbnail(request) {
    return new Promise(function(resolve, reject){
        co(function*(){
            if(!request.files) return resolve(false);
            var fileNewName = '', newFilename = '';
            // Calling model to insert data
            if(request.files.originalname && request.files.location) {
                var nameImage = request.files.originalname.split(".");
                if(nameImage[0]) {
                    var appDir = path.dirname(require.main.filename);
                    fileNewName = 'imageThumbnail' + Date.now().toString() + '.' + nameImage[1];
                    newFilename = appDir + '/uploads/'+ fileNewName;    
                    var requestObject = {
                        "fileNewName": fileNewName,
                        "newFilename": newFilename,
                        "fileType": nameImage[1]
                    };    
                    var thumbnailObject = {
                        "originalname": 'imageThumbnail.' + nameImage[1]
                    };
                    im.convert([request.files.location, '-resize', '100x100', newFilename],
                        function(err, stdout, stderr) {
                        co(function*(){
                            if (err) return reject({errorCode: 500, errorMessage: err});
                            var thumbnailResponseObject = yield bucketUpload(requestObject);
                            if(thumbnailResponseObject) {    
                                thumbnailObject.location = thumbnailResponseObject.thumbnailUrl;
                                return resolve(thumbnailObject);
                            } else {
                                return resolve(false);
                            }
                        }).catch(function(err){
                            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                            return reject(err);;
                        });
                    });    
                }
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}


/**************
 SIGNIN MODULE
 **************/
exports.signin = function(req, res) {
    co(function*(){
        // Validating and initialising fields
        var queryLoginObject = {};
    
        // if(req.body.email || req.body.fb_id) {
        //     req.body.email ? ("queryLoginObject.$or" = [{"email":new RegExp('^'+req.body.email+'$', "i")}]) : delete queryLoginObject.email;
        //     // req.body.email ? (queryLoginObject.email = req.body.email) : delete queryLoginObject.email;
        //     req.body.fb_id ? (queryLoginObject.fb_id = req.body.fb_id) : delete queryLoginObject.fb_id;
        // }

        var username = new RegExp('^' + req.body.email + '$', "i");
        if(req.body.email) {
            queryLoginObject = {
                "$or" : [{"email":req.body.email.toLowerCase()},{"username":username},{"nickname":username}]
            };
        }
        if(req.body.fb_id) {
            queryLoginObject = {
                "fb_id" : req.body.fb_id
            };
        }
    
        if(!Object.keys(queryLoginObject).length) {
            return res.status(400).json({status: 0, message: "Please enter credentials", data: [] });
        }
        var user = yield User.findOne(queryLoginObject).exec();
        if(!user) return res.status(404).json({status: 0, message: "User is not found.", data: [] });
        if(!user.userVerified && req.body.email) return res.status(404).json({status: 0, message: "Please click the verify link sent to your email.\n(Check your spam folder)", data: [] });

        // if(user.deleteStatus) return res.status(400).json({status: 0, message: 'Your account is been removed by admin - please contact at "support@memium.app"', data: [] });
        if (user.deleteStatus) return res.status(400).json({ status: 0, message: 'User is not found', data: [] });

        var deviceType = req.query.deviceType || req.params.deviceType || req.body.deviceType || 'ios';
        deviceType = deviceType.toLowerCase();

        if(req.body.email && req.body.password) {
            bcrypt.compare(req.body.password, user.hash_password, function(err, response) {
                co(function*(){
                    if(!response) {
                        return res.status(401).json({status: 0, message: "Authentication failed Invalid credentials",data: [] });
                    } else {
                        // update token id
                        req.body.device_token = req.body.device_token ? req.body.device_token : '';                        
                        var updateObj = {device_token: req.body.device_token, deviceType: deviceType};                     
                        user = yield User.findByIdAndUpdate(user._id, {$set: updateObj}, { new: true }).exec();
                        user = JSON.parse(JSON.stringify(user));
                        var token = yield globals.getToken({ id: user._id });
                        delete user.hash_password;
                        return res.status(200).json({ status: 1, message: "User is authenticated successfully", data: { user: user, token: token }});                        
                    }
                }).catch(function(err){
                    err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                    return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
                });
            });
        } else if(!queryLoginObject.fb_id) {
                return res.status(400).json({status: 0, message: "Bad Request Please enter password", data: [] });
        } else {
            // update token id
            req.body.device_token = req.body.device_token ? req.body.device_token : '';
            var updateObj = {device_token: req.body.device_token, deviceType: deviceType};
            user = yield User.findByIdAndUpdate(user._id, {$set: updateObj}, { new: true }).exec();
            user = JSON.parse(JSON.stringify(user));
            var token = yield globals.getToken({id: user._id});
            delete user.hash_password;
            return res.status(200).json({status: 1, message: "User is authenticated successfully", data: { user: user, token: token }});
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
};

/**************
 SIGNUP MODULE
 **************/
exports.signup = function(req, res, next) {
       console.log(req.body)
    co(function*(){
        // Validating and initialising fields
     
        var queryObject = {}, verificationToken;
        if(req.body.email || req.body.fb_id) {
            req.body.email = req.body.email.toLowerCase();
            // req.body.email ? (queryObject.email = req.body.email) : delete queryObject.email;
            var username = new RegExp('^' + req.body.username + '$', "i");
            var nickname = new RegExp('^' + req.body.nickname + '$', "i");

            req.body.email ? (queryObject = {$or:[{email:req.body.email.toLowerCase()},{username: username},{nickname: nickname},{mobile: req.body.mobile}]}) : delete queryObject.$or;
            req.body.fb_id ? (queryObject.fb_id = req.body.fb_id) : delete queryObject.fb_id;
        }
        if(!Object.keys(queryObject).length) {
            return res.status(400).json({status: 0, message: "Please enter credentials",data: []});
        }
        var user = yield User.findOne(queryObject).exec();
        if(user) {
            var message = (user.email.toLowerCase() == req.body.email.toLowerCase()) ? 'User with this Email already exists' : ((user.mobile === req.body.mobile) ? 'User with this mobile already exists' : 'User with this username/nickname already exists'); 
            return res.status(200).json({status: 0, message: message, data:[] });
        }
        if(user && user.deleteStatus) return res.status(400).json({status: 0, message: 'Your account/contact details is been removed by admin - please contact at "support@memium.app"', data:[]});

        // Initialising fields of user object to save
        var deviceType = req.query.deviceType || req.params.deviceType || req.body.deviceType || 'ios';
        deviceType = deviceType.toLowerCase();

        var newUser = new User(req.body);
        newUser.deviceType = deviceType;        
        newUser.device_token = req.body.device_token ? req.body.device_token : '';    
        if(req.body.password) {
            newUser.hash_password = bcrypt.hashSync(req.body.password, 10);
        }
        newUser.username = req.body.username ? req.body.username : req.body.nickname;
        newUser.nickname = req.body.nickname ? req.body.nickname : req.body.username;
        newUser.set('followeeCount', 0);
        newUser.set('sharedCount', 0);
        newUser.set('trendingCount', 0);
        newUser.set('followerCount', 0);
        newUser.set('glyffCount', 0);
        newUser.set('isPublic', true);
        newUser.set('isContactSync', true);
        const nameCanonical = newUser.get("name").toLowerCase().replace(/ /g, "");
        newUser.set("nameCanonical", nameCanonical);
        //console.log("check request",req);
        const imageUrl = req.file && req.file.location ? req.file.location : '';
        newUser.set("image", imageUrl);

        var push_notifications = [{type: "add", category: "glyph"},{type: "edit", category: "glyph"},
        {type: "share", category: "glyph"},{type: "trend", category: "glyph"},{type: "follow",
        category: "follow"}];
        newUser.set("push_notifications", push_notifications);

        crypto.randomBytes(48, function(err, buffer) {
            co(function*(){
                verificationToken = buffer.toString('hex');    
                if(!newUser.fb_id) {
                    newUser.set("userVerified", false);
                    newUser.set("verificationToken", verificationToken);
                }    
                var requestObject = {
                    "files": req.file
                };
                var thumbnailObject = yield generateThumbnail(requestObject);
                if(thumbnailObject) {
                    newUser.set("imageThumbnail", thumbnailObject.location)
                }
        
                var user = yield newUser.save();
                if(!user) return res.status(400).json({status: 0, message: "Bad Request User is not saved",data: [] });
                /*var confirmlink = 'http://ec2-52-53-136-248.us-west-1.compute.amazonaws.com:3000/static/confirmation.html?id='+verificationToken;*/
                var confirmlink = 'http://18.144.97.206:3000/static/confirmation.html?id='+verificationToken+'?email='+req.body.email+'?pass='+req.body.password;
                //var confirmlink = 'http://10.2.2.52:3000/static/confirmation.html?id='+verificationToken;
        
                yield globals.sendMail({
                    to: req.body.email,
                    subject: "Memium Sign Up Confirmation",
                    message: 'Hello ' + CapitlizeString(req.body.name) + ',<br><br>Welcome to Memium. Please verify your email address by clicking the link below:<br><br><a href="' + confirmlink + '">' + confirmlink +'</a><br><br>You may now Sign In and begin using Memium. Enjoy!<br><br>If you have any difficulties, feel free to email us at <a href="mailto:support@memium.app" target="_top">support@memium.app</a><br>'
                });
        
                // Generate token and return in response
                var token = yield globals.getToken({ id: user._id });
                delete user.hash_password;
                return res.status(200).json({status: 1, message: "Please verify email address by tapping the link in the message we just sent you.\nCheck your spam folder if you don't see the email message within a few minutes", data: []});
            }).catch(function(err){
                err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
            });
        });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
};

function CapitlizeString(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

/**************
 SIGNUPFB MODULE
 **************/
exports.signupfb = function(req, res) {
    co(function*(){
        // Validating and initialising fields
        if(!req.body.fb_id) return res.status(400).json({status: 0, message: "Please enter credentials",data: []});
        
        var username = new RegExp('^' + req.body.username + '$', "i");
        var nickname = new RegExp('^' + req.body.nickname + '$', "i");

        var queryArr = [
            {fb_id: req.body.fb_id},
            {username: username},
            {nickname: nickname},
            {mobile: req.body.mobile}
        ];

        if(req.body.email || req.body.fb_id) {
            queryArr.push({email: req.body.email.toLowerCase()});
        }
        var user = yield User.findOne({$or: queryArr}).exec();
        if(user) {
            var message = (user.email.toLowerCase() == req.body.email.toLowerCase()) ? 'User with this Email already exists' : (user.fb_id == req.body.fb_id ? "User with this facebook account already exists" : ((user.mobile === req.body.mobile) ? 'User with this mobile already exists' : 'User with this username/nickname already exists')); 
            return res.status(200).json({status: 0, message: message, data:[] });
        }

        // if(user && user.deleteStatus) return res.status(400).json({status: 0, message: 'Your account/contact details is been removed by admin - please contact at "support@memium.app"', data:[]});
        if (user && user.deleteStatus) return res.status(400).json({ status: 0, message: 'User is not found', data: [] });
        
        // Initialising fields of user object to save
        var deviceType = req.query.deviceType || req.params.deviceType || req.body.deviceType || 'ios';
        deviceType = deviceType.toLowerCase();

        var newUser = new User(req.body);  
        newUser.deviceType = deviceType;      
        newUser.device_token = req.body.device_token ? req.body.device_token : '';
        newUser.set('followeeCount', 0);
        newUser.set('sharedCount', 0);
        newUser.set('trendingCount', 0);
        newUser.set('followerCount', 0);
        newUser.set('glyffCount', 0);
        newUser.set('isPublic', true);
        newUser.set('isContactSync', true);
        // var nameCanonical = newUser.get("name").toLowerCase().replace(/ /g, "");
        // newUser.set("nameCanonical", nameCanonical);
        // nameCanonical = newUser.get("name").toLowerCase().replace(/ /g, "_");
        // newUser.set("username", nameCanonical);
        // newUser.set("nickname", nameCanonical);
        newUser.set("userVerified", true);
        const imageUrl = req.file ? req.file.location : req.body.fb_profile_pic_url;
        newUser.set("fb_profile_pic_url", imageUrl);
    
        var push_notifications = [{"type": "add", "category": "glyph"},{"type": "edit", "category": "glyph"},
        {"type": "share", "category": "glyph"},{"type": "trend", "category": "glyph"},{"type": "follow",
        "category": "follow"}];    
        newUser.set("push_notifications", push_notifications)

        var user = yield newUser.save();
        if(!user) return res.status(400).json({status: 0, message: "Bad Request User is not saved",data: [] });

        // Generate token and return in response
        var token = yield globals.getToken({ id: user._id });
        delete user.hash_password;
        return res.status(200).json({status: 1, message: "User saved successfully", data: { user: user, token: token } });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
};

/**************
 SIGNOUT MODULE
 **************/
exports.signout = function(req, res) {
     co(function*(){
        // Validating and initialising fields
        if(!req.query.user_id) return res.status(400).json({status: 0, message: "Bad Request Invalid User Id"});
        
        var userId = String(req.query.user_id);
        yield Authentication.remove({ userId: userId });
        res.clearCookie("Authorization");
        var updateObj = {
            $set: {
                device_token: '',
                deviceType: ''
            }
        };
        yield User.findByIdAndUpdate(userId, updateObj, { new: true }).exec();
        return res.status(200).json({status: 1, message: "User logout successfully"});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
};

/**************
 CHANGE PASSWORD MODULE
 **************/
exports.changePassword = function(req, res) {
    co(function*(){
        // Validating and initialising fields
        if(!req.params.userId) return res.status(400).json({status: 0, message: "Bad Request Invalid User Id", code: 400});
        if(!req.body.oldpassword) return res.status(400).json({status: 0, message: "Bad Request Please sent old password", code: 400});
        if(!req.body.newpassword) return res.status(400).json({status: 0, message: "Bad Request Please sent new password", code: 400});
        
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        // API call to find user
        var queryChangePasswordObject = {"_id": ObjectId(req.params.userId), "userVerified": true};
        var user = yield User.findOne(queryChangePasswordObject).exec();
        if(!user) return res.status(404).json({status: 0, message: "User is not found", data: [], code: 404 });

        bcrypt.compare(req.body.oldpassword, user.hash_password, function(err, response) {    
            if(response) {
                bcrypt.compare(req.body.newpassword, user.hash_password, function(err, responseStatus) {
                    co(function*(){
                        if(responseStatus) {
                            return res.status(401).json({status: 0, message: "Authentication failed New and old passwords are same",data: [], code: 401 });
                        } else {
                            // update token id
                            var password = bcrypt.hashSync(req.body.newpassword, 10);
                            var userObj = yield User.findByIdAndUpdate(req.params.userId, {$set: {hash_password: password, device_token: '', deviceType: ''}}, { new: true }).exec();
                            if(!userObj) return res.status(404).json({status: 0, message: "User does not exists", code: 404, data: [] });
        
                            // Authentication.remove({ userId: req.params.userId }, function(err) {
                            //     if (err) { res.status(500).json({status: 0, message: err }); return false; }
                            //     res.clearCookie("Authorization");
                            //     res.status(200).json({status: 1, message: "User has changed password successfully", code: 200, data:{ user: userObj } });
                            //     return false;
                            // });
        
                            return res.status(200).json({status: 1, message: "User has changed password successfully", code: 200, data:[] });    
                        }
                    }).catch(function(err){
                        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
                    });  
                });
            } else {
                return res.status(401).json({status: 0, message: "Old password does not match",data: [], code: 401 });
            }
        });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
};

/**************
 FORGOT PASSWORD MODULE
 **************/
exports.forgotPassword = function(req, res) {
    co(function*(){
        // Validating and initialising fields
        if(!req.body.email) return res.status(400).json({status: 0, message: "Bad Request Invalid Email ID", code: 400});
        
        var verificationToken;
        // API call to find user
        crypto.randomBytes(48, function(err, buffer) {
            co(function*(){
                verificationToken = buffer.toString('hex');
                req.body.email = req.body.email.toLowerCase();
                var queryForgotPasswordObject = {"email": req.body.email,"userVerified": true};
                var user = yield User.findOne(queryForgotPasswordObject).exec();
                if(!user) return res.status(404).json({status: 0, message: "User is not found", data: [], code: 404 });
        
                var appDir = path.dirname(require.main.filename);
                // var currentDate = new Date();
                var passwordresetlink = 'http://ec2-52-53-136-248.us-west-1.compute.amazonaws.com:3000/static/password-reset.html?token='+verificationToken+'&id='+user._id;
                //var passwordresetlink = 'http://10.2.2.52:3000/static/password-reset.html';
        
                yield globals.sendMail({
                    to: req.body.email,
                    subject: "Reset Password Link",
                    message: "<b>Please click on below link to reset your password</b><br><br><a href='" + passwordresetlink +"'>"+ passwordresetlink +"</a>"
                });
                       
                var queryUserObject = {"_id": ObjectId(user._id), "email": req.body.email,"userVerified": true};
                yield User.update(queryUserObject, {$set: {resetPasswordToken: verificationToken, updatedAt: new Date()}}, {"multi": true}).exec();
    
                return res.status(200).json({status: 1, message: "Password has been sent to the registered email-id", code: 200 });
            }).catch(function(err){
                err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
            });
        });        
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
};


/**************
 RESET PASSWORD MODULE
 **************/
exports.resetPassword = function(req, res) {
    co(function*(){
        // Validating and initialising fields
        if(!req.body.token) return res.status(400).json({status: 0, message: "Bad Request Invalid Email ID", code: 400});
        if(!req.body.password) return res.status(400).json({status: 0, message: "Bad Request Invalid Password", code: 400});
        if(!req.body.id) return res.status(400).json({status: 0, message: "Bad Request Invalid ID", code: 400});

        // API call to find user
        var password = bcrypt.hashSync(req.body.password, 10);
        var queryResetPasswordObject = {"_id": ObjectId(req.body.id), "userVerified": true};
        
        var userObj = yield User.findOne(queryResetPasswordObject).exec();
        if (!userObj) return res.status(404).json({status: 0, message: "User with this email does not exist", code: 404, data: []});
        if (!userObj.resetPasswordToken) return res.status(404).json({status: 0, message: "Link is expired", code: 404, data: []});

        var date1 = new Date();
        var date2 = userObj.updatedAt;
        var hours = Math.abs(date1 - date2) / 36e5;
        if(hours > 0.11) return res.status(404).json({status: 0, message: "Link is expired with actual date", code: 404, data: []});

        yield User.update(queryResetPasswordObject, {$set: {hash_password: password,resetPasswordToken: ''}}, {"multi": true}).exec();
        return res.status(200).json({status: 1, message: "Password has been set successfully"});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
};

/**************************
 EMAIL VALIDATION API
 **************************/
exports.checkEmailAvailable = checkEmailAvailable;
function checkEmailAvailable(requestObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            if(!requestObj.email) return resolve(false);
            // API call to fetch user
            //var email = new RegExp('^'+requestObj.email+'$', "i");
            var email = requestObj.email.toLowerCase();
            if(requestObj.userId) {
                var queryCondition = {"email": email,"_id": { $ne: ObjectId(requestObj.userId) }};
            } else {
                var queryCondition = {"email": email};
            }
            var user = yield User.findOne(queryCondition).exec();
            if(!user) return resolve(true); 
            if(user && !user.userVerified) return reject({errorCode: 404, errorMessage: "Account with this email is already registered, but not verified yet."}); 
            
            return reject({errorCode: 404, errorMessage: "Account with this email is already exists."});
        }).catch(function(err){
            return reject({errorCode: 500, errorMessage: 'Error while checking email'});
        });
    });
}
exports.checkEmail = function (req, res) {
    co(function*(){
        if(!(req.query.email)) return res.status(404).json({status: 0, message: "Bad Request Please enter email", data: [] });

        var isEmailAvailable = yield checkEmailAvailable(req.query);
        if(isEmailAvailable) return res.status(200).json({status: 1, message: "Email id is available", data: []}); 
                
        return res.status(404).json({status: 0, message: "Account with this email is already exists", data: [] });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

/**************************
 USERNAME VALIDATION API
 **************************/
exports.checkUsernameAvailable = checkUsernameAvailable;
function checkUsernameAvailable(requestObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var username = requestObj.username ? requestObj.username : requestObj.nickname;
            if(!username) return resolve(false);

            // API call to fetch user
            username = new RegExp('^' + username +'$', "i");    
            if(requestObj.userId) {
                var queryCondition = {"$or":[{"username": username},{"nickname": username}],"_id": { $ne: ObjectId(requestObj.userId) }};
            } else {
                var queryCondition = {"$or":[{"username": username},{"nickname": username}]};
            }
            var user = yield User.findOne(queryCondition).exec();
            if(!user) return resolve(true); 
            if(user && !user.userVerified) return reject({errorCode: 404, errorMessage: "Account with this username is already registered, but not verified yet."}); 
            
            return reject({errorCode: 404, errorMessage: "Account with this username is already exists."});
        }).catch(function(err){
            return reject({errorCode: 500, errorMessage: 'Error while checking username'});
        });
    });
}
exports.checkUsername = function (req, res) {
    co(function*(){
        if(!(req.query.username)) return res.status(404).json({status: 0, message: "Bad Request Please enter username", data: [] });

        var isUsernameAvailable = yield checkUsernameAvailable(req.query);
        if(isUsernameAvailable) return res.status(200).json({status: 1, message: "Username is available", data: []}); 
                
        return res.status(404).json({status: 0, message: "Account with this username is already exists", data: [] });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

/**************************
 EMAIL VALIDATION API
 **************************/
exports.checkMobileNoAvailable = checkMobileNoAvailable;
function checkMobileNoAvailable(requestObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            if(!requestObj.mobile) return resolve(false);
            // API call to fetch user
            var mobile = requestObj.mobile;
            if(requestObj.userId) {
                var queryCondition = {"mobile": mobile,"_id": { $ne: ObjectId(requestObj.userId) }};
            } else {
                var queryCondition = {"mobile": mobile};
            }
            var user = yield User.findOne(queryCondition).exec();
            if(!user) return resolve(true); 
            if(user && !user.userVerified) return reject({errorCode: 404, errorMessage: "Account with this mobile number is already registered, but not verified yet."}); 
            
            return reject({errorCode: 404, errorMessage: "Account with this mobile number is already exists."});
        }).catch(function(err){
            return reject({errorCode: 500, errorMessage: 'Error while checking mobile number'});
        });
    });
}
/*exports.checkMobileNo = function (req, res) {
    co(function*(){
        if(!(req.query.mobile)) return res.status(404).json({status: 0, message: "Bad Request Please enter mobile number", data: [] });

        var isMobileNoAvailable = yield checkMobileNoAvailable(req.query);
        if(isMobileNoAvailable) return res.status(200).json({status: 1, message: "Mobile number is available.", data: []}); 
                
        return res.status(404).json({status: 0, message: "Account with this mobile number is already exists.", data: [] });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}*/

/**************
 CHECK VERIFICATION TOKEN MODULE
 **************/
exports.checkVerificationToken = function(req, res) {
    co(function*(){
        // Validating and initialising fields
        if(!req.body.verificationToken) return res.status(400).json({status: 0, message: "Bad Request Invalid URL", code: 400});

        var token = req.body.verificationToken.toString();
        var queryVerificationTokenObject = {"verificationToken": token};
        var userObj = yield User.findOneAndUpdate(queryVerificationTokenObject, {$set: {userVerified: true, verificationToken: ''}}, { new: true }).exec();
        if (!userObj) return res.status(404).json({status: 0, message: "Link is expired", code: 404, data: []});
    
        return res.status(200).json({status: 1, message: "Account is confirmed successfully"});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
};

/**************
 SET DEVICE TOKEN (ESPECIALLY FOR ANDROID)
 **************/
exports.setDeviceToken = function(req, res) {
    co(function*(){
        var userDeleted = yield isUserDeleted(req.body.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});
        
        // Validating and initialising fields
        if(!req.body.deviceToken) return res.status(400).json({status: 0, message: "No device token found Please provide device token", code: 400});

        var token = req.body.deviceToken.toString();
        var deviceType = req.query.deviceType || req.params.deviceType || req.body.deviceType || 'android';
        var appCode = req.query.appCode || req.params.appCode || req.body.appCode;
        deviceType = deviceType.toLowerCase();
        var updateObj = {device_token: token, deviceType: deviceType};
        var userObj = yield User.findOneAndUpdate({_id : req.body.userId}, {$set: updateObj}, { new: true }).exec();
        
        if (!userObj) return res.status(404).json({status: 0, message: "Error while setting device token", code: 404, data: []});
    
        return res.status(200).json({status: 1, message: "Device token set successfully"});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
    
};

/**************
UPDATE DEVICE TOKEN (ESPECIALLY FOR ANDROID BECAUSE OF FIRBASE ACCOUNT WRONG ONE)
 **************/
exports.updateDeviceToken = function(req, res) {
    co(function*(){
    
        // Validating and initialising fields
        if(!req.body.deviceToken) return res.status(400).json({status: 0, message: "No device token found Please provide device token", code: 400});


        var tokenReq = req.headers.authorization;
       
        var decoded = jwt.decode(tokenReq);
        var userId = decoded.id;

        var token = req.body.deviceToken.toString();
        var deviceType = req.query.deviceType || req.params.deviceType || req.body.deviceType || 'android';
        var appCode = req.query.appCode || req.params.appCode || req.body.appCode;
        deviceType = deviceType.toLowerCase();
        var updateObj = {device_token: token, deviceType: deviceType,appCode:appCode};
        var userObj = yield User.findOneAndUpdate({_id :userId}, {$set: updateObj}, { new: true }).exec();
        
        if (!userObj) return res.status(404).json({status: 0, message: "Error while setting device token", code: 404, data: []});
    
        return res.status(200).json({status: 1, message: "Device token set successfully"});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}   