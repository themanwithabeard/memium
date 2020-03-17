/**************************
 MODULE INITIALISATION
 **************************/
 const  mongoose        = require('mongoose')
        Glyff           = require('../models/glyff.server.model').Glyff,
        Report          = require('../models/report.server.model').reportglyff,
        ObjectId        = require('mongodb').ObjectID,
        GlyphModel      = require('../models/glyff.server.model'),
        Follow          = require('../models/users.server.model').follow,
        User            = require('../models/users.server.model').user,
        FFmpeg          = require('fluent-ffmpeg'),
        s3              = require('../../configs/aws').s3,
        request         = require('request'),
        fs              = require('fs'),
        path            = require('path'),
        im              = require('imagemagick'),
        moment          = require('moment'),
        async           = require('async'),
        Promise         = require('bluebird'),
        co              = require('co'),
        _               = require('lodash'),
        jwt             = require('jsonwebtoken'),
        isUserDeleted   = require('../../configs/globals').checkWhetherUserIsDeleted;
 
/**************************
 S3 UPLOAD
 **************************/
function addDays (date, daysToAdd) {
  var _24HoursInMilliseconds = 86400000;
  return new Date(date.getTime() + daysToAdd * _24HoursInMilliseconds);
};
function unixTime(unixtime) {

    var u = new Date(unixtime*1000);

    return u.getUTCFullYear() +
    '-' + ('0' + u.getUTCMonth()).slice(-2) +
    '-' + ('0' + u.getUTCDate()).slice(-2) + 
    ' ' + ('0' + u.getUTCHours()).slice(-2) +
    ':' + ('0' + u.getUTCMinutes()).slice(-2) +
    ':' + ('0' + u.getUTCSeconds()).slice(-2) +
    '.' + (u.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) 
};

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
                            if (err && !requestObj.alreadyDeleted) {
                                return reject({errorCode: 500, errorMessage: err});
                            }
                            var thumbnailResponseObject = {
                                "thumbnailUrl": thumbnailUrl,
                                "etag": data.ETag
                            };
                            return resolve(thumbnailResponseObject);
                        });       
                    }        
                });        
            });
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            return reject(err);
        });
    });
}

/**************************************************************************************************
 This function is used to generateGif for video memes (to let android devices show video memes)
 **************************************************************************************************/
exports.generateGifFromVideo = generateGifFromVideo;
function generateGifFromVideo(files, caption, type) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var gifObject = {};
            if(type !== "video"){
                return resolve(gifObject);
            }    
            files.filter(function(ele) {
                co(function*(){
                    if(ele.originalname && ele.location) {
                        var nameImage = ele.originalname.split(".");   
                        if(nameImage[0] == caption) {
                            var gifDir = path.dirname(require.main.filename);
                            gifNewName = 'gifCustomisedGif' + Date.now().toString() + '.gif';
                            gifFilename = gifDir + '/uploads/'+ gifNewName;
                            var gifrequestObject = {
                                "fileNewName": gifNewName,
                                "newFilename": gifFilename,
                                "fileType": "gif",
                                "alreadyDeleted": 1
                            };
                            async.series([
                            function(newcallback) {
                                // generating color palette for better quality
                                FFmpeg(ele.location)
                                .addOutputOption('-vf','fps=15,scale=400:-1:flags=lanczos,palettegen')
                                .output("/tmp/palette.png")
                                .on('end', function() {
                                    // then generating gif
                                    FFmpeg(ele.location)
                                    .setStartTime('00:00:00')
                                    .addInput("/tmp/palette.png")
                                    .addOutputOption('-lavfi', 'fps=15,scale=400:-1:flags=lanczos [x]; [x][1:v] paletteuse')
                                    .output(gifFilename)
                                    .on('end', function(err) {
                                        co(function*(){
                                            var gifResponseObject = yield bucketUpload(gifrequestObject);
                                            if(gifResponseObject) {
                                                gifObject = Object.assign({}, ele);
                                                var nameImage = ele.originalname.split(".");
                                                gifObject.originalname = 'glyffCustomisedGif.gif';
                                                gifObject.location = gifResponseObject.thumbnailUrl;
                                                gifObject.key = gifNewName;
                                                gifObject.etag = gifResponseObject.etag;
                                                console.log("Video to GIF conversion succssful ... ",gifObject);
                                                return newcallback(null, gifObject);
                                            } else {
                                                return newcallback(null, false); 
                                            }
                                        }).catch(function(err){
                                            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                                            return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
                                        });                            
                                    })
                                    .on('error', function(err){
                                        console.log("Error while converting video to gif ... ",err);
                                        callback(null, false);
                                    }).run();
                                }).on('error', function(err){
                                    console.log("Error while converting video to gif ... ",err);
                                    err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                                    return reject(err);
                                }).run();
                            }],function(err, data){
                                if(err) {
                                    err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                                    return reject(err);
                                } else {
                                    return resolve(data);
                                }
                            });
                        }
                    }
                }).catch(function(err){
                    err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                    return reject(err);
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
            var fileNewName = '', newFilename = '', gifNewName = '', gifFilename = '';
            
            // Calling model to insert data
            request.files.filter(function(ele) {      
                if(ele.originalname && ele.location) {
                    var nameImage = ele.originalname.split(".");      
                    if(nameImage[0] == request.caption) {
                        var appDir = path.dirname(require.main.filename);
                        fileNewName = 'glyffThumbnail' + Date.now().toString() + '.' + nameImage[1];
                        newFilename = appDir + '/uploads/'+ fileNewName;
                        var requestObject = {
                            "fileNewName": fileNewName,
                            "newFilename": newFilename,
                            "fileType": nameImage[1]
                        };
                        var thumbnailObject = {
                            "originalname": 'glyffThumbnail.' + nameImage[1]
                        };
                        var gifObject = {
                            "originalname": 'glyffGif.' + "gif"
                        };
                        
                        if(nameImage[1] == 'jpeg' || nameImage[1] == 'JPEG' || nameImage[1] == 'jpg' || nameImage[1] == 'png' || nameImage[1] == 'gif' || nameImage[1] == 'JPG' || nameImage[1] == 'PNG' || nameImage[1] == 'GIF') {
                            im.convert([ele.location, '-resize', '100x100', newFilename],
                                function(err, stdout, stderr) {
                                co(function*(){
                                    if (err) {
                                        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                                        return reject(err);
                                    }
                                    
                                    var thumbnailResponseObject = yield bucketUpload(requestObject);       
                                    if(thumbnailResponseObject) {        
                                        thumbnailObject.location = thumbnailResponseObject.thumbnailUrl;
                                        thumbnailObject.key = fileNewName;
                                        thumbnailObject.etag = thumbnailResponseObject.etag;
                                        return resolve(thumbnailObject);
                                    } else {
                                        return resolve(false);
                                    }
                                }).catch(function(err){
                                    err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                                    return reject(err);
                                });        
                            });        
                        } else {
                            var gifDir = path.dirname(require.main.filename);
                            gifNewName = 'gifThumbnail' + Date.now().toString() + '.gif';
                            gifFilename = gifDir + '/uploads/'+ gifNewName;
                            var gifrequestObject = {
                                "fileNewName": gifNewName,
                                "newFilename": gifFilename,
                                "fileType": "gif"
                            };
                            async.series([
                                function(newcallback) {        
                                    // var finalGifObtain = generateGif(ele.location,gifFilename,gifrequestObject,gifNewName);
                                    async.series([
                                        function(newcallback2) {
                                            FFmpeg(ele.location)
                                            .addOutputOption('-vf','fps=15,scale=100:-1:flags=lanczos,palettegen')
                                            .output("/tmp/palette.png")
                                            .on('end', function() {
                                                // then generating gif
                                                FFmpeg(ele.location)
                                                .setStartTime('00:00:00')
                                                .setDuration('4')
                                                .addInput("/tmp/palette.png")
                                                .addOutputOption('-lavfi', 'fps=15,scale=100:-1:flags=lanczos [x]; [x][1:v] paletteuse')
                                                .output(gifFilename)
                                                .on('end', function(err) {
                                                    co(function*(){
                                                        if(!err) {
                                                            var thumbnailResponseObject = yield bucketUpload(gifrequestObject);
                                                            if(thumbnailResponseObject) {
                                                                gifObject.location = thumbnailResponseObject.thumbnailUrl;
                                                                gifObject.key = gifNewName;
                                                                gifObject.etag = thumbnailResponseObject.etag;
                                                                newcallback2(null, gifObject);  
                                                            }                                                   
                                                        }
                                                    }).catch(function(err){
                                                        //err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                                                        //return reject(err);
                                                        console.log("Error while converting video to gif ... ",err);
                                                        newcallback2(null, false);
                                                    });                     
                                                })
                                                .on('error', function(err){
                                                    console.log("Error while converting video to gif ... ",err);
                                                    newcallback2(null, false);
                                                }).run();
                                            }).on('error', function(err){
                                                console.log("Error while converting video to gif ... ",err);
                                                newcallback2(null, false);
                                            }).run();
                                        }],function(err,finalGifObtain){
                                            newcallback(null, finalGifObtain);
                                        })
                                    // newcallback(null, finalGifObtain);        
                                },
                                function(newcallback) {
                                    FFmpeg(ele.location)
                                    .addOutputOption('-vf','fps=15,scale=100:-1:flags=lanczos,palettegen')
                                    .output("/tmp/palette.png")
                                    .on('end', function() {
                                        // then generating gif
                                        FFmpeg(ele.location)
                                        .setStartTime('00:00:00')
                                        .setDuration('3')
                                        .addInput("/tmp/palette.png")
                                        .addOutputOption('-lavfi', 'fps=15,scale=100:-1:flags=lanczos [x]; [x][1:v] paletteuse')
                                        .output(newFilename)
                                        .on('end', function(err) {
                                            co(function*(){
                                                if(!err) {
                                                    var thumbnailResponseObject = yield bucketUpload(requestObject);        
                                                    if(thumbnailResponseObject) {
                                                        thumbnailObject.location = thumbnailResponseObject.thumbnailUrl;
                                                        thumbnailObject.key = fileNewName;
                                                        thumbnailObject.etag = thumbnailResponseObject.etag;
                                                         // console.log(thumbnailUrl, "thumbnailUrl", thumbnailObject)
                                                        newcallback(null, thumbnailObject);
                                                    } else {
                                                        newcallback(null, false);
                                                    }        
                                                }
                                            }).catch(function(err){
                                                // err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                                                // return reject(err);
                                                // console.log(err, "error in ffmpeg")
                                                newcallback(null, false);
                                            });
                                        })
                                        .on('error', function(err){
                                            // console.log(err, "error in ffmpeg")
                                            callback(null, false);
                                        }).run();
                                    })
                                    .on('error', function(err){
                                        // console.log(err, "error in ffmpeg")
                                        callback(null, false);
                                    }).run();        
                                },
                            ],function(error,result){
                                return resolve(result);
                                // console.log("final result from both function",result[0])
                                // console.log("final result from both function",result[1])
                            });
                        }        
                    }        
                }
            });
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

var cron = require('node-cron');

cron.schedule('00 00 17 * * *', function(){
    co(function*(){
        yield sendTrendingNotification();
    }).catch(function(err){
        console.log('Error while sending trending notifications - ',err);
    });
});
// function generateGif(location,gifFilename,gifrequestObject,gifNewName){

// }

function sendTrendingNotification(){
    return new Promise(function(resolve, reject){
        co(function*(){
            var glyphObj = yield GlyphModel.getTopTrendingGlyph();
            if(!glyphObj.status) return resolve(false);
            var glyphData = glyphObj.data[0];
            var userData = glyphObj.data[0].user;
            var requestNotificationObject = {
                "glyffId": glyphData._id,
                "fromUserID": glyphData.creatorID,
                "fromMessage": " has created today's top trending meme",
                "type": "trend",
                "fromUserImageUrl": userData.image,
                "glyphImageUrl": glyphData.type === 'image' ? glyphData.glyffThumbnail : glyphData.glyffGif,
                "isPublic": userData.isPublic,
                "fromName": userData.nickname ? '@' + userData.nickname : '@' + userData.username,
                "glyphType": glyphData.type
            };
            yield GlyphModel.notificationModel(requestNotificationObject);
            var users = yield User.find({'userVerified':true}).exec();
            yield Promise.each(users, co.wrap(function*(user, key){
                var checkStatusPushnotification = user.push_notifications.filter(function(push_notification) {
                    return ( push_notification.type === "trend" && push_notification.category === "glyph")
                });
                if(checkStatusPushnotification.length) {
                    var deviceType = 'ios';
                    // deviceType = deviceType.toLowerCase();
                    user.badge += 1;
                    yield user.save();
                    var requestPushNotificationObj = {
                        name : userData.name,
                        device_token : user.device_token,
                        deviceType: user.deviceType,
                        message : user._id.toString() === glyphData.creatorID ? 'Your meme has been Top Trending meme for yesterday' : userData.name + " has created today's top trending meme",
                        type : "trend",
                        badge : user.badge + 1,
                        imageUrl : glyphData.glyffThumbnail,
                        // imageUrl : glyphData.glyffCustomised,
                        glyphType : glyphData.type,
                        fromUserImageUrl : userData.image
                    };

                    // for temporary commented 
                    // yield GlyphModel.pushNotificationModel(requestPushNotificationObj);
                }
            }));
            resolve(true);
        }).catch(function(err){
            reject(err);
        });
    });
}
/**************************
 SAVE GLYFF LIST API
 **************************/
exports.saveGlyff = function (req, res, next) {
    console.log(req.body)
 
    co(function*(){
        // Validating the fields
        if(!req.body.creatorID) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});

        var userDeleted = yield isUserDeleted(req.body.creatorID);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});
        
        var files = [];
        var caption = req.files.glyffCustomised ? "glyffCustomised" : "glyffOriginal";
        if(req.files.glyffOriginal) {
            var filename = 'glyffOriginal.' + req.files.glyffOriginal[0].originalname.split('.')[1];
            var file = req.files.glyffOriginal[0];
            file.originalname = filename;
            files.push(file);
        }

        if(req.files.glyffCustomised) {
            var filename = 'glyffCustomised.' + req.files.glyffCustomised[0].originalname.split('.')[1];
            var file = req.files.glyffCustomised[0];
            file.originalname = filename;
            files.push(file);
        }
        req.files = files.length ? files : req.files;
        var glyffCustomisedName,  glyffCustomisedType, glyffCustomisedEtag, glyffCustomisedLocation;
        req.body.captions = req.body.captions && req.body.captions.length ? JSON.parse(req.body.captions) : req.body.captions;
        req.body.tags = req.body.tags && req.body.tags.length ? JSON.parse(req.body.tags) : req.body.tags;
        var uniqTags = _.uniq(req.body.tags);
        req.body.tags = uniqTags;
        var glyphObject = req.body;
        //var caption = ((req.body.captions && req.body.captions.length) || (req.body.isSignatureEnable && (req.body.isSignatureEnable === "true" || req.body.isSignatureEnable == true || req.body.isSignatureEnable == "1" || req.body.isSignatureEnable == 1)) || (req.body.borderSize && Number(req.body.borderSize)>0)) ? "glyffCustomised" : "glyffOriginal";
        var requestObject = {
            "files": req.files,
            "caption": caption
        };
        
        if(caption == 'glyffOriginal') {
            req.files.filter(function(ele) {
                if (ele.originalname && ele.location) {
                    var nameImage = ele.originalname.split(".");    
                    if (nameImage[0] == caption) {
                        glyffCustomisedName = 'glyffCustomised' + Date.now().toString() + '.' + nameImage[1];
                        glyffCustomisedType = nameImage[1];
    
                        var requestObject = {
                            "fileNewName": glyffCustomisedName,
                            "newFilename": ele.location,
                            "fileType": nameImage[1]
                        };    
                        var options = {
                            uri: ele.location,
                            encoding: null
                        };
                        request(options, function(error, response, body) {
                            if (error || response.statusCode !== 200) {
                                console.log("failed to get image");
                                console.log(error);
                            } else {    
                                const params = {
                                    Bucket: 'glyphoto',
                                    Key: requestObject.fileNewName,
                                    ACL: "public-read",
                                    ContentType: requestObject.fileType,
                                    Body: body
                                };    
                                s3.putObject(params, function(error, data) {
                                    if (error) {
                                        console.log("error downloading image to s3");
                                    } else {
                                        console.log("success uploading to s3");
                                        glyffCustomisedLocation = 'https://glyphoto.s3-us-west-1.amazonaws.com/'+ requestObject.fileNewName;
                                        glyffCustomisedEtag = data.etag;
                                    }
                                });
                            }
                        });    
                    }
                }
            });
        }

        var videoGif = yield generateGifFromVideo(req.files, caption, req.body.type);
        var length = req.files.length;
        glyphObject.files = req.files;
        var fileObject = Object.assign({}, glyphObject.files[length - 1]);
        var gifObject = Object.assign({}, glyphObject.files[length - 1]);
        
        if(Object.keys(videoGif).length){
            var glyffVideoGifObject = videoGif[0];
            glyphObject.files.push(glyffVideoGifObject);
        }
        
        if(caption == 'glyffOriginal') {
            var otherFileObject = Object.assign({}, glyphObject.files[length - 1]);
            otherFileObject.location = 'https://glyphoto.s3-us-west-1.amazonaws.com/'+ glyffCustomisedName;
            otherFileObject.originalname = 'glyffCustomised.' + glyffCustomisedType;
            otherFileObject.key = glyffCustomisedName;
            otherFileObject.etag = (glyffCustomisedEtag) ? glyffCustomisedEtag : '';
            glyphObject.files.push(otherFileObject);
        }
        
        var thumbnailObject = yield generateThumbnail(requestObject);
        if(thumbnailObject.length){
            if(thumbnailObject[1].location){
                fileObject.location = thumbnailObject[1].location;
            }
            if(thumbnailObject[1].originalname){
                fileObject.originalname = thumbnailObject[1].originalname;    
            }
            if(thumbnailObject[1].key){
                fileObject.key = thumbnailObject[1].key;
            }
            if(thumbnailObject[1].etag){
                fileObject.etag = thumbnailObject[1].etag;
            }
            
            glyphObject.files.push(fileObject);
            if(thumbnailObject[0][0].location){
                gifObject.location =thumbnailObject[0][0].location;
            }
            if(thumbnailObject[0][0].originalname){
                gifObject.originalname = thumbnailObject[0][0].originalname;
            }
            if(thumbnailObject[0][0].key){
                gifObject.key = thumbnailObject[0][0].key;    
            }
            if(thumbnailObject[0][0].etag){
                gifObject.etag = thumbnailObject[0][0].etag;    
            }
            
            glyphObject.files.push(gifObject);    
        } else{
            fileObject.location = thumbnailObject.location;
            fileObject.originalname = thumbnailObject.originalname;  
            fileObject.key = thumbnailObject.key;  
            fileObject.etag = thumbnailObject.etag;
            glyphObject.files.push(fileObject);
        }

         var stickerdata = {
         userId     : req.body.creatorID,
         stickerUrl : glyphObject.files[1].location,
         stickerType: 'mine' 
        }
if(req.body.uploadtype == 'sticker')
      var stickers = yield GlyphModel.saveStickerModel(stickerdata);
        
        var glyph = yield GlyphModel.saveGlyphModel(glyphObject);
      
       
     
        
        
        if(glyph.status == 0) return res.status(500).json({status: 0, message: glyph.message, data: [], code: 500 });
        
        if(glyph.category != 'edit') {
            var queryUserObject = {"_id": ObjectId(req.body.creatorID)};
            var user = yield User.findOne(queryUserObject, {hash_password: 0}).exec();
            if(!user) return res.status(404).json({status: 0, message: 'User not found , please provide correct creator ID of Glyff', data: [], code: 500 });
    
            
            // Calling model to insert data
            var image = user.image ? user.image : user.fb_profile_pic_url;
            var userName = user.nickname ? '@' + user.nickname : '@' + user.username;
            const pushMessage = (glyph.category == 'new') ? userName + " created a new meme" : userName + " cloned your meme";
            const message = (glyph.category == 'new') ? " created a new meme" : " cloned your meme";
            const type = (glyph.category == 'new') ? "newGlyph" : "editGlyph";
            const fromUserID = (glyph.category == 'new') ? user._id : user.parentID;

            var requestNotificationObject = {
                "glyffId": glyph._id,
                "fromUserID": fromUserID,
                "fromMessage": message,
                "type": type,
                "fromUserImageUrl": image,
                "glyphImageUrl": glyph.type === 'image' ? glyph.glyffThumbnail : glyph.glyffGif,
                "isPublic": user.isPublic,
                "fromName": userName,
                "glyphType": glyph.type
            };
            yield GlyphModel.notificationModel(requestNotificationObject);

            var requestFollowObject = {
                "followeeId": ObjectId(user._id),
                "push_notification": (glyph.category == 'new') ? { "category" : "glyph", "type" : "add" } : { "category" : "glyph", "type" : "edit" }
            };
            var followees = yield GlyphModel.fetchFolloweesModel(requestFollowObject);
                    
            var counter = 0;
            if(followees.length > 0) {
                followees.filter( function( item ) {
                    co(function*(){
                        var updatedUser = yield User.findByIdAndUpdate({"_id": ObjectId(item.user._id)},{$inc: { badge: 1 }},{hash_password: 0}).exec();
                        var checkStatusPushnotification = updatedUser.push_notifications.filter(function(push_notification) {
                            return ( push_notification.type === "add" && push_notification.category === "glyph")
                        });
    
                        if(checkStatusPushnotification.length && item.user.device_token) {
                            var requestPushNotificationObj = {
                                name : requestNotificationObject.fromName,
                                device_token : item.user.device_token,
                                deviceType : item.user.deviceType,
                                // message : requestNotificationObject.fromMessage,
                                message : pushMessage,
                                type : glyphObject.type,
                                badge : updatedUser.badge + 1,
                                imageUrl : glyph.type === 'image' ? glyph.glyffThumbnail : glyph.glyffGif,
                                // imageUrl : glyph.glyffCustomised,
                                glyphType : glyph.type,
                            };
                            yield GlyphModel.pushNotificationModel(requestPushNotificationObj);
                            counter++;
                            if(followees.length == counter) {
                                return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph }, code: 201 });
                            }
                        } else {
                            counter++;
                            if(followees.length == counter) {
                                return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph }, code: 201 });
                            }
                        }
                    }).catch(function(err){
                        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
                    });
                });
            } else {
                return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph }, code: 201 });
            }
        } else {
            // In case of edit    
            var notificationFlag = false, requestUserId = '';
            //var cloneSourceGlyffId = req.body.referenceGlyffId ? req.body.referenceGlyffId : req.body.glyffId;
            var cloneSourceGlyffId = req.body.glyffId;
            yield GlyphModel.updateGlyphEditCountModel(cloneSourceGlyffId);

            if(req.body.creatorID.toString() == req.body.parentID.toString()) {
                return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph }, code: 201 });
            } else {
                notificationFlag = true;
                requestUserId = ObjectId(req.body.parentID);
            }

            // if(glyph.creatorID.toString() == req.body.creatorID.toString()) {
            //     if(glyph.parentID.toString() == req.body.creatorID.toString()) {
            //         return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph }, code: 201 });
            //     } else {
            //         notificationFlag = true;
            //         requestUserId = ObjectId(glyph.parentID);
            //     }    
            // } else {
            //     notificationFlag = true;
            //     requestUserId = ObjectId(req.body.creatorID);
            // }
    
            if(notificationFlag) {
                //change in requestUserId
                var queryUserObject = {"_id": ObjectId(req.body.creatorID)};
                var user = yield User.findOne(queryUserObject, {hash_password: 0}).exec();               
                if(!user) return res.status(404).json({status: 0, message: 'User not found , please provide correct creator ID of Glyff', data: [], code: 500 });
                
                // Calling model to insert data
                var image = user.image ? user.image : user.fb_profile_pic_url;
                var userName = user.nickname ? '@' + user.nickname : '@' + user.username;
                const pushMessage = (glyph.category == 'new') ? userName + " created a new meme" : userName + " cloned your meme";
                const message = (glyph.category == 'new') ? " created a new meme" : " cloned your meme";
                const type = "editGlyph";
                const fromUserID = user._id;
                var requestNotificationObject = {
                    "glyffId": glyph._id,
                    "fromUserID": fromUserID,
                    "fromMessage": message,
                    "type": type,
                    "fromUserImageUrl": image,
                    "glyphImageUrl": glyph.type === 'image' ? glyph.glyffThumbnail : glyph.glyffGif,
                    "isPublic": user.isPublic,
                    "fromName": userName,
                    "glyphType": glyph.type
                };
                yield GlyphModel.notificationModel(requestNotificationObject);
                
                var requestFollowObject = {
                    "followeeId": ObjectId(user._id),
                    "push_notification": (glyph.category == 'new') ? { "category" : "glyph", "type" : "add" } : { "category" : "glyph", "type" : "edit" }
                };

                var parentUser = yield User.findByIdAndUpdate({"_id": requestUserId},{$inc: { badge: 1 }},{hash_password: 0}).exec();
    
                var checkStatusPushnotification = parentUser.push_notifications.filter(function(push_notification) {
                    return ( push_notification.type === "edit" && push_notification.category === "glyph")
                });

                if(!checkStatusPushnotification.length) return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph }, code: 201 });


                var requestPushNotificationObj = {
                    name : user.name,
                    device_token : parentUser.device_token,
                    deviceType : parentUser.deviceType,
                    message : pushMessage,
                    type : type,
                    badge : parentUser.badge + 1,
                    imageUrl : glyph.type === 'image' ? glyph.glyffThumbnail : glyph.glyffGif,
                    // imageUrl : glyph.glyffCustomised,
                    glyphType : glyph.type,
                };
                yield GlyphModel.pushNotificationModel(requestPushNotificationObj);
                return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph }, code: 201 });
            }
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}


