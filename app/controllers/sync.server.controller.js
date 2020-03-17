/**************************
 MODULE INITIALISATION
 **************************/
const   Contact                         = require('../models/contacts.server.model').contacts,
        ObjectId                        = require('mongodb').ObjectID,
        Follow                          = require('../models/users.server.model').follow,
        User                            = require('../models/users.server.model').user,
        updateFollowerAndFolloweeCount  = require('../controllers/user.server.controller').updateFollowerAndFolloweeCount,
        Notification                    = require('../../configs/notification'),
        Promise                         = require('bluebird'),
        co                              = require('co'),
        _                               = require('lodash'),
        isUserDeleted = require('../../configs/globals').checkWhetherUserIsDeleted;

/**************************
 UPLOAD BULK CONTACTS API
 **************************/
exports.uploadContacts = function (req, res) {
    co(function*(){        
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});
        
        var userId = req.params.userId;
        var syncDeviceId = req.body.deviceId;
        var syncDeviceType = req.body.deviceType;
        var contacts = req.body.contacts;
        res.status(200).json({status: 1, message: "Your contacts will be uploaded shortly", code: 200, data: [] } );
        var dataStatus = yield uploadContactsInBackground(userId, contacts, syncDeviceId, syncDeviceType);
        var notificationObj = {};
        if(dataStatus) {
            notificationObj = {status: 1, message: 'Contacts uploaded successfully'};
        } else {
            notificationObj = {status: 0, message: 'Error while uploading contacts'};
        }        
        yield sendBackgroundNotification(notificationObj, userId);
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}

function uploadContactsInBackground(userId, contacts, deviceId, deviceType) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var finalContacts = [];
            if(!contacts.length) {
                // We will find contacts of any one of user's contacts uploaded from same device id
                var existingContact = yield Contact.findOne({deviceType: deviceType, deviceId: deviceId}, {user: 1}).exec();
                if(existingContact && existingContact.user) {
                    var newContact = {};
                    yield Contact.remove({user: userId, deviceType: deviceType, deviceId: deviceId});
                    contacts = yield Contact.find({deviceType: deviceType, user: existingContact.user, deviceId: deviceId}).exec();
                    if(contacts.length) {
                        yield Promise.each(contacts, co.wrap(function*(contact, key){
                            /*var existingDuplicateContacts = yield Contact.find({user: ObjectId(userId), deviceId: deviceId, deviceType: deviceType,$or:[{email: contact.email},{mobile: contact.mobile}]}).exec();
                            if(existingDuplicateContacts.length) {
                                yield Promise.each(existingDuplicateContacts, co.wrap(function*(duplicatedContact, key){
                                    duplicatedContact.email = contact.email;
                                    duplicatedContact.mobile = contact.mobile;
                                    duplicatedContact.name = contact.name;
                                }));
                            } else {*/
                                newContact.email = contact.email;
                                newContact.name = contact.name;
                                newContact.mobile = contact.mobile
                                newContact.deviceId = deviceId;
                                newContact.deviceType = deviceType;
                                newContact.user = userId;
                                newContact.createdAt = new Date();
                                if(contact.email || contact.mobile) {
                                    var queryArr = [];
                                    if(contact.email && contact.email.trim()) queryArr.push({email: contact.email.trim()});
                                    if(contact.mobile && contact.mobile.trim()) queryArr.push({mobile: contact.mobile.trim()});
                                    if(queryArr.length) {
                                        var contactUser = yield User.findOne({$or: queryArr},{_id: 1, userVerified: 1, deleteStatus: 1}).exec();
                                        if(contactUser && contactUser.userVerified && !contactUser.deleteStatus) {
                                            newContact.contactUser = contactUser._id;
                                            var followObj = yield Follow.findOne({followerId: userId, followeeId: contactUser._id}).exec();
                                            newContact.isFollow = followObj ? (followObj.isValid ? 2 : 1) : 0;
                                        } else {
                                            newContact.isFollow = -1;
                                        }                            
                                    }
                                }
                                finalContacts.push(JSON.parse(JSON.stringify(newContact)));
                            //}
                        }));
                    } else {
                        return resolve({status: 0, message: 'No contacts found'});
                    }
                } else {
                    return resolve({status: 0, message: 'No contacts found'});
                }
            } else {
                yield Contact.remove({user: userId, deviceType: deviceType, deviceId: deviceId});
                yield Promise.each(contacts, co.wrap(function*(contact, key){
                    // var existingContact = yield Contact.count({user: ObjectId(userId), deviceId: deviceId, deviceType: deviceType,$or:[{email: contact.email},{mobile: contact.mobile}]})
                    contact.deviceId = deviceId;
                    contact.deviceType = deviceType;
                    contact.user = userId;
                    if(contact.email || contact.mobile) {
                        var queryArr = [];
                        if(contact.email && contact.email.trim()) queryArr.push({email: contact.email.trim()});
                        if(contact.mobile && contact.mobile.trim()) queryArr.push({mobile: contact.mobile.trim()});
                        if(queryArr.length) {
                            var contactUser = yield User.findOne({$or: queryArr},{_id: 1, userVerified: 1, deleteStatus: 1}).exec();
                            if(contactUser && contactUser.userVerified && !contactUser.deleteStatus) {
                                contact.contactUser = contactUser._id;
                                var followObj = yield Follow.findOne({followerId: userId, followeeId: contactUser._id}).exec();
                                contact.isFollow = followObj ? (followObj.isValid ? 2 : 1) : 0;
                            } else {
                                contact.isFollow = -1;
                            }
                        }
                    }
                    finalContacts.push(JSON.parse(JSON.stringify(contact)));
                }));
            }
            yield Contact.insertMany(finalContacts);
            return resolve({status: 1, messge:"Contacts uploaded successfully"});
        }).catch(function(err){
            return resolve({status: 0, message: "Error while uploading contacts"});
        });
    });
}

