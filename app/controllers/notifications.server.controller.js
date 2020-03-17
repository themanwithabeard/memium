/**************************
 MODULE INITIALISATION
 **************************/
const   mongoose        = require('mongoose'),
        Notifications   = require('../models/notifications.server.model').notifications,
        ObjectId        = require('mongodb').ObjectID,
        User            = require('../models/users.server.model').user,
        GlyphModel      = require('../models/glyff.server.model'),
        Follow          = require('../models/users.server.model').follow,
        Promise         = require('bluebird'),
        co              = require('co'),
        _               = require('lodash'),
        isUserDeleted = require('../../configs/globals').checkWhetherUserIsDeleted;


/**************************
 FETCH USER NOTIFICATIONS LIST API
 **************************/
/* exports.getNotifications = function (req, res) {
    co(function*(){
        // Validating user id
        if(!req.params.userId) return res.status(400).json({status: 0, message: "Bad Request. Invalid User Id.",data:[]});
        
        var limit = parseInt(req.query.limit);
        var offset = parseInt(req.query.offset);

        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        // API call to fetch specific user glyffs
        // var queryUserNotificationsObject = {"fromUserID": req.params.userId}
        // Notifications.find(queryUserNotificationsObject, null, { sort: { createdAt: -1 } }, function(err, notifications) {
        //     if(err) { res.status(500).json({status: 0, message: err,data: [] }); return false;}
        //     if(!notifications) { res.status(404).json({status: 0, message: "Notifications not found",data: [] }); return false;}
        //
        //     res.status(200).json({status: 1, message: "Notifications found successfully", data: { notifications:notifications }});
        //     return false;
        // });

        var followingNotification = yield getFollowingNotificationIds(req.params.userId);
        var glyffNotification = yield getFolloweeNotificationIds(req.params.userId);
        
        var notificationsIds = followingNotification.concat(glyffNotification);
        var query = {$and:[{"toUserID" : ObjectId(req.params.userId)},{"isSame": {$ne: 0}}]};
        if(notificationsIds.length > 0){
            var query = {$and:[{"isSame": {$ne: 0}},
            {$or:[{"toUserID" : ObjectId(req.params.userId)},{"type": "trend"},{"_id": {$in : notificationsIds}}, {"fromUserID": ObjectId(req.params.userId), "type": "editGlyph"}]}]};
        } 
        console.log(followingNotification.length, glyffNotification.length);
        var notifications = yield Notifications.aggregate([
            // Pipeline Stage 1
            {
                $project: {
                    "isSame": { "$cmp": [ "$fromUserID", "$toUserID" ] },
                    "isPublic" : 1,
                    "isDenied" : 1,
                    "fromUserID" : 1,
                    "toUserID" : 1,
                    "toMessage" : 1,
                    "fromMessage" : 1,
                    "fromUserImageUrl" : 1,
                    "toUserImageUrl" : 1,
                    "fromName" : 1,
                    "toName" : 1,
                    "type" : 1,
                    "createdAt" :1,
                    "updatedAt" : 1,
                    "glyphImageUrl" : 1,
                    "glyphType" : 1,
                    "isFromReverseFollowing" : 1,
                    "isToReverseFollowing" : 1,
                    "isFromAcceptedFollowRequest" : 1,
                    "isToAcceptedFollowRequest" : 1, 

                }
            },
            // Stage 2
            {
                $match: query
            },
            // Stage 3
            // {
            //     $group: {
            //         _id:{createdAt:'$createdAt'},
            //         info:{$addToSet:{_id:'$_id',fromName:'$fromName',toName:'$toName',isPublic:'$isPublic'
            //         ,isDenied:'$isDenied',fromUserID:'$fromUserID',toUserID:'$toUserID',toMessage:'$toMessage'
            //         ,fromMessage:'$fromMessage',fromUserImageUrl:'$fromUserImageUrl',toUserImageUrl:'$toUserImageUrl',
            //         updatedAt:'$updatedAt',type:'$type',glyphImageUrl:'$glyphImageUrl',glyphType: '$glyphType',isFromReverseFollowing: '$isFromReverseFollowing',isToReverseFollowing: '$isToReverseFollowing',isFromAcceptedFollowRequest:'$isFromAcceptedFollowRequest',isToAcceptedFollowRequest:'$isToAcceptedFollowRequest' }}
            //     }
            // },
            // Stage 4
            {
                $sort: {
                    'createdAt':-1
                }
            },
            // Stage 5
            // {
            //     $unwind: {
            //         path : "$info",
            //     }
            // },
            // Stage 6
            {
                $sort: {
                    "updatedAt": -1
                }
            },
            // Stage 7
            // {
            //     $group: {
            //         _id:{createdAt:"$_id.createdAt"},
            //         doc: { "$push" : "$info"}
            //     }
            // },
            // Stage 8
            // {
            //     $sort: {
            //         "_id.createdAt":-1
            //     }
            // },
            // Stage 9
            // {
            //     $project: {
            //         createdAt:'$_id.createdAt',
            //         info:'$doc',
            //         _id:0
            //     }
            // },
        ]).exec();

    //     var notifications = yield Notifications.aggregate([
    //         // Pipeline Stage 1
    //         {
    //             $project: {
    //                 "isSame": { "$cmp": [ "$fromUserID", "$toUserID" ] },
    //                 "isPublic" : 1,
    //                 "isDenied" : 1,
    //                 "fromUserID" : 1,
    //                 "toUserID" : 1,
    //                 "toMessage" : 1,
    //                 "fromMessage" : 1,
    //                 "fromUserImageUrl" : 1,
    //                 "toUserImageUrl" : 1,
    //                 "fromName" : 1,
    //                 "toName" : 1,
    //                 "type" : 1,
    //                 "createdAt" : 1,
    //                 "updatedAt" : 1,
    //                 "glyphImageUrl" : 1,
    //                 "glyphType" : 1,
    //                 "isFromReverseFollowing" : 1,
    //                 "isToReverseFollowing" : 1,
    //                 "isFromAcceptedFollowRequest" : 1,
    //                 "isToAcceptedFollowRequest" : 1
    //             }
    //         },
    //         // Stage 2
    //         {
    //             $match: query
    //         },
    //         // Stage 3
    //         {
    //             $sort: {
    //                 //'createdAt': -1,
    //                 'updatedAt': -1
    //             }
    //         },
    //         {
    //             $skip: offset
    //         },
    //         {
    //             $limit: limit
    //         }
    //     ]).exec();

    //     var hasMoreRecords = limit > notifications.length ? 0 : 1;
    //     if(!notifications) return res.status(404).json({status: 0, message: "Notifications not found",data: [] });

    //     return res.status(200).json({status: 1, message: "Notifications found successfully", data: { notifications:notifications, hasMoreRecords:hasMoreRecords }});
    // }).catch(function(err){
    //     err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
    //     return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data:[]});
    // });
} */