//SAVE STICKER API
exports.saveSticker = function(req,res){
	console.log("Test")
	console.log("Test")
	console.log("Test")
	console.log("Test")
	console.log("Test")
	
     co(function*(){
          yield GlyphModel.saveStickerModel(req.body);
                return res.status(201).json({status: 1, message: "Sticker has been added Successfully"});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [] });  
    });
}


//GET API
exports.getSticker = function(req,res){
	console.log("Test")
	console.log("Test")
	console.log("Test")
	console.log("Test")
	console.log("Test")
     co(function*(){        
       
          var sticker = yield GlyphModel.getSticker(req.params);
                return res.status(201).json({status: 1, message: "Stickers",data:sticker});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [] });  
    });
}



/**************************
 FETCH USER GLYFF LIST API
 **************************/
 exports.fetchUserGlyff = function (req, res) {
    co(function*(){
        // Validating user id
        if(!req.params.userId) {
            return res.status(400).json({status: 0, message: "Bad Request Invalid User Id",data:[]});
        }
        var userId = req.query.user_id ? ObjectId(req.query.user_id) : ObjectId(req.params.userId);
        
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});
        
        var limit = parseInt(req.query.limit);
        var offset = parseInt(req.query.offset);
        var paginationQuery = { skip: offset, limit: limit };
        var currentUserId = ObjectId(req.params.userId);

        var queryCondition = req.query.captionText ? { $text: { $search: req.query.captionText }, "creatorID": userId, "isDeleted": false, $and: [{ $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: currentUserId }] }] }] }] } : { "creatorID": userId, "isDeleted": false, $and: [{ $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: currentUserId }] }] }] }]};

        var reportedGlyffs = yield GlyphModel.checkIfGlyffsReportedByUser(currentUserId);
        if(reportedGlyffs && reportedGlyffs.length > 0){            
            queryCondition.$and.push({$or : [
                {$and:[{_id: {$in: reportedGlyffs}},{creatorID: currentUserId}]},
                {_id: {$nin: reportedGlyffs}}
            ]});
        }
        if(req.query.isReaction == true || req.query.isReaction == "true") {
            queryCondition.isReaction = true;
        }
        var isTextBasedSearch = req.query.captionText ? 1 : 0;
        var requestObject = {
            "queryCondition": queryCondition,
            "paginationQuery" : paginationQuery,
            "userId": userId,
            "currentUserId": currentUserId,
            "isTextBasedSearch": isTextBasedSearch
        };
        if(req.query.sortParams) {
            var sortQuery = {sortParams: req.query.sortParams, sortOrder: req.query.sortOrder ? req.query.sortOrder : "asc"};
            requestObject.sortQuery = sortQuery;
        }
        var userGlyffs = yield GlyphModel.fetchAllGlyphModel(requestObject);
        if(userGlyffs.status === 'Unfollow'){
            var user = yield User.findOne({ "_id": userId }, { hash_password: 0 }).exec();
            var isFollowObject = yield Follow.findOne({ followerId: userId, followeeId: currentUserId }).exec();
            user.isFollowed = isFollowObject ? (isFollowObject.isValid ? 2 : 1) : 0;
            return res.status(500).json({ status: 0, message: userGlyffs.message, data: { glyffs: [], user: user, hasMoreRecords: 0, offset: offset } }); 
        }
        if(!userGlyffs.length) {
            var user = yield User.findOne({"_id": userId}, {hash_password: 0}).exec();
            var isFollowObject = yield Follow.findOne({followerId: userId, followeeId: currentUserId}).exec();
            user.isFollowed = isFollowObject ? ( isFollowObject.isValid ? 2 : 1 ) : 0;
            return res.status(404).json({status: 0, message: "No memes to display" ,data: {glyffs: [], user: user, hasMoreRecords: 0, offset: offset} });
        }
        var hasMoreRecords = limit > userGlyffs.length ? 0 : 1;
        var user = userGlyffs[0].user;
        user.isFollowed = userGlyffs[0].isFollow;
        return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs: userGlyffs,user: user, hasMoreRecords: hasMoreRecords, offset: offset }});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [] });  
    });
}

/**************************
 FETCH RELATED GLYFF LIST API
 **************************/