function sendBackgroundNotification(notificationObj, userId) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var user = yield User.findOne({_id: ObjectId(userId)},{deviceType: 1, device_token: 1}).exec();
            if(user) {
                var deviceType = user.deviceType;
                var deviceToken = user.device_token;
                yield Notification.backgroundPushNotifcation({deviceType: deviceType, deviceToken: deviceToken, status: notificationObj.status, message: notificationObj.message});
            }
            resolve(1);
        }).catch(function(err){
            reject({errorCode: 500, errorMessage:'Error while sending background notification...'});
        });
    });
}
/**************************
 FETCH CONTACT USERS API 
 **************************/
exports.fetchContacts = function (req, res) {
    co(function*(){        
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});
        
        var userId = req.params.userId;
        var syncDeviceId = req.query.deviceId;
        var syncDeviceType = req.query.deviceType;
        var skip = req.query.offset ? Number(req.query.offset) : 0;
        var limit = req.query.limit ? Number(req.query.limit) : 50;
        var contacts = yield Contact.find({user: ObjectId(userId), deviceId: syncDeviceId, deviceType: syncDeviceType}).sort({isFollow: -1, name: 1, email: 1}).populate('contactUser').skip(skip).limit(limit).exec();
        var contactUsers = [];
        yield Promise.each(contacts, co.wrap(function*(contact, key){
            if(contact.contactUser) {
                contact.contactUser.isFollowed = contact.isFollow;
                contactUsers.push(contact.contactUser);
            } else {
                user = new User();
                delete user._id;
                user.email = contact.email;
                user.name = contact.name;
                user.mobile = contact.mobile;
                user.isFollowed = contact.isFollow;  // -1 means that user with this details does not exists with our app
                contactUsers.push(user);
            }
        }));
        var finalUsers = _.sortBy(contactUsers, function(contactUser){
            return -contactUser.isFollowed;
        });
        var hasMoreRecords = limit > finalUsers.length ? 0 : 1;
        return  res.status(200).json({status: 1, message: "Contacts found successfully", code: 200, data: { contacts: finalUsers, hasMoreRecords: hasMoreRecords} } );
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}