exports.getNotifications = function(req, res) {
    co(function*(){
        // Validating user id
        if(!req.params.userId) return res.status(400).json({status: 0, message: "Bad Request Invalid User Id",data:[]});
               
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});
        
        var userId = ObjectId(req.params.userId);
        var limit = parseInt(req.query.limit);
        var offset = parseInt(req.query.offset);

        var followees = yield Follow.find({followerId: userId, isValid: true},{followeeId:1, updatedAt:1}).exec();
        var followeeNotificationIds = [];
        yield Promise.each(followees, co.wrap(function*(followee){
            var followeeNotifications = yield Notifications.find({type: 'newGlyph', fromUserID: followee.followeeId, createdAt: {$gt: followee.updatedAt}}).exec();
            followeeNotificationIds = followeeNotificationIds.concat(_.map(followeeNotifications, '_id'));
        }));

        var userGlyffs = yield GlyphModel.getGlyffs({parentID: userId}, {_id:1});
        var userGlyffIds = _.map(userGlyffs, '_id');
        var cloneGlyffNotifications = yield Notifications.find({type: 'editGlyph', glyffId: {$in: userGlyffIds}},{_id: 1}).exec();
        var cloneGlyffNotificationIds = _.map(cloneGlyffNotifications, '_id');

        var queryString = {
            $or: [
                {$or: [{_id: {$in: followeeNotificationIds}}, {_id: {$in: cloneGlyffNotificationIds}}]},
                {type: { $in: ['favouriteGlyph', 'addComment', 'mentionComment', 'follow']},toUserID: userId},
                {type: 'following', $or: [{toUserID: userId}, {fromUserID: userId}]}
            ]
        };
        var notifications = yield Notifications.find(queryString).sort({updatedAt: -1}).skip(offset).limit(limit).exec();
        if(!notifications) return res.status(404).json({status: 0, message: "Notifications not found",data: [] });

        notifications = JSON.parse(JSON.stringify(notifications));
        yield Promise.each(notifications, co.wrap(function*(notification){
            var followObj;
            if(notification.type === 'following') { 
                var followeeId = notification.toUserID === req.params.userId ? notification.fromUserID : notification.toUserID;
                followObj = yield Follow.findOne({followeeId: followeeId, followerId: userId}).exec();
                var userObj = yield User.findOne({_id: followeeId},{isPublic:1}).exec();
                notification.isPublic = userObj.isPublic;
            } else if(notification.type === 'newGlyph'){
                followObj = yield Follow.findOne({followerId: userId, followeeId: notification.fromUserID}).exec();
            } else {
                followObj = yield Follow.findOne({followerId: notification.toUserID, followeeId: notification.fromUserID}).exec(); 
            }
            notification.isFollow = followObj ? (followObj.isValid ? 2 : 1) : 0;
        }));

        var user = yield User.findOne({_id: userId}).exec();
        user.badge = (user.badge - limit) > 0 ? (user.badge - limit) : 0;
        yield user.save();
        
        var hasMoreRecords = limit > notifications.length ? 0 : 1;        
        return res.status(200).json({status: 1, message: "Notifications found successfully", data: { notifications:notifications, hasMoreRecords:hasMoreRecords }});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data:[]});
    });
};