exports.fetchRelatedGlyffs = function (req, res) {
    co(function*(){
        // Validating user id
        if(!req.query.user_id) {
            return res.status(400).json({status: 0, message: "Bad Request Invalid User Id",data:[]});
        }
        if(!req.params.glyffId) {
            return res.status(400).json({status: 0, message: "Bad Request Invalid Glyff Id",data:[]});
        }
        var userDeleted = yield isUserDeleted(req.query.user_id);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var userId = ObjectId(req.query.user_id);
        var glyffId = ObjectId(req.params.glyffId);
        var glyffDetails = yield getGlyffDetails(userId, glyffId);
        if(!glyffDetails) {
            return res.status(404).json({status: 0, message: "No memes to display",data: [], code: 404 });
        } else {

            // Updating view count for that glyff
            var reqObj = {"userId": userId, "glyphId": glyffId};
            yield GlyphModel.updateGlyphViewCountModel(reqObj);
            var referenceGlyffId = glyffDetails.referenceGlyffId ? glyffDetails.referenceGlyffId : glyffId;
            var limit = parseInt(req.query.limit);
            var offset = parseInt(req.query.offset);
            var paginationQuery = { skip: offset, limit: limit };
            var reportedGlyffs = yield GlyphModel.checkIfGlyffsReportedByUser(userId);
            var queryCondition = {};
            if(reportedGlyffs && reportedGlyffs.length > 0){            
                queryCondition = {
                    $and: [
                        {
                            $or: [
                                {
                                    $and: [
                                        { "referenceGlyffId": { $exists: true } },
                                        { "referenceGlyffId": referenceGlyffId },
                                        {
                                            $or: [
                                                {
                                                    $and: [
                                                        { _id: { $in: reportedGlyffs } },
                                                        { creatorID: userId }
                                                    ]
                                                },
                                                {
                                                    _id: { $nin: reportedGlyffs }
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    $and: [
                                        { "_id": referenceGlyffId },
                                        {
                                            $or: [
                                                {
                                                    $and: [
                                                        { _id: { $in: reportedGlyffs } },
                                                        { creatorID: userId }
                                                    ]
                                                },
                                                {
                                                    _id: { $nin: reportedGlyffs }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            $or: [
                                { "isSecret": { $exists: false } },
                                {
                                    $and: [
                                        { "isSecret": { $exists: true } },
                                        {
                                            $or: [
                                                { "isSecret": false },
                                                { "isSecret": true, creatorID: userId }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    "isDeleted":false                    
                };
            } else {
                queryCondition = { 
                    $and: [
                        {
                            $or: [
                                {
                                    $and: [
                                        { "referenceGlyffId": { $exists: true } },
                                        { "referenceGlyffId": referenceGlyffId }
                                    ]
                                },
                                { "_id": referenceGlyffId }
                            ]
                        },
                        {
                            $or: [
                                { "isSecret": { $exists: false } },
                                {
                                    $and: [
                                        { "isSecret": { $exists: true } },
                                        {
                                            $or: [
                                                { "isSecret": false },
                                                { "isSecret": true, creatorID: userId }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ], 
                    "isDeleted": false
                };
            }
            if(req.query.isReaction == true || req.query.isReaction == "true") {
                queryCondition.isReaction = true;
            }    
            var requestObject = {
                "queryCondition": queryCondition,
                "paginationQuery" : paginationQuery,
                "userId": glyffDetails.parentID,
                "currentUserId": userId,
                "isTextBasedSearch": 0
            };
            if(req.query.sortParams) {
                var sortQuery = {sortParams: req.query.sortParams, sortOrder: req.query.sortOrder ? req.query.sortOrder : "asc"};
                requestObject.sortQuery = sortQuery;
            }
            var relatedGlyffs = yield GlyphModel.fetchAllGlyphModel(requestObject);
            if(relatedGlyffs.status === 'Unfollow') {
                let response = { "glyffs" : [glyffDetails]}
                return res.status(200).json({status: 1, message: relatedGlyffs.message ,data: response });
            }
            if(!relatedGlyffs.length) {
                return res.status(404).json({status: 0, message: "No memes to display" ,data: [] });
            }

            relatedGlyffs = JSON.parse(JSON.stringify(relatedGlyffs));

            var idArr = relatedGlyffs.map(obj => obj._id);
            if(idArr.indexOf(glyffId.toString()) >= 0) {
                relatedGlyffs.splice(idArr.indexOf(glyffId.toString()),1);
            }
            var currentGlyffArr = [glyffDetails];
            relatedGlyffs = currentGlyffArr.concat(relatedGlyffs);
            var hasMoreRecords = limit > relatedGlyffs.length ? 0 : 1;
            return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs: relatedGlyffs,user: relatedGlyffs[0].user, hasMoreRecords: hasMoreRecords, offset: offset }});
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [] }); 
    });
}

/*****************************************
 FETCH RELATED GLYFF LIST API FOR ADMIN
 *****************************************/
// exports.fetchRelatedGlyffsForAdmin = function (req, res) {
//     co(function*(){
//         var response = yield fetchRelatedGlyffsForAdmin(req);
//         return res.status(200).json(response);
//     }).catch(function(err){
//         err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
//         return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [] }); 
//     });
// }


// Common function that can be used in both fetchRelatedGlyffsForAdmin and fetchClones
function fetchRelatedGlyffsForAdmin(req) {
    return new Promise(function(resolve, reject){
        co(function*(){
             // Validating user id
            if(!req.query.user_id) {
                return reject({errorCode: 400, errorMessage: "Bad Request Invalid User Id"});
            }
            if(!req.params.glyffId) {
                return reject({errorCode: 400, errorMessage: "Bad Request Invalid Glyff Id"});
            }
            var userId = ObjectId(req.query.user_id);
            var glyffId = ObjectId(req.params.glyffId);
            
            var glyffDetails = yield getGlyffDetails(userId, glyffId);
            if(!glyffDetails) {
                return reject({errorCode: 400, errorMessage: "No memes to display"});
            } else {
                var reportedGlyffObj = yield Report.findOne({glyphId: glyffId}).exec();
                glyffDetails.isReported = reportedGlyffObj ? "Yes" : "No";
                var referenceGlyffId = glyffDetails.referenceGlyffId ? glyffDetails.referenceGlyffId : glyffId;
                var limit = parseInt(req.query.limit);
                var offset = parseInt(req.query.offset);
                var paginationQuery = { skip: offset, limit: limit };
                var queryCondition = {$or : [{$and: [{"referenceGlyffId": {$exists: true}}, {"referenceGlyffId": referenceGlyffId}]}, {"_id": referenceGlyffId}] ,"isDeleted":false};
                if(req.query.isReaction == true || req.query.isReaction == "true") {
                    queryCondition.isReaction = true;
                }    
                var requestObject = {
                    "queryCondition": queryCondition,
                    "paginationQuery" : paginationQuery,
                    "userId": glyffDetails.parentID,
                    "currentUserId": userId,
                    "isTextBasedSearch": 0
                };
                if(req.query.sortParams) {
                    var sortQuery = {sortParams: req.query.sortParams, sortOrder: req.query.sortOrder ? req.query.sortOrder : "asc"};
                    requestObject.sortQuery = sortQuery;
                }
                var relatedGlyffs = yield GlyphModel.fetchAllGlyphModelForAdmin(requestObject);

                if(!relatedGlyffs.glyffs.length) {
                    return reject({errorCode: 400, errorMessage: "No memes to display"});
                }

                finalRelatedGlyffs = JSON.parse(JSON.stringify(relatedGlyffs.glyffs));
                var count = relatedGlyffs.count[0].count;

                var idArr = finalRelatedGlyffs.map(obj => obj._id);
                if(idArr.indexOf(glyffId.toString()) >= 0) {
                    finalRelatedGlyffs.splice(idArr.indexOf(glyffId.toString()),1);
                }
                // var currentGlyffArr = [glyffDetails];
                // count[0].count +=1 ;
                // finalRelatedGlyffs = currentGlyffArr.concat(finalRelatedGlyffs);
                
                return resolve({status: 1, message: "Memes found successfully", data: { glyffs: finalRelatedGlyffs, user: finalRelatedGlyffs[0].user, count: count, offset: offset}});
            }
        }).catch(function(err){
            var error = err ? err : {errorCode: 500, errorMessage: "Error while fetching memes"};
            reject(error);
        });
    })
}

/*****************************************
 FETCH CLONES API FOR ADMIN
 *****************************************/
exports.fetchClones = function (req, res) {
    co(function*(){
        var request = {
            query : {
                user_id: req.params.userId,
                limit: req.body.limit,
                offset: req.body.offset,
                sortParams: req.body.sortParams,
                sortOrder: req.body.sortOrder
            },
            params : {
                glyffId: req.body.glyffId
            }
        };
        var response = yield fetchRelatedGlyffsForAdmin(request);
        // response.data.glyffs.splice(0,1);
        // response.data.count[0].count -= 1;
        return res.status(200).json(response);
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [] }); 
    });
}

/**************************
 FETCH Glyph API METHOD
 **************************/
exports.fetchGlyphs = fetchGlyphs;
function fetchGlyphs(requestObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var glyphs = yield GlyphModel.fetchGlyphModel(requestObj);
            // var glyphCount = yield GlyphModel.countGlyphModel(requestObj);  // seperate api is made to count all glyphs
            if(glyphs.length) {
                glyphs.hasMoreRecords = requestObj.pageSortQuery.limit > glyphs.length ? 0 : 1;
                resolve(glyphs);
            } else {
                reject({ errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'});
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

exports.checkFollow = function(item) {
    return new Promise(function(resolve, reject){
        co(function*(){
            item.types = item.types || "";
            if((item.user.isPublic || (String(item.creatorID) == String(item.userId))) && item.types == "All") {
                return resolve(item);
            } else  {
                var followObject = yield Follow.findOne({followeeId: item.creatorID,followerId: item.userId,isValid: true }).exec();
                if(followObject) {
                    return resolve(item);
                } else {
                   return resolve(false);
                }
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/* exports.checkIfUserIsFollowing = function (glyffs, callback) {

    var cnt = 0;
    glyffs.map(function(k,v){
        var creatorId = String(k.user._id);
        var parentId = String(k.user._id);
        Follow.find({followerId:ObjectId(glyffs.userId),followeeId:ObjectId(creatorId)},function(err,creatorFollowers) {
            Follow.find({followerId:ObjectId(glyffs.userId),followeeId:ObjectId(parentId)},function(err,parentFollowers) {
                Follow.count({followerId:ObjectId(creatorId),isValid:true},function(err,creatorFollowee_count) {
                    Follow.count({followerId:ObjectId(parentId),isValid:true},function(err,parentFollowee_count) {
                        Follow.count({followeeId:ObjectId(creatorId),isValid:true},function(err,creatorFollower_count) {
                            Follow.count({followeeId:ObjectId(parentId),isValid:true},function(err,parentFollower_count) {
                                glyffs[v].user.followerCount = creatorFollower_count;
                                glyffs[v].parentUser.followerCount = parentFollower_count;
                                glyffs[v].user.followeeCount = creatorFollowee_count;
                                glyffs[v].parentUser.followeeCount = parentFollowee_count;

                                if(creatorFollowers.length > 0  && creatorFollowers[0].isValid == true){
                                    glyffs[v].user.isFollowed = 2;
                                } else {
                                    if(creatorFollowers.length > 0 && !creatorFollowers[0].isValid) {
                                        glyffs[v].user.isFollowed = 1;
                                    }
                                }

                                if(parentFollowers.length > 0  && parentFollowers[0].isValid == true){
                                    glyffs[v].parentUser.isFollowed = 2;
                                } else {
                                    if(parentFollowers.length > 0 && !parentFollowers[0].isValid) {
                                        glyffs[v].parentUser.isFollowed = 1;
                                    }
                                }

                                cnt = cnt + 1;
                                if(glyffs.length == cnt) {
                                    callback(null, glyffs)
                                }
                            });
                        });
                    });
                });
            });
        });
    });

} */

exports.checkIfUserIsFollowing = checkIfUserIsFollowing;
function checkIfUserIsFollowing(glyffs) {
   
    return new Promise(function(resolve, reject){
        co(function*(){
            var userIds = JSON.parse(JSON.stringify(_.map(glyffs.glyphs, 'creatorID')));
            var parentIds = JSON.parse(JSON.stringify(_.map(glyffs.glyphs, 'parentID')));
                   
            userIds = _.concat(userIds, parentIds);
            userIds = _.uniq(userIds);

            var followers = yield Follow.find({ followerId: ObjectId(glyffs.loggedinId), followeeId: { $in: userIds }}).exec();
           
            var tempFollowers = [];
            yield Promise.each(glyffs.glyphs, co.wrap(function*(glyph, key){
                // Commented logic as for performance improvement now only one query will fire
                // var creatorFollower = yield Follow.findOne({followerId: ObjectId(glyffs.loggedinId),followeeId: glyph.creatorID}).exec();
                // var parentFollower =  yield Follow.findOne({followerId: ObjectId(glyffs.loggedinId),followeeId: glyph.parentID}).exec();
                
                // glyph.user.isFollowed = creatorFollower ? (creatorFollower.isValid ? 2 : 1) : 0;                
                // glyph.parentUser.isFollowed = parentFollower ? (parentFollower.isValid ? 2 : 1) : 0;
                
                tempFollowers = _.filter(followers, function(followerObj){
                    if (glyph.user._id.toString() === followerObj.followeeId.toString()) {
                        return followerObj;
                    }
                });
                glyph.user.isFollowed = tempFollowers.length ? (tempFollowers[0].isValid ? 2 : 1) : 0;
                tempFollowers = _.filter(followers, function (followerObj) {
                    if (glyph.parentUser._id.toString() === followerObj.followeeId.toString()) {
                        return followerObj;
                    }
                });
                glyph.parentUser.isFollowed = tempFollowers.length ? (tempFollowers[0].isValid ? 2 : 1) : 0;
            }));
            resolve(glyffs.glyphs);
        }).catch(function(err){
            console.log("err")
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**************************
 Search Glyph API
 **************************/
exports.searchCaptionBasedGlyphs = function (req, res) {
    co(function*(){
        console.log(req.query)
        if(!(req.query.user_id && req.query.limit && req.query.offset && req.query.type)){
            return res.status(404).json({status: 0, message: "Bad Request Invalid Parameters", data: [] });
        }
        
        var userDeleted = yield isUserDeleted(req.query.user_id);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var reqQueryObj = {
            caption : req.query.captionText,
            limit : parseInt(req.query.limit),
            offset : parseInt(req.query.offset),
            userId : ObjectId(req.query.user_id),
            glifId : ObjectId(req.query.glif_id),
        };
        if(req.query.isReaction == true || req.query.isReaction == "true") {
            reqQueryObj.isReaction = true;
        }
        if(req.query.sortParams) {
            reqQueryObj.sortParams = req.query.sortParams;
            reqQueryObj.sortOrder = req.query.sortOrder ? req.query.sortOrder : 'asc';
        }
        if(req.query.type == 'Recents') {
            var recentGlyphs = yield fetchRecentGlyphs(reqQueryObj);
            var hasMoreRecords = reqQueryObj.limit > recentGlyphs.length ? 0 : 1;
            return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs: recentGlyphs, hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } } );
        } else if(req.query.type == 'Trending') {
            // var trendingGlyphs = yield fetchTrendingGlyphs(reqQueryObj);
            // var hasMoreRecords = reqQueryObj.limit > trendingGlyphs.length ? 0 : 1;
            //return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs: trendingGlyphs, hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } } );
            return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs: [], hasMoreRecords: 0, offset: reqQueryObj.offset } } );
        } else if(req.query.type == 'Mine') {
            var mineGlyphs = yield fetchMineGlyphs(reqQueryObj);
            var hasMoreRecords = reqQueryObj.limit > mineGlyphs.length ? 0 : 1;
            return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs: mineGlyphs, hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } } );
        } else if(req.query.type == 'All') {
            var allGlyphs = yield fetchAllGlyphs(reqQueryObj, 'all');
            var hasMoreRecords = reqQueryObj.limit > allGlyphs.length ? 0 : 1;
            return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs: allGlyphs, hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } } );
        } else if(req.query.type == 'Friends') {
            var friendsGlyphs = yield fetchFriendsGlyphs(reqQueryObj);
            var hasMoreRecords = reqQueryObj.limit > friendsGlyphs.length ? 0 : 1;
            return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs: friendsGlyphs, hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } } );
        } else if(req.query.type == 'Favourites') {
            var favouriteGlyphs = yield fetchFavouritesGlyphs(reqQueryObj);
            var hasMoreRecords = reqQueryObj.limit > favouriteGlyphs.length ? 0 : 1;
            return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs: favouriteGlyphs, hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } } );
        } else if (req.query.type == 'Public') {
            var publicGlyphs = yield fetchPublicGlyphs(reqQueryObj);
            var hasMoreRecords = reqQueryObj.limit > publicGlyphs.length ? 0 : 1;
            return res.status(200).json({ status: 1, message: "Memes found successfully", data: { glyffs: publicGlyphs, hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } });
        } else {
            return res.status(500).json({status: 0, message: 'Bad Request Invalid type ',data: [], code: 500 });
        }
    }).catch(function(err){
        console.log(err,'err')
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [], code: err.errorCode });
    });   
}

/**********************
 RECENT GLYPHS API
 **********************/
function fetchRecentGlyphs(dataObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var paginationQuery = { skip: dataObj.offset, limit: dataObj.limit };

            // Finding those glyffs which are not deleted and not secret and if it is secret then the logged in user should be creator of glyff
            var queryCondition = dataObj.caption ? { $text: { $search: dataObj.caption }, "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }]};

            var isTextBasedSearch = dataObj.caption ? 1 : 0;
            if(dataObj.isReaction) {
                queryCondition.isReaction = true;
            }
            var requestObject = {
                "queryCondition": queryCondition,
                "paginationQuery" : paginationQuery,
                "userId": dataObj.userId,
                "isTextBasedSearch": isTextBasedSearch
            };
            if(dataObj.sortParams) {
                requestObject.sortQuery = {sortParams: dataObj.sortParams, sortOrder: dataObj.sortOrder};
            }
            var recentGlyphs = yield GlyphModel.aggregationViewedRecentGlyphModel(requestObject);
            // var glyphsList = glyphs.splice(dataObj.offset, dataObj.limit);
            if(recentGlyphs.length) {
                var finalRecentGlyffs = yield checkIfUserIsFollowing({glyphs : recentGlyphs, loggedinId : dataObj.userId});
                resolve(finalRecentGlyffs);            
            } else {
                reject({
                    errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'});
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**********************
 TRENDING GLYPHS API
 **********************/
function fetchTrendingGlyphs(dataObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            // Logic for Date/Time to find trending glyffs
            var now = new Date();
            var currentdate = now.setHours(17);
            currentdate = new Date(currentdate).setMinutes(30);
            currentdate = new Date(currentdate).setSeconds(00);
            var final = currentdate;
            var timeZoneOffset = -new Date().getTimezoneOffset()
            var utcStartTime = new Date(final + timeZoneOffset*60*1000)
            var finalDate = utcStartTime.getTime();            
            var previousDate = moment(utcStartTime).subtract(1,'days');
            var finalpreviousDate = new Date(previousDate).getTime();           
            var start = new Date(finalDate - (24 * 60 * 60 * 1000));
            
            var pageSortQuery = { sort: { viewCount: -1 }, skip: dataObj.offset, limit: dataObj.limit };
            var queryCondition = dataObj.caption ? { $text: { $search: dataObj.caption }, "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { updatedAt: { '$gte': new Date(finalpreviousDate), '$lte': new Date(finalDate) }, "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }]};
            if(dataObj.isReaction) {
                queryCondition.isReaction = true;
            }
            var requestObject = {
                "queryCondition": queryCondition,
                "pageSortQuery" : pageSortQuery,
                "userId": dataObj.userId
            };
            var trendingGlyphs = yield fetchGlyphs(requestObject);
            if(trendingGlyphs.length) {
                var finalTrendingGlyphs = yield checkIfUserIsFollowing({glyphs : trendingGlyphs, loggedinId : dataObj.userId});
                resolve(finalTrendingGlyphs);
            } else {
                reject({ errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'});
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**********************
 MINE GLYPHS API
 **********************/
function fetchMineGlyphs(dataObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var paginationQuery = { skip: dataObj.offset, limit: dataObj.limit };
            var queryCondition = dataObj.caption ? {$text: { $search: dataObj.caption }, "creatorID": dataObj.userId,"isDeleted": false} : {"creatorID": dataObj.userId,"isDeleted": false};
            var isTextBasedSearch = dataObj.caption ? 1 : 0;
            if(dataObj.isReaction) {
                queryCondition.isReaction = true;
            }
            var requestObject = {
                "queryCondition": queryCondition,
                "paginationQuery" : paginationQuery,
                "userId": dataObj.userId,
                "isTextBasedSearch": isTextBasedSearch
            };
            if(dataObj.sortParams) {
                requestObject.sortQuery = {sortParams: dataObj.sortParams, sortOrder: dataObj.sortOrder};
            }
            var mineGlyffs = yield fetchGlyphs(requestObject);
            if(mineGlyffs.length) {
                var finalMineGlyffs = yield checkIfUserIsFollowing({glyphs : mineGlyffs, loggedinId : dataObj.userId});
                resolve(finalMineGlyffs);
            } else {
                reject({ errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'});
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**********************
 ALL GLYPHS API
 **********************/
function fetchAllGlyphs(dataObj, reqType) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var paginationQuery = { skip: dataObj.offset, limit: dataObj.limit };

            var queryCondition = dataObj.caption ? { $text: { $search: dataObj.caption }, "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }]};
            
            var isTextBasedSearch = dataObj.caption ? 1 : 0;
            if(dataObj.isReaction) {
                queryCondition.isReaction = true;
            }
            var requestObject = {
                "queryCondition": queryCondition,
                "paginationQuery" : paginationQuery,
                "userId": dataObj.userId,
                "isTextBasedSearch": isTextBasedSearch,
                "publicPrivateOrder": -1
            };
            if(dataObj.sortParams) {
                requestObject.sortQuery = {sortParams: dataObj.sortParams, sortOrder: dataObj.sortOrder};
            }
           
            var allGlyffs = yield GlyphModel.aggregationFetchAllGlyphModelWithPublicPrivateOrder(requestObject, reqType);
            var finalGlyffs = yield checkIfUserIsFollowing({glyphs : allGlyffs, loggedinId : dataObj.userId});
            /* 
            var publicGlyffs = yield GlyphModel.aggregationFetchPublicGlyphModel(requestObject);
            var privateGlyffs = yield GlyphModel.aggregationFetchPrivateGlyphModel(requestObject);
            
            var allGlyffs = publicGlyffs.concat(privateGlyffs);
            if(allGlyffs.length) {
                allGlyffs.sort(function(a, b){
                    var dateA = new Date(a.createdAt), dateB = new Date(b.createdAt)
                    return dateB-dateA //sort by date descending
                });
                var glyffs = allGlyffs.splice(dataObj.offset, dataObj.limit);
                var finalGlyffs = yield checkIfUserIsFollowing({glyphs : glyffs, loggedinId : dataObj.userId});
            */
            if(finalGlyffs.length) {
            
                resolve(finalGlyffs);                
            } else {
                reject({ errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'});
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**********************
 FRIENDS GLYPHS API
 **********************/
function fetchFriendsGlyphs(dataObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var paginationQuery = { skip: dataObj.offset, limit: dataObj.limit };
            var queryCondition = dataObj.caption ? { $text: { $search: dataObj.caption }, "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }]};
            var isTextBasedSearch = dataObj.caption ? 1 : 0;
            if(dataObj.isReaction) {
                queryCondition.isReaction = true;
            }
            var requestObject = {
                "queryCondition": queryCondition,
                "paginationQuery" : paginationQuery,
                "userId": dataObj.userId,
                "isTextBasedSearch": isTextBasedSearch
            };
            if(dataObj.sortParams) {
                requestObject.sortQuery = {sortParams: dataObj.sortParams, sortOrder: dataObj.sortOrder};
            }
            var friendsGlyffs = yield GlyphModel.aggregationFetchFriendsGlyphModel(requestObject);
            if(friendsGlyffs.length) {
                var finalFriendsGlyffs = yield checkIfUserIsFollowing({glyphs : friendsGlyffs, loggedinId : dataObj.userId});
                resolve(finalFriendsGlyffs);
            } else {
                reject({ errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'});
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**********************
 FAVOURITES GLYPHS API
 **********************/
function fetchFavouritesGlyphs(dataObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var paginationQuery = { skip: dataObj.offset, limit: dataObj.limit };
            var queryCondition = dataObj.caption ? { $text: { $search: dataObj.caption }, "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }]};
            var isTextBasedSearch = dataObj.caption ? 1 : 0;
            if(dataObj.isReaction) {
                queryCondition.isReaction = true;
            }
            var requestObject = {
                "queryCondition": queryCondition,
                "paginationQuery" : paginationQuery,
                "userId": dataObj.userId,
                "isTextBasedSearch": isTextBasedSearch
            };
            if(dataObj.sortParams) {
                requestObject.sortQuery = {sortParams: dataObj.sortParams, sortOrder: dataObj.sortOrder};
            }
            var favouriteGlyffs = yield GlyphModel.aggregationFetchFavouriteGlyphModel(requestObject);
            if(favouriteGlyffs.length) {
                var finalFavouriteGlyffs = yield checkIfUserIsFollowing({glyphs : favouriteGlyffs, loggedinId : dataObj.userId});
                resolve(finalFavouriteGlyffs);
            } else {
                reject({ errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'});
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**********************
 PUBLIC GLYPHS API
 **********************/
function fetchPublicGlyphs(dataObj) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            var paginationQuery = { skip: dataObj.offset, limit: dataObj.limit };
            var queryCondition = dataObj.caption ? { $text: { $search: dataObj.caption }, "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] };
            var isTextBasedSearch = dataObj.caption ? 1 : 0;
            if (dataObj.isReaction) {
                queryCondition.isReaction = true;
            }
            var requestObject = {
                "queryCondition": queryCondition,
                "paginationQuery": paginationQuery,
                "userId": dataObj.userId,
                "isTextBasedSearch": isTextBasedSearch,
                "publicPrivateOrder": -1
            };
            if (dataObj.sortParams) {
                requestObject.sortQuery = { sortParams: dataObj.sortParams, sortOrder: dataObj.sortOrder };
            }
             
            var publicGlyffs = yield GlyphModel.aggregationFetchPublicGlyphModel(requestObject);
            var finalGlyffs = yield checkIfUserIsFollowing({ glyphs: publicGlyffs, loggedinId : dataObj.userId});
            
            if (finalGlyffs.length) {
                resolve(finalGlyffs);
            } else {
                reject({ errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply' });
            }
        }).catch(function (err) {
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}

/*******************************
 Search Glyph API For Keyboard
 *******************************/
exports.searchCaptionBasedGlyphsForKeyboard = function (req, res) {
    co(function*(){
        if(!(req.query.user_id && req.query.limit && req.query.offset && req.query.type)){
            return res.status(404).json({status: 0, message: "Bad Request Invalid Parameters", data: [] });
        }
        
        var userDeleted = yield isUserDeleted(req.query.user_id);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var reqQueryObj = {
            caption : req.query.captionText,
            limit : parseInt(req.query.limit),
            offset : parseInt(req.query.offset),
            userId : ObjectId(req.query.user_id),
            glifId : ObjectId(req.query.glif_id),
        };
        if(req.query.isReaction == true || req.query.isReaction == "true") {
            reqQueryObj.isReaction = true;
        }
        if(req.query.sortParams) {
            reqQueryObj.sortParams = req.query.sortParams;
            reqQueryObj.sortOrder = req.query.sortOrder ? req.query.sortOrder : 'asc';
        }
        
        if(req.query.type == 'All') {
            var allGlyphs = yield fetchAllGlyphsForKeyboard(reqQueryObj);
            var hasMoreRecords = reqQueryObj.limit > allGlyphs.length ? 0 : 1;
            return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs: allGlyphs, hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } } );
        } else {
            return res.status(500).json({status: 0, message: 'Bad Request Invalid type ',data: [], code: 500 });
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [], code: err.errorCode });
    });   
}

/*****************************
 ALL GLYPHS API For Keyboard
 *****************************/
function fetchAllGlyphsForKeyboard(dataObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var paginationQuery = { skip: dataObj.offset, limit: dataObj.limit };
            console.log(dataObj.caption,'dataObj.caption')
            var queryCondition = dataObj.caption ? { $text: { $search: dataObj.caption }, "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }]};
            var isTextBasedSearch = dataObj.caption ? 1 : 0;
            if(dataObj.isReaction) {
                queryCondition.isReaction = true;
            }
            var requestObject = {
                "queryCondition": queryCondition,
                "paginationQuery" : paginationQuery,
                "userId": dataObj.userId,
                "isTextBasedSearch": isTextBasedSearch,
                "publicPrivateOrder": -1
            };
            if(dataObj.sortParams) {
                requestObject.sortQuery = {sortParams: dataObj.sortParams, sortOrder: dataObj.sortOrder};
            }
            console.log(queryCondition,'queryCondition')
            console.log(requestObject,'requestObject')
            var allGlyffs = yield GlyphModel.aggregationFetchAllGlyphModelWithPublicPrivateOrderForKeyboard(requestObject);
            var finalGlyffs = yield checkIfUserIsFollowing({glyphs : allGlyffs, loggedinId : dataObj.userId});
            /* 
            var publicGlyffs = yield GlyphModel.aggregationFetchPublicGlyphModel(requestObject);
            var privateGlyffs = yield GlyphModel.aggregationFetchPrivateGlyphModel(requestObject);
            
            var allGlyffs = publicGlyffs.concat(privateGlyffs);
            if(allGlyffs.length) {
                allGlyffs.sort(function(a, b){
                    var dateA = new Date(a.createdAt), dateB = new Date(b.createdAt)
                    return dateB-dateA //sort by date descending
                });
                var glyffs = allGlyffs.splice(dataObj.offset, dataObj.limit);
                var finalGlyffs = yield checkIfUserIsFollowing({glyphs : glyffs, loggedinId : dataObj.userId});
            */
            if(finalGlyffs.length) {
                resolve(finalGlyffs);                
            } else {
               // reject({ errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'});
                reject({ errorCode: 404, errorMessage: 'No searched meme found.'});
                
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*****************
 EDIT GLYPH API
 *****************/
 exports.editGlyph = function (req, res) {
    co(function*(){
        // Validating the fields
        if(!req.params.glyphId) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});  
        if(!req.body.creatorID) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});

        var setObject = {};
        req.body.type ? (setObject.type = req.body.type) : delete setObject.type;
        req.body.title ? (setObject.title = req.body.title) : delete setObject.title;
        req.body.creatorID ? (setObject.creatorID = req.body.creatorID) : delete setObject.creatorID;
        req.body.captionText ? (setObject.captionText = req.body.captionText) : delete setObject.captionText;
        req.body.isEditable ? (setObject.isEditable = req.body.isEditable) : delete setObject.isEditable;
        req.body.followeeCount ? (setObject.followeeCount = req.body.followeeCount) : delete setObject.followeeCount;
        req.body.sharedCount ? (setObject.sharedCount = req.body.sharedCount) : delete setObject.sharedCount;
        req.body.trendingCount ? (setObject.trendingCount = req.body.trendingCount) : delete setObject.trendingCount;
        req.body.followerCount ? (setObject.followerCount = req.body.followerCount) : delete setObject.followerCount;
        req.body.glyffCount ? (setObject.glyffCount = req.body.glyffCount) : delete setObject.glyffCount;
        req.body.isPublic ? (setObject.isPublic = req.body.isPublic) : delete setObject.isPublic;
        req.body.isTemplate ? (setObject.isTemplate = req.body.isTemplate) : delete setObject.isTemplate;

        if(!req.files.length) {
            var requestObject = {
                "glyphId": req.params.glyphId,
                "setObject" : setObject
            };
            var glyph = yield GlyphModel.updateGlyphModel(requestObject);
            if(!glyph) return res.status(404).json({status: 0, message: "Meme does not exist", code: 404, data: [] });

            var queryUserObject = {"_id": ObjectId(req.body.creatorID)};
            var user = yield User.findOne(queryUserObject, {hash_password: 0}).exec();
            
            // Calling model to insert data
            var image = user.image ? user.image : user.fb_profile_pic_url;
            const pushMessage = user.name + " cloned his meme";
            const message = " cloned his meme";
            const type = "editGlyph";
            const fromUserID = user._id;
            
            var requestNotificationObject = {
                "glyffId": glyph._id,
                "fromUserID": fromUserID,
                "fromMessage": message,
                "type": type,
                "fromUserImageUrl": image,
                "glyphImageUrl": glyph.type === 'image' ? glyph.glyffThumbnail : glyph.glyffGif,
                "isPublic": user.isPublic,
                "fromName": user.nickname ? '@' + user.nickname : '@' + user.username,
                "glyphType": glyph.type
            };
            yield GlyphModel.notificationModel(requestNotificationObject);

            var requestFollowObject = {
                "followeeId": ObjectId(user._id),
                "push_notification": { "category" : "glyph", "type" : "edit" }
            };
            
            var followees = yield GlyphModel.fetchFolloweesModel(requestFollowObject);
            var counter = 0;
            if(followees.length > 0) {
                followees.filter( function( item ) {
                    co(function*(){
                        var updatedUser = yield User.findByIdAndUpdate({"_id": ObjectId(item.user._id)},{$inc: { badge: 1 }},{hash_password: 0});
                        var checkStatusPushnotification = updatedUser.push_notifications.filter(function(push_notification) {
                            return ( push_notification.type === "edit" && push_notification.category === "glyph")
                        });        
                        if(!checkStatusPushnotification.length) return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph } } );
            
                        var requestPushNotificationObj = {
                            name : requestNotificationObject.fromName,
                            device_token : item.user.device_token,
                            deviceType : item.user.deviceType,
                            // message : requestNotificationObject.fromMessage,
                            message : pushMessage,
                            type : req.body.type,
                            badge : updatedUser.badge + 1,
                            imageUrl : glyph.type === 'image' ? glyph.glyffThumbnail : glyph.glyffGif,
                            // imageUrl : glyph.glyffCustomised,
                            glyphType : glyph.type
                        };
                        yield GlyphModel.pushNotificationModel(requestPushNotificationObj);        
                        counter++;        
                        if(followees.length == counter) {
                            return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph } } );
                        }
                    }).catch(function(err){
                        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
                    });
                });        
            } else {
                return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph } } );
            }
        } else {
            var caption = req.body.captionText ? "glyffCustomised" : "glyffOriginal";
            var glyffCustomisedName, glyffCustomisedType, glyffCustomisedEtag, glyffCustomisedLocation;
            var requestObject = {
                "files": req.files,
                "caption": caption
            };

            if(caption == 'glyffOriginal') {        
                req.body.captionText = '';        
                req.files.filter(function(ele) {
                    if (ele.originalname && ele.location) {
                        var nameImage = ele.originalname.split(".");        
                        if (nameImage[0] == caption) {
                            glyffCustomisedName = 'glyffCustomised' + Date.now().toString() + '.' + nameImage[1];
                            glyffCustomisedType = nameImage[1];        
                            var requestObject = {
                                "fileNewName": glyffCustomisedName,
                                "newFilename": ele.location,
                                "fileType": nameImage[1]
                            };        
                            var options = {
                                uri: ele.location,
                                encoding: null
                            };
                            request(options, function(error, response, body) {
                                if (error || response.statusCode !== 200) {       
                                } else {        
                                    const params = {
                                        Bucket: 'glyphoto',
                                        Key: requestObject.fileNewName,
                                        ACL: "public-read",
                                        ContentType: requestObject.fileType,
                                        Body: body
                                    };        
                                    s3.putObject(params, function(error, data) {
                                        if (error) {        
                                        } else {        
                                            glyffCustomisedLocation = 'https://glyphoto.s3-us-west-1.amazonaws.com/'+ requestObject.fileNewName;
                                            glyffCustomisedEtag = data.etag;
                                        }
                                    });
                                }
                            });        
                        }
                    }
                });
        
            }

            var thumbnailObject = yield generateThumbnail(requestObject);
            var length = req.files.length;
            var glyphArray = req.files;
            var fileObject = Object.assign({}, glyphArray[length - 1]);
            var gifObject = Object.assign({}, glyphArray[length - 1]);

            if(caption == 'glyffOriginal') {
                var otherFileObject = Object.assign({}, glyphArray[length - 1]);
                otherFileObject.location = 'https://glyphoto.s3-us-west-1.amazonaws.com/'+ glyffCustomisedName;
                otherFileObject.originalname = 'glyffCustomised.' + glyffCustomisedType;
                otherFileObject.key = glyffCustomisedName;
                otherFileObject.etag = (glyffCustomisedEtag) ? glyffCustomisedEtag : '';
                glyphArray.push(otherFileObject);
            }
            if(thumbnailObject.length){
                if(thumbnailObject[1].location){
                    fileObject.location = thumbnailObject[1].location;
                }
                if(thumbnailObject[1].originalname){
                    fileObject.originalname = thumbnailObject[1].originalname;    
                }
                if(thumbnailObject[1].key){
                    fileObject.key = thumbnailObject[1].key;
                }
                if(thumbnailObject[1].etag){
                    fileObject.etag = thumbnailObject[1].etag;
                }                
                glyphArray.push(fileObject);

                if(thumbnailObject[0][0].location){
                    gifObject.location =thumbnailObject[0][0].location;
                }
                if(thumbnailObject[0][0].originalname){
                    gifObject.originalname = thumbnailObject[0][0].originalname;
                }
                if(thumbnailObject[0][0].key){
                    gifObject.key = thumbnailObject[0][0].key;    
                }
                if(thumbnailObject[0][0].etag){
                    gifObject.etag = thumbnailObject[0][0].etag;    
                }
                glyphArray.push(gifObject);   
            }
            else{
                fileObject.location = thumbnailObject.location;
                fileObject.originalname = thumbnailObject.originalname;  
                fileObject.key = thumbnailObject.key;  
                fileObject.etag = thumbnailObject.etag;
                glyphArray.push(fileObject);
            }

            glyphArray.filter(function(ele) {
                if(ele.originalname && ele.location) {
                    var nameImage = ele.originalname.split(".");
                    setObject[nameImage[0]] = ele.location;
                }
            });        
            var requestObject = {
                "glyphId": req.params.glyphId,
                "setObject" : setObject
            };
            requestObject.setObject.glyffCustomised = requestObject.setObject.glyffCustomised ? requestObject.setObject.glyffCustomised : '';

            yield GlyphModel.updateGlyphEditCountModel(req.params.glyphId);

            var glyph = yield GlyphModel.updateGlyphModel(requestObject);
            if(!glyph) return res.status(404).json({status: 0, message: "Meme does not exist", code: 404, data: [] });

            var queryUserObject = {"_id": ObjectId(req.body.creatorID)};
            var user = yield User.findOne(queryUserObject, {hash_password: 0}).exec();
            
            // Calling model to insert data
            var image = user.image ? user.image : user.fb_profile_pic_url;
            const pushMessage = user.name + " cloned his meme";
            const message = " cloned his meme";
            const type = "editGlyph";
            const fromUserID = user._id;
        
            var requestNotificationObject = {
                "glyffId": glyph._id,
                "fromUserID": fromUserID,
                "fromMessage": message,
                "type": type,
                "fromUserImageUrl": image,
                "glyphImageUrl": glyph.type === 'image' ? glyph.glyffThumbnail : glyph.glyffGif,
                "isPublic": user.isPublic,
                "fromName": user.nickname ? '@' + user.nickname : '@' + user.username,
                "glyphType": glyph.type
            };
            yield GlyphModel.notificationModel(requestNotificationObject);

            var requestFollowObject = {
                "followeeId": ObjectId(user._id),
                "push_notification": { "category" : "glyph", "type" : "edit" }
            };
            
            var counter = 0;
            var followees = yield GlyphModel.fetchFolloweesModel(requestFollowObject);
            if(followees.length > 0) {
                followees.filter( function( item ) {
                    co(function*(){
                        var updatedUser = yield User.findByIdAndUpdate({"_id": ObjectId(item.user._id)},{$inc: { badge: 1 }},{hash_password: 0}).exec();
                        var checkStatusPushnotification = updatedUser.push_notifications.filter(function(push_notification) {
                            return ( push_notification.type === "edit" && push_notification.category === "glyph")
                        });
            
                        if(!checkStatusPushnotification.length) return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph } } );
            
                        var requestPushNotificationObj = {
                            name : requestNotificationObject.fromName,
                            device_token : item.user.device_token,
                            deviceType : item.user.deviceType,
                            // message : requestNotificationObject.fromMessage,
                            message : pushMessage,
                            type : req.body.type,
                            badge : updatedUser.badge + 1,
                            imageUrl : glyph.type === 'image' ? glyph.glyffThumbnail : glyph.glyffGif,
                            // imageUrl : glyph.glyffCustomised,
                            glyphType : glyph.type
                        };
                        yield GlyphModel.pushNotificationModel(requestPushNotificationObj);
                        counter++;        
                        if(followees.length == counter) {
                            return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph } } );
                            
                        }
                    }).catch(function(err){
                        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
                    });
                });        
             } else {
                return res.status(201).json({status: 1, message: "Meme has been added to your Profile", data: { glyph: glyph } } );
            }
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}

/**************************
 SAVE FAVOURITE GLYPH API
 **************************/
 exports.saveGlyffFavourite = function (req, res, next) {
    co(function*(){
        // Validating the fields
        if(!req.body.userId) {
            return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }    
        if(!req.body.glyphId) {
            return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }

        var userDeleted = yield isUserDeleted(req.body.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var glyphFavouriteObject = req.body;
        glyphFavouriteObject.isDeleted = false;

        var alreadyFavouriteGlyff = yield GlyphModel.findGlyphFavouriteModel(glyphFavouriteObject);
        
        // Return with 500 if Glyff is reported
        if(alreadyFavouriteGlyff.status == 'Report') return res.status(500).json({status: 0, message: alreadyFavouriteGlyff.message, data: []});

        // Return with 200 if Glyff is already chosen favourite by user
        if(alreadyFavouriteGlyff.length) return res.status(200).json({status: 0, message: "Glyph is already favourite for the user"}); 

        // Else save it as favourite
        yield GlyphModel.saveGlyphFavouriteModel(glyphFavouriteObject);

        // Updating Glyff's favouriteCount and hotness
        var updatedGlyff = yield GlyphModel.calculateAndUpdateGlyphFavouriteCountAndHotness(ObjectId(req.body.glyphId));
        if(!updatedGlyff) return res.status(404).json({status: 0, message: "No memes to display",data: [], code: 404 });
        
        //updateting trending ness
        GlyphModel.calculateandUpdateTrendingNess(ObjectId(req.body.glyphId));
        if(!updatedGlyff) return res.status(404).json({status: 0, message: "No memes to display",data: [], code: 404 });
        
        // Updating User's favouriteCount and hotness
        var updatedUser = yield GlyphModel.calculateAndUpdateUserCredNoFavouriteCountAndHotness(updatedGlyff.creatorID);
        if(!updatedUser) return res.status(404).json({status: 0, message: "User not found",data: [], code: 404 });

        // Fetching Updated Glyff Details
        var glyffDetails = yield getGlyffDetails(req.body.userId, req.body.glyphId);
        if(!glyffDetails) return res.status(404).json({status: 0, message: "No memes to display",data: [], code: 404 });

        if(req.body.userId.toString() === glyffDetails.user._id.toString()) return res.status(201).json({status: 1, message: "Meme saved as a favourite successfully", code: 201, data: { glyph: glyffDetails} });

        var favUser = yield User.findOne({_id: glyphFavouriteObject.userId}).exec();
        var requestNotificationObject = {
            "glyffId": glyffDetails._id,
            "fromUserID": favUser._id,
            "toUserID": glyffDetails.user._id,
            "fromMessage": " faved your meme",
            "type": "favouriteGlyph",
            "fromUserImageUrl": favUser.image ? favUser.image : favUser.fb_profile_pic_url,
            "glyphImageUrl": glyffDetails.type === 'image' ? glyffDetails.glyffThumbnail : glyffDetails.glyffGif,
            "isPublic": favUser.isPublic,
            "fromName": favUser.nickname ? '@' + favUser.nickname : '@' + favUser.username,
            "glyphType": glyffDetails.type
        };
        yield GlyphModel.notificationModel(requestNotificationObject);

        var updatedUser = yield User.findByIdAndUpdate({"_id": ObjectId(glyffDetails.user._id)},{$inc: { badge: 1 }},{hash_password: 0}).exec();
        var checkStatusPushnotification = updatedUser.push_notifications.filter(function(push_notification) {
            return ( push_notification.type === "favourite" && push_notification.category === "glyph")
        });

        if(!checkStatusPushnotification.length) {
            return res.status(201).json({status: 1, message: "Meme saved as a favourite successfully", code: 201, data: { glyph: glyffDetails} });
        }

        var requestPushNotificationObj = {
            "name" : requestNotificationObject.fromName,
            "device_token" : glyffDetails.user.device_token,
            "deviceType" : glyffDetails.user.deviceType,
            // "message" : requestNotificationObject.fromMessage,
            "message" : requestNotificationObject.fromName + " faved your meme",
            "type" : "favouriteGlyph",
            "badge" : updatedUser.badge + 1,
            "imageUrl" : glyffDetails.type === 'image' ? glyffDetails.glyffThumbnail : glyffDetails.glyffGif,
            // "imageUrl" : glyffDetails.glyffCustomised,
            "glyphType" : glyffDetails.type,
        };
       
        var pushNotification = yield GlyphModel.pushNotificationModel(requestPushNotificationObj);
        //old condtion for check push notification
        // if(pushNotification) {
        //     return res.status(201).json({status: 1, message: "Meme saved as a favourite successfully", code: 201, data: { glyph: glyffDetails} });
        // } else {
        //     return res.status(500).json({status: 0, message: "Error while saving meme as favourite", code: 500 });
        // }
        return res.status(201).json({status: 1, message: "Meme saved as a favourite successfully", code: 201, data: { glyph: glyffDetails} });
    }).catch(function(err){        
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [], code: err.errorCode });
    });
}

/**************************
 REMOVE FAVOURITE GLYPH API
 **************************/
exports.removeFavouriteGlyff = function (req, res, next) {
    co(function*(){
        // Validating the fields
        if(!req.body.userId) {
            return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }    
        if(!req.body.glyphId) {
            return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }

        var userDeleted = yield isUserDeleted(req.body.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var removeGlyphFavouriteObject = req.body;

        // Remove glyff as favourite
        yield GlyphModel.removeFavouriteGlyff(removeGlyphFavouriteObject);

        // Updating Glyff's favouriteCount and hotness
        var updatedGlyff = yield GlyphModel.calculateAndUpdateGlyphFavouriteCountAndHotness(ObjectId(req.body.glyphId));
        if(!updatedGlyff) return res.status(404).json({status: 0, message: "No memes to display",data: [], code: 404 });

        // Updating user's favouriteCount and hotenss
        var updatedUser = yield GlyphModel.calculateAndUpdateUserCredNoFavouriteCountAndHotness(updatedGlyff.creatorID);
        if(!updatedUser) return res.status(404).json({status: 0, message: "User not found",data: [], code: 404 });

        // Fetching updated glyff's details
        var glyffDetails = yield getGlyffDetails(req.body.userId, req.body.glyphId);
        if(!glyffDetails) return res.status(404).json({status: 0, message: "No memes to display",data: [], code: 404 });
        return res.status(200).json({status: 1, message: "Meme removed from favourite successfully", code: 200, data: { glyph: glyffDetails} } );
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [], code: err.errorCode });
    });
}

/**************************
 FETCH GLYPH API
 **************************/
exports.fetchGlyffDetail = function (req, res, next) {
    co(function*(){
        // Validating the fields
        if(!req.params.glyphId) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});

        var userDeleted = yield isUserDeleted(req.query.user_id);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var glyffDetails = yield getGlyffDetails(req.query.user_id, req.params.glyphId);
        if(glyffDetails) {
            return res.status(200).json({status: 1, message: "Meme found successfully", code: 200, data: { glyph: glyffDetails} } );
        } else {
            return res.status(404).json({status: 0, message: "No memes to display",data: [], code: 404 });
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}

/**************************
 SAVE SHARE GLYPH API
 **************************/
exports.shareGlyff = function (req, res, next) {
    co(function*(){
        // Validating the fields
        if (!req.body.userId || !req.body.glyphId) {
            return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }    

        var userDeleted = yield isUserDeleted(req.body.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var userId = ObjectId(req.body.userId);
        var queryUserObject = {"_id": userId};        
        var user = yield User.findOne(queryUserObject, {hash_password: 0}).exec();
        if(!user) return res.status(400).json({status: 0, message: "User doesn't exist", data: []});    

        var queryCondition = { "_id": ObjectId(req.body.glyphId), "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: userId }] }] }]};

        var requestObject = {
            "queryCondition": queryCondition,
            "userId": userId
        };
        var shareGlyphObject = req.body;
        
        yield GlyphModel.shareGlyphModel(shareGlyphObject);
        yield GlyphModel.updateGlyphShareCountModel({id:req.body.glyphId,userId:user._id});
        
        // var glyffs = yield GlyphModel.fetchGlyphModel(requestObject);
        // if(!glyffs.length) return res.status(404).json({status: 0, message: "No memes to display", data: []});
        
        // if(user._id.toString() === glyffs[0].user._id.toString) {
        //     return res.status(200).json({status: 1, message: "Meme has been shared successfully", code: 200 });
        // }
        
        // var requestNotificationObject = {
        //     "glyffId": glyffs[0]._id,
        //     "fromUserID": user._id,
        //     "toUserID": glyffs[0].user._id,
        //     "fromMessage": " shared your meme",
        //     "type": "shareGlyph",
        //     "fromUserImageUrl": user.image ? user.image : user.fb_profile_pic_url,
        //     "glyphImageUrl": glyffs[0].type === 'image' ? glyffs[0].glyffThumbnail : glyffs[0].glyffGif,
        //     "isPublic": user.isPublic,
        //     "fromName": user.name,
        //     "glyphType": glyffs[0].type
        // };
        // yield GlyphModel.notificationModel(requestNotificationObject);

        // var updatedUser = yield User.findByIdAndUpdate({"_id": ObjectId(glyffs[0].user._id)},{$inc: { badge: 1 }},{hash_password: 0}).exec();
        // var checkStatusPushnotification = updatedUser.push_notifications.filter(function(push_notification) {
        //     return ( push_notification.type === "share" && push_notification.category === "glyph")
        // });

        // if(!checkStatusPushnotification.length) {
        //     return res.status(201).json({status: 1, message: "Meme has been shared successfully", code: 201 });
        // }

        // var requestPushNotificationObj = {
        //     "name" : requestNotificationObject.fromName,
        //     "device_token" : glyffs[0].user.device_token,
        //     "deviceType" : glyffs[0].user.deviceType,
        //     // "message" : requestNotificationObject.fromMessage,
        //     "message" : user.name + " shared your meme",
        //     "type" : "shareGlyph",
        //     "badge" : updatedUser.badge + 1,
        //     "imageUrl" : glyffs[0].type === 'image' ? glyffs[0].glyffThumbnail : glyffs[0].glyffGif,
        //     // "imageUrl" : glyffs[0].glyffCustomised,
        //     "glyphType" : glyffs[0].type,
        // };
        // var pushNotification = yield GlyphModel.pushNotificationModel(requestPushNotificationObj);
        // if(pushNotification) {
        //     return res.status(201).json({status: 1, message: "Meme has been shared successfully", code: 201 });
        // } else {
        //     return res.status(500).json({status: 0, message: "Error while sending share notification", code: 500 });
        // }
        return res.status(201).json({ status: 1, message: "Meme has been shared successfully", code: 201 });
    }).catch(function(err) {
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}

exports.removeGlyff = function (req, res, next) {
    co(function*(){
        // Validating the fields
        if(!req.body.userId) {
            return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }    
        if(!req.body.glyphId) {
            return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }

        var userDeleted = yield isUserDeleted(req.body.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var userId = ObjectId(req.body.userId);
        var glyphId = ObjectId(req.body.glyphId);
        var queryCondition = {"_id": glyphId,"creatorID": userId};
        var removedGlyff = yield GlyphModel.removeGlyff(queryCondition);
        return res.status(200).json({status: removedGlyff.status, message: removedGlyff.message, data: [], code: 200});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode});
    });
}

/**************************
 FETCH USER GLYFF LIST API
 **************************/
exports.fetchGlyffByUser = function (req, res) {
    co(function*(){
        // Validating user id
        if(!req.body.userId) {
            return res.status(400).json({status: 0, message: "Bad Request Invalid User Id",data:[]});
        }
        var limit = parseInt(req.body.limit);
        var offset = parseInt(req.body.offset);
        var paginationQuery = { skip: offset, limit: limit };

        var queryCondition = req.body.captionText ? { $text: { $search: req.body.captionText }, "creatorID": ObjectId(req.body.userId), isDeleted: false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: req.body.userId }] }] }] } : { "creatorID": ObjectId(req.body.userId), isDeleted: false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: req.body.userId }] }] }]};

        if(req.body.isReaction == true || req.body.isReaction == "true") {
            queryCondition.isReaction = true;
        }
        var isTextBasedSearch = req.body.captionText ? 1 : 0;
        var requestObject = {
            "queryCondition": queryCondition,
            "paginationQuery" : paginationQuery,
            "isTextBasedSearch": isTextBasedSearch
        };
        if(req.body.sortParams) {
            var sortQuery = {sortParams: req.body.sortParams, sortOrder: req.body.sortOrder ? req.body.sortOrder : "asc"};
            requestObject.sortQuery = sortQuery;
        }
        // var glyphs = yield GlyphModel.fetchAllGlyphByUserModel(requestObject);
        // if(!glyphs) return res.status(404).send({status: 1, message: "No memes to display",data: { glyffs:[], count: 0 } });
        // return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs:glyphs, count: glyphs.length }});

        var glyphs = yield GlyphModel.fetchAllGlifModel(requestObject);
        
        if(!glyphs.glyffs.length) return res.status(404).send({status: 1, message: "No memes to display",data: { glyffs:[], count: 0 } , code:404});
        // var hasMoreRecords = limit > glyphs.length ? 0 : 1;
        return res.status(200).json({status: 1, message: "Memes found successfully", data: { glyffs: glyphs.glyffs, count: glyphs.count }, code: 200});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode});
    });
}

exports.viewGlif = function(req,res){
    co(function*(){
        if(!req.body.userId) {
           return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }       
        if(!req.body.glyphId) {
           return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }
        var userId = ObjectId(req.body.userId);
        var queryCondition = { "_id": ObjectId(req.body.glyphId), "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: userId }] }] }]};

        var requestObject = {
            "queryCondition": queryCondition,
            "userId": userId
        };
        var shareGlyphObject = req.body;
        var queryUserObject = {"_id": userId};
        var user = yield User.findOne(queryUserObject, {hash_password: 0}).exec();

        if(!user) return res.status(404).json({status: 0, message: "User doesn't exist", data: [], code: 404});

        var reqObj = {
            "userId":user._id,
            "glyphId":req.body.glyphId 
        };
        yield GlyphModel.updateGlyphViewCountModel(reqObj);
        yield GlyphModel.viewGlyphModel(shareGlyphObject); 

        var glyffs = yield GlyphModel.fetchAllGlyphByUserModel(requestObject);
        if(!glyffs.length) return res.status(404).json({status: 0, message: "No memes to display", data: []});

        if(user._id.toString() === glyffs[0].creatorID.toString()) return res.status(201).json({status: 1, message: "Meme has been View successfully", code: 201 });

        var requestNotificationObject = {
            "glyffId": glyffs[0]._id,
            "fromUserID": user._id,
            "toUserID": glyffs[0].creatorID,
            "fromMessage": " viewed your meme",
            "type": "shareGlyph",
            "fromUserImageUrl": user.image ? user.image : user.fb_profile_pic_url,
            "glyphImageUrl": glyffs[0].type === 'image' ? glyffs[0].glyffThumbnail : glyffs[0].glyffGif,
            "isPublic": user.isPublic,
            "fromName": user.nickname ? '@' + user.nickname : '@' + user.username,
            "glyphType": glyffs[0].type
        };
        yield  GlyphModel.notificationModel(requestNotificationObject);

        var user = yield User.findByIdAndUpdate({"_id": ObjectId(glyffs[0].creatorID)},{$inc: { badge: 1 }},{hash_password: 0}).exec();

        var checkStatusPushnotification = user.push_notifications.filter(function(push_notification) {
            return ( push_notification.type === "share" && push_notification.category === "glyph")
        });

        if(!checkStatusPushnotification.length) return res.status(201).json({status: 1, message: "Meme has been View successfully", code: 201 });

        var requestPushNotificationObj = {
            name : requestNotificationObject.fromName,
            device_token : user.device_token,
            deviceType : user.deviceType,
            // message : requestNotificationObject.fromMessage,
            message: requestNotificationObject.fromName + " viewed your meme",
            type : requestNotificationObject.type,
            badge : user.badge + 1,
            imageUrl : glyffs[0].type === 'image' ? glyffs[0].glyffThumbnail : glyffs[0].glyffGif,
            // imageUrl : glyffs[0].glyffCustomised,
            glyphType : glyffs[0].type,
        };
        var pushNotification = yield GlyphModel.pushNotificationModel(requestPushNotificationObj);
        if(pushNotification) {
            return res.status(201).json({status: 1, message: "Meme has been View successfully", code: 201 });
        } else {
            return res.status(500).json({status: 0, message: "Error while sending meme view notification", code: 500 });
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err,errorMessage, data: [], code: err.errorCode});
    });
}

exports.getFavouriteCountUser = function(req,res){
    co(function*(){
        var user_id = req.params.userId; 
        var favouriteCount = yield GlyphModel.getFavouriteCountOfParticularUser(user_id);
        return res.status(200).json({status:1, message: 'Memes found successfully' , data:favouriteCount});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [] });
    });
}

exports.fetchAllGlif = function(req,res){
    co(function*(){
        var limit = parseInt(req.body.limit);
        var offset = parseInt(req.body.offset);
        var paginationQuery = { skip: offset, limit: limit };
        var queryCondition = req.body.captionText ? {$text: { $search: req.body.captionText}, isDeleted: false} : {isDeleted: false};
        if(req.body.isReaction == true || req.body.isReaction == "true") {
            queryCondition.isReaction = true;
        }
        var isTextBasedSearch = req.body.captionText ? 1 : 0;
        var requestObject = {
            "queryCondition": queryCondition,
            "paginationQuery" : paginationQuery,
            "isTextBasedSearch": isTextBasedSearch
        };
        if(req.body.sortParams) {
            var sortQuery = {sortParams: req.body.sortParams, sortOrder: req.body.sortOrder ? req.body.sortOrder : "asc"};
            requestObject.sortQuery = sortQuery;
        }
        var glyffs = yield GlyphModel.fetchAllGlifModel(requestObject);
        
        if(!glyffs.glyffs.length) return res.status(200).json({status: 1, message: "No memes to display",data: {glyffs: [], count: 0}, code: 200 });

        return res.status(200).json({status: 1, message: "Memes found successfully",data: {glyffs: glyffs.glyffs, count: glyffs.count}, code: 200 });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [] });
    });
}


/* function strtotime (text, now) {

  var parsed
  var match
  var today
  var year
  var date
  var days
  var ranges
  var len
  var times
  var regex
  var i
  var fail = false
  if (!text) {
    return fail
    }
  // Unecessary spaces
  text = text.replace(/^\s+|\s+$/g, '')
  .replace(/\s{2,}/g, ' ')
  .replace(/[\t\r\n]/g, '')
  .toLowerCase()
  // in contrast to php, js Date.parse function interprets:
  // dates given as yyyy-mm-dd as in timezone: UTC,
  // dates with "." or "-" as MDY instead of DMY
  // dates with two-digit years differently
  // etc...etc...
  // ...therefore we manually parse lots of common date formats
  var pattern = new RegExp([
    '^(\\d{1,4})',
    '([\\-\\.\\/:])',
    '(\\d{1,2})',
    '([\\-\\.\\/:])',
    '(\\d{1,4})',
    '(?:\\s(\\d{1,2}):(\\d{2})?:?(\\d{2})?)?',
    '(?:\\s([A-Z]+)?)?$'
    ].join(''))
  match = text.match(pattern)
  if (match && match[2] === match[4]) {
    if (match[1] > 1901) {
      switch (match[2]) {
        case '-':
          // YYYY-M-D
          if (match[3] > 12 || match[5] > 31) {
            return fail
        }
        return new Date(match[1], parseInt(match[3], 10) - 1, match[5],
          match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
        case '.':
          // YYYY.M.D is not parsed by strtotime()
          return fail
          case '/':
          // YYYY/M/D
          if (match[3] > 12 || match[5] > 31) {
            return fail
        }
        return new Date(match[1], parseInt(match[3], 10) - 1, match[5],
          match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
    }
    } else if (match[5] > 1901) {
  switch (match[2]) {
    case '-':
          // D-M-YYYY
          if (match[3] > 12 || match[1] > 31) {
            return fail
        }
        return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
          match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
        case '.':
          // D.M.YYYY
          if (match[3] > 12 || match[1] > 31) {
            return fail
        }
        return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
          match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
        case '/':
          // M/D/YYYY
          if (match[1] > 12 || match[3] > 31) {
            return fail
        }
        return new Date(match[5], parseInt(match[1], 10) - 1, match[3],
          match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
    }
    } else {
  switch (match[2]) {
    case '-':
          // YY-M-D
          if (match[3] > 12 || match[5] > 31 || (match[1] < 70 && match[1] > 38)) {
            return fail
        }
        year = match[1] >= 0 && match[1] <= 38 ? +match[1] + 2000 : match[1]
        return new Date(year, parseInt(match[3], 10) - 1, match[5],
          match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
        case '.':
          // D.M.YY or H.MM.SS
          if (match[5] >= 70) {
            // D.M.YY
            if (match[3] > 12 || match[1] > 31) {
              return fail
          }
          return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
            match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
      }
      if (match[5] < 60 && !match[6]) {
            // H.MM.SS
            if (match[1] > 23 || match[3] > 59) {
              return fail
          }
          today = new Date()
          return new Date(today.getFullYear(), today.getMonth(), today.getDate(),
            match[1] || 0, match[3] || 0, match[5] || 0, match[9] || 0) / 1000
      }
          // invalid format, cannot be parsed
          return fail
          case '/':
          // M/D/YY
          if (match[1] > 12 || match[3] > 31 || (match[5] < 70 && match[5] > 38)) {
            return fail
        }
        year = match[5] >= 0 && match[5] <= 38 ? +match[5] + 2000 : match[5]
        return new Date(year, parseInt(match[1], 10) - 1, match[3],
          match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
        case ':':
          // HH:MM:SS
          if (match[1] > 23 || match[3] > 59 || match[5] > 59) {
            return fail
        }
        today = new Date()
        return new Date(today.getFullYear(), today.getMonth(), today.getDate(),
          match[1] || 0, match[3] || 0, match[5] || 0) / 1000
    }
    }
    }
  // other formats and "now" should be parsed by Date.parse()
  if (text === 'now') {
    return now === null || isNaN(now)
    ? new Date().getTime() / 1000 | 0
    : now | 0
    }
    if (!isNaN(parsed = Date.parse(text))) {
        return parsed / 1000 | 0
    }
  // Browsers !== Chrome have problems parsing ISO 8601 date strings, as they do
  // not accept lower case characters, space, or shortened time zones.
  // Therefore, fix these problems and try again.
  // Examples:
  //   2015-04-15 20:33:59+02
  //   2015-04-15 20:33:59z
  //   2015-04-15t20:33:59+02:00
  pattern = new RegExp([
    '^([0-9]{4}-[0-9]{2}-[0-9]{2})',
    '[ t]',
    '([0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]+)?)',
    '([\\+-][0-9]{2}(:[0-9]{2})?|z)'
    ].join(''))
  match = text.match(pattern)
  if (match) {
    // @todo: time zone information
    if (match[4] === 'z') {
      match[4] = 'Z'
  } else if (match[4].match(/^([+-][0-9]{2})$/)) {
      match[4] = match[4] + ':00'
  }
  if (!isNaN(parsed = Date.parse(match[1] + 'T' + match[2] + match[4]))) {
      return parsed / 1000 | 0
  }
    }
    date = now ? new Date(now * 1000) : new Date()
    days = {
    'sun': 0,
    'mon': 1,
    'tue': 2,
    'wed': 3,
    'thu': 4,
    'fri': 5,
    'sat': 6
    }
    ranges = {
    'yea': 'FullYear',
    'mon': 'Month',
    'day': 'Date',
    'hou': 'Hours',
    'min': 'Minutes',
    'sec': 'Seconds'
}
function lastNext (type, range, modifier) {
    var diff
    var day = days[range]
    if (typeof day !== 'undefined') {
      diff = day - date.getDay()
      if (diff === 0) {
        diff = 7 * modifier
    } else if (diff > 0 && type === 'last') {
        diff -= 7
    } else if (diff < 0 && type === 'next') {
        diff += 7
    }
    date.setDate(date.getDate() + diff)
    }
}
function process (val) {
    // @todo: Reconcile this with regex using \s, taking into account
    // browser issues with split and regexes
    var splt = val.split(' ')
    var type = splt[0]
    var range = splt[1].substring(0, 3)
    var typeIsNumber = /\d+/.test(type)
    var ago = splt[2] === 'ago'
    var num = (type === 'last' ? -1 : 1) * (ago ? -1 : 1)
    if (typeIsNumber) {
      num *= parseInt(type, 10)
  }
  if (ranges.hasOwnProperty(range) && !splt[1].match(/^mon(day|\.)?$/i)) {
      return date['set' + ranges[range]](date['get' + ranges[range]]() + num)
  }
  if (range === 'wee') {
      return date.setDate(date.getDate() + (num * 7))
  }
  if (type === 'next' || type === 'last') {
      lastNext(type, range, num)
  } else if (!typeIsNumber) {
      return false
  }
  return true
    }
    times = '(years?|months?|weeks?|days?|hours?|minutes?|min|seconds?|sec' +
    '|sunday|sun\\.?|monday|mon\\.?|tuesday|tue\\.?|wednesday|wed\\.?' +
    '|thursday|thu\\.?|friday|fri\\.?|saturday|sat\\.?)'
    regex = '([+-]?\\d+\\s' + times + '|' + '(last|next)\\s' + times + ')(\\sago)?'
    match = text.match(new RegExp(regex, 'gi'))
    if (!match) {
        return fail
    }
    for (i = 0, len = match.length; i < len; i++) {
        if (!process(match[i])) {
        return fail
    }
    }
    return (date.getTime() / 1000)
} */


exports.deleteMemeByAdmin = function(req,res){
    co(function*(){
        if(!req.params.glyffId) {
            return res.status(400).json({status: 0, message: "Bad Request Invalid User Id",data:[], code: 400});
        }
        var glyffId = req.params.glyffId; 
        yield GlyphModel.deleteMeme(glyffId);
        return res.status(200).json({status: 1, message: "Meme is successfully deleted",data:[], code: 200});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [], code: err.errorCode });
    });
};

/****************************
 UPVOTE/DOWNVOTE GLYFF API
 ****************************/
exports.voteGlyff = function (req, res, next) {
    co(function*(){
        // Validating the fields
        if(!req.body.userId) {
            return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }
    
        if(!req.body.glyffId) {
            return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }
    
        if(!req.body.voteType) {
            return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        }

        var userDeleted = yield isUserDeleted(req.body.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        // Calling model to upvote/downvote glyff
        var voteResult = yield GlyphModel.upvoteOrDownvoteGlyff(req.body);
        if(voteResult) {
            // Updating glyff's credNo and hotness
            var updateGlyff = yield GlyphModel.calculateAndUpdateGlyphCredNoAndHotness(ObjectId(req.body.glyffId));
            if(!updateGlyff) return res.status(404).json({status: 0, message: "No memes to display",data: [], code: 404 });

            // Updating user's credNo, favouriteCount and hotness
            var updatedUser = yield GlyphModel.calculateAndUpdateUserCredNoFavouriteCountAndHotness(updateGlyff.creatorID);
            if(!updatedUser) return res.status(404).json({status: 0, message: "User is not found",data: [], code: 404 });

            // Fetching updated glyff's details
            var updatedGlyffDetails = yield getGlyffDetails(req.body.userId, req.body.glyffId);
            if(!updatedGlyffDetails) return res.status(404).json({status: 0, message: "No memes to display",data: [], code: 404 });

            return res.status(201).json({status: 1, message: "Meme "+req.body.voteType+"d successfully", code: 201, data: { glyph: updatedGlyffDetails} } );
        } else {
            return res.status(500).json({status: 0, message: err, data: []});
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [], code: err.errorCode });
    });
}

/***************************************
 COMMON FUNCTION TO GET GLYFF DETAILS
 ***************************************/

function getGlyffDetails(userId, glyphId) {
    return new Promise(function(resolve, reject){
        co(function*(){
            userId = ObjectId(userId);
            var queryCondition = {"_id": ObjectId(glyphId)};
            var requestObject = {
                "queryCondition": queryCondition,
                "userId": userId,
                "flag":"fetchGlyffDetail"
            };
            var glyffDetails = yield GlyphModel.fetchGlyphModel(requestObject);
            resolve(glyffDetails[0]);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
};

/*******************************************
 COMMON FUNCTION TO FETCH COMMENTS FROM GLYFF 
 ********************************************/
exports.fetchComments = function(req, res) {
    co(function*(){        
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});
        
        var userId = req.params.userId;
        var glyffId = req.params.glyffId;
        var offset = Number(req.query.offset);
        var limit = Number(req.query.limit);
        var comments = yield GlyphModel.fetchComments(glyffId, offset, limit);
        yield Promise.each(comments, co.wrap(function*(comment){
            var followObj = yield Follow.findOne({followerId: ObjectId(userId), followeeId: ObjectId(comment.commenterId._id)}).exec();
            comment.commenterId.isFollowed = followObj ? (followObj.isValid ? 2 : 1) : 0;
        }));
        var hasMoreRecords = limit > comments.length ? 0 : 1;
        return res.status(201).json({status: 1, message: "Meme comments found successfully", code: 201, data: {comments: comments, hasMoreRecords: hasMoreRecords} } );
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [], code: err.errorCode });
    });
}

/*******************************************
 COMMON FUNCTION TO ADD COMMENT TO GLYFF 
 ********************************************/
exports.addComment = function(req, res) {
    co(function*(){
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});
        
        var glyffId = req.params.glyffId;
        var commentObj = {
            comment: req.body.comment,
            commenterId: req.params.userId,
            mentionsArr: req.body.mentionsArr
        };
        
        var comment = yield GlyphModel.addComment(glyffId, commentObj);

        if(comment && Object.keys(comment).length) {
            var commenter = yield User.findOne({_id: ObjectId(commentObj.commenterId)}).exec();
            var glyffDetails = yield getGlyffDetails(req.params.userId, glyffId);

            if(commentObj.commenterId.toString() === glyffDetails.user._id.toString()) return res.status(201).json({status: 1, message: "Meme comment added successfully", code: 201, data: {comment: comment}  });

            var requestNotificationObject = {
                "glyffId": glyffDetails._id,
                "fromUserID": commenter._id,
                "toUserID": glyffDetails.user._id,
                "fromMessage": " commented on your meme",
                "type": "addComment",
                "fromUserImageUrl": commenter.image ? commenter.image : commenter.fb_profile_pic_url,
                "glyphImageUrl": glyffDetails.type === 'image' ? glyffDetails.glyffThumbnail : glyffDetails.glyffGif,
                "isPublic": commenter.isPublic,
                "fromName": commenter.nickname ? '@' + commenter.nickname : '@' + commenter.username,
                "glyphType": glyffDetails.type
            };
            yield GlyphModel.notificationModel(requestNotificationObject);
            var requestMentionNotificationObject;
            if(comment.mentionsArr.length) {
                yield Promise.each(comment.mentionsArr, co.wrap(function*(mentionObj){
                    var mentionedUser = yield User.findOne({_id: ObjectId(mentionObj.mentionId)}).exec();
                    requestMentionNotificationObject = {
                        "glyffId": glyffDetails._id,
                        "fromUserID": commenter._id,
                        "toUserID": mentionedUser._id,
                        "fromMessage": " mentioned you in a comment",
                        "type": "mentionComment",
                        "fromUserImageUrl": commenter.image ? commenter.image : commenter.fb_profile_pic_url,
                        "glyphImageUrl": glyffDetails.type === 'image' ? glyffDetails.glyffThumbnail : glyffDetails.glyffGif,
                        "isPublic": commenter.isPublic,
                        "fromName": commenter.nickname ? '@' + commenter.nickname : '@' + commenter.username,
                        "glyphType": glyffDetails.type
                    };
                    yield GlyphModel.notificationModel(requestMentionNotificationObject);
                }));
            }           
            
            var updatedUser = yield User.findByIdAndUpdate({"_id": ObjectId(glyffDetails.user._id)},{$inc: { badge: 1 }},{hash_password: 0}).exec();

            if(comment.mentionsArr.length) {
                yield Promise.each(comment.mentionsArr, co.wrap(function*(mentionObj){
                    var mentionedUser = yield User.findOneAndUpdate({_id: ObjectId(mentionObj.mentionId)},{$inc: { badge: 1 }}).exec();
                    var checkMentionStatusPushnotification = mentionedUser.push_notifications.filter(function(push_notification) {
                        return ( push_notification.type === "mentionComment" && push_notification.category === "glyph")
                    });
                    if(checkMentionStatusPushnotification.length) {
                        var requestMentionPushNotificationObj = {
                            "name" : requestMentionNotificationObject.fromName,
                            "device_token" : mentionedUser.device_token,
                            "deviceType" : mentionedUser.deviceType,
                            // "message" : requestMentionNotificationObject.fromMessage,
                            "message" : requestMentionNotificationObject.fromName + " mentioned you in a comment",
                            "type" : "mentionComment",
                            "badge" : mentionedUser.badge + 1,
                            "imageUrl" : glyffDetails.type === 'image' ? glyffDetails.glyffThumbnail : glyffDetails.glyffGif,
                            // "imageUrl" : glyffDetails.glyffCustomised,
                            "glyphType" : glyffDetails.type,
                        };
                        yield GlyphModel.pushNotificationModel(requestMentionPushNotificationObj);
                    }                    
                }));
            }

            var checkStatusPushnotification = updatedUser.push_notifications.filter(function(push_notification) {
                return ( push_notification.type === "addComment" && push_notification.category === "glyph")
            });
            
            if(!checkStatusPushnotification.length) {
                return res.status(201).json({status: 1, message: "Meme comment added successfully", code: 201, data: {comment: comment} });
            }

            var requestPushNotificationObj = {
                "name" : requestNotificationObject.fromName,
                "device_token" : glyffDetails.user.device_token,
                "deviceType" : glyffDetails.user.deviceType,
                // "message" : requestNotificationObject.fromMessage,
                "message" : requestNotificationObject.fromName + " commented on your meme",
                "type" : "addComment",
                "badge" : updatedUser.badge + 1,
                "imageUrl" : glyffDetails.type === 'image' ? glyffDetails.glyffThumbnail : glyffDetails.glyffGif,
                // "imageUrl" : glyffDetails.glyffCustomised,
                "glyphType" : glyffDetails.type,
            };
            var pushNotification = yield GlyphModel.pushNotificationModel(requestPushNotificationObj);
            return res.status(201).json({status: 1, message: "Meme comment added successfully", code: 201, data: {comment: comment} });
            // if(pushNotification) {
            //     return res.status(201).json({status: 1, message: "Meme comment added successfully", code: 201, data: {comment: comment} });
            // } else {
            //     return res.status(500).json({status: 0, message: "Error while adding comment", code: 500 });
            // }            
        } else {
            return res.status(500).json({status: 0, message: "Error while adding comment", code: 500 });
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [], code: err.errorCode });
    });
}

/*******************************************
 COMMON FUNCTION TO ADD COMMENT TO GLYFF 
 ********************************************/
exports.deleteComment = function(req, res) {
    co(function*(){        
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});
        
        var userId = req.params.userId;
        var glyphId = req.params.glyphId;
        var commentId = req.params.commentId;
        var deleteCommentObj = yield GlyphModel.deleteComment(userId, commentId, glyphId);
        return res.status(201).json({ status: 1, message: "Meme comment deleted successfully", code: 201, data: { isCommented: deleteCommentObj.isCommented, lastComment: deleteCommentObj.lastComment}});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage,data: [], code: err.errorCode });
    });
}