/**************************
 FETCH CONTACTS API
 **************************/
exports.fetchFacebookFriends = function (req, res) {
    co(function*(){
        var userId = req.params.userId;

        var userDeleted = yield isUserDeleted(req.body.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var fbId = req.body.fb_id;
        var incomingFbFriends = req.body.fb_friends;
        var fbFriends = [], user = {};

        if(fbId) {
            var existingFbUser = yield User.findOne({fb_id: fbId},{_id: 1}).exec();
            if(existingFbUser) {
                user = existingFbUser;
                if(existingFbUser._id.toString() !== userId.toString()) {
                    return  res.status(401).json({status: 0, message: "Account with this facebook id is already synced with other account Please try to sync using that account", code: 401, data: { } } );
                }
            } else {
                user = yield User.findOne({_id: ObjectId(userId)}).exec();
                if(!user.fb_id) {
                    user.fb_id = fbId;
                    yield user.save();
                } 
            }            
        } 
        var users = yield User.find({fb_id: {$in: incomingFbFriends}, deleteStatus: false}).exec();
        yield Promise.each(users, co.wrap(function*(user, key){
            if(user) {
                var followObj = yield Follow.findOne({followerId: ObjectId(userId), followeeId: user._id}).exec();
                user.isFollowed = followObj ? (followObj.isValid ? 2 : 1) : 0;
                fbFriends.push(user);
            } /* else {
                user = new User();
                delete user._id;
                user.email = incomingUser.email;
                user.fb_id = incomingUser.fb_id;
                user.mobile = incomingUser.mobile;
                user.isFollowed = -1;  // -1 means that user with this details does not exists with our app
            } */
        }));
        
        var finalFbFriends = _.sortBy(fbFriends, function(friend){
            return -friend.isFollowed;
        });
        return  res.status(200).json({status: 1, message: "Facebook friends found successfully", code: 200, data: { fbFriends: finalFbFriends} } );
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}

/*****************************
 * FOLLOW FB FRIENDS API
 *****************************/
exports.followFacebookFriends = function(req, res) {
    co(function*(){
        var followerId = ObjectId(req.params.userId);

        var userDeleted = yield isUserDeleted(followerId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var deviceType = req.body.deviceType;
        var followeeUsersArr = yield User.find({"fb_id": {$in: req.body.fb_friends}, userVerified: true, deleteStatus: false}).exec();
        yield followUsers(followerId, followeeUsersArr, deviceType);
        return  res.status(200).json({status: 1, message: "Facebook friends followed successfully", code: 200, data: [] } );
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}

/*****************************
 * FOLLOW CONTACTS API
 *****************************/
exports.followContacts = function(req, res) {
    co(function*(){
        var followerId = ObjectId(req.params.userId);

        var userDeleted = yield isUserDeleted(followerId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var deviceId = req.body.deviceId;
        var deviceType = req.body.deviceType;
        console.log(JSON.parse(JSON.stringify(followerId)));
        var contacts = yield Contact.find({user: followerId, deviceId: deviceId, deviceType: deviceType}).exec();
        var emails = _.map(contacts, 'email');
        var mobileNos = _.map(contacts, 'mobile')
        var followeeUsersArr = yield User.find({userVerified: true, deleteStatus: false, $or: [{email: {$in: emails}}, {mobile: {$in: mobileNos}}]}).exec();
        yield followUsers(followerId, followeeUsersArr, deviceType);
        return res.status(200).json({status: 1, message: "Contacts followed successfully", code: 200, data: [] });
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}

/*************************************************
 * COMMON FUNCTION TO SET FOLLOW OF USER 
 * AND SEND NOTIFICATION TO HIM 
 * WITHOUT REJECTING REQUEST IF ERROR OCCURS 
 *************************************************/
function followUsers(followerId, followeeUsersArr, deviceType) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var follower = yield User.findOne({"_id": followerId}, {hash_password: 0}).exec();
    
            if(!follower) return reject({errorCode: 404, errorMessage: "User is not found"});        
            if(!follower.userVerified) return reject({errorCode: 404, errorMessage: "Your account is not verified yet Please verify it using link sent to your email"});   
    
            yield Promise.each(followeeUsersArr, co.wrap(function*(followee, key){
                var followeeId = followee._id;
                if(followeeId.toString() !== followerId.toString()) {
                    var isFollow = 0;
                    var followeeImage = followee.image ? followee.image : followee.fb_profile_pic_url;
        
                    var followObj = yield Follow.find({followeeId: followeeId, followerId: followerId}).exec();
                    isFollow = followObj.length ? (followObj[0].isValid ? 2 : 1) : 0;
                    if(!followObj.length) {
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
                        yield Contact.findOneAndUpdate({user: followerId, contactUser: followeeId},{$set: {isFollow: isFollow}}).exec();
                        var followData = yield newFollow.save();
                        if(followData) { 
                            var checkReverseFollower = yield Follow.find({followeeId: followerId, followerId: followeeId, isValid: true}).exec();
                            //check Followee is already follow//start
                            if(checkReverseFollower.length) {
                                if(followee.isPublic) {
                                    yield Notifications.findOneAndUpdate({toUserID: followerId, fromUserID: followeeId, type: "following"}, {$set: {isToReverseFollowing: true}});
                                } 
                                yield Notifications.findOneAndUpdate({toUserID: followerId, fromUserID: followeeId, type: "following"}, {$set: {isFromReverseFollowing: true,isToAcceptedFollowRequest: true}});              
                            }
                            //end
                            //check Follower is public//start
                            if(follower.isPublic) {
                                yield Notifications.findOneAndUpdate({toUserID: followeeId, fromUserID: followerId, type: "following"}, {$set: {isFromReverseFollowing: true}});
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
                            deviceType = followee.deviceType;
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
                                const fromMessage = followee.isPublic ? 'You are now following ' + followeeName : 'You have sent follow request to ' + followeeName;
                                newNotification.set('fromMessage', fromMessage);
                                var toMessage = followee.isPublic ? followerName + ' is following you' : followerName + ' has sent you a follow request';
                                newNotification.set('toMessage', toMessage);
                                newNotification.set('type', followee.isPublic ? 'following' : 'follow');
                                newNotification.set('isDenied', false);
                                newNotification.set('toUserImageUrl', followeeImage);
                                newNotification.set('fromUserImageUrl', followerImage);
                                newNotification.set('isPublic', followee.isPublic ? true : false);
                                newNotification.set('toName', followeeName);
                                newNotification.set('fromName', followerName);
                                newNotification.set('isFromAcceptedFollowRequest', true);
                                newNotification.set('followUserImageUrl',followerImage);
                                //newNotification.set('isAFollowingB', followee.isPublic ? true : false);  
                                
                                //set accept Follow request//start
                                var followingNotification = yield Notifications.findOneAndUpdate({toUserID:followerId,fromUserID:followeeId, type: "following"}, {$set: {isToAcceptedFollowRequest: true}}, { new: true }).exec();
                                var followNotification = yield Notifications.findOneAndUpdate({toUserID:followerId,fromUserID:followeeId, type: "follow"}, {$set: {isToAcceptedFollowRequest: true}}, { new: true }).exec();
                                
                                if(followingNotification || followNotification) {
                                    newNotification.set('isToAcceptedFollowRequest', true);
                                }
                                var savedNotification = yield newNotification.save();
                                if(!savedNotification) return reject({errorCode: 500, errorMessage: "Error while sending follow notification to user"});
                            }
                            if(followee.isPublic) {
                                yield updateFollowerAndFolloweeCount(followeeId, followerId);
                            }
                
                            yield Notification.pushNotification({ "type": queryParam.type, "glyphThumbnail": followerImage, "glyphType": "image", "device_token": deviceToken, "deviceType": deviceType, "message": toMessage, "name": followeeName,"badge": updatedUser.badge + 1});
                        }            
                    }        
                } 
            }));
            return resolve(1);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            return reject(err);
        });
    });
}