function getFolloweeNotificationIds(id){
    return new Promise(function(resolve, reject) {
        co(function*(){
            var followData = yield Follow.find({'followerId':id,'isValid':true}).exec();
            if(!followData.length)  return resolve([]);

            var notiIds = [];
            var cntFd = 0;

            followData.map(function(obj) {
                co(function*(){
                    cntNd = 0;
                    var notificationData = yield Notifications.find({"$and": [{"fromUserID": obj.followeeId,"createdAt": {$gt: obj.updatedAt}},{ $or: [{"type": "newGlyph"}, {"type": "editGlyph"}] }]}).exec();
                    
                    if(notificationData.length){
                        notificationData.map(function(o){
                            cntNd = cntNd + 1;
                            notiIds.push(o._id);
                            if(cntNd >= notificationData.length){
                                cntFd = cntFd + 1;
                                if(cntFd >= followData.length){
                                    return resolve(notiIds);
                                }
                            }   
                        });
                    }
                    else
                    {
                        cntFd = cntFd + 1;
                        if(cntFd >= followData.length){
                            return resolve(notiIds);
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

function getFollowingNotificationIds(id){
    return new Promise(function(resolve, reject) {
        co(function*(){
            var notifications = [];
            var notificationData = yield Notifications.find({"fromUserID":id,"type":"following"}).exec();
            if(!notificationData.length) return resolve([]);
            
            var notiIds = notificationData.map(function(obj) { return obj._id; })
            return resolve(notiIds);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    })
}


/************************************
 PUSH NOTIFICATIONS CHANGE STATUS API
 ************************************/
exports.changePushNotificationsStatus = function (req, res) {
    co(function*(){
        // Validating user id
        if(!req.params.userId) return res.status(400).json({status: 0, message: "Bad Request Invalid User Id",data:[]});
        
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var updateObject = req.body.action == "active" ? { $addToSet: { push_notifications: {"type": req.body.type, "category":req.body.category} } } : { $pull: { push_notifications: {"type": req.body.type, "category":req.body.category} } } ;
        var requestCondition = { _id: ObjectId(req.params.userId) };
        var user = yield User.findOneAndUpdate(requestCondition, updateObject, {new:true}).exec();

        return res.status(200).json({status: 1, message: "User push notifications status updated successfully", data: { user:user }});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data:[]});
    });
}

exports.glyphNotifications = function(req,res){
    co(function*(){
        if(!req.params.userId) return res.status(400).json({status: 0, message: "Bad Request Invalid User Id",data:[]});
        
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var limit = parseInt(req.query.limit);
        var offset = parseInt(req.query.offset);   
        var pageSortQuery = {skip: offset, limit: limit };

        var followingNotification = yield getFollowingNotificationIds(req.params.userId);
        var glyffNotification = yield getFolloweeNotificationIds(req.params.userId);

        var notificationsIds = followingNotification.concat(glyffNotification);
        var query = {$and:[{"toUserID" : ObjectId(req.params.userId)},{"isSame": {$ne: 0}}]};
        if(notificationsIds.length){
            var query = {$and:[{"isSame": {$ne: 0}},
            {$or:[{"toUserID" : ObjectId(req.params.userId)},{"type": "trend"},{"_id": {$in : notificationsIds}}]}]};
        }           
        pageSortQuery = pageSortQuery || {};

        var aggregationQueryString = [
            // Pipeline Stage 1
            {
                $match: query
            },
            // Stage 2
                {
                $sort: {
                    'createdAt':-1
                }
            }   
        ];

        if(Object.keys(pageSortQuery).length) {
            aggregationQueryString = aggregationQueryString.concat([
                // Stage 3
                {
                    $skip:pageSortQuery.skip
                },

                // Stage 4
                {
                    $limit:pageSortQuery.limit
                },
            ]);
        }
        aggregationQueryString.push({   // Stage 5
            $project: {
                "isSame": { "$cmp": [ "$fromUserID", "$toUserID" ] },
                "isPublic" : 1,
                "isProfileHidden": { $ifNull: ["$isProfileHidden", false] },
                "isDenied" : 1,
                "fromUserID" : 1,
                "toUserID" : 1,
                "toMessage" : 1,
                "fromMessage" : 1,
                "fromUserImageUrl" : 1,
                "toUserImageUrl" : 1,
                "fromName" : 1,
                "toName" : 1,
                "type" : 1,
                "createdAt" :{ $dateToString: { format: "%Y-%m-%d", date: '$createdAt' }} ,
                "updatedAt" : 1,
                "glyphImageUrl" : 1,
                "glyphType" : 1,
                "isFromReverseFollowing" : 1,
                "isToReverseFollowing" : 1,
                "isFromAcceptedFollowRequest" : 1,
                "isToAcceptedFollowRequest" : 1, 

            }
        });
        
        var notifications = yield Notifications.aggregate(aggregationQueryString).exec();
        if(!notifications) return res.status(404).json({status: 0, message: "Notifications not found",data: [] });
                        
        return res.status(200).json({status: 1, message: "Notifications found successfully", data: { notifications:notifications }});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data:[]});
    });
}