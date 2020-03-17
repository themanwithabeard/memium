/**************************
 MODULE INITIALISATION
 **************************/
const   mongoose            = require('mongoose'),
        User                = require('../models/users.server.model').user,
        Glyff               = require('../models/glyff.server.model').Glyff,
        Follow              = require('../models/users.server.model').follow,
        Contact             = require('../models/contacts.server.model').contacts,
        ObjectId            = require('mongodb').ObjectID,
        Authentication      = require('../models/users.server.model').Authentication,
        Notifications       = require('../models/notifications.server.model').notifications,
        apn                 = require('apn'),
        Notification        = require('../../configs/notification'),
        reportglyff         = require('../models/report.server.model').reportglyff,
        GlyphModel          = require('../models/glyff.server.model'),
        Promise             = require('bluebird'),
        co                  = require('co'),
        moment          = require('moment'),
        checkUsername       = require('../controllers/login.server.controller').checkUsernameAvailable,
        checkEmail          = require('../controllers/login.server.controller').checkEmailAvailable,
        checkMobileNo       = require('../controllers/login.server.controller').checkMobileNoAvailable,        
        generateThumbnail   = require('../controllers/login.server.controller').generateThumbnail,
        csvConvertor        = require('json-2-csv'),
        fs                  = require('fs'),
        globals             = require('../../configs/globals'),
        _                   = require('lodash'),
        isUserDeleted = require('../../configs/globals').checkWhetherUserIsDeleted;