/**************************
 Get Popular API
 **************************/
exports.getPopular = function (req, res) {
    co(function* () {
        if (!(req.query.limit && req.query.offset && req.query.type)) {
            return res.status(404).json({ status: 0, message: "Bad Request Invalid Parameters", data: [] });
        }
        var tokenReq = req.headers.authorization;
        var decoded = jwt.decode(tokenReq);
        var userId = decoded.id;

        var userDeleted = yield isUserDeleted(userId);
        if (userDeleted) return res.status(400).json({ status: 0, message: userDeleted, data: [], code: 400 });

        var reqQueryObj = {
            searchTerm: req.query.searchTerm,
            isTextBasedSearch: req.query.searchTerm ? 1 : 0,
            limit: parseInt(req.query.limit),
            offset: parseInt(req.query.offset),
            userId: ObjectId(userId),
            sortParams: 'hotness',
            sortOrder: 'desc',
            duration: req.query.duration ? req.query.duration : 'week'   // possible values are 'week'/'month'/'all'
        };

        
        if (req.query.type == 'glyffs') {
          
           /* var popularMemes = yield getPopularGlyffs(reqQueryObj);

            var hasMoreRecords = parseInt(req.query.limit) > popularMemes.length ? 0 : 1;
            return res.status(200).json({ status: 1, message: "Memes found successfully", data: { popularGlyffs: popularMemes, popularPeople: [], hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } });*/
           if(req.query.duration == 'top'){
  
                 var popularMemes = yield getTopGlyffs(reqQueryObj);

            var hasMoreRecords = parseInt(req.query.limit) > popularMemes.length ? 0 : 1;
            return res.status(200).json({ status: 1, message: "Memes found successfully", data: { popularGlyffs: popularMemes, popularPeople: [], hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } });
            }
           else if(req.query.duration == 'hot')
            {
        
                 var popularMemes = yield getHotGlyffs(reqQueryObj);

            var hasMoreRecords = parseInt(req.query.limit) > popularMemes.length ? 0 : 1;
            return res.status(200).json({ status: 1, message: "Memes found successfully", data: { popularGlyffs: popularMemes, popularPeople: [], hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } });
            }
           else if(req.query.duration == 'trending')
            {
              
                 var popularMemes = yield getTrendGlyffs(reqQueryObj);

            var hasMoreRecords = parseInt(req.query.limit) > popularMemes.length ? 0 : 1;
            return res.status(200).json({ status: 1, message: "Memes found successfully", data: { popularGlyffs: popularMemes, popularPeople: [], hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } });
            }
             else if(req.query.duration == 'new')
            {
              
                 var popularMemes = yield getNewGlyffs(reqQueryObj);

            var hasMoreRecords = parseInt(req.query.limit) > popularMemes.length ? 0 : 1;
            return res.status(200).json({ status: 1, message: "Memes found successfully", data: { popularGlyffs: popularMemes, popularPeople: [], hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } });
            }
            else {
            return res.status(500).json({ status: 0, message: 'Bad Request Invalid duration ', data: [], code: 500 });
        }
        
        } else if (req.query.duration == 'people') {
            var popularPeople = yield getPopularPeople(reqQueryObj);
            var hasMoreRecords = parseInt(req.query.limit) > popularPeople.length ? 0 : 1;
            return res.status(200).json({ status: 1, message: "People found successfully", data: { popularGlyffs: [], popularPeople: popularPeople, hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } });
        } 
        
        
        else {
            return res.status(500).json({ status: 0, message: 'Bad Request Invalid type ', data: [], code: 500 });
        }
    }).catch(function (err) {
        err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
        return res.status(err.errorCode).json({ status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}

/**********************
 Get Popular Memes
 **********************/
function getPopularGlyffs(dataObj) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            var popularGlyffs = [];
            if(dataObj.duration === 'all') {
                popularGlyffs = yield fetchAllGlyphs(dataObj, 'popular');
            } else {
                var queryCondition = dataObj.searchTerm ? { $text: { $search: dataObj.searchTerm }, "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] };
                
                var requestObject = {
                    "queryCondition": queryCondition,
                    "userId": dataObj.userId,
                    "publicPrivateOrder": -1,
                    "skip": dataObj.offset,
                    "limit": dataObj.limit
                };
               
                popularGlyffs = yield GlyphModel.fetchPopularGlyffs(requestObject);
         

            }
            if (popularGlyffs.length) {
                var finalGlyffs = yield checkIfUserIsFollowing({ glyphs: popularGlyffs, loggedinId: dataObj.userId });
               
                resolve(finalGlyffs);
            } else {
                reject({
                    errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'
                });
            }
        }).catch(function (err) {
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}


/**********************
 Get Top Memes
 **********************/
function getTopGlyffs(dataObj) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            var popularGlyffs = [];
            if(dataObj.duration === 'all') {
                popularGlyffs = yield fetchAllGlyphs(dataObj, 'popular');
            } else {
                var queryCondition = dataObj.searchTerm ? { $text: { $search: dataObj.searchTerm }, "isDeleted": false, hotness:{$gt:0},$or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { "isDeleted": false,hotness:{$gt:0}, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] };
                
                var requestObject = {
                    "queryCondition": queryCondition,
                    "userId": dataObj.userId,
                    "publicPrivateOrder": -1,
                    "skip": dataObj.offset,
                    "limit": dataObj.limit
                };
               
                popularGlyffs = yield GlyphModel.fetchTopGlyffs(requestObject);
         

            }
            if (popularGlyffs.length) {
                var finalGlyffs = yield checkIfUserIsFollowing({ glyphs: popularGlyffs, loggedinId: dataObj.userId });
               
                resolve(finalGlyffs);
            } else {
                reject({
                    errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'
                });
            }
        }).catch(function (err) {
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}

/**********************
 Get Hot Memes
 **********************/
function getHotGlyffs(dataObj) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            var popularGlyffs = [];
            if(dataObj.duration === 'all') {
                popularGlyffs = yield fetchAllGlyphs(dataObj, 'popular');
            } else {
                var queryCondition = dataObj.searchTerm ? { $text: { $search: dataObj.searchTerm }, "isDeleted": false, 'hotnessEachDay.hotness':{$gt:0},$or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { "isDeleted": false,'hotnessEachDay.hotness':{$gt:0}, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] };
                
                var requestObject = {
                    "queryCondition": queryCondition,
                    "userId": dataObj.userId,
                    "publicPrivateOrder": -1,
                    "skip": dataObj.offset,
                    "limit": dataObj.limit
                };
               
                popularGlyffs = yield GlyphModel.fetchHotGlyffs(requestObject);
         

            }
            if (popularGlyffs.length) {
                var finalGlyffs = yield checkIfUserIsFollowing({ glyphs: popularGlyffs, loggedinId: dataObj.userId });
               
                resolve(finalGlyffs);
            } else {
                reject({
                    errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'
                });
            }
        }).catch(function (err) {
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}

/**********************
 Get Trending Memes
 **********************/
function getTrendGlyffs(dataObj) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            var popularGlyffs = [];
            if(dataObj.duration === 'all') {
                popularGlyffs = yield fetchAllGlyphs(dataObj, 'popular');
            } else {
                var queryCondition = dataObj.searchTerm ? { $text: { $search: dataObj.searchTerm }, "isDeleted": false,trendingNess:{$gt:0}, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }],trendingNess:{$gt:0} };
                
                var requestObject = {
                    "queryCondition": queryCondition,
                    "userId": dataObj.userId,
                    "publicPrivateOrder": -1,
                    "skip": dataObj.offset,
                    "limit": dataObj.limit
                };
               
                popularGlyffs = yield GlyphModel.fetchTrendingGlyffs(requestObject);
         

            }
            if (popularGlyffs.length) {
                var finalGlyffs = yield checkIfUserIsFollowing({ glyphs: popularGlyffs, loggedinId: dataObj.userId });
               
                resolve(finalGlyffs);
            } else {
                reject({
                    errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'
                });
            }
        }).catch(function (err) {
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}


/**********************
 Get New Memes
 **********************/
function getNewGlyffs(dataObj) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            var popularGlyffs = [];
            if(dataObj.duration === 'all') {
                popularGlyffs = yield fetchAllGlyphs(dataObj, 'popular');
            } else {
                var queryCondition = dataObj.searchTerm ? { $text: { $search: dataObj.searchTerm }, "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }] } : { "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }]};
                
                var requestObject = {
                    "queryCondition": queryCondition,
                    "userId": dataObj.userId,
                    "publicPrivateOrder": -1,
                    "skip": dataObj.offset,
                    "limit": dataObj.limit
                };
               
                popularGlyffs = yield GlyphModel.fetchNewGlyffs(requestObject);
         

            }
            if (popularGlyffs.length) {
                var finalGlyffs = yield checkIfUserIsFollowing({ glyphs: popularGlyffs, loggedinId: dataObj.userId });
               
                resolve(finalGlyffs);
            } else {
                reject({
                    errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'
                });
            }
        }).catch(function (err) {
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}

/**********************
 Get Popular People
 **********************/
function getPopularPeople(dataObj) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            var offset = dataObj.offset;
            var limit = dataObj.limit;
            delete dataObj.offset;
            delete dataObj.limit;
            var allPopularPeople = [];

            if (dataObj.duration === 'all') {
                var aggregationQueryString = [
                    // Pipeline Stage 1
                    {
                        $match: {
                            $and: [
                                { role: { $ne: 'admin' } }
                            ]
                        }
                    },
                    // Stage 2
                    {
                        $lookup: {
                            "from": "blocks",
                            "localField": "_id",
                            "foreignField": "blockedId",
                            "as": "block"
                        }
                    },
                    // Stage 5 - Moved here
                    {
                        $match: {
                            "$and": [
                                { "block.blockedById": { $ne: dataObj.userId } },
                                { "_id": { $ne: dataObj.userId } }
                            ]
                        }
                    },
                    {
                        $sort: {
                            hotness: -1,
                            updatedAt: -1
                        }
                    },
                    {
                        $skip: offset
                    },
                    {
                        $limit: limit
                    },
                    // Stage 3
                    {
                        $lookup: {
                            "from": "follows",
                            "localField": "_id",
                            "foreignField": "followeeId",
                            "as": "checkFollower"
                        }
                    },
                    // Stage 6
                    {
                        $project: {
                            "_id": 1,
                            "userVerified": 1,
                            "isPublic": 1,
                            "isProfileHidden": { $ifNull: ["$isProfileHidden", false] },
                            "device_token": 1,
                            "gender": 1,
                            "fb_profile_pic_url": 1,
                            "fb_id": 1,
                            "sharedCount": 1,
                            "trendingCount": 1,
                            "image": 1,
                            "imageThumbnail": 1,
                            "glyffCount": 1,
                            //"glyffSize": { $size: "$glyffsData" },
                            // "isFollowed" : 1,
                            "followeeCount": 1,
                            "followerCount": 1,

                            // isFollow is a flag which shows whether current user is following glyph creator or not
                            "isFollowed": {
                                $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", dataObj.userId] }, { "$eq": ["$$checkFollower.followeeId", "$_id"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", dataObj.userId] }, { "$eq": ["$$checkFollower.followeeId", "$_id"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                            },

                            "mobile": 1,
                            "language": 1,
                            "name": 1,
                            "insensitiveName": { "$toLower": "$name" },
                            "email": 1,
                            "nickname": 1,
                            "username": 1,
                            "createdAt": 1,
                            "updatedAt": 1,
                            "block": 1,
                            // "totalViews":{ $sum: "$glyffsData.viewCount" },
                            "viewCount": 1,
                            "favouriteCount": 1,
                            "credNo": 1,
                            "hotness": 1,
                        }
                    },
                    {
                        $match: {
                            $or: [
                                { isPublic: true },
                                { isPublic: false, isFollowed: 2 }
                            ]
                        }
                    }
                ];
                allPopularPeople = yield User.aggregate(aggregationQueryString).allowDiskUse(true).exec();

                var userIds = _.map(allPopularPeople, '_id');
                let glyffs = yield Glyff.aggregate([
                    {
                        $match: {
                            creatorID: { $in: userIds }
                        }
                    },
                    {
                        $group: {
                            _id: "$creatorID",
                            glyffSize: { $sum: 1 },
                            totalViews: { $sum: '$viewCount' }
                        }
                    }
                ]);
                var glyffUser;

                allPopularPeople = JSON.parse(JSON.stringify(allPopularPeople));

                yield Promise.each(allPopularPeople, co.wrap(function* (user, key) {
                    glyffUser = _.filter(glyffs, function (g) {
                        return g._id.toString() == user._id.toString();
                    });
                    user.glyffSize = glyffUser.length ? glyffUser[0].glyffSize : 0;
                    user.totalViews = glyffUser.length ? glyffUser[0].totalViews : 0;
                }));

            } else {
                var popularGlyffs = yield getPopularGlyffs(dataObj);
                var creatorIds = _.map(popularGlyffs, 'creatorID');
                creatorIds = _.uniq(creatorIds);
                
                var popularPeopleIdArr = [];
                creatorIds.forEach(function(creatorId) {
                    popularPeopleIdArr.push(ObjectId(creatorId));
                });
                var aggregationQueryString = [
                    // Pipeline Stage 1
                    {
                        $match: {
                            $and: [
                                { role: { $ne: 'admin' } },
                                { _id: { $in: popularPeopleIdArr }}
                            ]
                        }
                    },
                    // Stage 2
                    {
                        $lookup: {
                            "from": "blocks",
                            "localField": "_id",
                            "foreignField": "blockedId",
                            "as": "block"
                        }
                    },
                    // Stage 5 - Moved here
                    {
                        $match: {
                            "$and": [
                                { "block.blockedById": { $ne: dataObj.userId } },
                                { "_id": { $ne: dataObj.userId } }
                            ]
                        }
                    },
                    {
                        $sort: {
                            hotness: -1,
                            updatedAt: -1
                        }
                    },
                    // Stage 3
                    {
                        $lookup: {
                            "from": "follows",
                            "localField": "_id",
                            "foreignField": "followeeId",
                            "as": "checkFollower"
                        }
                    },
                    // Stage 6
                    {
                        $project: {
                            "_id": 1,
                            "userVerified": 1,
                            "isPublic": 1,
                            "isProfileHidden": { $ifNull: ["$isProfileHidden", false] },
                            "device_token": 1,
                            "gender": 1,
                            "fb_profile_pic_url": 1,
                            "fb_id": 1,
                            "sharedCount": 1,
                            "trendingCount": 1,
                            "image": 1,
                            "imageThumbnail": 1,
                            "glyffCount": 1,
                            //"glyffSize": { $size: "$glyffsData" },
                            // "isFollowed" : 1,
                            "followeeCount": 1,
                            "followerCount": 1,
    
                            // isFollow is a flag which shows whether current user is following glyph creator or not
                            "isFollowed": {
                                $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", dataObj.userId] }, { "$eq": ["$$checkFollower.followeeId", "$_id"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", dataObj.userId] }, { "$eq": ["$$checkFollower.followeeId", "$_id"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                            },
    
                            "mobile": 1,
                            "language": 1,
                            "name": 1,
                            "insensitiveName": { "$toLower": "$name" },
                            "email": 1,
                            "nickname": 1,
                            "username": 1,
                            "createdAt": 1,
                            "updatedAt": 1,
                            "block": 1,
                            // "totalViews":{ $sum: "$glyffsData.viewCount" },
                            "viewCount": 1,
                            "favouriteCount": 1,
                            "credNo": 1,
                            "hotness": 1,
                        }
                    },
                    {
                        $match: {
                            $or: [
                                { isPublic: true },
                                { isPublic: false, isFollowed: 2 }
                            ]
                        }
                    }
                ];

                allPopularPeople = yield User.aggregate(aggregationQueryString).allowDiskUse(true).exec();
                
                var userIds = _.map(allPopularPeople, '_id');
                let glyffs = yield Glyff.aggregate([
                    {
                        $match: {
                            creatorID: { $in: userIds }
                        }
                    },
                    {
                        $group: {
                            _id: "$creatorID",
                            glyffSize: { $sum: 1 },
                            totalViews: { $sum: '$viewCount' }
                        }
                    }
                ]);
                var glyffUser;
                var hotnessArr = _(popularGlyffs).groupBy('creatorID').map((glyff, key) => ({ "creatorID": key, 'hotness': _.sumBy(glyff, 'hotness') })).value();
                
                allPopularPeople = JSON.parse(JSON.stringify(allPopularPeople));
                var hotness;

                yield Promise.each(allPopularPeople, co.wrap(function* (user, key) {
                    glyffUser = _.filter(glyffs, function (g) {
                        return g._id.toString() == user._id.toString();
                    });
                    user.glyffSize = glyffUser.length ? glyffUser[0].glyffSize : 0;
                    user.totalViews = glyffUser.length ? glyffUser[0].totalViews : 0;          
                    hotness = _.filter(hotnessArr, (u) => {return u.creatorID.toString() === user._id.toString() });
                    user.hotness = hotness && hotness.length && hotness[0].hotness ? hotness[0].hotness : (user.hotness ? user.hotness : 0);   
                }));

                allPopularPeople = _.orderBy(allPopularPeople, ['hotness'], ['desc']);
                if (limit) {
                    offset = offset ? offset : 0;
                    allPopularPeople = allPopularPeople.slice(offset, offset + limit);
                } 
            }            

            if (allPopularPeople.length) {
                resolve(allPopularPeople);
            } else {
                reject({
                    errorCode: 404, errorMessage: 'People not found.'
                });
            }
        }).catch(function (err) {
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}

/***************************************************************************************************************
 Common function to get the list of users who made some action on a glyff for eg. favourite/clone/vote/share
****************************************************************************************************************/
exports.getUsersListOfGlyffActions = function (req, res) {
    co(function* () {
        var tokenReq = req.headers.authorization;
        var decoded = jwt.decode(tokenReq);
        let userId = decoded.id;

        var userDeleted = yield isUserDeleted(userId);
        if (userDeleted) return res.status(400).json({ status: 0, message: userDeleted, data: [], code: 400 });
        
        var userList = yield GlyphModel.getUsersListOfGlyffActions(userId, req.query);

        if(userList.length) {
            var hasMoreRecords = parseInt(req.query.limit) > userList.length ? 0 : 1;
            return res.status(201).json({ status: 1, message: "Users found successfully", code: 201, data: { users: userList, hasMoreRecords: hasMoreRecords, offset: parseInt(req.query.offset) } });
        }
        else 
            return res.status(404).json({ status: 0, message: 'Users not found', data: { users: [], hasMoreRecords: 0, offset: req.query.offset }, code: 404 });
    }).catch(function (err) {
        err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
        return res.status(err.errorCode).json({ status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}

/***************************************************************************************************************
 Function to Edit Individual Glyff Details like Add/Remove Tags, make isReaction true/false , make isSecret true/false
****************************************************************************************************************/
exports.editGlyphDetails = function (req, res) {
    co(function* () {
        var tokenReq = req.headers.authorization;
        var decoded = jwt.decode(tokenReq);
        let userId = decoded.id;

        var userDeleted = yield isUserDeleted(userId);
        if (userDeleted) return res.status(400).json({ status: 0, message: userDeleted, data: [], code: 400 });

        var glyphId = req.params.glyphId;
        var glyff = yield Glyff.findOne({ _id: glyphId, isDeleted: false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: userId }] }] }] }).exec();
        
        if(!_.isEmpty(glyff)) {
            if(glyff.creatorID.toString() === userId.toString()) {
                if(req.body.tags && JSON.parse(req.body.tags).length) {
                    glyff.tags = JSON.parse(req.body.tags);
                    var uniqTags = _.uniq(glyff.tags);
                    glyff.tags = uniqTags;
                }

                if(Object.keys(req.body).indexOf('isSecret') >= 0)
                    glyff.isSecret = (req.body.isSecret === 'true' || req.body.isSecret === true || req.body.isSecret === '1' || req.body.isSecret === 1) ? true : false;

                if (Object.keys(req.body).indexOf('isReaction') >= 0)
                    glyff.isReaction = (req.body.isReaction === 'true' || req.body.isReaction === true || req.body.isReaction === '1' || req.body.isReaction === 1) ? true : false;

                yield glyff.save();
                return res.status(201).json({ status: 1, message: "Glyff updated successfully", code: 201 });
            } else {
                return res.status(401).json({ status: 2, message: "You are not allowed to perform this action", data: [] });
            }
        } else {
            return res.status(404).json({ status: 0, message: 'Glyff not found', data: [], code: 404 });
        }
    }).catch(function (err) {
        err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
        return res.status(err.errorCode).json({ status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}