function usersList(requestObject) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            queryCondition = requestObject.queryCondition || {};
            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: {
                        $and: [
                            { role: { $ne: 'admin' } },
                            queryCondition
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
                            { "block.blockedById": { $ne: requestObject.userId } },
                            { "_id": { $ne: requestObject.userId } }
                        ]
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
                // Stage 4
                // {
                //     $lookup:{
                //         "from" : "glyffs",
                //         "localField" : "_id",
                //         "foreignField" : "creatorID",
                //         "as" : "glyffsData"
                //     }
                // },
                // Stage 6
                {
                    $project: {
                        "_id": 1,
                        "userVerified": 1,
                        "isPublic": 1,
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
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", requestObject.userId] }, { "$eq": ["$$checkFollower.followeeId", "$_id"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", requestObject.userId] }, { "$eq": ["$$checkFollower.followeeId", "$_id"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                        },

                        "mobile": 1,
                        "language": 1,
                        "name": 1,
                        "insensitiveName": { "$toLower": "$name" },
                        "email": 1,
                        "isProfileHidden": { $ifNull: ["$isProfileHidden", false] },
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
                }
            ];
            var sortObjArr = [];
            if (requestObject.sortQuery && Object.keys(requestObject.sortQuery).length) {
                var sortParamsMapping = { "alphabetical": "insensitiveName", "cred": "credNo", "hotness": "hotness" };
                var sortParam = sortParamsMapping[requestObject.sortQuery.sortParams];
                var sortOrder = requestObject.sortQuery.sortOrder === "asc" ? 1 : -1;
                if (requestObject.isTextBasedSearch) {
                    sortObjArr = [{
                        $sort: {
                            "isFollowed": -1,
                            "score": { $meta: "textScore" },
                        }
                    },
                    {
                        $skip: requestObject.paginationQuery.skip
                    },
                    {
                        $limit: requestObject.paginationQuery.limit
                    }
                    ];
                    eval("sortObjArr[0].$sort." + sortParam + "= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                } else {
                    sortObjArr = [{
                        $sort: {
                            "isFollowed": -1
                        }
                    },
                    {
                        $skip: requestObject.paginationQuery.skip
                    },
                    {
                        $limit: requestObject.paginationQuery.limit
                    }
                    ];
                    eval("sortObjArr[0].$sort." + sortParam + "= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                }
            } else {
                if (requestObject.isTextBasedSearch) {
                    sortObjArr = [{
                        $sort: {
                            "isFollowed": -1,
                            "score": { $meta: "textScore" },
                            "createdAt": -1
                        }
                    },
                    {
                        $skip: requestObject.paginationQuery.skip
                    },
                    {
                        $limit: requestObject.paginationQuery.limit
                    }
                    ];
                } else {
                    sortObjArr = [{
                        $sort: {
                            "isFollowed": -1,
                            "createdAt": -1
                        }
                    },
                    {
                        $skip: requestObject.paginationQuery.skip
                    },
                    {
                        $limit: requestObject.paginationQuery.limit
                    }
                    ];
                }
            }
            aggregationQueryString = aggregationQueryString.concat(sortObjArr);
            var users = yield User.aggregate(aggregationQueryString).allowDiskUse(true).exec();

            var userIds = _.map(users, '_id');

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
            yield Promise.each(users, co.wrap(function* (user, key) {
                var glyffUser = _.filter(glyffs, function (g) {
                    return g._id.toString() == user._id.toString();
                });
                user.glyffSize = glyffUser.length ? glyffUser[0].glyffSize : 0;
                user.totalViews = glyffUser.length ? glyffUser[0].totalViews : 0;
            }));

            return resolve(users);
        }).catch(function (err) {
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}

/**************************
 PEOPLE LIST API
 **************************/
exports.peopleList = function (req, res) {
    co(function*(){
        // API call to fetch people list
        var login_id = String(req.query.user_id);
        var limit = parseInt(req.query.limit);
        // var originalLimit = parseInt(req.query.limit);
        var offset = parseInt(req.query.offset);
        var userId = ObjectId(login_id);
        var name = req.query.name;
        //var queryCondition = {userVerified: true};
        var queryCondition = name ? { $or: [{ $text: { $search: name } }, { "email": { '$regex': name, '$options': 'i' } }], "userVerified": true, "deleteStatus": false} : {"userVerified": true, "deleteStatus": false};
        var paginationQuery = {skip: offset, limit: limit};
        var isTextBasedSearch = name ? 1 : 0;
        var requestObject = {
            "queryCondition": queryCondition,
            "paginationQuery": paginationQuery,
            "userId": userId,
            "isTextBasedSearch": isTextBasedSearch
        };
        var userList = yield usersList(requestObject);
        if(!userList.length) return res.status(404).json({status: 0, message: "Users not found", data: [] });
       
        userList = JSON.parse(JSON.stringify(userList));
        //var users = userList.splice(offset, limit);
        yield Promise.each(userList, co.wrap(function*(user, key){
            var isLoginUserFollows = yield Follow.findOne({followerId: userId, followeeId: user._id}).exec();
            if(isLoginUserFollows) {
                if(isLoginUserFollows.isValid) {
                    user.isFollowed = 2;
                } else {
                    user.isFollowed = 1;
                }
            } else {
                user.isFollowed = 0;
            }
            var followeeCount = yield Follow.count({followerId: user._id, isValid: true});
            user.followeeCount = followeeCount;
    
            var followerCount = yield Follow.count({followeeId: user._id, isValid: true});
            user.followerCount = followerCount;           
        }));
        var hasMoreRecords = limit > userList.length ? 0 : 1;
        return res.status(200).json({status: 1, message: "Users found successfully", data: { users:userList, hasMoreRecords: hasMoreRecords, offset: offset }});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

/**************************
 USER PROFILE API
 **************************/
exports.userProfile = function (req, res) {
    co(function*(){
        // Validating user id
        if(!req.query.userId) {
            res.status(400).json({status: 0, message: "Bad Request Invalid User Id",data: []});
            return false;
        }
        // API call to fetch specific people details
        var queryUserProfileObject = {"_id": req.query.userId};
        var user = yield User.findOne(queryUserProfileObject, {hash_password: 0}).exec();

        if(!user) return res.status(404).json({status: 0, message: "User is not found", data: [] });
        if(user.deleteStatus) return res.status(400).json({status: 0, message: 'Your account is been removed by admin - please contact at "support@memium.app"', data: [] });

        return res.status(200).json({status: 1, message: "User found successfully", data:{user:user}});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

/**************************
 Follow/Unfollow User API
 **************************/
exports.setFollow = function (req, res) {
    co(function*(){
        // API call to set follow status
        var followerId = req.body.followerId;
        var followeeId = req.body.followeeId;
        var status = req.body.status;

        var userDeleted = yield isUserDeleted(followerId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        if(followeeId == followerId) return res.status(404).json({status: 0, message: "User can not "+ status +" by self", data: [] });

        if(status === 'follow') {
            var isFollow = 0;
            var follower = yield User.findOne({"_id": followerId}, {hash_password: 0}).exec();
            if(!follower) return res.status(404).json({status: 0, message: "User is not found", data: [] });        
            if(!follower.userVerified) return res.status(404).json({status: 0, message: "Your account is not verified yet Please verify it using link sent to your email", data: [] });            
            var followerImageUrl = follower.image ? follower.image : follower.fb_profile_pic_url;

            var followee = yield User.findOne({"_id": followeeId}, {hash_password: 0}).exec();
            if(!followee) return res.status(404).json({status: 0, message: "User is not found", data: [] });
            if(!followee.userVerified) return res.status(404).json({status: 0, message: "The user whom you want to follow is not verified yet Please wait until he gets verfied", data: [] });
            var followeeImage = followee.image ? followee.image : followee.fb_profile_pic_url;

            var followObj = yield Follow.find({followeeId: followeeId, followerId: followerId}).exec();
            isFollow = followObj.length ? (followObj[0].isValid ? 2 : 1) : 0;
            if(followObj.length) return res.status(200).json({status: 1, message: "Already followed", data: {isFollow: isFollow} });

            // Initialising fields of follow object to save
            var newFollow = new Follow();
            newFollow.set('followeeId', followeeId);
            newFollow.set('followerId', followerId);
            if(followee.isPublic) {
                newFollow.set('isValid', true);
                isFollow = 2;
            } else {
                newFollow.set('isValid', false);
                isFollow = 1;
            } 
            
            var followData = yield newFollow.save();
            if(!followData) return res.status(400).json({status: 0, message: "Bad Request Follow User is not saved",data: [] });

            yield Contact.findOneAndUpdate({user: followerId, contactUser: followeeId}, {$set: {isFollow: isFollow}}).exec();

            var checkReverseFollower = yield Follow.find({followeeId: followerId, followerId: followeeId, isValid: true}).exec();
            //check Followee is already follow//start
            if(checkReverseFollower.length) {
                if(followee.isPublic) {
                    yield Notifications.findOneAndUpdate({toUserID: followerId, fromUserID: followeeId, type: "following"}, {$set: {isToReverseFollowing: true}}).exec();
                } 
                yield Notifications.findOneAndUpdate({toUserID: followerId, fromUserID: followeeId, type: "following"}, {$set: {isFromReverseFollowing: true,isToAcceptedFollowRequest: true}}).exec();              
            }
            //end
            //check Follower is public//start
            if(follower.isPublic) {
                yield Notifications.findOneAndUpdate({toUserID: followeeId, fromUserID: followerId, type: "following"}, {$set: {isFromReverseFollowing: true}}).exec();
            }
            //end

            var followerImage = follower.image ? follower.image : follower.fb_profile_pic_url;

            var updatedUser = yield User.findByIdAndUpdate(ObjectId(followeeId),{$inc: { badge: 1 }},{hash_password: 0}).exec();
            var checkStatusPushnotification = followee.push_notifications.filter(function(push_notification) {
                return ( push_notification.type === "follow" && push_notification.category === "follow")
            });
            var queryParam = {
                "toUserID": followeeId,
                "fromUserID": followerId,
                "type": followee.isPublic ? 'following' : 'follow'
            };
            var deviceType = followee.deviceType;
            var deviceToken = followee.device_token;
            var notification = yield Notifications.findOne(queryParam).exec();
            
            if(!notification) {
                var newNotification = new Notifications();
                newNotification.set('isFromReverseFollowing', false);
                
                if(checkReverseFollower.length) {
                    newNotification.set('isToReverseFollowing', true);
                } else {
                    if(followee.isPublic) { 
                        newNotification.set('isToReverseFollowing', false); 
                        newNotification.set('isFromReverseFollowing', true);
                    }
                }

                var followeeName = followee.nickname ? '@' + followee.nickname : '@' + followee.username;
                var followerName = follower.nickname ? '@' + follower.nickname : '@' + follower.username;

                newNotification.set('toUserID', followeeId);
                newNotification.set('fromUserID', followerId);
                const fromMessage = followee.isPublic ? 'You are now following ' : 'You have sent follow request to ';
                newNotification.set('fromMessage', fromMessage);
                var toMessage = followee.isPublic ? ' is following you' : ' has sent you a follow request';
                newNotification.set('toMessage', toMessage);
                newNotification.set('type', followee.isPublic ? 'following' : 'follow');
                newNotification.set('isDenied', false);
                newNotification.set('toUserImageUrl', followeeImage);
                newNotification.set('fromUserImageUrl', followerImage);
                newNotification.set('isPublic', followee.isPublic ? true : false);
                newNotification.set('toName', followeeName);
                newNotification.set('fromName', followerName);
                newNotification.set('isFromAcceptedFollowRequest', true);
                newNotification.set('followUserImageUrl',followerImageUrl);
                //newNotification.set('isAFollowingB', followee.isPublic ? true : false);  
                
                //set accept Follow request//start
                var followingNotification = yield Notifications.findOneAndUpdate({toUserID:followerId,fromUserID:followeeId, type: "following"}, {$set: {isToAcceptedFollowRequest: true}}, { new: true }).exec();
                var followNotification = yield Notifications.findOneAndUpdate({toUserID:followerId,fromUserID:followeeId, type: "follow"}, {$set: {isToAcceptedFollowRequest: true}}, { new: true }).exec();
                
                if(followingNotification || followNotification) {
                    newNotification.set('isToAcceptedFollowRequest', true);
                }
                var savedNotification = yield newNotification.save();
                if(!savedNotification) return res.status(500).json({status: 0, message: "Error while sending follow notification to user", data:[] });
            }
            if(followee.isPublic) {
                yield updateFollowerAndFolloweeCount(followeeId, followerId);
            }
            if(!checkStatusPushnotification.length) return res.status(200).json({status: 1, message: "User is followed by you successfully", data:{isFollow: isFollow} });

            yield Notification.pushNotification({ "type": queryParam.type, "glyphThumbnail": followerImageUrl, "glyphType": "image", "device_token": deviceToken, "deviceType": deviceType, "message": followerName + toMessage, "name": followeeName,"badge": updatedUser.badge + 1});

            return res.status(200).json({status: 1, message: "User is followed by you successfully", data:{isFollow: isFollow} }); 
        } else if(status === 'unfollow'){
            var followArr = yield Follow.find({followeeId: followeeId, followerId: followerId}).exec();
            yield Contact.findOneAndUpdate({user: followerId, contactUser: followeeId}, {$set: {isFollow: 0}}).exec();
            if(followArr.length) {
                var removeFollowResult = yield Follow.remove({followeeId: followeeId, followerId: followerId});
                if(!removeFollowResult) return res.status(400).json({status: 0, message: "Bad Request unfollow User is not saved",data: [] });

                yield Notifications.remove({$and: [{ toUserID:followeeId }, { fromUserID:followerId }, { $or: [{type: 'follow'}, {type: 'following'}] }]});

                yield Notifications.findOneAndUpdate({$and: [{ toUserID:followerId }, { fromUserID:followeeId }, { type: 'following'}]},{$set:{isToReverseFollowing:false, isToAcceptedFollowRequest: false}});

                yield updateFollowerAndFolloweeCount(followeeId, followerId);
                return res.status(200).json({status: 1, message: "User is unfollowed by you successfully", data: {isFollow:0} });
            } else {
                return res.status(404).json({status: 0, message: "User is not followed by you", data: [] });
            }
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

exports.updateFollowerAndFolloweeCount =  updateFollowerAndFolloweeCount;
function updateFollowerAndFolloweeCount(followeeId, followerId) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var followeCount = 0, followeeCount = 0;

            // Recalculating Followers and Following count of followee
            var followee = yield User.findOne({_id: followeeId}).exec();
            followerCount = yield Follow.count({followeeId: followeeId, isValid: true});
            followee.followerCount = followerCount;
            followeeCount = yield Follow.count({followerId: followeeId, isValid: true});
            followee.followeeCount = followeeCount;
            yield followee.save();

            // Recalculating Followers and Following count of follower
            var follower = yield User.findOne({_id: followerId}).exec();
            followerCount = yield Follow.count({followeeId: followerId, isValid: true});
            follower.followerCount = followerCount;
            followeeCount = yield Follow.count({followerId: followerId, isValid: true});
            follower.followeeCount = followeeCount;
            yield follower.save();

            resolve(true);
        }).catch(function(err){
            err = err && errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

function updateFollowNotification(notification) {
    return new Promise(function(resolve, reject){
        co(function*(){
            if(notification.isPublic) return resolve(false);

            var queryUserObject = {"_id": notification.fromUserID, "userVerified": true};
            var user = yield User.findOne(queryUserObject, {hash_password: 0}).exec();
            if(!user) return resolve(false);

            // Initialisation of variables
            var toMessage =  ' is following you';
            var toName = notification.fromName;
            var fromMessage = 'You are now following ';
            var fromName = notification.toName;

            var follower = yield Follow.findOneAndUpdate({followeeId:notification.toUserID, followerId:notification.fromUserID}, {$set: {isValid: true}}, { new: true }).exec();
            var checkReverseFollower = yield Follow.find({followeeId:notification.fromUserID,followerId:notification.toUserID,isValid:true}).exec();

            var isReverseFollowing = (checkReverseFollower.length > 0) ? true : false;

            yield Notifications.findOneAndUpdate({toUserID: notification.fromUserID, fromUserID: notification.toUserID,type: "following"}, {$set: {isReverseFollowing: isReverseFollowing}}, { new: true }).exec();
            yield Notifications.findOneAndUpdate({toUserID: notification.toUserID, fromUserID: notification.fromUserID, type: 'follow'}, {$set: {toMessage: toMessage,fromMessage: fromMessage, toName: fromName, fromName: toName, type: 'following', isPublic: true, updatedAt: new Date(), isReverseFollowing: isReverseFollowing}}, { new: true }).exec();

            var updatedUser = yield User.findByIdAndUpdate(ObjectId(user._id),{$inc: { badge: 1 }},{hash_password: 0}).exec();
            var checkStatusPushnotification = updatedUser.push_notifications.filter(function(push_notification) {
                co(function*(){
                    if(push_notification.type === "follow" && push_notification.category === "follow" && notification.type === 'follow') {
                        var deviceType = updatedUser.deviceType;
                        var deviceToken = updatedUser.device_token;
                        yield Notification.pushNotification({"type": "following", "device_token": deviceToken, "deviceType": deviceType, "glyphType": "image", "glyphThumbnail": notification.toUserImageUrl, "message": fromMessage+fromName, "name": toName,"badge": updatedUser.badge + 1});
                    }
                }).catch(function(err){
                    err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
                    return reject(err);
                });
            });

            var updatedUser2 = yield User.findByIdAndUpdate({"_id": ObjectId(notification.toUserID)},{$inc: { badge: 1 }},{hash_password: 0}).exec();
            var checkStatusPushSecondnotification = updatedUser2.push_notifications.filter(function(push_notification) {
                return ( push_notification.type === "follow" && push_notification.category === "follow" && notification.type === 'follow')
            });
            if(!checkStatusPushSecondnotification.length) {
                return resolve(true);
            }

            var deviceType = updatedUser2.deviceType;
            var deviceToken = updatedUser2.device_token;
            var secondPushNotification = yield Notification.pushNotification({"type": "following", "device_token": deviceToken, "deviceType": deviceType, "glyphType": "image", "glyphThumbnail": notification.fromUserImageUrl, "message": toName+toMessage, "name": fromName,"badge": updatedUser2.badge + 1});
            if (secondPushNotification) {
                return resolve(true);
            } else {
                return resolve(false);
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*****************
 EDIT PROFILE API
 *****************/
exports.editProfile = function (req, res) {
    co(function*(){
        // Validating user id
        if(!req.params.userId) return res.status(400).json({status: 0, message: "Bad Request Invalid User Id",data: []});

        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var setObject = {};
        req.body.userId = req.params.userId;
        req.body.name ? (setObject.name = req.body.name) : delete setObject.name;
        req.body.isPublic ? (setObject.isPublic = req.body.isPublic) : delete setObject.isPublic;
        req.body.instagram_id ? (setObject.instagram_id = req.body.instagram_id) : delete setObject.instagram_id;
        req.body.isContactSync ? (setObject.isContactSync = req.body.isContactSync) : delete setObject.isContactSync;
        req.body.fb_id ? (setObject.fb_id = req.body.fb_id) : delete setObject.fb_id;
        req.body.badge ? (setObject.badge = req.body.badge) : delete setObject.badge;
        req.body.isProfileHidden ? (setObject.isProfileHidden = req.body.isProfileHidden) : delete setObject.isProfileHidden;

        if(req.body.nickname){
            yield checkUsername(req.body);
            setObject.nickname = req.body.nickname;
            setObject.username = req.body.nickname;
        }
        if(req.body.email){
            yield checkEmail(req.body);
            setObject.email = req.body.email;
        }
        if(req.body.mobile) {
            yield checkMobileNo(req.body.mobile);
            setObject.mobile = req.body.mobile;
        }
        if(req.file) {
            setObject.image = req.file.location;
            var thumbnailObject = yield generateThumbnail({"files": req.file});
            if(thumbnailObject) {
                setObject.imageThumbnail = thumbnailObject.location;
            }
        }        
        var updatedUser = yield User.findByIdAndUpdate(req.params.userId, {$set: setObject}, { new: true }).exec();
        if(!updatedUser) return res.status(404).json({status: 0, message: "User does not exists", code: 404, data: [] });

        if(setObject.isPublic == 'true' || setObject.isPublic == true) {
            yield Notifications.update({$or:[{toUserID: req.params.userId},{fromUserID: req.params.userId}], type: {$nin: ['follow', 'following']}},{$set: {isPublic: true}},{multi: true}).exec();
            var notifications = yield Notifications.find({toUserID: req.params.userId, type: {$in: ['follow', 'following']}}).exec();
            if(!notifications.length) return res.status(200).json({status: 1, message: "Users profile updated successfully", code: 200, data:{ user: updatedUser } });
    
            var noticnt = 0;
            yield Promise.each(notifications, co.wrap(function*(notification, key){
                var notificationObject = notification;
                notificationObject.device_token = req.body.device_token;
                if (setObject.nickname) {
                    notification.toName = '@' + setObject.nickname;
                }
                yield updateFollowNotification(notificationObject); 
            }));
        } else if (setObject.isPublic == 'false' || setObject.isPublic == false) {
            yield Notifications.update({$or:[{toUserID: req.params.userId},{fromUserID: req.params.userId}]},{$set: {isPublic: false}},{multi: true}).exec();
        }
        return res.status(200).json({status: 1, message: "Users profile updated successfully", code: 200, data:{ user: updatedUser } });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

/**************************
 Accept Follow Request User API
 **************************/
exports.acceptFollowRequest = function (req, res) {
    co(function*(){
        // API call to set follow status
        var followerId = req.body.followerId;
        var followeeId = req.body.followeeId;

        var userDeleted = yield isUserDeleted(followeeId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        if(followeeId == followerId) return res.status(404).json({status: 0, message: "Bad Request Same User IDs", data: [] });

        var toMessage = '', fromMessage = '';
        var followObj = yield Follow.findOneAndUpdate({followeeId:followeeId, followerId:followerId}, {$set: {isValid: true,updatedAt: new Date()}}, { new: true }).exec();
        if(!followObj) return res.status(404).json({status: 0, message: "User does not exists", code: 404, data: [] });

        var queryFollowerObj = {"_id": followerId, "userVerified": true};
        var follower = yield User.findOne(queryFollowerObj, {hash_password: 0}).exec();
        if (!follower) return res.status(404).json({status: 0, message: "User is not found", data: []});

        var queryFolloweeObj = {"_id": followeeId, "userVerified": true};
        var followee = yield User.findOne(queryFolloweeObj, {hash_password: 0}).exec();
        if (!followee) return res.status(404).json({status: 0, message: "User is not found", data: []});

        var toMessage = ' is following you' ;
        var fromMessage = ' has accepted your follow request';
        var followeeUserImageUrl = followee.image;
        if(followee.fb_profile_pic_url) followeeUserImageUrl = followee.fb_profile_pic_url; 
        var followerUserImageUrl = follower.image;
        if(follower.fb_profile_pic_url) followerUserImageUrl = follower.fb_profile_pic_url;

        var checkReverseFollower = yield Follow.find({followeeId:followerId,followerId:followeeId,isValid:true}).exec();
        var isReverseFollowing = checkReverseFollower.length ? true : false;

        // Updating followee and follower count
        yield updateFollowerAndFolloweeCount(followeeId, followerId);

        yield Notifications.findOneAndUpdate({toUserID: followerId, fromUserID: followeeId, type: "follow"}, {$set: {isFromReverseFollowing: isReverseFollowing, isToReverseFollowing : true}}, { new: true }).exec();
        yield Notifications.findOneAndUpdate({toUserID: followerId, fromUserID: followeeId, type: "following"}, {$set: {isFromReverseFollowing: isReverseFollowing, isToReverseFollowing : true}}, { new: true }).exec();

        var followeeName = followee.nickname ? '@' + followee.nickname : '@' + followee.username;
        var followerName = follower.nickname ? '@' + follower.nickname : '@' + follower.username;

        var updatedFollowingNotification = yield Notifications.findOneAndUpdate({ toUserID: followeeId, fromUserID: followerId, type: 'follow' }, { $set: { toMessage: toMessage, fromMessage: fromMessage, type: 'following', updatedAt: new Date(), isFromReverseFollowing: true, isToReverseFollowing: isReverseFollowing, fromName: followerName, toName: followeeName, fromUserImageUrl: followerUserImageUrl, toUserImageUrl: followeeUserImageUrl}}, { new: true }).exec();

        var updatedUser = User.findByIdAndUpdate({"_id": ObjectId(follower._id)},{$inc: { badge: 1 }},{hash_password: 0}).exec();

        var checkStatusPushnotification = follower.push_notifications.filter(function(push_notification) {
            return ( push_notification.type === "follow" && push_notification.category === "follow")
        });

        if(!checkStatusPushnotification.length) return res.status(200).json({status: 1, message: "Follow request has been accepted successfully", code: 200, data:{notifications: updatedFollowingNotification} });

        var deviceType = follower.deviceType;
        var deviceToken = follower.device_token;

        yield Notification.pushNotification({ "type": "following", "device_token": deviceToken, "deviceType": deviceType, "glyphType": "image", "glyphThumbnail": followeeUserImageUrl, "message": followeeName + fromMessage, "name": followerName,"badge": follower.badge + 1});

        return res.status(200).json({status: 1, message: "Follow request has been accepted successfully", code: 200, data:{notifications: updatedFollowingNotification} });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });                       
}

/**************************
 Deny Follow Request User API
 **************************/
exports.denyFollowRequest = function (req, res) {
    co(function*(){
        // API call to set follow status
        var followerId = req.body.followerId;
        var followeeId = req.body.followeeId;

        var userDeleted = yield isUserDeleted(followeeId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});
    
        if(followeeId == followerId) return res.status(404).json({status: 0, message: "Bad Request Same User IDs", data: [] });
        
        yield Follow.remove({followeeId:followeeId,followerId:followerId});
        yield Notifications.remove({toUserID:followeeId,fromUserID:followerId, type: 'follow'});

        yield Notifications.findOneAndUpdate({toUserID: followerId, fromUserID: followeeId, type: "following"}, {$set: {isToAcceptedFollowRequest: false}}).exec();

        return res.status(200).json({status: 1, message: "Follow request has been rejected successfully", code: 200 });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(500).json({status: 0, message: err,data: []});
    });
}

function compare(a, b) {
    // Use toUpperCase() to ignore character casing
    const userA = a.name.toUpperCase();
    const userB = b.name.toUpperCase();

    let comparison = 0;
    if (userA > userB) {
        comparison = 1;
    } else if (userA < userB) {
        comparison = -1;
    }
    return comparison;
}

function compareCount(a, b) {
    // Use toUpperCase() to ignore character casing
    const userA = a.glyffSize;
    const userB = b.glyffSize;
    console.log("userB",userB)
    let comparison = 0;
    if (userA < userB) {
        comparison = 1;
    } else if (userA > userB) {
        comparison = -1;
    }
    return comparison;
}

function compareCountByViews(a, b) {
    // Use toUpperCase() to ignore character casing
    const userA = a.totalViews;
    const userB = b.totalViews;
    console.log("userB",userB)
    let comparison = 0;
    if (userA < userB) {
        comparison = 1;
    } else if (userA > userB) {
        comparison = -1;
    }
    return comparison;
}

/**************************
 PEOPLE LIST API
 **************************/
exports.searchPeople = function (req, res) {
    co(function*(){
        if(!(req.query.user_id && req.query.limit && req.query.offset)){
            return res.status(404).json({status: 0, message: "Bad Request Invalid Parameters", data: [] });
        }

        var userDeleted = yield isUserDeleted(req.query.user_id);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        // API call to fetch people list
        var name = String(req.query.name);
        var limit = parseInt(req.query.limit);
        var offset = parseInt(req.query.offset);
        var userId = ObjectId(req.query.user_id);
        var login_id = req.query.user_id;
        //var queryCondition = {"name": { '$regex' : name, '$options' : 'i' }, "userVerified": true};
        var queryCondition = name ? { $or: [{ $text: { $search: name } }, { "email": { '$regex': name, '$options': 'i' } }], "userVerified": true, "deleteStatus": false} : {"userVerified": true, "deleteStatus": false};
        var paginationQuery = {skip: offset, limit: limit};
        var isTextBasedSearch = name ? 1 : 0;
        var requestObject = {
            "queryCondition": queryCondition,
            "paginationQuery": paginationQuery,
            "userId": userId,
            "isTextBasedSearch": isTextBasedSearch
        };
        if(req.query.sortParams) {
            var sortQuery = {sortParams: req.query.sortParams, sortOrder: req.query.sortOrder ? req.query.sortOrder : "asc"};
            requestObject.sortQuery = sortQuery;
        }
        var users = yield usersList(requestObject);
        if(!users.length) return res.status(404).json({status: 0, message: "Users not found", data: [] });

        /* 
            var publicUsers = [], privateUsers = [];
            var unFollowedUsers = [], followPublicUsers = [], followPrivateUsers = [];
            yield Promise.each(users, co.wrap(function*(user, key){
                var id = String(user._id);
                // var followeeCount = yield Follow.count({followerId:ObjectId(id),isValid:true});
                // user.followeeCount = followeeCount;
                // var followerCount = yield Follow.count({followeeId:ObjectId(id),isValid:true});
                // user.followerCount = followerCount;
                
                var isLoginUserFollows = yield Follow.findOne({followerId: userId,followeeId: user._id}).exec();
                if(isLoginUserFollows) { 
                    if(isLoginUserFollows.isValid){
                        user.isFollowed = 2;                
                    } else {
                        user.isFollowed = 1;                
                    }       
                    if(user.isPublic) {
                        followPublicUsers.push(user);
                    } else {    
                        followPrivateUsers.push(user);
                    }
                } else {
                    user.isFollowed = 0;
                    unFollowedUsers.push(user);
                    // if(user.isPublic) {
                    //     publicUsers.push(user);
                    // } else {    
                    //     privateUsers.push(user);
                    // }                    
                }
            }));
            followPublicUsers.sort(compare);
            followPrivateUsers.sort(compare);
            unFollowedUsers.sort(compare);
            publicUsers.sort(compareCountByViews);
            privateUsers.sort(compare);
            var finalUsers = followPublicUsers.concat(followPrivateUsers, publicUsers, privateUsers);
            var finalUsers = followPublicUsers.concat(followPrivateUsers, unFollowedUsers);
            var responseUsers = finalUsers.splice(offset, limit); 
        */
        var hasMoreRecords = limit > users.length ? 0 : 1;
        return res.status(200).json({status: 1, message: "Users found successfully", data: { users:users, hasMoreRecords: hasMoreRecords, offset: offset }});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

/**************************
 FOLLOWEE LIST API
 **************************/
exports.fetchFollowees = function (req, res) {
    co(function*(){
        if(!(req.query.user_id && req.params.userId && req.query.limit && req.query.offset)){
            return res.status(404).json({status: 0, message: "Bad Request Invalid Parameters", data: [] });
        }

        var userDeleted = yield isUserDeleted(req.query.user_id);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var followees = yield fetchFollowees(req.query, req.params.userId);
        var hasMoreRecords = parseInt(req.query.limit) > followees.length ? 0 : 1;
        return res.status(200).json({status: 1, message: "Followee found successfully", data: { follow: followees, hasMoreRecords: hasMoreRecords, offset: parseInt(req.query.offset) } } );
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

function fetchFollowees(queryObject, loggedUserId) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var userFollows = yield GlyphModel.checkIfUserFollows(queryObject.user_id, loggedUserId);
            if(!userFollows && queryObject.user_id != loggedUserId) {
                return reject({errorCode: 404, errorMessage: "People is private , So you should follow him to see his followees"});
            }

            // API call to fetch followers list
            var limit = parseInt(queryObject.limit);
            var offset = parseInt(queryObject.offset);
            var userId = ObjectId(queryObject.user_id);
            var currentUserId = ObjectId(loggedUserId);

            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: {
                        "followerId": userId,
                        "isValid": true
                    }
                },    
                // Stage 2
                {
                    $skip: offset
                },    
                // Stage 3
                {
                    $limit: limit
                },    
                // Stage 4
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "followeeId",
                        "foreignField" : "_id",
                        "as" : "user"
                    }
                },
                // Stage 5
                {
                    $unwind: "$user"
                },
                // Stage 6
                {
                    $project: {
                        _id: 1,
                        isValid : 1,
                        followerId : 1,
                        followeeId : 1,
                        createdAt : 1,
                        user : '$user',
                        userNameLowerCase: {$toLower: "$user.username"}
                    }
                }
            ];

            if(queryObject.name) {
                aggregationQueryString.push({
                    $match: {
                        "user.role": {"$ne": 'admin'},
                        $or: [{ "user.username": { "$regex": queryObject.name, "$options": 'i' } }, { "user.nickname": { "$regex": queryObject.name, "$options": 'i' } }],
                        "user.deleteStatus":  false
                    }
                });
            } else {
                aggregationQueryString.push({
                    $match: {
                        "user.role": {"$ne": 'admin'},
                        "user.deleteStatus": false
                    }
                });
            }
            aggregationQueryString.push({
                $sort: { userNameLowerCase : 1 }
            });

            var followees = yield Follow.aggregate(aggregationQueryString).exec();

            if(!followees.length) return reject({errorCode: 404, errorMessage: "You are not following to anyone."});
            yield Promise.each(followees, co.wrap(function*(followee, key){
                //if(userId.toString() !== currentUserId.toString()) {
                    var followObj = yield Follow.findOne({"followerId":currentUserId,"followeeId":followee.followeeId},{isValid: 1}).exec();
                    followee.user.isFollowed = followObj ? (followObj.isValid ? 2 : 1) : 0;
                //}
            }));
            return resolve(followees);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**********************************
 * SEARCH USERS FOR MENTIONS API
 **********************************/
exports.searchUserForMentions = function(req, res) {
    co(function*(){
        if(!(req.query.user_id && req.params.userId && req.query.limit && req.query.offset)){
            return res.status(404).json({status: 0, message: "Bad Request Invalid Parameters", data: [] });
        }

        var userDeleted = yield isUserDeleted(req.query.user_id);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var followees = yield fetchFollowees(req.query, req.params.userId);
        var hasMoreRecords = parseInt(req.query.limit) > followees.length ? 0 : 1;
        return res.status(200).json({status: 1, message: "Followee found successfully", data: { follow: followees, hasMoreRecords: hasMoreRecords, offset: parseInt(req.query.offset) } } );
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

/**************************
 FOLLOWER LIST API
 **************************/
exports.fetchFollowers = function (req, res) {
    co(function*(){
        if(!(req.query.user_id && req.params.userId && req.query.limit && req.query.offset)){
            return res.status(404).json({status: 0, message: "Bad Request Invalid Parameters", data: [] });
        }

        var userDeleted = yield isUserDeleted(req.query.user_id);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var userFollows = yield GlyphModel.checkIfUserFollows(req.query.user_id, req.params.userId);
        if(!userFollows && req.query.user_id != req.params.userId) {
            return res.status(404).json({status: 0, message: "People is private , So you should follow him to see his followers", data: [], code: 404 });
        }
        // API call to fetch followers list
        var limit = parseInt(req.query.limit);
        var offset = parseInt(req.query.offset);
        var userId = ObjectId(req.query.user_id);
        var currentUserId = ObjectId(req.params.userId);

        var followers = yield Follow.aggregate([
            // Pipeline Stage 1
            {
                $match: {
                    "followeeId": userId,
                    "isValid": true
                }
            },    
            // Stage 2
            {
                $sort: {
                    "createdAt" : -1
                }
            },    
            // Stage 3
            {
                $skip: offset
            },    
            // Stage 4
            {
                $limit: limit
            },    
            // Stage 5
            {
                $lookup: {
                    "from" : "users",
                    "localField" : "followerId",
                    "foreignField" : "_id",
                    "as" : "user"
                }
            },    
            // Stage 6
            {
                $project: {
                    "_id" : 1,
                    "isValid" : 1,
                    "followerId" : 1,
                    "followeeId" : 1,
                    "createdAt" : 1,
                    "user" : { $arrayElemAt: [ "$user", 0 ] }
                }
            },
            {
                $match: {
                    "user.role": {$ne: 'admin'},
                    "user.deleteStatus": false
                }
            }
        ]).exec();

        if(!followers.length) return res.status(404).json({status: 0, message: "No one is following you", data: [], code: 404 });
        yield Promise.each(followers, co.wrap(function*(follower, key){
            //if(userId.toString() !== currentUserId.toString()) {
                var followObj = yield Follow.findOne({"followerId":currentUserId,"followeeId":follower.followerId},{isValid: 1}).exec();
                follower.user.isFollowed = followObj ? (followObj.isValid ? 2 : 1) : 0;
            //}
        }));  
        var hasMoreRecords = limit > followers.length ? 0 : 1;
        return res.status(200).json({status: 1, message: "Follower found successfully", data: { follow: followers, hasMoreRecords: hasMoreRecords, offset: offset } } );
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: "Bad Request Invalid Parameters", data: [] });
    });
}

/**************************
 USER LIST API
 **************************/
exports.userList = function (req, res) {
    co(function*(){
        // Validating user id
        if(!req.params.userId) return res.status(400).json({status: 0, message: "Bad Request Invalid User Id",data: []});
    
        // API call to fetch people list
        var userId = ObjectId(req.params.userId);
        var name = String(req.body.name);
        var limit = parseInt(req.body.limit);
        var skip = parseInt(req.body.offset);
        //var queryCondition = {"name": { '$regex' : name, '$options' : 'i' }, "userVerified": true};
        var queryCondition = name ? {$text: { $search: name }, _id: {$ne: userId}, role: {$ne: 'admin'}} : {_id: {$ne: userId}, role: {$ne: 'admin'}};  

        if(req.body.isExport && req.body.isExport == true) {
            var users = yield User.find(queryCondition, {name: 1, nickname: 1, username: 1, email: 1, mobile: 1, createdAt: 1, isPublic: 1, userVerified: 1, hotness: 1}).exec();
            if(!users.length) {
                return res.status(404).json({ status: 0, message: "Users not found" });
            }
            var jsonArr = [], jsonObj = {};
            users = JSON.parse(JSON.stringify(users));
            yield Promise.each(users, co.wrap(function* (user, key) {
                jsonObj = {
                    Name: user.name ? user.name : '',
                    Username: user.nickname ? user.nickname : (user.username ? user.username : ''),
                    Email: user.email ? user.email : '',
                    Mobile: user.mobile ? user.mobile : '',
                    Created: user.createdAt ? moment(user.createdAt).format('YYYY-MM-DD') : '',
                    Public: user.isPublic ? 'Yes' : 'No',
                    Verified: user.userVerified ? 'Yes' : 'No',
                    Dankness: user.hotness ? user.hotness : 0
                };
                jsonArr.push(JSON.parse(JSON.stringify(jsonObj)));
            }));
            csvConvertor.json2csv(jsonArr, (err, csv) => {
                if (err) {
                    //console.log('err 1--- ', err)
                    return res.status(500).json({ status: 0, message: 'Error while exporting csv' });
                }
                co(function*() {
                    if (csv) {
                        //console.log('users --- ',csv)
                        var csvDate = new Date();
                        yield globals.sendMailWithAttachments({
                            to: 'errol.hula@gmail.com',     // sending mail to admin
                            // to: 'sahil.kanani@indianic.com',
                            subject: "Users Csv Data",
                            message: 'Hello Admin,<br><br>Please find attached User Csv data.',
                            attachmentName: 'Memium User Data - ' + csvDate.getFullYear() + '-' + (csvDate.getMonth() + 1) + '-' + csvDate.getDate() +'.csv',
                            attachmentData: csv
                        });
                        return res.status(200).json({ status: 1, message: "Users Csv is sent to your mail Please check your inbox" });
                    } else {
                        return res.status(404).json({ status: 0, message: 'Users data not found' });
                    }
                }).catch(function(err){
                    //console.log('err --- ', err)
                    return res.status(500).json({ status: 0, message: 'Error while exporting csv' });
                });
            });

        } else {
            var isTextBasedSearch = name ? 1 : 0;

            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: queryCondition

                },
                // Stage 2
                // {
                //     $lookup: {
                //         "from": "glyffs",
                //         "localField": "_id",
                //         "foreignField": "creatorID",
                //         "as": "glyffsdata"
                //     }
                // },
                // Stage 4
                {
                    $project: {

                        "name": 1,
                        "nickname": 1,
                        "email": 1,
                        "isProfileHidden": { $ifNull: ["$isProfileHidden", false] },
                        "deleteStatus": 1,
                        "username": 1,
                        "createdAt": 1,
                        "mobile": 1,
                        "isPublic": 1,
                        "userVerified": 1,
                        "hotness": 1,
                        "credNo": 1,
                        "glyffCount": 1,
                        "followerCount": 1,
                        "followeeCount": 1,
                        "fb_id": 1,
                        "instagram_id": 1,
                        "fb_profile_pic_url": 1,
                        "imageThumbnail": 1,
                        "image": 1,
                        // "glyffsdata": 1,
                        // "glyffsArrayForViews": {
                        //     $filter: {
                        //         input: "$glyffsdata",
                        //         as: "item",
                        //         cond: { $eq: ["$$item.isDeleted", false] }

                        //     }
                        // }
                    }
                },
                // Stage 5
                // {
                //     $unwind: {
                //         path: "$glyffsArrayForViews",
                //         preserveNullAndEmptyArrays: true

                //     }
                // },
                // Stage 6
                {
                    $project: {
                        // "viewCounts": "$glyffsArrayForViews.viewCount",
                        // "sharedCount": "$glyffsArrayForViews.sharedCount",
                        "name": 1,
                        "nickname": 1,
                        "deleteStatus": 1,
                        "email": 1,
                        "isProfileHidden": { $ifNull: ["$isProfileHidden", false] },
                        "username": 1,
                        "createdAt": 1,
                        "mobile": 1,
                        "isPublic": 1,
                        "userVerified": 1,
                        "hotness": 1,
                        "credNo": 1,
                        "glyffCount": 1,
                        "followerCount": 1,
                        "followeeCount": 1,
                        "fb_id": 1,
                        "instagram_id": 1,
                        "fb_profile_pic_url": 1,
                        "imageThumbnail": 1,
                        "image": 1
                    }
                },
                // Stage 7
                {
                    $group: {
                        _id: "$_id",
                        // totalView: { $sum: '$viewCounts' },
                        // totalShares: { $sum: '$sharedCount' },
                        name: { $first: '$name' },
                        nickname: { $first: '$nickname' },
                        deleteStatus: { $first: '$deleteStatus' },
                        email: { $first: '$email' },
                        isProfileHidden: { $first: '$isProfileHidden' },
                        username: { $first: '$username' },
                        createdAt: { $first: '$createdAt' },
                        mobile: { $first: '$mobile' },
                        isPublic: { $first: '$isPublic' },
                        userVerified: { $first: '$userVerified' },
                        hotness: { $first: '$hotness' },
                        credNo: { $first: '$credNo' },
                        glyffCount: { $first: '$glyffCount' },
                        followerCount: { $first: '$followerCount' },
                        followeeCount: { $first: '$followeeCount' },
                        fb_id: { $first: '$fb_id' },
                        instagram_id: { $first: '$instagram_id' },
                        fb_profile_pic_url: { $first: '$fb_profile_pic_url' },
                        imageThumbnail: { $first: '$imageThumbnail' },
                        image: { $first: '$image' }
                    }
                }
            ];

            // Getting total count of searched results
            // aggregationQueryString.push({$count: "count"});
            var totalUserCount = yield User.count(queryCondition);
            // aggregationQueryString.pop();

            var sortObjArr = [];
            if(req.body.sortParams) {
                var sortParam = req.body.sortParams;
                var sortOrder = req.body.sortOrder ? req.body.sortOrder : 'asc';
                var sortOrder = sortOrder === "asc" ? 1 : -1;                
                if(isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {                            
                                "score": { $meta: "textScore" },
                            }
                        },
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    if(sortParam !== 'createdAt') {
                        sortObjArr[0].$sort.createdAt = -1;
                    }
                } else {
                    sortObjArr = [{
                            $sort: { 
                            }
                        },
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    if(sortParam !== 'createdAt') {
                        sortObjArr[0].$sort.createdAt = -1;
                    }
                }
            } else {
                if(isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" }, 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        }                        
                    ];
                } else {
                    sortObjArr = [{
                            $sort: { 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: skip
                        },
                        {
                            $limit: limit
                        }
                    ];
                }
            }
    
            aggregationQueryString = aggregationQueryString.concat(sortObjArr);
            var users = yield User.aggregate(aggregationQueryString).allowDiskUse(true).exec();
    
            if(!users) return res.status(404).json({status: 0, message: "Users are not found", data: [] });
    
            var userList = users.filter(function(user) {    
                if(user.fb_profile_pic_url) {
                    user.image = user.fb_profile_pic_url
                    user.imageThumbnail = user.fb_profile_pic_url
                } else {
                    user.imageThumbnail = user.image
                }
                return user;
            });
            
            var finalUserList = userList.length == users.length ? users : userList;
            return res.status(200).json({status: 1, message: "Users found successfully", data:{users: finalUserList, count: totalUserCount}});
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: []});
    });
}

exports.deleteUserByAdmin = function(req,res){
    co(function*(){
        yield User.findByIdAndRemove(req.params.deleteUserId).exec();
        yield Authentication.remove({"userId":req.params.deleteUserId});
        return res.status(200).json({status: 1, message: "User Deleted successfully", data: [] });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode:500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

exports.blockMemeByAdmin = function(req,res){
    co(function*(){
        var glyphId = req.body.glyphId;
        var userId = req.params.userId;
        if(!glyphId) return res.status(404).json({status: 0, message: "Please enter glyph id", data: [] });

        // var reportedGlyffs = yield reportglyff.find({"glyphId": glyph_Id}).exec()
        // if(reportedGlyffs.length) {
        //     yield reportglyff.updateMany({"glyphId":glyph_Id},{ $set: { reportApprovedByAdmin: true } }).exec();
        //     var glyffObj = yield Glyff.findOne({_id: glyph_Id}).exec();
        //     yield User.findOneAndUpdate({_id: glyffObj.creatorID},{$inc: { glyffCount: -1 }}).exec();
        // } else {
            yield GlyphModel.blockMemeByAdmin(userId, glyphId);
        //}
        return res.status(200).json({status: 1, message: "Meme Blocked successfully", data: [] });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode:500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

exports.unblockMemeByAdmin = function(req,res){
    co(function*(){
        var glyph_Id = req.body.glyphId;
        if(!glyph_Id) return res.status(404).json({status: 0, message: "Please enter glyph id", data: [] });

        // var reportedGlyffs = yield reportglyff.find({"glyphId": glyph_Id}).exec()
        // if(reportedGlyffs.length) {
        //     yield reportglyff.updateMany({"glyphId":glyph_Id},{ $set: { reportApprovedByAdmin: true } }).exec();
        //     var glyffObj = yield Glyff.findOne({_id: glyph_Id}).exec();
        //     yield User.findOneAndUpdate({_id: glyffObj.creatorID},{$inc: { glyffCount: -1 }}).exec();
        // } else {
            yield GlyphModel.unblockMemeByAdmin(glyph_Id);
        //}
        return res.status(200).json({status: 1, message: "Meme Unblocked successfully", data: [] });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode:500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

exports.hideOrUnhideUser = function(req, res){
    co(function*(){
        if(!req.body.action) return res.status(404).json({status: 0, message: "Please enter action", data: [] });
        if(!req.body.userId) return res.status(404).json({status: 0, message: "Please enter userId", data: [] });
        var user = yield User.findOne({_id: ObjectId(req.params.userId)},{role: 1}).exec();
        if(user && user.role && user.role === 'admin') {
            var deleteStatus = req.body.action == "hide" ? true : false;
            yield User.findOneAndUpdate({_id: ObjectId(req.body.userId)},{$set: {deleteStatus: deleteStatus}}).exec();
            return res.status(200).json({status: 1, message: "User "+req.body.action+" successfully", data: [] });
        } else {
            return res.status(401).json({status: 2, message: "You are not allowed to perform this action", data: [] });
        }
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode:500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

exports.deleteAccount = function (req, res) {
    co(function* () {
        var user = yield User.findOne({ _id: ObjectId(req.params.userId) }).exec();
        user.deleteStatus = true;
        user.username = '~' + user.username;
        user.nickname = '~' + user.nickname;
        user.email = '~' + user.email;
        yield user.save();
        // yield User.findOneAndUpdate({ _id: ObjectId(req.params.userId) }, { $set: { deleteStatus: true } }).exec();
        return res.status(200).json({ status: 1, message: "Account deleted successfully", data: [] });
    }).catch(function (err) {
        err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
        return res.status(err.errorCode).json({ status: 0, message: err.errorMessage, data: [] });
    });
}

/**************************
 USER LIST API
 **************************/
exports.getRecommendedPeople = function (req, res) {
    co(function* () {
        // Validating user id
        if (!(req.query.limit && req.query.offset && req.query.type)) {
            return res.status(404).json({ status: 0, message: "Bad Request Invalid Parameters", data: [] });
        }

        var tokenReq = req.headers.authorization;
        var decoded = jwt.decode(tokenReq);
        var userId = decoded.id;

        var userDeleted = yield isUserDeleted(userId);
        if (userDeleted) return res.status(400).json({ status: 0, message: userDeleted, data: [], code: 400 });

        var reqQueryObj = {
            name: req.query.name,
            isTextBasedSearch: req.query.name ? 1 : 0,
            limit: req.query.limit ? parseInt(req.query.limit) : 10,
            skip: req.query.offset ? parseInt(req.query.offset) : 0,
            userId: ObjectId(userId)
        };

        var recommendedPeople = [], hasMoreRecords = 0;
        if (req.query.type == 'peopleYouMayKnow') {
            recommendedPeople = yield getPeopleYouMayKnow(reqQueryObj);
            hasMoreRecords = parseInt(req.query.limit) > recommendedPeople.length ? 0 : 1;
            return res.status(200).json({ status: 1, message: "People found successfully", data: { users: recommendedPeople, hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } });
        } else if (req.query.type == 'mostFollowed') {
            recommendedPeople = yield getMostFollowedPeople(reqQueryObj);
            hasMoreRecords = parseInt(req.query.limit) > recommendedPeople.length ? 0 : 1;
            return res.status(200).json({ status: 1, message: "People found successfully", data: { users: recommendedPeople, hasMoreRecords: hasMoreRecords, offset: reqQueryObj.offset } });
        } else {
            return res.status(500).json({ status: 0, message: 'Bad Request Invalid type ', data: [], code: 500 });
        }
    }).catch(function (err) {
        console.log(err)
        err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
        return res.status(err.errorCode).json({ status: 0, message: err.errorMessage, data: [] });
    });
}

function getPeopleYouMayKnow(reqQueryObj) {
    return new Promise(function(resolve, reject) {
        co(function*(){
            var recommendedPeople = [];
            var peopleWhomIFollowing = yield Follow.find({ followerId: reqQueryObj.userId, isValid: true }, { followeeId: 1 });
            var peopleWhomIFollowingIds = _.map(peopleWhomIFollowing, 'followeeId');

            // adding user's own id in array as we dont want that user also in that list
            peopleWhomIFollowingIds.push(reqQueryObj.userId);

            var peopleFollowingMe = yield Follow.find({ followeeId: reqQueryObj.userId, isValid: true }, { followerId: 1 });
            var peopleFollowingMeIds = _.map(peopleFollowingMe, 'followerId');

            // Finding my friends
            var friends = _.uniq(_.concat(peopleWhomIFollowingIds, peopleFollowingMeIds));            

            // Findign list of people my friends following
            var friendsFollowees = yield Follow.find({ followerId: { $in: friends }, isValid: true}, { followeeId: 1});
            var friendsFolloweeIds = _.map(friendsFollowees, 'followeeId');

            // Removing those people whom i already following
            var peopleYouMayKnow = _.uniq(_.differenceWith(friendsFolloweeIds, peopleWhomIFollowingIds, _.isEqual));
            
            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: {
                        _id: {
                            $in: peopleYouMayKnow
                        },
                        "userVerified": true,
                        "deleteStatus": false,
                        role: {
                            $ne: 'admin'
                        }
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
                        "$and": [{
                                "block.blockedById": {
                                    $ne: reqQueryObj.userId
                                }
                            },
                            {
                                "_id": {
                                    $ne: reqQueryObj.userId
                                }
                            }
                        ]
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
                            $cond: {
                                if: {
                                    "$gt": [{
                                        "$size": {
                                            "$filter": {
                                                input: "$checkFollower",
                                                as: "checkFollower",
                                                cond: {
                                                    "$and": [{
                                                        "$eq": ["$$checkFollower.followerId", reqQueryObj.userId]
                                                    }, {
                                                        "$eq": ["$$checkFollower.followeeId", "$_id"]
                                                    }]
                                                }
                                            }
                                        }
                                    }, 0]
                                },
                                then: {
                                    $cond: {
                                        if: {
                                            "$gt": [{
                                                "$size": {
                                                    "$filter": {
                                                        input: "$checkFollower",
                                                        as: "checkFollower",
                                                        cond: {
                                                            "$and": [{
                                                                "$eq": ["$$checkFollower.followerId", reqQueryObj.userId]
                                                            }, {
                                                                "$eq": ["$$checkFollower.followeeId", "$_id"]
                                                            }, {
                                                                "$eq": ["$$checkFollower.isValid", true]
                                                            }]
                                                        }
                                                    }
                                                }
                                            }, 0]
                                        },
                                        then: 2,
                                        else: 1
                                    }
                                },
                                else: 0
                            }
                        },
                        // "followerCount": {
                        //     "$size": {
                        //         "$filter": {
                        //             input: "$checkFollower",
                        //             as: "checkFollower",
                        //             cond: {
                        //                 "$eq": ["$$checkFollower.followeeId", "$_id"]
                        //             }
                        //         }
                        //     }
                        // },
                        "mobile": 1,
                        "language": 1,
                        "name": 1,
                        "insensitiveName": {
                            "$toLower": "$name"
                        },
                        "email": 1,
                        "isProfileHidden": {
                            $ifNull: ["$isProfileHidden", false]
                        },
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
                }
            ];

            var sortObjArr = [];            
            if (reqQueryObj.isTextBasedSearch) {
                aggregationQueryString[0].$match.$text = {
                    $search: reqQueryObj.name
                };
                sortObjArr = [{
                    $sort: {
                        "score": {
                            $meta: "textScore"
                        },
                        hotness: -1,
                        isPublic: -1,
                        createdAt: -1
                    }
                },
                {
                    $skip: reqQueryObj.skip
                },
                {
                    $limit: reqQueryObj.limit
                }
                ];
            } else {
                sortObjArr = [{
                    $sort: {
                        hotness: -1,
                        isPublic: -1,
                        createdAt: -1
                    }
                },
                {
                    $skip: reqQueryObj.skip
                },
                {
                    $limit: reqQueryObj.limit
                }
                ];
            }
            
            aggregationQueryString = aggregationQueryString.concat(sortObjArr);
            recommendedPeople = yield User.aggregate(aggregationQueryString).allowDiskUse(true).exec();

            var userIds = _.map(recommendedPeople, '_id');

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
            yield Promise.each(recommendedPeople, co.wrap(function* (user, key) {
                var glyffUser = _.filter(glyffs, function (g) {
                    return g._id.toString() == user._id.toString();
                });
                user.glyffSize = glyffUser.length ? glyffUser[0].glyffSize : 0;
                user.totalViews = glyffUser.length ? glyffUser[0].totalViews : 0;
            }));
            return resolve(recommendedPeople);
        }).catch(function(err){
            return reject(err);
        })
    });
}

function getMostFollowedPeople(reqQueryObj) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            var recommendedPeople = [];
            var peopleWhomIFollowing = yield Follow.find({ followerId: reqQueryObj.userId, isValid: true }, { followeeId: 1});
            var peopleWhomIFollowingIds = _.map(peopleWhomIFollowing, 'followeeId');
            
            // adding user's own id in array as we dont want that user also in that list
            peopleWhomIFollowingIds.push(reqQueryObj.userId);

            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: {
                        _id: {
                            $nin: peopleWhomIFollowingIds
                        },
                        "userVerified": true,
                        "deleteStatus": false,
                        role: {
                            $ne: 'admin'
                        }
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
                        "$and": [{
                            "block.blockedById": {
                                $ne: reqQueryObj.userId
                            }
                        },
                        {
                            "_id": {
                                $ne: reqQueryObj.userId
                            }
                        }
                        ]
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
                            $cond: {
                                if: {
                                    "$gt": [{
                                        "$size": {
                                            "$filter": {
                                                input: "$checkFollower",
                                                as: "checkFollower",
                                                cond: {
                                                    "$and": [{
                                                        "$eq": ["$$checkFollower.followerId", reqQueryObj.userId]
                                                    }, {
                                                        "$eq": ["$$checkFollower.followeeId", "$_id"]
                                                    }]
                                                }
                                            }
                                        }
                                    }, 0]
                                },
                                then: {
                                    $cond: {
                                        if: {
                                            "$gt": [{
                                                "$size": {
                                                    "$filter": {
                                                        input: "$checkFollower",
                                                        as: "checkFollower",
                                                        cond: {
                                                            "$and": [{
                                                                "$eq": ["$$checkFollower.followerId", reqQueryObj.userId]
                                                            }, {
                                                                "$eq": ["$$checkFollower.followeeId", "$_id"]
                                                            }, {
                                                                "$eq": ["$$checkFollower.isValid", true]
                                                            }]
                                                        }
                                                    }
                                                }
                                            }, 0]
                                        },
                                        then: 2,
                                        else: 1
                                    }
                                },
                                else: 0
                            }
                        },
                        // "followerCount": {
                        //     "$size": {
                        //         "$filter": {
                        //             input: "$checkFollower",
                        //             as: "checkFollower",
                        //             cond: {
                        //                 "$eq": ["$$checkFollower.followeeId", "$_id"]
                        //             }
                        //         }
                        //     }
                        // },
                        "mobile": 1,
                        "language": 1,
                        "name": 1,
                        "insensitiveName": {
                            "$toLower": "$name"
                        },
                        "email": 1,
                        "isProfileHidden": {
                            $ifNull: ["$isProfileHidden", false]
                        },
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
                }
            ];

            var sortObjArr = [];
            if (reqQueryObj.isTextBasedSearch) {
                aggregationQueryString[0].$match.$text = {
                    $search: reqQueryObj.name
                };
                sortObjArr = [{
                    $sort: {
                        "score": {
                            $meta: "textScore"
                        },
                        followerCount: -1,
                        isPublic: -1,
                        createdAt: -1
                    }
                },
                {
                    $skip: reqQueryObj.skip
                },
                {
                    $limit: reqQueryObj.limit
                }
                ];
            } else {
                sortObjArr = [{
                    $sort: {
                        followerCount: -1,
                        isPublic: -1,
                        createdAt: -1
                    }
                },
                {
                    $skip: reqQueryObj.skip
                },
                {
                    $limit: reqQueryObj.limit
                }
                ];
            }

            aggregationQueryString = aggregationQueryString.concat(sortObjArr);
    
            recommendedPeople = yield User.aggregate(aggregationQueryString).allowDiskUse(true).exec();

            var userIds = _.map(recommendedPeople, '_id');

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
            yield Promise.each(recommendedPeople, co.wrap(function* (user, key) {
                var glyffUser = _.filter(glyffs, function (g) {
                    return g._id.toString() == user._id.toString();
                });
                user.glyffSize = glyffUser.length ? glyffUser[0].glyffSize : 0;
                user.totalViews = glyffUser.length ? glyffUser[0].totalViews : 0;
            }));
            return resolve(recommendedPeople);
        }).catch(function (err) {
            return reject(err);
        })
    });
}