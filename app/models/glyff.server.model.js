/**********************
 SCHEMA INITIALISTAION
 **********************/
const   Schema                      = require('mongoose').Schema;
        Notifications               = require('./notifications.server.model').notifications,
        apn                         = require('apn'),
        Notification                = require('../../configs/notification'),
        Follow                      = require('./users.server.model').follow,
        BlockModel                  = require('./block.server.model'),
        User                        = require('../models/users.server.model').user,
        reportglyff                 = require('./report.server.model').reportglyff,
        ReportGlyffModel            = require('../models/report.server.model'),
        ObjectId                    = require('mongodb').ObjectID,
        Promise                     = require('bluebird'),
        co                          = require('co'),
        moment                      = require('moment'),
        favouriteFactorForHotness   = 10,
        credFactorForHotness        = 1,
        recentFactorForHotness      = 0.5,
        decayRateForHotness         = 0.01,
        decayStartDateForHotness    = moment("2018-07-01"), // Given by Client
        commentFactorForHotness     = 1,
        cloneFactorForHotness       = 10,
        shareFactorForHotness       = 10,
        _                           = require('lodash'),
        saveFactor                  = 10,
        commentFactor               = 10    

/************
 GLYFF SCHEMA
 ************/
 var glyffSchema = new Schema({
    updatedAt:          {
        type: Date,
        default: Date.now
    },
    createdAt:          {
        type: Date,
        default: Date.now
    },
    glyffOriginal:      {type: String, default: ''},
    glyffCustomised:    {type: String, default: ''},
    glyffCustomisedGif: {type: String, default: ''},  // Gif version of glyffCustomised especially for android
    glyffThumbnail:     {type: String, default: ''},
    glyffSticker:       {type: String, default: ''},//New Addtion by jatin glyffsticker
    type:               {type: String, default: ''},
    creatorID:          {type: Schema.Types.ObjectId, ref: 'users' },
    parentID:           {type: Schema.Types.ObjectId, ref: 'users' },
    parentGlyffId:      {type: Schema.Types.ObjectId, ref: 'glyffs' },
    referenceGlyffId:   {type: Schema.Types.ObjectId, ref: 'glyffs' }, // reference id of super parent glyff which first ancestor of this glyff
    creator:            {type: String, default: ''},
    category:           {type: String, default: ''},
    title:              {type: String, default: ''},
    sharedCount:        {type: Number, default: 0},
    trendingCount:      {type: Number, default: 0},
    popularity:         {type: Number, default: 0},
    trendingDirty:      Boolean,
    followerCount:      {type: Number, default: 0},
    followeeCount:      {type: Number, default: 0},
    isPublic:           Boolean,
    isTemplate:         {type: Number, default: 0},
    captionText:        {type: String, default: ''},
    isEditable:         {type: Boolean, default: true},
    editCount:          {type: Number, default: 0},
    commentCount:       {type: Number, default: 0},
    viewCount:          {type: Number, default: 0},
    favouriteCount:     {type: Number, default: 0},
    credNo:             {type: Number, default: 0},
    hotness:            {type: Number, default: 0}, 
    isDeleted:          {type: Boolean, default: false},
    glyffGif:           {type: String, default: ''},
    frameWidth:         {type: Number, default: 0},
    frameHeight:        {type: Number, default: 0},
    borderSize:         {type: Number, default: 0},
    isReaction:         Boolean,
    isSecret:           {type: Boolean, default: false},
    isSignatureEnable:  Boolean,     
    tags:               [{type: String}],
    borderColor:        {type: String, default:'#000000'},
    deviceType:         {type: String, enum: ['ios','android']},
    captions:           [{
        layerId:        {type: Number, default: 0},
        captionText:    {type: String, default: ''},
        fontName:       {type: String, default: ''},
        fontColor:      {type: String, default: '#000000'},
        fontAlpha:      { type: Number, default: 0 },
        fontSize:       {type: Number, default: 0},
        textAlignment:  {type: String, enum: ['left','right','center','justify']},
        backgroundColor:{type: String, default: '#000000'},
        backgroundAlpha: { type: Number, default: 0 },
        xPos:           {type: Number, default: 0},
        yPos:           {type: Number, default: 0}, 
        centerX:        {type: Number, default: 0},
        centerY:        {type: Number, default: 0},
        width:          {type: Number, default: 0},
        height:         {type: Number, default: 0},
        rotateAngle:    {type: Number, default: 0},
        isOutline:      Boolean,
        isTransparent:  Boolean
    }],
    comments: [{
        comment: String,
        commenterId: {type: Schema.Types.ObjectId, ref: 'users' },
        commentedAt: {type: Date, default: Date.now},
        mentionsArr: [{
            startPos: Number,
            endPos: Number,
            mentionId: {type: Schema.Types.ObjectId, ref: 'users' },
        }]
    }],
    clonerIds: [{type: Schema.Types.ObjectId, ref: 'users' }],   // Asked by client to show whether user has cloned this meme or not (to highlight clone icon)
     hotnessEachDay:{type:Array,default:[]}, //This is user for to add the hotness for each day by jatin
     trendingNess:{type:Number,default:0},
     uploadtype:{type:String,default:'meme'},
    // stickerUrl:{type:String,default:""}
    
});

 var glyff = mongoose.model('glyff', glyffSchema);
//  module.exports = {
//     Meme:glyff
// }
exports.Glyff = glyff;
/*********************
 FAVOURITES GLYPH SCHEMA
 *********************/
 var favouriteGlyphsSchema = new Schema({
    userId:   { type: Schema.Types.ObjectId, ref: 'users' },
    glyphId:   { type: Schema.Types.ObjectId, ref: 'glyffs' },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

 var favouriteGlyphs = mongoose.model('favouriteGlyphs', favouriteGlyphsSchema);


/*********************
 SHARE GLYPH SCHEMA
 *********************/
 var shareGlyphsSchema = new Schema({
    userId:   { type: Schema.Types.ObjectId, ref: 'users' },
    glyphId:   { type: Schema.Types.ObjectId, ref: 'glyffs' },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

 var shareGlyphs = mongoose.model('shareGlyphs', shareGlyphsSchema);

 var viewGlyphsSchema = new Schema({
    userId:   { type: Schema.Types.ObjectId, ref: 'users' },
    glyphId:   { type: Schema.Types.ObjectId, ref: 'glyffs' },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

 var viewGlyphs = mongoose.model('viewGlyphs', viewGlyphsSchema);



/*********************
 STICKER SCHEMA
 *********************/
 var stickerSchema = new Schema({
    userId:   { type: Schema.Types.ObjectId, ref: 'users' },
    stickerUrl : { type: String},
    stickerType :{type:String},
     createdAt: {
        type: Date,
        default: Date.now
    }
});

var stickerGlyphs = mongoose.model('stickerGlyphs', stickerSchema);

exports.saveStickerModel = function(data)
{
   
    return new Promise(function(resolve, reject){
        co(function*(){
          
          var sticker = new stickerGlyphs(data);
           
            yield sticker.save();
            resolve(true);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });  
}



exports.getSticker = function(data)
{
   
   return new Promise(function(resolve, reject){
        co(function*(){
            if(data.type == 'mine')
            {
            var stickers = yield stickerGlyphs.find({userId:data.userId,stickerType:'mine'});  
        }
            else  
            {
                 var stickers = yield stickerGlyphs.find({userId:data.userId}).sort({'createdAt':-1});               
            }
            
            
            resolve(stickers);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });  
}



/**************
 EXPORT SCHEMA
 *************/
//  module.exports = {
//     glyff:      glyff
// }

exports.viewGlyphModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var viewGlyph = new viewGlyphs(data);
            yield viewGlyph.save();
            resolve(true);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}
/*****************
 SAVE GLYPH MODEL
 *****************/
exports.saveGlyphModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            if(data.category == 'edit'){
                var parentID = data.parentID;
                var creatorID = data.creatorID;
                var glyffId = data.glyffId;
                
                var status = yield checkEditAccess(glyffId, creatorID, parentID);
                if(status == 'Allow'){
                    var updateStatus = yield addGlyffData(data);
                    yield glyff.findOneAndUpdate({_id: ObjectId(glyffId)}, {$push: {clonerIds: creatorID}}).exec();
                    var glyph = yield updateStatus.save();
                    yield User.findOneAndUpdate({_id: ObjectId(creatorID)},{$inc: { glyffCount: 1 }}).exec();
                    return resolve(glyph);                            
                } else if(status == 'Disallow'){
                    return resolve({message:'You are unable to update this Meme , As Meme is private and you must follow meme creator',status:0});
                } else if(status == 'Error'){
                    return resolve({message:'Oops something went wrong',status:0});
                } else if(status == 'Report'){
                    return resolve({message:'This meme has been reported by you',status:0});
                }
            } else if(data.category == "new"){
                var updateStatus = yield addGlyffData(data);
                var glyph = yield updateStatus.save();
                yield User.findOneAndUpdate({_id: ObjectId(data.creatorID)},{$inc: { glyffCount: 1 }}).exec();
                return resolve(glyph);                          
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/******************************************
 CHECK EDIT ACCESS OF USER TOWARDS GLYFF
 ******************************************/

function checkEditAccess(id, cID, pID) {
    return new Promise(function(resolve, reject) {
        co(function*(){
            var reportedGlyffs = yield checkIfGlyffsReportedByUserAndGlyff(cID, id);
            if(reportedGlyffs) return resolve('Report');

            var glyffs = yield glyff.find({"_id":id}).exec();
            if(!glyffs.length) return resolve('Error');

            var data = glyffs[0];
            if(pID.toString() != data.creatorID.toString()) return resolve('Error');
            if(data.isPublic && pID.toString() == data.parentID.toString()) return resolve('Allow');
            
            if(data.isPublic){
                var status = yield checkEditAccess(data.parentGlyffId, cID, data.parentID);
                return resolve(status);         
            }
            
            if(!data.isPublic){
                var fdata = yield Follow.find({"followeeId":cID,"followerId":pID, "isValid":true}).exec();
                if(!fdata.length) return resolve('Disallow');
                if(pID.toString() == data.parentID.toString()) return resolve('Allow');
                var status = yield checkEditAccess(data.parentGlyffId, cID, data.parentID);
                return resolve(status);                
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/******************************
 SET GLYFF SAVE DATA OBJECT
 ******************************/

function addGlyffData(data){
    return new Promise(function(resolve, reject) {
        co(function*(){
            var isEditable = (data.isEditable) ? data.isEditable : true;

            var newGlyff = new glyff(data);   
            newGlyff.set('followeeCount', 0);
            newGlyff.set('sharedCount', 0);
            newGlyff.set('trendingCount', 0);
            newGlyff.set('followerCount', 0);
            newGlyff.set('glyffCount', 0);
            newGlyff.set('isPublic', true);
            newGlyff.set('isTemplate', 0);
            newGlyff.set('captionText', data.captionText);
            newGlyff.set('isEditable', isEditable);
            if(data.glyffId != undefined && data.glyffId != ''){
                newGlyff.set('parentGlyffId',data.glyffId);    
            }

            if(data.referenceGlyffId != undefined && data.referenceGlyffId != ''){
                newGlyff.set('referenceGlyffId',data.referenceGlyffId);    
            }
    
            data.files.filter(function(ele) {
                if(ele.originalname && ele.location) {
                    var nameImage = ele.originalname.split(".");
                    newGlyff.set(nameImage[0], ele.location);
                }
            });            
            resolve(newGlyff);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**********************
 Fetch GLYPH MODEL
 **********************/
exports.fetchGlyphModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            data.pageSortQuery = data.pageSortQuery || {};
            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if(reportedGlyffs && reportedGlyffs.length && !data.flag){
                data.queryCondition._id = {$nin : reportedGlyffs};
            }
            var aggregationQueryString = [
                // Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 2
                {
                    $lookup: {
                        "from" : "favouriteglyphs",
                        "localField" : "_id",
                        "foreignField" : "glyphId",
                        "as" : "favourite"
                    }
                },
                // Stage 3
                {
                    $lookup: {
                        "from" : "blocks",
                        "localField" : "creatorID",
                        "foreignField" : "blockedId",
                        "as" : "block"
                    }
                },
                // Stage 4
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "creatorID",
                        "foreignField" : "_id",
                        "as" : "user"
                    }
                },
                // Stage 5
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "parentID",
                        "foreignField" : "_id",
                        "as" : "parentUser"
                    }
                },
                // Stage 6
                {
                    $lookup: {
                        "from" : "follows",
                        "localField" : "creatorID",
                        "foreignField" : "followeeId",
                        "as" : "checkFollower"
                    }
                },
                // Stage 7
                {
                    $lookup: {
                        "from" : "votedglyffs",
                        "localField" : "_id",
                        "foreignField" : "glyffId",
                        "as" : "votedGlyffs"
                    }
                },
                {
                    $lookup: {
                        "from" : "reportglyffs",
                        "localField" : "_id",
                        "foreignField" : "glyphId",
                        "as" : "report"
                    }
                },
                // Stage 7_1
                {
                    $lookup: {
                        "from": "shareglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "sharedGlyffs"
                    }
                },
                // Stage 8
                {
                    $project: {
                        "_id" : 1,
                        "isPublic" : 1,
                        "isSecret": { $ifNull: ["$isSecret", false] },
                        "creatorID" : 1,
                        "parentID" : 1,
                        "isEditable" : 1,
                        "captionText" : 1,
                        "isTemplate" : 1,
                        "followeeCount" : 1,
                        "followerCount" : 1,
                        "popularity" : 1,
                        "trendingCount" : 1,
                        "sharedCount" : 1,
                        "title" : 1,
                        "creator" : 1,
                        "type" : 1,
                        "glyffGif": 1,
                        "glyffThumbnail" : 1,
                        "glyffCustomised" : 1,
                        "glyffCustomisedGif" : 1,
                        "referenceGlyffId" : 1,
                        "glyffOriginal" : 1,
                        "createdAt" : 1,
                        "updatedAt" : 1,
                        "editCount" : 1,
                        "commentCount" : 1,
                        "comments": 1,
                        "viewCount" : 1,
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                        "captions": 1,
                        "clonerIds": 1,

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isFavourite" : { $cond: { if: { $gt: [{$size :{ $filter: { input: "$favourite", as: "favourite", cond: { $eq: [ "$$favourite.userId",data.userId ] } } } }, 0 ] }, then: true, else: false } },               
                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.userId] } } } }, 0] }, then: true, else: false } },

                        // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                        "userVote": { "$cond": { if: { "$gt":[ {"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'upvote']},{"$eq":["$$upvotes.userId", data.userId]}] }}}},0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'downvote']},{"$eq":["$$upvotes.userId", data.userId]}] }}}}, 0] }, then: "downvote", else: "" } } } },

                        // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow" : {
                            $cond : { if: { "$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}] }}}}, 0 ] }, then: {$cond : {if: {"$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}, {"$eq":["$$checkFollower.isValid",true]}] }}}}, 0 ]},then: 2,else: 1}}, else: 0 } 
                        },

                        "isCommented" : {
                            $cond : {if: {"$gt": [{ "$size": {"$filter":{input:"$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId",data.userId]}}}}, 0 ]},then: 1,else: 0}
                        },

                        "isCloned" : {
                           $cond : {if: {"$in": [ data.userId, "$clonerIds" ]},then: 1,else: 0}
                        },

                        // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block" : { $filter: { input: "$block", as: "block", cond: { $eq: [ "$$block.blockedById",data.userId ] } } },

                        "isReported" : { $cond: { if: { $eq: [{ $arrayElemAt: [ "$report.glyphId", 0 ] }, "$_id"] }, then: "Yes", else: "No" } },

                        "isBlocked" : { $cond: { if: { $eq: [{ $arrayElemAt: [ "$block.blockedId", 0 ] }, "$creatorId"] }, then: "Yes", else: "No" } },
                        
                        "user" : { $arrayElemAt: [ "$user", 0 ] },
                        "parentUser" : { $arrayElemAt: [ "$parentUser", 0 ] },

                        // Last comment of the glyff                            
                        "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {} } }
                    }
                },
                // Stage 9
                {
                    $match: {
                        "block.blockedById": {$nin: [data.userId]},
                        "user.deleteStatus": false
                    }
                },
                // Stage 9
                {
                    $lookup: {
                        "from": "users",
                        "localField": "lastComment.commenterId",
                        "foreignField": "_id",
                        "as": "commenter"
                    }
                },
                // Stage 10
                {
                    $addFields: {
                        "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                    }
                },
                // Stage 11
                {
                    $project: {
                        "commenter": 0,
                        "lastComment.commenterId.hash_password": 0,
                        "lastComment.commenterId.resetPasswordToken": 0,
                        "lastComment.commenterId.verificationToken": 0
                    }
                }
            ];

            var sortObjArr = [];
            if(data.sortQuery && Object.keys(data.sortQuery).length && data.sortQuery.sortParams !== "newest") {
                var sortParamsMapping = {"hotness": "hotness"};
                var sortParam = sortParamsMapping[data.sortQuery.sortParams];
                var sortOrder = data.sortQuery.sortOrder === "asc" ? 1 : -1;                
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" },                          
                            }
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                } else {
                    sortObjArr = [{
                            $sort: { 
                            }
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                }
            } else {
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" }, 
                                "createdAt" : -1
                            }
                        }                        
                    ];
                } else {
                    sortObjArr = [{
                            $sort: { 
                                "createdAt" : -1
                            }
                        }
                    ];
                }
            }
            if(data.paginationQuery && Object.keys(data.paginationQuery).length) {
                sortObjArr = sortObjArr.concat([
                    {
                        $skip: data.paginationQuery.skip
                    },
                    {
                        $limit: data.paginationQuery.limit
                    }
                ]);
            }
            aggregationQueryString = aggregationQueryString.concat(sortObjArr);
            var glyffs = yield glyff.aggregate(aggregationQueryString).exec();
            resolve(glyffs);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });  
}

/*************************
 Fetch ALL GLYPH MODEL
 *************************/
 
exports.fetchAllGlyphModel = function(data){
    return new Promise(function(resolve, reject){
        co(function*(){
            var userFollows = yield checkIfUserFollows(data.userId, data.currentUserId);
            if(!userFollows && data.userId != data.currentUserId) {
                return resolve({ status: 'Unfollow', message: "The user is Private \nFollow them to view their memes"});
            }
            data.queryCondition = data.queryCondition || {};
            data.pageSortQuery = data.pageSortQuery || {};

            var deletedUsers = yield User.find({ deleteStatus: true }, { _id: 1 });
            var deletedUserIds = _.map(deletedUsers, '_id');

            if (deletedUserIds.length) {
                data.queryCondition.$and.push({ $or: [{ creatorID: { $nin: deletedUserIds } }]});
            }

            var aggregationQueryString = [
                // Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "blocks",
                        "localField": "creatorID",
                        "foreignField": "blockedId",
                        "as": "block"
                    }
                },
                // Stage 3
                {
                    $project: {
                        // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.currentUserId] } } },
                        'hotness': 1,
                        'createdAt': 1
                    }

                },
                // Stage 4
                {
                    $match: {
                        "block.blockedById": { $nin: [data.currentUserId] }
                    }
                }
            ];

            var sortObjArr = [];
            if(data.sortQuery && Object.keys(data.sortQuery).length && data.sortQuery.sortParams !== "newest") {
                var sortParamsMapping = {"hotness": "hotness"};
                var sortParam = sortParamsMapping[data.sortQuery.sortParams];
                var sortOrder = data.sortQuery.sortOrder === "asc" ? 1 : -1;                
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" },                          
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                } else {
                    sortObjArr = [{
                            $sort: { 
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                }
            } else {
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" }, 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }                        
                    ];
                } else {
                    sortObjArr = [{
                            $sort: { 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                    ];
                }
            }
            aggregationQueryString = aggregationQueryString.concat(sortObjArr);
            // console.log(JSON.stringify(aggregationQueryString));
            var allGlyffs = yield glyff.aggregate(aggregationQueryString).exec();
            var allGlyffIds = _.map(allGlyffs, '_id');

            aggregationQueryString = [
                // Stage 1
                {
                    $match: {
                        _id: { $in: allGlyffIds }
                    }
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "favouriteglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "favourite"
                    }
                },
                // // Stage 3
                // {
                //     $lookup: {
                //         "from": "blocks",
                //         "localField": "creatorID",
                //         "foreignField": "blockedId",
                //         "as": "block"
                //     }
                // },
                // Stage 4
                {
                    $lookup: {
                        "from": "users",
                        "localField": "creatorID",
                        "foreignField": "_id",
                        "as": "user"
                    }
                },
                // Stage 5
                {
                    $lookup: {
                        "from": "users",
                        "localField": "parentID",
                        "foreignField": "_id",
                        "as": "parentUser"
                    }
                },
                // Stage 6
                {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                },
                // Stage 7
                {
                    $lookup: {
                        "from": "votedglyffs",
                        "localField": "_id",
                        "foreignField": "glyffId",
                        "as": "votedGlyffs"
                    }
                },
                // Stage 7_1
                {
                    $lookup: {
                        "from": "shareglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "sharedGlyffs"
                    }
                },
                // Stage 11
                {
                    $project: {
                        "_id": 1,
                        //"textSearchScore": { "$meta": "textScore" },
                        "isPublic": 1,
                        "isSecret": { $ifNull: ["$isSecret", false] },
                        "creatorID": 1,
                        "parentID": 1,
                        "isEditable": 1,
                        "captionText": 1,
                        "isTemplate": 1,
                        "followeeCount": 1,
                        "followerCount": 1,
                        "popularity": 1,
                        "trendingCount": 1,
                        "sharedCount": 1,
                        "title": 1,
                        "creator": 1,
                        "type": 1,
                        "glyffGif": 1,
                        "glyffThumbnail": 1,
                        "glyffCustomised": 1,
                        "glyffCustomisedGif": 1,
                        "referenceGlyffId": 1,
                        "glyffOriginal": 1,
                        "glyffSticker":1,
                        "createdAt": 1,
                        "updatedAt": 1,
                        "editCount": 1,
                        "commentCount": 1,
                        "viewCount": 1,
                        "favourite": 1,
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                        "captions": 1,
                        "clonerIds": 1,

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isFavourite": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$favourite", as: "favourite", cond: { $eq: ["$$favourite.userId", data.currentUserId] } } } }, 0] }, then: true, else: false } },

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.currentUserId] } } } }, 0] }, then: true, else: false } },

                        // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                        "userVote": { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'upvote'] }, { "$eq": ["$$upvotes.userId", data.currentUserId] }] } } } }, 0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'downvote'] }, { "$eq": ["$$upvotes.userId", data.currentUserId] }] } } } }, 0] }, then: "downvote", else: "" } } } },

                        // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.currentUserId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.currentUserId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                        },

                        "isCommented": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId", data.currentUserId] } } } }, 0] }, then: 1, else: 0 }
                        },

                        "isCloned": {
                            $cond: { if: { "$in": [data.currentUserId, "$clonerIds"] }, then: 1, else: 0 }
                        },

                        // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        // "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.currentUserId] } } },

                        "user": { $arrayElemAt: ["$user", 0] },
                        "parentUser": { $arrayElemAt: ["$parentUser", 0] },

                        // Last comment of the glyff                            
                        "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {} } }
                    }
                },
                // Stage 9
                {
                    $lookup: {
                        "from": "users",
                        "localField": "lastComment.commenterId",
                        "foreignField": "_id",
                        "as": "commenter"
                    }
                },
                // Stage 10
                {
                    $addFields: {
                        "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                    }
                },
                // Stage 11
                {
                    $project: {
                        "commenter": 0,
                        "lastComment.commenterId.hash_password": 0,
                        "lastComment.commenterId.resetPasswordToken": 0,
                        "lastComment.commenterId.verificationToken": 0
                    }
                }
            ];
            aggregationQueryString = aggregationQueryString.concat(sortObjArr.splice(0,1));
            allGlyffs = yield glyff.aggregate(aggregationQueryString).exec();
            allGlyffs = JSON.parse(JSON.stringify(allGlyffs));

            yield Promise.each(allGlyffs, co.wrap(function* (glifObj, key) {
                glifObj.user.isProfileHidden = glifObj.user.isProfileHidden ? glifObj.user.isProfileHidden : false;
                glifObj.parentUser.isProfileHidden = glifObj.parentUser.isProfileHidden ? glifObj.parentUser.isProfileHidden : false;
                if (!_.isEmpty(glifObj.lastComment)) {
                    glifObj.lastComment.commenterId.isProfileHidden = glifObj.lastComment.commenterId.isProfileHidden ? glifObj.lastComment.commenterId.isProfileHidden : false;
                }
            }));

            resolve(allGlyffs);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*********************************
 Fetch ALL GLYPH MODEL FOR ADMIN
 *********************************/
 
exports.fetchAllGlyphModelForAdmin = function(data){
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            data.pageSortQuery = data.pageSortQuery || {};
            
            var aggregationQueryString = [
                // Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 2
                {
                    $lookup: {
                        "from" : "glyffs",
                        "localField" : "_id",
                        "foreignField" : "referenceGlyffId",
                        "as" : "clones"
                    }
                },
                // Stage 3
                {
                    $lookup: {
                        "from" : "blocks",
                        "localField" : "creatorID",
                        "foreignField" : "blockedId",
                        "as" : "block"
                    }
                },
                {
                    $lookup: {
                        "from" : "reportglyffs",
                        "localField" : "_id",
                        "foreignField" : "glyphId",
                        "as" : "report"
                    }
                },
                // Stage 4
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "creatorID",
                        "foreignField" : "_id",
                        "as" : "user"
                    }
                }            
            ];

            aggregationQueryString = aggregationQueryString.concat([
                // Stage 11
                {
                    $project: {
                        "_id" : 1,
                        //"textSearchScore": { "$meta": "textScore" },
                        "isPublic" : 1,
                        "parentID" : 1,
                        "creatorID" : 1,
                        "parentGlyffId" : 1,
                        "referenceGlyffId" : 1,
                        "glyffGif" : 1,
                        "isDeleted" : 1,
                        "isEditable" : 1,
                        "viewCount" : 1,
                        "editCount" : 1,
                        "captionText" : 1,
                        "captions": 1,
                        "tags": 1,
                        "isTemplate" : 1,
                        "followeeCount" : 1,
                        "followerCount" : 1,
                        "popularity" : 1,
                        "trendingCount" : 1,
                        "sharedCount" : 1,
                        "title" : 1,
                        "category" : 1,
                        "creator" : 1,
                        "type" : 1,
                        "glyffThumbnail" : 1,
                        "glyffCustomised" : 1,
                        "glyffCustomisedGif" : 1,
                        "glyffOriginal" : 1,
                        "createdAt" : 1,
                        "updatedAt" : 1,
                        "hotness": 1,
                        "credNo": 1,
                        "comments" : 1,
                        "commentCount" : 1,
                        "favouriteCount": 1,

                        "clones" : { "$size": { $filter: { input: "$clones", as: "clones", cond: { $eq: [ "$$clones.isDeleted",false ] } } } },

                        "creatorname" : {$arrayElemAt:['$user.name',0]},
                        "creatorUsername" : {$arrayElemAt:['$user.nickname',0]},
                        "originatorname" : {$arrayElemAt:['$user.name',0]}, 

                        "isReported" : { $cond: { if: { $eq: [{ $arrayElemAt: [ "$report.glyphId", 0 ] }, "$_id"] }, then: "Yes", else: "No" } },

                        "isBlocked" : { $cond: { if: { $eq: [{ $arrayElemAt: [ "$block.blockedId", 0 ] }, "$creatorId"] }, then: "Yes", else: "No" } }                  
                    }
                },
                // Stage 12
                {
                    $match: {
                        "block.blockedById": {$nin: [data.currentUserId]},
                    }
                }
            ]);

            aggregationQueryString.push({"$count": "count"});
            var count =  yield glyff.aggregate(aggregationQueryString).exec();
            aggregationQueryString.pop();

            var sortObjArr = [];
            if(data.sortQuery && Object.keys(data.sortQuery).length) {
                var sortParam = data.sortQuery.sortParams;
                var sortOrder = data.sortQuery.sortOrder === "asc" ? 1 : -1;                
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" },                          
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
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
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    if(sortParam !== 'createdAt') {
                        sortObjArr[0].$sort.createdAt = -1;
                    }
                }
            } else {
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" }, 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }                        
                    ];
                } else {
                    sortObjArr = [{
                            $sort: { 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                    ];
                }
            }
            aggregationQueryString = aggregationQueryString.concat(sortObjArr.splice(0, 1));
            // console.log(JSON.stringify(aggregationQueryString));
            var allGlyffs = yield glyff.aggregate(aggregationQueryString).exec();
            resolve({glyffs: allGlyffs, count: count});
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/******************************
 CHECK USER IS FOLLOW OR NOT
 *****************************/
exports.checkIfUserFollows = checkIfUserFollows;
function checkIfUserFollows(userId, currentUserId){
    return new Promise(function(resolve, reject){
        co(function*(){
            if(userId.toString() === currentUserId.toString()){
                return resolve(true);
            }
            var user = yield User.findOne({"_id":userId,"isPublic":true, "userVerified": true}).exec();
            if(user) {      // If public user then resolve true
                return resolve(true);
            } else {        // Else private user. So check if current user follows this private user or not
                var isFollowing = yield Follow.count({"followeeId":userId,"followerId":currentUserId,"isValid":true});
                if(isFollowing) {
                    return resolve(true);
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

/***********************************************
 CHECK ARE GLYFFS IS REPORTED BASE ON USER ID
 ***********************************************/
exports.checkIfGlyffsReportedByUser = checkIfGlyffsReportedByUser;
function checkIfGlyffsReportedByUser(userId){
    return new Promise(function(resolve, reject){
        co(function*(){
            var reportedGlyffs = yield reportglyff.find({$or:[{"userId": userId, 'reportApprovedByAdmin': {$exists: false}}, {"reportApprovedByAdmin": true}]}).exec();
            var reportedGlyffIds = _.map(reportedGlyffs, 'glyphId');
            resolve(reportedGlyffIds);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/********************************
 CHECK WHICH GLYFFS IS DELETED
 *******************************/

function deletedGlyffIds() {
    return new Promise(function(resolve, reject) {
        co(function*(){
            var deletedGlyffs = yield glyff.find({"isDeleted":true}).exec();
            resolve(deletedGlyffs);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/***********************************************************
 CHECK IS GLYFFS IS REPORTED BASE ON USER ID AND GLYFF ID
 ***********************************************************/

function checkIfGlyffsReportedByUserAndGlyff(id,glyphId) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var reportedGlyffCount = yield reportglyff.count({"userId":id,"glyphId":glyphId});
            if(reportedGlyffCount) {
                resolve(true);
            } else {
                resolve(false);
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*********************
 COUNT GLYPH MODEL
 *********************/
exports.countGlyphModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if(reportedGlyffs && reportedGlyffs.length) data.queryCondition._id = {$nin : reportedGlyffs};

            var glyffCount = yield glyff.count(data.queryCondition);
            resolve(glyffCount);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

exports.checkGlyphCount = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var glyffCount = yield User.aggregate([
                // Pipeline Stage 1
                {
                    $match: {
                        "_id":ObjectId(data)
                    }
                },            
                // Stage 2
                {
                    $lookup: {
                        "from" : "glyffs",
                        "localField" : "_id",
                        "foreignField" : "creatorID",
                        "as" : "glyffsdata"
                    }
                },            
                // Stage 3
                {
                    $project: {
        
                        glyffData: {
                            $filter: {
                                input: "$glyffsdata",
                                as: "item",
                                cond: { $eq: [ "$$item.category", "new" ] }
                            }
                        }
                        
                    }
                },            
                // Stage 4
                {
                    $project: {
                        "glyffsCount": { "$size": "$glyffData" }
                    }
                }            
            ]).exec();
            resolve(glyffCount);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**********************
 UPDATE GLYPH MODEL
 **********************/
exports.updateGlyphModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var updatedGlyff = yield glyff.findByIdAndUpdate(data.glyphId, {$set: data.setObject}, { new: true }).exec();
            resolve(updatedGlyff);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/***************************
 AGGREGATION GLYPH MODEL
 **************************/
exports.aggregationFetchGlyphModel = function(data, isTextBasedSearch) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if(reportedGlyffs && reportedGlyffs.length) data.queryCondition._id = {$nin : reportedGlyffs};
            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },    
                // Stage 2
                {
                    $sort: {
                        createdAt: -1
                    }
                },    
                // Stage 3
                {
                    $skip: data.pageSortQuery.skip
                },    
                // Stage 4
                {
                    $limit: data.pageSortQuery.limit
                },    
                // Stage 5
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "creatorID",
                        "foreignField" : "_id",
                        "as" : "user"
                    }
                },    
                // Stage 6
                {
                    $lookup: {
                        "from" : "favouriteglyphs",
                        "localField" : "_id",
                        "foreignField" : "glyphId",
                        "as" : "favourite"
                    }
                },    
                // Stage 7
                {
                    $lookup: {
                        "from" : "blocks",
                        "localField" : "creatorID",
                        "foreignField" : "blockedId",
                        "as" : "block"
                    }
                },    
                // Stage 8
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "parentID",
                        "foreignField" : "_id",
                        "as" : "parentUser"
                    }
                },
                // Stage 9
                {
                    $lookup: {
                        "from" : "follows",
                        "localField" : "creatorID",
                        "foreignField" : "followeeId",
                        "as" : "checkFollower"
                    }
                },
                // Stage 10
                {
                    $lookup: {
                        "from" : "votedglyffs",
                        "localField" : "_id",
                        "foreignField" : "glyffId",
                        "as" : "votedGlyffs"
                    }
                },
                // Stage 11
                {
                    $project: {
                        "_id" : 1,
                        "isPublic" : 1,
                        "creatorID" : 1,
                        "parentID" : 1,
                        "isEditable" : 1,
                        "captionText" : 1,
                        "isTemplate" : 1,
                        "followeeCount" : 1,
                        "followerCount" : 1,
                        "popularity" : 1,
                        "trendingCount" : 1,
                        "sharedCount" : 1,
                        "title" : 1,
                        "creator" : 1,
                        "type" : 1,
                        "glyffGif": 1,
                        "glyffThumbnail" : 1,
                        "glyffCustomised" : 1,
                        "glyffCustomisedGif" : 1,
                        "referenceGlyffId" : 1,
                        "glyffOriginal" : 1,
                        "createdAt" : 1,
                        "updatedAt" : 1,
                        "editCount" : 1,
                        "commentCount" : 1,
                        "viewCount" : 1,
                        "user": { $arrayElemAt: [ "$user", 0 ] },
                        "parentUser" : { $arrayElemAt: [ "$parentUser", 0 ] },
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                        "captions": 1,
                        "clonerIds": 1,

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isFavourite" : { $cond: { if: { $gt: [{$size :{ $filter: { input: "$favourite", as: "favourite", cond: { $eq: [ "$$favourite.userId",data.currentUserId ] } } } }, 0 ] }, then: true, else: false } },

                        // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                        "userVote": { "$cond": { if: { "$gt":[ {"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'upvote']},{"$eq":["$$upvotes.userId", data.currentUserId]}] }}}},0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'downvote']},{"$eq":["$$upvotes.userId", data.currentUserId]}] }}}}, 0] }, then: "downvote", else: "" } } } },                        
                        // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow" : {
                            $cond : { if: { "$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}] }}}}, 0 ] }, then: {$cond : {if: {"$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}, {"$eq":["$$checkFollower.isValid",true]}] }}}}, 0 ]},then: 2,else: 1}}, else: 0 } 
                        },

                        "isCommented" : {
                            $cond : {if: {"$gt": [{ "$size": {"$filter":{input:"$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId",data.currentUserId]}}}}, 0 ]},then: 1,else: 0}
                        },

                        "isCloned" : {
                           $cond : {if: {"$in": [ data.currentUserId, "$clonerIds" ]},then: 1,else: 0}
                        },

                        // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block" : { $filter: { input: "$block", as: "block", cond: { $eq: [ "$$block.blockedById",data.currentUserId ] } } }
                    }
                },    
                // Stage 12
                {
                    $match: {
                        "block.blockedById": {$nin: [data.userId]},
                        "user.deleteStatus": false
                    }
                }
            ];
            if(isTextBasedSearch) {
                aggregationQueryString = aggregationQueryString.concat([
                    // Stage 13
                    {
                        $sort: { score: { $meta: "textScore" } }
                    }
                ]);
            }
            var glyffs = yield glyff.aggregate(aggregationQueryString).exec();
            resolve(glyffs);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/************************************************
 * CHECK WHETHER GLYPH'S USER IS BLOCKED OR NOT
 ************************************************/
exports.checkGlyphUserIsBlockedOrNot = checkGlyphUserIsBlockedOrNot;
function checkGlyphUserIsBlockedOrNot(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var glyph = yield glyff.findOne({_id: data.glyphId},{creatorID:1}).exec();
            var blockCount = yield BlockModel.countBlockModel({blockedId: glyph.creatorID, blockedById: data.userId});
            if(blockCount) {
                resolve(true);
            } else {
                resolve(false);
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/******************************
 SAVE FAVOURITE GLYPHS MODEL
 ******************************/
exports.saveGlyphFavouriteModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var userIsBlocked = yield checkGlyphUserIsBlockedOrNot(data);
            if(userIsBlocked) {
                reject({erroCode: 404, errorMessage: 'No memes to display'});
            } else {
                
                var favouriteGlyph = new favouriteGlyphs(data); 
                yield favouriteGlyph.save();
                resolve(favouriteGlyph);
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/********************************
 REMOVE FAVOURITE GLYPHS MODEL
 ********************************/
exports.removeFavouriteGlyff = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var userIsBlocked = yield checkGlyphUserIsBlockedOrNot(data);
            if(userIsBlocked) {
                reject({errorCode: 404, errorMessage: 'No memes to display'});
            } else {
                yield favouriteGlyphs.remove({ userId: data.userId, glyphId: data.glyphId });
                resolve(true);
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/******************************
 FIND FAVOURITE GLYPHS MODEL
 ******************************/
exports.findGlyphFavouriteModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var reportedGlyffsStatus = yield checkIfGlyffsReportedByUserAndGlyff(data.userId,data.glyphId);
            if(!reportedGlyffsStatus) {
                var favouriteGlyffs = yield favouriteGlyphs.find({userId: data.userId, glyphId: data.glyphId}).exec();
                resolve(favouriteGlyffs);
            } else {
                resolve({message:'You can not mark this meme as favourite, as you have reported this meme',status:'Report'});
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*****************************************************************************************
 AGGREGATION Favourite GLYPH MODEL - COUNT FAVOURITE GLYFFS
 ****************************************************************************************/
exports.getFavouriteCountOfParticularUser = function(data){
    return new Promise(function(resolve, reject){
        co(function*(){
            var favouriteCount = yield favouriteGlyphs.aggregate([                
                {
                    $match: {
                        userId:ObjectId(data)
                    }
                },                
                {
                    $count: "count"
                }
            ]).exec();
            resolve(favouriteCount);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/****************************************************************************************
 AGGREGATION Favourite GLYPH MODEL - FIND FAVOURITE GLYFFS
 ****************************************************************************************/

exports.aggregationFetchFavouriteGlyphModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            
            //Finding favourite glyffs of user
            var favouriteGlyffs = yield favouriteGlyphs.find({userId: data.userId},{glyphId:1}).exec();
            var favouriteGlyffIds = _.map(favouriteGlyffs, 'glyphId');

            var deletedUsers = yield User.find({ deleteStatus: true }, { _id: 1 });
            var deletedUserIds = _.map(deletedUsers, '_id');

            if(favouriteGlyffIds.length) {
                data.queryCondition.$and = [{_id: {$in: favouriteGlyffIds}}];

                if (deletedUserIds.length) 
                    data.queryCondition.creatorID = { $nin: deletedUserIds };

                //Finding Reported glyffs
                var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
                if(reportedGlyffs && reportedGlyffs.length) data.queryCondition.$and.push({_id:{$nin : reportedGlyffs}});
                
                var aggregationQueryString = [
                    // Pipeline Stage 1
                    {
                        $match: data.queryCondition
                    },
                    // Stage 4
                    {
                        $lookup: {
                            "from": "blocks",
                            "localField": "creatorID",
                            "foreignField": "blockedId",
                            "as": "block"
                        }
                    },
                    {
                        $project: {
                            // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                            "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.userId] } } },
                            'hotness': 1,
                            'createdAt': 1
                        }
                    },
                    // Stage 8
                    {
                        $match: {
                            "block.blockedById": { $nin: [data.userId] },
                        }
                    }
                ];

                var sortObjArr = [];
                if(data.sortQuery && Object.keys(data.sortQuery).length && data.sortQuery.sortParams !== "newest") {
                    var sortParamsMapping = {"hotness": "hotness"};
                    var sortParam = sortParamsMapping[data.sortQuery.sortParams];
                    var sortOrder = data.sortQuery.sortOrder === "asc" ? 1 : -1;                
                    if(data.isTextBasedSearch) {
                        sortObjArr = [{
                                $sort: {
                                    "score": { $meta: "textScore" },                          
                                }
                            },
                            {
                                $skip: data.paginationQuery.skip
                            },
                            {
                                $limit: data.paginationQuery.limit
                            }
                        ];
                        eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                        sortObjArr[0].$sort.createdAt = -1;
                    } else {
                        sortObjArr = [{
                                $sort: { 
                                }
                            },
                            {
                                $skip: data.paginationQuery.skip
                            },
                            {
                                $limit: data.paginationQuery.limit
                            }
                        ];
                        eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                        sortObjArr[0].$sort.createdAt = -1;
                    }
                } else {
                    if(data.isTextBasedSearch) {
                        sortObjArr = [{
                                $sort: {
                                    "score": { $meta: "textScore" }, 
                                    "createdAt" : -1
                                }
                            },
                            {
                                $skip: data.paginationQuery.skip
                            },
                            {
                                $limit: data.paginationQuery.limit
                            }                        
                        ];
                    } else {
                        sortObjArr = [{
                                $sort: { 
                                    "createdAt" : -1
                                }
                            },
                            {
                                $skip: data.paginationQuery.skip
                            },
                            {
                                $limit: data.paginationQuery.limit
                            }
                        ];
                    }
                }
                aggregationQueryString = aggregationQueryString.concat(sortObjArr);
                
                favouriteGlyffs = yield glyff.aggregate(aggregationQueryString).exec();

                var favGlyffIds = _.map(favouriteGlyffs, '_id');
                aggregationQueryString = [
                    // Stage 1
                    {
                        $match: {
                            _id: { $in: favGlyffIds }
                        }
                    },
                    // Stage 2
                    {
                        $lookup: {
                            "from": "users",
                            "localField": "creatorID",
                            "foreignField": "_id",
                            "as": "user"
                        }
                    },
                    // Stage 3
                    {
                        $lookup: {
                            "from": "users",
                            "localField": "parentID",
                            "foreignField": "_id",
                            "as": "parentUser"
                        }
                    },
                    // Stage 5
                    {
                        $lookup: {
                            "from": "follows",
                            "localField": "creatorID",
                            "foreignField": "followeeId",
                            "as": "checkFollower"
                        }
                    },
                    // Stage 6
                    {
                        $lookup: {
                            "from": "votedglyffs",
                            "localField": "_id",
                            "foreignField": "glyffId",
                            "as": "votedGlyffs"
                        }
                    },
                    // Stage 7_1
                    {
                        $lookup: {
                            "from": "shareglyphs",
                            "localField": "_id",
                            "foreignField": "glyphId",
                            "as": "sharedGlyffs"
                        }
                    },
                    // Stage 7
                    {
                        $project: {
                            "_id": 1,
                            "isPublic": 1,
                            "parentID": 1,
                            "creatorID": 1,
                            "isDeleted": 1,
                            "viewCount": 1,
                            "editCount": 1,
                            "isEditable": 1,
                            "captionText": 1,
                            "isTemplate": 1,
                            "followeeCount": 1,
                            "followerCount": 1,
                            "popularity": 1,
                            "trendingCount": 1,
                            "sharedCount": 1,
                            "title": 1,
                            "category": 1,
                            "creator": 1,
                            "type": 1,
                            "glyffGif": 1,
                            "glyffThumbnail": 1,
                            "glyffCustomised": 1,
                            "glyffCustomisedGif": 1,
                            "referenceGlyffId": 1,
                            "glyffOriginal": 1,
                            "createdAt": 1,
                            "updatedAt": 1,
                            "favouriteCount": 1,
                            "credNo": 1,
                            "hotness": 1,
                            "frameWidth": 1,
                            "frameHeight": 1,
                            "isReaction": 1,
                            "isSignatureEnable": 1,
                            "borderSize": 1,
                            "borderColor": 1,
                            "deviceType": 1,
                            "tags": 1,
                            "captions": 1,
                            "clonerIds": 1,

                            // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                            "isFavourite": { "$cond": { if: 1, then: true, else: true } },

                            // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                            "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.userId] } } } }, 0] }, then: true, else: false } },

                            // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                            "userVote": { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'upvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'downvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "downvote", else: "" } } } },

                            // isFollow is a flag which shows whether current user is following glyph creator or not
                            "isFollow": {
                                $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                            },

                            "isCommented": {
                                $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId", data.userId] } } } }, 0] }, then: 1, else: 0 }
                            },

                            "isCloned": {
                                $cond: { if: { "$in": [data.userId, "$clonerIds"] }, then: 1, else: 0 }
                            },

                            "user": { $arrayElemAt: ["$user", 0] },
                            "parentUser": { $arrayElemAt: ["$parentUser", 0] },

                            // Last comment of the glyff                            
                            "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {} } }
                        }
                    },
                    // Stage 9
                    {
                        $lookup: {
                            "from": "users",
                            "localField": "lastComment.commenterId",
                            "foreignField": "_id",
                            "as": "commenter"
                        }
                    },
                    // Stage 10
                    {
                        $addFields: {
                            "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                        }
                    },
                    // Stage 11
                    {
                        $project: {
                            "commenter": 0,
                            "lastComment.commenterId.hash_password": 0,
                            "lastComment.commenterId.resetPasswordToken": 0,
                            "lastComment.commenterId.verificationToken": 0
                        }
                    }
                ];

                if (sortObjArr.length && sortObjArr[0].$sort.score)
                    delete sortObjArr[0].$sort.score;

                aggregationQueryString = aggregationQueryString.concat(sortObjArr);
                favouriteGlyffs = yield glyff.aggregate(aggregationQueryString).exec();
                favouriteGlyffs = JSON.parse(JSON.stringify(favouriteGlyffs));

                yield Promise.each(favouriteGlyffs, co.wrap(function* (glifObj, key) {
                    glifObj.user.isProfileHidden = glifObj.user.isProfileHidden ? glifObj.user.isProfileHidden : false;
                    glifObj.parentUser.isProfileHidden = glifObj.parentUser.isProfileHidden ? glifObj.parentUser.isProfileHidden : false;
                    if (!_.isEmpty(glifObj.lastComment)) {
                        glifObj.lastComment.commenterId.isProfileHidden = glifObj.lastComment.commenterId.isProfileHidden ? glifObj.lastComment.commenterId.isProfileHidden : false;
                    }
                }));

                resolve(favouriteGlyffs);
            } else {
                reject({ errorCode: 404, errorMessage: "Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply"});
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*******************************
 COUNT Favourite GLYPH MODEL
 ******************************/
exports.countFavouriteGlyphModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var query = {userId:data.queryCondition.userId};
            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.queryCondition.userId);
            if(reportedGlyffs && reportedGlyffs.length) query.glyphId = {$nin : reportedGlyffs};

            var favouriteCount = yield favouriteGlyphs.count(query);
            resolve(favouriteCount);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*************************
 COUNT Share GLYPH MODEL
 *************************/
exports.countShareGlyphModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var query = {userId:data.userId};
            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if(reportedGlyffs && reportedGlyffs.length) query.glyphId = {$nin : reportedGlyffs};

            var sharedCount = yield shareGlyphs.count(query);
            resolve(sharedCount);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**********************
 SHARE GLYPHS MODEL
 **********************/
exports.shareGlyphModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var shareGlyph = new shareGlyphs(data);
            yield shareGlyph.save();
            resolve(true);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*********************
 NOTIFICATIONS MODEL
 *********************/
exports.notificationModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var newNotification = new Notifications();
        
            newNotification.set('toUserID', data.toUserID);
            newNotification.set('fromUserID', data.fromUserID);
            newNotification.set('glyffId', data.glyffId);
            newNotification.set('fromMessage', data.fromMessage);
            newNotification.set('toMessage', data.toMessage);
            newNotification.set('type', data.type);
            newNotification.set('toUserImageUrl', data.toUserImageUrl);
            newNotification.set('fromUserImageUrl', data.fromUserImageUrl);
            newNotification.set('glyphImageUrl', data.glyphImageUrl);
            newNotification.set('isPublic', data.isPublic);
            newNotification.set('toName', data.toName);
            newNotification.set('fromName', data.fromName);
            newNotification.set('glyphType', data.glyphType);
            yield newNotification.save();
            resolve(true);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**************************
 PUSH NOTIFICATIONS MODEL
 **************************/
exports.pushNotificationModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var fromUserImageUrl = data.fromUserImageUrl || '';
            var pushNotificationResponse = yield Notification.pushNotification({"type": data.type,"fromUserImageUrl":fromUserImageUrl,"glyphType": data.glyphType, "glyphThumbnail": data.imageUrl , "device_token": data.device_token, "deviceType":data.deviceType, "message": data.message, "name": data.name,"badge":data.badge});
            resolve(pushNotificationResponse);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**************************
 FETCH FOLLOWEES MODEL
 **************************/
exports.fetchFolloweesModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var followees = yield Follow.aggregate([
                // Pipeline Stage 1
                {
                    $match: {
                        "followeeId": data.followeeId,
                        "isValid": true
                    }
                },        
                // Stage 2
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "followerId",
                        "foreignField" : "_id",
                        "as" : "user"
                    }
                },        
                // Stage 3
                {
                    $match: {
                        user: {
                            $elemMatch: {
                                push_notifications: {
                                    $elemMatch: data.push_notification
                                }
                            }
                        }
                    }
                },        
                // Stage 4
                {
                    $project: {
                        "_id" : 1,
                        "isValid" : 1,
                        "followerId" : 1,
                        "followeeId" : 1,
                        "createdAt" : 1,
                        "user" : { $arrayElemAt: [ "$user", 0 ] }
                    }
                }        
            ]).exec();
            resolve(followees);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

exports.fetchAllGlifModel = function(requestObj){
    return new Promise(function(resolve, reject){
        co(function*(){
            var adminId = ObjectId("5a59cae13e2aa66d71f4df7c");
           
            var aggregationQueryString 
           // console.log(requestObj,'requestObj')
            //checked condition for sorting in admin panel
            if(requestObj.sortQuery && Object.keys(requestObj.sortQuery).length)
            {
            if(requestObj.sortQuery.sortParams === 'isReported')
            {
                console.log('isReported')
                aggregationQueryString = [
                    // Stage 1
                    {
                        $match: requestObj.queryCondition
                    },
                    { 
                        "$lookup" : {
                            "from" : "users", 
                            "localField" : "creatorID", 
                            "foreignField" : "_id", 
                            "as" : "creatorDetail"
                        }
                    },
                        {
                        $lookup: {
                            "from": "reportglyffs",
                            "localField": "_id",
                            "foreignField": "glyphId",
                            "as": "report"
                        }
                    }, 
                    // {
                    //     $lookup: {
                    //         "from": "blocks",
                    //         "localField": "blockedId",
                    //         "foreignField": "creatorID",
                    //         "as": "block"
                    //     }
                    // },
                    // {
                    //     $lookup: {
                    //         "from": "favouriteglyphs",
                    //         "localField": "_id",
                    //         "foreignField": "glyphId",
                    //         "as": "favourites"
                    //     }
                    // },
                     {
                        $unwind: {
                            path: "$report",
                            preserveNullAndEmptyArrays: true // optional
                        }
                    },
                    // Stage 6
                    // {
                    //     $unwind: {
                    //         path: "$block",
                    //         preserveNullAndEmptyArrays: true // optional
                    //     }
                    // },
                    {
                        $group: {
                            _id: "$_id",
                            report: { $addToSet: '$report' },
                          //  block: { $addToSet: '$block' },
                            doc: { $first: '$$ROOT' }
                        }
                    },
                    { 
                        "$project" : {
                            "isPublic": '$doc.isPublic',
                            "parentID": '$doc.parentID',
                            "creatorID": '$doc.creatorID',
                            "parentGlyffId": '$doc.parentGlyffId',
                            "referenceGlyffId": '$doc.referenceGlyffId',
                            "glyffGif": '$doc.glyffGif',
                            "isDeleted": '$doc.isDeleted',
                            "isEditable": '$doc.isEditable',
                            "captionText": '$doc.captionText',
                            "captions": "$doc.captions",
                            "tags": "$doc.tags",
                            "isTemplate": '$doc.isTemplate',
                            "popularity": '$doc.popularity',
                            "title": '$doc.title',
                            "category": '$doc.category',
                            "creator": '$doc.creator',
                            "type": '$doc.type',
                            "glyffThumbnail": '$doc.glyffThumbnail',
                            "glyffCustomised": '$doc.glyffCustomised',
                            "glyffCustomisedGif": "$doc.glyffCustomisedGif",
                            "glyffOriginal": '$doc.glyffOriginal',
                            "comments": "$doc.comments",
                            "creatorname": { $arrayElemAt: ['$doc.creatorDetail', 0] },
                            "creatorUsername": { $arrayElemAt: ['$doc.creatorDetail', 0] },
                            "parentGlyffId" : "$doc.parentGlyffId", 
                            "createdAt" : "$doc.createdAt", 
                            "updatedAt" : "$doc.updatedAt", 
                            "hotness" : "$doc.hotness", 
                            "credNo" : "$doc.credNo", 
                            "commentCount" : "$doc.commentCount",
                            "isReported": { $cond: { if: { $and: [{ $eq: [{ $arrayElemAt: ["$report.glyphId", 0] }, "$_id"] }, { $ne: [{ $arrayElemAt: ["$report.userId", 0] }, adminId] }] }, then: "Yes", else: "No" } },
                            //"isBlocked": { $cond: { if: { $eq: [{ $arrayElemAt: ["$report.reportApprovedByAdmin", 0] }, true] }, then: "Yes", else: "No" } },
                         
                        }
                    },
                    { 
                        "$project" : {
                            "isPublic": '$isPublic',
                            "parentID": '$parentID',
                            "creatorID": '$creatorID',
                            "parentGlyffId": '$parentGlyffId',
                            "referenceGlyffId": '$referenceGlyffId',
                            "glyffGif": '$glyffGif',
                            "isDeleted": '$isDeleted',
                            "isEditable": '$isEditable',
                            "captionText": '$captionText',
                            "captions": "$captions",
                            "tags": "$tags",
                            "isTemplate": '$isTemplate',
                            "popularity": '$popularity',
                            "title": '$title',
                            "category": '$category',
                            "creator": '$creator',
                            "type": '$type',
                            "glyffThumbnail": '$glyffThumbnail',
                            "glyffCustomised": '$glyffCustomised',
                            "glyffCustomisedGif": "$glyffCustomisedGif",
                            "glyffOriginal": '$glyffOriginal',
                            "comments": "$comments",
                            "creatorname": '$creatorname.name' ,
                            "creatorUsername": '$creatorname.nickname',
                            "parentGlyffId" : "$parentGlyffId", 
                            "createdAt" : "$createdAt", 
                            "updatedAt" : "$updatedAt", 
                            "hotness" : "$hotness", 
                            "credNo" : "$credNo", 
                            "type": '$type',
                            "commentCount" : "$commentCount",
                        //    // "favouritesCount": { "$size": "$doc.favourites" },
                            "isReported": { $cond: { if: { $and: [{ $eq: [{ $arrayElemAt: ["$report.glyphId", 0] }, "$_id"] }, { $ne: [{ $arrayElemAt: ["$report.userId", 0] }, adminId] }] }, then: "Yes", else: "No" } },
                        //     "isBlocked": { $cond: { if: { $eq: [{ $arrayElemAt: ["$report.reportApprovedByAdmin", 0] }, true] }, then: "Yes", else: "No" } },
                         
                        }
                    }    
                 
                ];
            }
            if(requestObj.sortQuery.sortParams === 'isBlocked')
             {
                         console.log('isBlocked')
                    aggregationQueryString = [
                        // Stage 1
                        {
                            $match: requestObj.queryCondition
                        },
                        { 
                            "$lookup" : {
                                "from" : "users", 
                                "localField" : "creatorID", 
                                "foreignField" : "_id", 
                                "as" : "creatorDetail"
                            }
                        },
                        //     {
                        //     $lookup: {
                        //         "from": "reportglyffs",
                        //         "localField": "_id",
                        //         "foreignField": "glyphId",
                        //         "as": "report"
                        //     }
                        // }, 
                        {
                            $lookup: {
                                "from": "blocks",
                                "localField": "blockedId",
                                "foreignField": "creatorID",
                                "as": "block"
                            }
                        },
                        // {
                        //     $lookup: {
                        //         "from": "favouriteglyphs",
                        //         "localField": "_id",
                        //         "foreignField": "glyphId",
                        //         "as": "favourites"
                        //     }
                        // },
                        //  {
                        //     $unwind: {
                        //         path: "$report",
                        //         preserveNullAndEmptyArrays: true // optional
                        //     }
                        // },
                        // Stage 6
                        {
                            $unwind: {
                                path: "$block",
                                preserveNullAndEmptyArrays: true // optional
                            }
                        },
                        {
                            $group: {
                                _id: "$_id",
                            // report: { $addToSet: '$report' },
                                block: { $addToSet: '$block' },
                                doc: { $first: '$$ROOT' }
                            }
                        },
                        { 
                            "$project" : {
                                "isPublic": '$doc.isPublic',
                                "parentID": '$doc.parentID',
                                "creatorID": '$doc.creatorID',
                                "parentGlyffId": '$doc.parentGlyffId',
                                "referenceGlyffId": '$doc.referenceGlyffId',
                                "glyffGif": '$doc.glyffGif',
                                "isDeleted": '$doc.isDeleted',
                                "isEditable": '$doc.isEditable',
                                "captionText": '$doc.captionText',
                                "captions": "$doc.captions",
                                "tags": "$doc.tags",
                                "isTemplate": '$doc.isTemplate',
                                "popularity": '$doc.popularity',
                                "title": '$doc.title',
                                "category": '$doc.category',
                                "creator": '$doc.creator',
                                "type": '$doc.type',
                                "glyffThumbnail": '$doc.glyffThumbnail',
                                "glyffCustomised": '$doc.glyffCustomised',
                                "glyffCustomisedGif": "$doc.glyffCustomisedGif",
                                "glyffOriginal": '$doc.glyffOriginal',
                                "comments": "$doc.comments",
                                "creatorname": { $arrayElemAt: ['$doc.creatorDetail', 0] },
                                "creatorUsername": { $arrayElemAt: ['$doc.creatorDetail', 0] },
                                "parentGlyffId" : "$doc.parentGlyffId", 
                                "createdAt" : "$doc.createdAt", 
                                "updatedAt" : "$doc.updatedAt", 
                                "hotness" : "$doc.hotness", 
                                "credNo" : "$doc.credNo", 
                                "commentCount" : "$doc.commentCount",
                            //    "isReported": { $cond: { if: { $and: [{ $eq: [{ $arrayElemAt: ["$report.glyphId", 0] }, "$_id"] }, { $ne: [{ $arrayElemAt: ["$report.userId", 0] }, adminId] }] }, then: "Yes", else: "No" } },
                            "isBlocked": { $cond: { if: { $eq: [{ $arrayElemAt: ["$report.reportApprovedByAdmin", 0] }, true] }, then: "Yes", else: "No" } },
                            
                            }
                        },
                        { 
                            "$project" : {
                                "isPublic": '$isPublic',
                                "parentID": '$parentID',
                                "creatorID": '$creatorID',
                                "parentGlyffId": '$parentGlyffId',
                                "referenceGlyffId": '$referenceGlyffId',
                                "glyffGif": '$glyffGif',
                                "isDeleted": '$isDeleted',
                                "isEditable": '$isEditable',
                                "captionText": '$captionText',
                                "captions": "$captions",
                                "tags": "$tags",
                                "isTemplate": '$isTemplate',
                                "popularity": '$popularity',
                                "title": '$title',
                                "category": '$category',
                                "creator": '$creator',
                                "type": '$type',
                                "glyffThumbnail": '$glyffThumbnail',
                                "glyffCustomised": '$glyffCustomised',
                                "glyffCustomisedGif": "$glyffCustomisedGif",
                                "glyffOriginal": '$glyffOriginal',
                                "comments": "$comments",
                                "creatorname": '$creatorname.name' ,
                                "creatorUsername": '$creatorname.nickname',
                                "parentGlyffId" : "$parentGlyffId", 
                                "createdAt" : "$createdAt", 
                                "updatedAt" : "$updatedAt", 
                                "hotness" : "$hotness", 
                                "credNo" : "$credNo", 
                                "type": '$type',
                                "commentCount" : "$commentCount",
                            //    // "favouritesCount": { "$size": "$doc.favourites" },
                            // "isReported": { $cond: { if: { $and: [{ $eq: [{ $arrayElemAt: ["$report.glyphId", 0] }, "$_id"] }, { $ne: [{ $arrayElemAt: ["$report.userId", 0] }, adminId] }] }, then: "Yes", else: "No" } },
                                "isBlocked": { $cond: { if: { $eq: [{ $arrayElemAt: ["$report.reportApprovedByAdmin", 0] }, true] }, then: "Yes", else: "No" } },
                            
                            }
                        }    
                    
                    ];
             }
             if(requestObj.sortQuery.sortParams == 'favouritesCount') 
             {
                         console.log('favouritesCount')
                    aggregationQueryString = [
                        // Stage 1
                        {
                            $match: requestObj.queryCondition
                        },
                        { 
                            "$lookup" : {
                                "from" : "users", 
                                "localField" : "creatorID", 
                                "foreignField" : "_id", 
                                "as" : "creatorDetail"
                            }
                        },
                        //     {
                        //     $lookup: {
                        //         "from": "reportglyffs",
                        //         "localField": "_id",
                        //         "foreignField": "glyphId",
                        //         "as": "report"
                        //     }
                        // }, 
                        // {
                        //     $lookup: {
                        //         "from": "blocks",
                        //         "localField": "blockedId",
                        //         "foreignField": "creatorID",
                        //         "as": "block"
                        //     }
                        // },
                        {
                            $lookup: {
                                "from": "favouriteglyphs",
                                "localField": "_id",
                                "foreignField": "glyphId",
                                "as": "favourites"
                            }
                        },
                        //  {
                        //     $unwind: {
                        //         path: "$report",
                        //         preserveNullAndEmptyArrays: true // optional
                        //     }
                        // },
                        // Stage 6
                        // {
                        //     $unwind: {
                        //         path: "$block",
                        //         preserveNullAndEmptyArrays: true // optional
                        //     }
                        // },
                        {
                            $group: {
                                _id: "$_id",
                            // report: { $addToSet: '$report' },
                             //   block: { $addToSet: '$block' },
                                doc: { $first: '$$ROOT' }
                            }
                        },
                        { 
                            "$project" : {
                                "isPublic": '$doc.isPublic',
                                "parentID": '$doc.parentID',
                                "creatorID": '$doc.creatorID',
                                "parentGlyffId": '$doc.parentGlyffId',
                                "referenceGlyffId": '$doc.referenceGlyffId',
                                "glyffGif": '$doc.glyffGif',
                                "isDeleted": '$doc.isDeleted',
                                "isEditable": '$doc.isEditable',
                                "captionText": '$doc.captionText',
                                "captions": "$doc.captions",
                                "tags": "$doc.tags",
                                "isTemplate": '$doc.isTemplate',
                                "popularity": '$doc.popularity',
                                "title": '$doc.title',
                                "category": '$doc.category',
                                "creator": '$doc.creator',
                                "type": '$doc.type',
                                "glyffThumbnail": '$doc.glyffThumbnail',
                                "glyffCustomised": '$doc.glyffCustomised',
                                "glyffCustomisedGif": "$doc.glyffCustomisedGif",
                                "glyffOriginal": '$doc.glyffOriginal',
                                "comments": "$doc.comments",
                                "creatorname": { $arrayElemAt: ['$doc.creatorDetail', 0] },
                                "creatorUsername": { $arrayElemAt: ['$doc.creatorDetail', 0] },
                                "parentGlyffId" : "$doc.parentGlyffId", 
                                "createdAt" : "$doc.createdAt", 
                                "updatedAt" : "$doc.updatedAt", 
                                "hotness" : "$doc.hotness", 
                                "credNo" : "$doc.credNo", 
                                "commentCount" : "$doc.commentCount",
                              "favouritesCount": { "$size": "$doc.favourites" },
                            //    "isReported": { $cond: { if: { $and: [{ $eq: [{ $arrayElemAt: ["$report.glyphId", 0] }, "$_id"] }, { $ne: [{ $arrayElemAt: ["$report.userId", 0] }, adminId] }] }, then: "Yes", else: "No" } },
                           //"isBlocked": { $cond: { if: { $eq: [{ $arrayElemAt: ["$report.reportApprovedByAdmin", 0] }, true] }, then: "Yes", else: "No" } },
                            
                            }
                        },
                        { 
                            "$project" : {
                                "isPublic": '$isPublic',
                                "parentID": '$parentID',
                                "creatorID": '$creatorID',
                                "parentGlyffId": '$parentGlyffId',
                                "referenceGlyffId": '$referenceGlyffId',
                                "glyffGif": '$glyffGif',
                                "isDeleted": '$isDeleted',
                                "isEditable": '$isEditable',
                                "captionText": '$captionText',
                                "captions": "$captions",
                                "tags": "$tags",
                                "isTemplate": '$isTemplate',
                                "popularity": '$popularity',
                                "title": '$title',
                                "category": '$category',
                                "creator": '$creator',
                                "type": '$type',
                                "glyffThumbnail": '$glyffThumbnail',
                                "glyffCustomised": '$glyffCustomised',
                                "glyffCustomisedGif": "$glyffCustomisedGif",
                                "glyffOriginal": '$glyffOriginal',
                                "comments": "$comments",
                                "creatorname": '$creatorname.name' ,
                                "creatorUsername": '$creatorname.nickname',
                                "parentGlyffId" : "$parentGlyffId", 
                                "createdAt" : "$createdAt", 
                                "updatedAt" : "$updatedAt", 
                                "hotness" : "$hotness", 
                                "credNo" : "$credNo", 
                                "type": '$type',
                                "commentCount" : "$commentCount",
                               "favouritesCount":  "$favourites" ,
                            // "isReported": { $cond: { if: { $and: [{ $eq: [{ $arrayElemAt: ["$report.glyphId", 0] }, "$_id"] }, { $ne: [{ $arrayElemAt: ["$report.userId", 0] }, adminId] }] }, then: "Yes", else: "No" } },
                               // "isBlocked": { $cond: { if: { $eq: [{ $arrayElemAt: ["$report.reportApprovedByAdmin", 0] }, true] }, then: "Yes", else: "No" } },
                            
                            }
                        }    
                    
                    ];
             } 
             if(requestObj.sortQuery.sortParams == 'clones')
             {
                         console.log('clones')
                    aggregationQueryString = [
                        // Stage 1
                        {
                            $match: requestObj.queryCondition
                        },
                        { 
                            "$lookup" : {
                                "from" : "users", 
                                "localField" : "creatorID", 
                                "foreignField" : "_id", 
                                "as" : "creatorDetail"
                            }
                        },
                        // //     {
                        //     $lookup: {
                        //         "from": "reportglyffs",
                        //         "localField": "_id",
                        //         "foreignField": "glyphId",
                        //         "as": "report"
                        //     }
                        // }, 
                        // {
                        //     $lookup: {
                        //         "from": "blocks",
                        //         "localField": "blockedId",
                        //         "foreignField": "creatorID",
                        //         "as": "block"
                        //     }
                        // },
                        {
                            $lookup: {
                                "from": "glyffs",
                                "localField": "_id",
                                "foreignField": "referenceGlyffId",
                                "as": "clones"
                            }
                        },
                        //  {
                        //     $unwind: {
                        //         path: "$report",
                        //         preserveNullAndEmptyArrays: true // optional
                        //     }
                        // },
                        // Stage 6
                        // {
                        //     $unwind: {
                        //         path: "$block",
                        //         preserveNullAndEmptyArrays: true // optional
                        //     }
                        // },
                        // {
                        //     $group: {
                        //         _id: "$_id",
                        //     // report: { $addToSet: '$report' },
                        //      //   block: { $addToSet: '$block' },
                        //         doc: { $first: '$$ROOT' }
                        //     }
                        // },
                        { 
                            "$project" : {
                                "isPublic": '$doc.isPublic',
                                "parentID": '$doc.parentID',
                                "creatorID": '$doc.creatorID',
                                "parentGlyffId": '$doc.parentGlyffId',
                                "referenceGlyffId": '$doc.referenceGlyffId',
                                "glyffGif": '$doc.glyffGif',
                                "isDeleted": '$doc.isDeleted',
                                "isEditable": '$doc.isEditable',
                                "captionText": '$doc.captionText',
                                "captions": "$doc.captions",
                                "tags": "$doc.tags",
                                "isTemplate": '$doc.isTemplate',
                                "popularity": '$doc.popularity',
                                "title": '$doc.title',
                                "category": '$doc.category',
                                "creator": '$doc.creator',
                                "type": '$doc.type',
                                "glyffThumbnail": '$doc.glyffThumbnail',
                                "glyffCustomised": '$doc.glyffCustomised',
                                "glyffCustomisedGif": "$doc.glyffCustomisedGif",
                                "glyffOriginal": '$doc.glyffOriginal',
                                "comments": "$doc.comments",
                                "creatorname": { $arrayElemAt: ['$doc.creatorDetail', 0] },
                                "creatorUsername": { $arrayElemAt: ['$doc.creatorDetail', 0] },
                                "parentGlyffId" : "$doc.parentGlyffId", 
                                "createdAt" : "$doc.createdAt", 
                                "updatedAt" : "$doc.updatedAt", 
                                "hotness" : "$doc.hotness", 
                                "credNo" : "$doc.credNo", 
                                "commentCount" : "$doc.commentCount",
                                "clones": { "$size": { $filter: { input: "$clones", as: "clones", cond: { $eq: ["$$clones.isDeleted", false] } } } },
                              //"favouritesCount": { "$size": "$doc.favourites" },
                            //    "isReported": { $cond: { if: { $and: [{ $eq: [{ $arrayElemAt: ["$report.glyphId", 0] }, "$_id"] }, { $ne: [{ $arrayElemAt: ["$report.userId", 0] }, adminId] }] }, then: "Yes", else: "No" } },
                           //"isBlocked": { $cond: { if: { $eq: [{ $arrayElemAt: ["$report.reportApprovedByAdmin", 0] }, true] }, then: "Yes", else: "No" } },
                            
                            }
                        },
                        { 
                            "$project" : {
                                "isPublic": '$isPublic',
                                "parentID": '$parentID',
                                "creatorID": '$creatorID',
                                "parentGlyffId": '$parentGlyffId',
                                "referenceGlyffId": '$referenceGlyffId',
                                "glyffGif": '$glyffGif',
                                "isDeleted": '$isDeleted',
                                "isEditable": '$isEditable',
                                "captionText": '$captionText',
                                "captions": "$captions",
                                "tags": "$tags",
                                "isTemplate": '$isTemplate',
                                "popularity": '$popularity',
                                "title": '$title',
                                "category": '$category',
                                "creator": '$creator',
                                "type": '$type',
                                "glyffThumbnail": '$glyffThumbnail',
                                "glyffCustomised": '$glyffCustomised',
                                "glyffCustomisedGif": "$glyffCustomisedGif",
                                "glyffOriginal": '$glyffOriginal',
                                "comments": "$comments",
                                "creatorname": '$creatorname.name' ,
                                "creatorUsername": '$creatorname.nickname',
                                "parentGlyffId" : "$parentGlyffId", 
                                "createdAt" : "$createdAt", 
                                "updatedAt" : "$updatedAt", 
                                "hotness" : "$hotness", 
                                "credNo" : "$credNo", 
                                "type": '$type',
                                "commentCount" : "$commentCount",
                                "clones": "$clones",
                               //"favouritesCount":  "$favourites" ,
                            // "isReported": { $cond: { if: { $and: [{ $eq: [{ $arrayElemAt: ["$report.glyphId", 0] }, "$_id"] }, { $ne: [{ $arrayElemAt: ["$report.userId", 0] }, adminId] }] }, then: "Yes", else: "No" } },
                               // "isBlocked": { $cond: { if: { $eq: [{ $arrayElemAt: ["$report.reportApprovedByAdmin", 0] }, true] }, then: "Yes", else: "No" } },
                            
                            }
                        }    
                    
                    ];
             } 
            }
             else
            {
              
                console.log('test')
                 aggregationQueryString = [
                    // Stage 1
                    {
                        $match: requestObj.queryCondition
                    },
                    { 
                        "$lookup" : {
                            "from" : "users", 
                            "localField" : "creatorID", 
                            "foreignField" : "_id", 
                            "as" : "creatorDetail"
                        }
                    },
                    { 
                        "$project" : {
                          
                            "creatorname": { $arrayElemAt: ['$creatorDetail', 0] },
                            "creatorUsername": { $arrayElemAt: ['$creatorDetail', 0] },
                            "parentGlyffId" : "$parentGlyffId", 
                            "createdAt" : "$createdAt", 
                            "updatedAt" : "$updatedAt", 
                            "hotness" : "$hotness", 
                            "credNo" : "$credNo", 
                            "commentCount" : "$commentCount",
                         
                        }
                    },
                    { 
                        "$project" : {
                            "creatorname": '$creatorname.name' ,
                            "creatorUsername": '$creatorname.nickname',
                            "parentGlyffId" : "$parentGlyffId", 
                            "createdAt" : "$createdAt", 
                            "updatedAt" : "$updatedAt", 
                            "hotness" : "$hotness", 
                            "credNo" : "$credNo", 
                            "type": '$type',
                            "commentCount" : "$commentCount",
                        }
                    }
                 
                ];
            }
           
         

            //To get count of glyffs
            // aggregationQueryString.push({
            //     $count: "count"
            // });
            var count = yield glyff.count(requestObj.queryCondition);
            // count = count && count.length ? count[0].count : 0;
            // aggregationQueryString.pop();

            var sortObjArr = [];
            if(requestObj.sortQuery && Object.keys(requestObj.sortQuery).length) {
                var sortParam = requestObj.sortQuery.sortParams;
                var sortOrder = requestObj.sortQuery.sortOrder === "asc" ? 1 : -1;                
                if(requestObj.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" },                          
                            }
                        },
                        {
                            $skip: requestObj.paginationQuery.skip
                        },
                        {
                            $limit: requestObj.paginationQuery.limit
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
                            $skip: requestObj.paginationQuery.skip
                        },
                        {
                            $limit: requestObj.paginationQuery.limit
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    if(sortParam !== 'createdAt') {
                        sortObjArr[0].$sort.createdAt = -1;
                    }
                }
            } else {
                if(requestObj.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" }, 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: requestObj.paginationQuery.skip
                        },
                        {
                            $limit: requestObj.paginationQuery.limit
                        }                        
                    ];
                } else {
                    sortObjArr = [{
                            $sort: { 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: requestObj.paginationQuery.skip
                        },
                        {
                            $limit: requestObj.paginationQuery.limit
                        }
                    ];
                }
            }
           
            aggregationQueryString = aggregationQueryString.concat(sortObjArr);
            console.log(aggregationQueryString,'new one')
            var glyffs = yield glyff.aggregate(aggregationQueryString).allowDiskUse(true).exec();
           
            var glyffIds = _.map(glyffs, '_id');

            aggregationQueryString = [
                // Stage 1
                {
                    $match: {
                        _id: {
                            $in: glyffIds
                        }
                    }
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "reportglyffs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "report"
                    }
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "glyffs",
                        "localField": "_id",
                        "foreignField": "referenceGlyffId",
                        "as": "clones"
                    }
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "blocks",
                        "localField": "blockedId",
                        "foreignField": "creatorID",
                        "as": "block"
                    }
                },
                // Stage 3
                {
                    $lookup: {
                        "from": "favouriteglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "favourites"
                    }
                },
                // Stage 4
                {
                    $lookup: {
                        "from": "users",
                        "localField": "creatorID",
                        "foreignField": "_id",
                        "as": "creatorDetail"
                    }
                },
                // Stage 5
                {
                    $lookup: {
                        "from": "users",
                        "localField": "parentID",
                        "foreignField": "_id",
                        "as": "originatorDetail"
                    }
                },
                // Stage 6
                {
                    $unwind: {
                        path: "$report",
                        preserveNullAndEmptyArrays: true // optional
                    }
                },
                // Stage 6
                {
                    $unwind: {
                        path: "$block",
                        preserveNullAndEmptyArrays: true // optional
                    }
                },
                // Stage 7
                // {
                //     $match: {
                //         $or:[{"report.reportApprovedByAdmin" : false},{'report.reportApprovedByAdmin':{$exists:false}}]
                //     }
                // },
                // Stage 8
                {
                    $group: {
                        _id: "$_id",
                        report: { $addToSet: '$report' },
                        block: { $addToSet: '$block' },
                        doc: { $first: '$$ROOT' }
                    }
                },
                // Stage 9
                {
                    $project: {
                        report: 1,
                        "isPublic": '$doc.isPublic',
                        "parentID": '$doc.parentID',
                        "creatorID": '$doc.creatorID',
                        "parentGlyffId": '$doc.parentGlyffId',
                        "referenceGlyffId": '$doc.referenceGlyffId',
                        "glyffGif": '$doc.glyffGif',
                        "isDeleted": '$doc.isDeleted',
                        "viewCount": '$doc.viewCount',
                        "editCount": '$doc.editCount',
                        "isEditable": '$doc.isEditable',
                        "captionText": '$doc.captionText',
                        "captions": "$doc.captions",
                        "tags": "$doc.tags",
                        "isTemplate": '$doc.isTemplate',
                        "followeeCount": '$doc.followeeCount',
                        "followerCount": '$doc.followerCount',
                        "popularity": '$doc.popularity',
                        "trendingCount": '$doc.trendingCount',
                        "sharedCount": '$doc.sharedCount',
                        "title": '$doc.title',
                        "category": '$doc.category',
                        "creator": '$doc.creator',
                        "type": '$doc.type',
                        "glyffThumbnail": '$doc.glyffThumbnail',
                        "glyffCustomised": '$doc.glyffCustomised',
                        "glyffCustomisedGif": "$doc.glyffCustomisedGif",
                        "glyffOriginal": '$doc.glyffOriginal',
                        "createdAt": '$doc.createdAt',
                        "updatedAt": '$doc.updatedAt',
                        "hotness": "$doc.hotness",
                        "credNo": "$doc.credNo",
                        "comments": "$doc.comments",
                        "commentCount": "$doc.commentCount",
                        "favouritesCount": { "$size": "$doc.favourites" },
                        "clones": { "$size": { $filter: { input: "$doc.clones", as: "clones", cond: { $eq: ["$$clones.isDeleted", false] } } } },
                        "creatorname": { $arrayElemAt: ['$doc.creatorDetail.name', 0] },
                        "creatorUsername": { $arrayElemAt: ['$doc.creatorDetail.nickname', 0] },
                        "originatorname": { $arrayElemAt: ['$doc.originatorDetail.name', 0] },
                        // "isReported" : { $cond: { if: { $eq: [{ $arrayElemAt: [ "$report.glyphId", 0 ] }, "$_id"] }, then: "Yes", else: "No" } },
                        "isReported": { $cond: { if: { $and: [{ $eq: [{ $arrayElemAt: ["$report.glyphId", 0] }, "$_id"] }, { $ne: [{ $arrayElemAt: ["$report.userId", 0] }, adminId] }] }, then: "Yes", else: "No" } },
                        "isBlocked": { $cond: { if: { $eq: [{ $arrayElemAt: ["$report.reportApprovedByAdmin", 0] }, true] }, then: "Yes", else: "No" } },
                        // 'blocked': "$block",
                        //"isBlocked" : { $cond: { if: { $gt: [{ $size: { $filter: { input: "$block", as: "block", cond: { $eq: [ "$$block.blockedId","$doc.creatorID" ] } }} }, 0] }, then: "Yes", else: "No" } }
                    }
                }
            ];

            if (sortObjArr.length && sortObjArr[0].$sort.score)
            delete sortObjArr[0].$sort.score;

            aggregationQueryString = aggregationQueryString.concat(sortObjArr.splice(0, 1));
            //aggregationQueryString = aggregationQueryString.concat(sortObjArr);
            glyffs = yield glyff.aggregate(aggregationQueryString).allowDiskUse(true).exec();
          
            resolve({glyffs: glyffs, count: count});
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });   
}
/*************************
 UPDATE GLYPH EDITCOUNT
 *************************/
exports.updateGlyphEditCountModel = function(id) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var updatedGlyff = yield glyff.findByIdAndUpdate({"_id":id,"isDeleted":false},{$inc: { editCount: 1 }, $set: {updatedAt: new Date()}}).exec();
            resolve(updatedGlyff);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*************************
 UPDATE GLYPH VIEWCOUNT
 *************************/
exports.updateGlyphViewCountModel = function(dataObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var glyffObj = yield glyff.findOne({ '_id': dataObj.glyphId, 'isDeleted': false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: dataObj.userId }] }] }]}).exec();

            if(glyffObj) {
                if(glyffObj.creatorID.toString() !== dataObj.userId.toString()) {
                    var alreadyViewed = yield viewGlyphs.count(dataObj);
                    if(!alreadyViewed) {
                        var viewGlyph = new viewGlyphs(dataObj);
                        yield viewGlyph.save();
                        glyffObj.viewCount += 1;
                        yield glyffObj.save();
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}


/*************************
 UPDATE GLYPH SHARECOUNT
 *************************/
exports.updateGlyphShareCountModel = function(data) {
var hotness   = 10;
var todayDate = new Date().toISOString().slice(0,10);
    return new Promise(function(resolve, reject){
        co(function*(){
            var sharedCount = yield shareGlyphs.count({ glyphId: data.id });          
            yield glyff.findByIdAndUpdate(data.id, { $set: { updatedAt: new Date(), sharedCount: sharedCount }},{new: true}).exec();
            // yield User.findByIdAndUpdate(updatedGlyff.creatorID,{$inc: { sharedCount: 1 , trendingCount: 1}}).exec();
              //Start New Changes
                   var currentHotness = yield glyff.find({$and:[{"_id":data.id},{ 'hotnessEachDay': { $elemMatch: { "todayDate":todayDate} } }]},{"hotnessEachDay.$": 1 }).exec();
              
            if(currentHotness.length > 0)
                {
                    
                    hotness           =  currentHotness[0].hotnessEachDay[0].hotness + 10;
                    var updateHotness =   yield glyff.updateOne({"_id":data.id,'hotnessEachDay.todayDate':todayDate},{"hotnessEachDay.$.hotness":hotness}).exec();
                    
                }
            else
                {
                    
                 var pushNewHotness = yield glyff.update({"_id":data.id},{$push:
		                  {"hotnessEachDay":{"hotness":hotness,"todayDate":todayDate}}}).exec();
                 
                }
            
            //call trendingness formula function 
            
              //End New Changes
            
            resolve(true);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/********************************************************************************************************
 VIEW AGGREGRATION RECENT MODEL - RECENTLY VIEWED GLYFFS
 *******************************************************************************************************/
exports.aggregationViewedRecentGlyphModel = function(data){
    return new Promise(function(resolve, reject){
        co(function*(){
            var viewedRecentGlyffs = yield viewGlyphs.find({"userId" : data.userId},{glyphId: 1}).exec();
            var viewedRecentGlyffIds = _.map(viewedRecentGlyffs, 'glyphId');

            var deletedUsers = yield User.find({ deleteStatus: true }, { _id: 1 });
            var deletedUserIds = _.map(deletedUsers, '_id');

            if(viewedRecentGlyffIds.length) {
                data.queryCondition.$and = [{_id: {$in: viewedRecentGlyffIds}}];
                var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
                if(reportedGlyffs && reportedGlyffs.length) {
                    data.queryCondition.$and.push({"_id": {$nin : reportedGlyffs}});
                } 

                if(deletedUserIds.length)
                    data.queryCondition.creatorID = { $nin: deletedUserIds };

                var aggregationQueryString = [
                    // Stage 1
                    {
                        $match: data.queryCondition
                    },
                    // Stage 3
                    {
                        $lookup: {
                            "from": "blocks",
                            "localField": "creatorID",
                            "foreignField": "blockedId",
                            "as": "block"
                        }
                    },
                    {
                        $project: {
                            // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                            "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.userId] } } },
                            'createdAt': 1,
                            'hotness': 1
                        }
                    },
                    // Stage 9
                    {
                        $match: {
                            "block.blockedById": {$nin: [data.userId]},
                        }
                    }
                ];
    
                var sortObjArr = [];
                if(data.sortQuery && Object.keys(data.sortQuery).length && data.sortQuery.sortParams !== "newest") {
                    var sortParamsMapping = {"hotness": "hotness"};
                    var sortParam = sortParamsMapping[data.sortQuery.sortParams];
                    var sortOrder = data.sortQuery.sortOrder === "asc" ? 1 : -1;
                    //var sortBasedOnDate = {"viewedGlyff.createdAt":-1}; 
                    var sortBasedOnDate = {"createdAt":-1};               
                    if(data.isTextBasedSearch) {
                        sortObjArr = [{
                                $sort: {
                                    "score": { $meta: "textScore" }                   
                                }
                            },
                            {
                                $skip: data.paginationQuery.skip
                            },
                            {
                                $limit: data.paginationQuery.limit
                            }
                        ];
                        eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                        _.merge(sortObjArr[0].$sort, sortBasedOnDate);
                    } else {
                        sortObjArr = [{
                                $sort: { 
                                }
                            },
                            {
                                $skip: data.paginationQuery.skip
                            },
                            {
                                $limit: data.paginationQuery.limit
                            }
                        ];
                        eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                        _.merge(sortObjArr[0].$sort, sortBasedOnDate);
                    }
                } else {
                    if(data.isTextBasedSearch) {
                        sortObjArr = [{
                                $sort: {
                                    "score": { $meta: "textScore" }, 
                                    //"viewedGlyff.createdAt" : -1
                                    "createdAt" : -1
                                }
                            },
                            {
                                $skip: data.paginationQuery.skip
                            },
                            {
                                $limit: data.paginationQuery.limit
                            }                        
                        ];
                    } else {
                        sortObjArr = [{
                                $sort: { 
                                    //"viewedGlyff.createdAt" : -1
                                    "createdAt" : -1
                                }
                            },
                            {
                                $skip: data.paginationQuery.skip
                            },
                            {
                                $limit: data.paginationQuery.limit
                            }
                        ];
                    }
                }
                aggregationQueryString = aggregationQueryString.concat(sortObjArr);
                var recentGlyphs = yield glyff.aggregate(aggregationQueryString).exec();

                var recentGlyffIds = _.map(recentGlyphs, '_id');
                aggregationQueryString = [
                    // Stage 1
                    {
                        $match: {
                            _id: { $in: recentGlyffIds }
                        }
                    },
                    // Stage 2
                    {
                        $lookup: {
                            "from": "favouriteglyphs",
                            "localField": "_id",
                            "foreignField": "glyphId",
                            "as": "favourite"
                        }
                    },
                    // Stage 4
                    {
                        $lookup: {
                            "from": "users",
                            "localField": "creatorID",
                            "foreignField": "_id",
                            "as": "user"
                        }
                    },
                    // Stage 5
                    {
                        $lookup: {
                            "from": "users",
                            "localField": "parentID",
                            "foreignField": "_id",
                            "as": "parentUser"
                        }
                    },
                    // Stage 6
                    {
                        $lookup: {
                            "from": "follows",
                            "localField": "creatorID",
                            "foreignField": "followeeId",
                            "as": "checkFollower"
                        }
                    },
                    // Stage 7
                    {
                        $lookup: {
                            "from": "votedglyffs",
                            "localField": "_id",
                            "foreignField": "glyffId",
                            "as": "votedGlyffs"
                        }
                    },
                    // Stage 7_1
                    {
                        $lookup: {
                            "from": "shareglyphs",
                            "localField": "_id",
                            "foreignField": "glyphId",
                            "as": "sharedGlyffs"
                        }
                    },
                    // Stage 8 - To sort based on recent views
                    {
                        $lookup: {
                            "from": "viewglyphs",
                            "localField": "_id",
                            "foreignField": "glyphId",
                            "as": "viewGlyphs"
                        }
                    },
                    // Stage 8
                    {
                        $project: {
                            "_id": 1,
                            "isPublic": 1,
                            "creatorID": 1,
                            "parentID": 1,
                            "viewCount": 1,
                            "editCount": 1,
                            "commentCount": 1,
                            "isEditable": 1,
                            "captionText": 1,
                            "isTemplate": 1,
                            "followeeCount": 1,
                            "followerCount": 1,
                            "popularity": 1,
                            "trendingCount": 1,
                            "sharedCount": 1,
                            "title": 1,
                            "category": 1,
                            "creator": 1,
                            "type": 1,
                            "glyffGif": 1,
                            "glyffThumbnail": 1,
                            "glyffCustomised": 1,
                            "glyffCustomisedGif": 1,
                            "referenceGlyffId": 1,
                            "glyffOriginal": 1,
                            "createdAt": 1,
                            "viewedGlyff": { $filter: { input: "$viewGlyphs", as: "viewGlyphs", cond: { $eq: ["$$viewGlyphs.userId", data.userId] } } },
                            "updatedAt": 1,
                            "sharedCreatedAt": 1,
                            "userId": 1,
                            "favouriteCount": 1,
                            "credNo": 1,
                            "hotness": 1,
                            "frameWidth": 1,
                            "frameHeight": 1,
                            "isReaction": 1,
                            "isSignatureEnable": 1,
                            "borderSize": 1,
                            "borderColor": 1,
                            "deviceType": 1,
                            "tags": 1,
                            "captions": 1,
                            "clonerIds": 1,

                            // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                            "isFavourite": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$favourite", as: "favourite", cond: { $eq: ["$$favourite.userId", data.userId] } } } }, 0] }, then: true, else: false } },

                            // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                            "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.userId] } } } }, 0] }, then: true, else: false } },

                            // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                            "userVote": { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'upvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'downvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "downvote", else: "" } } } },
                            // isFollow is a flag which shows whether current user is following glyph creator or not
                            "isFollow": {
                                $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                            },

                            "isCommented": {
                                $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId", data.userId] } } } }, 0] }, then: 1, else: 0 }
                            },

                            "isCloned": {
                                $cond: { if: { "$in": [data.userId, "$clonerIds"] }, then: 1, else: 0 }
                            },

                            "user": { $arrayElemAt: ["$user", 0] },
                            "parentUser": { $arrayElemAt: ["$parentUser", 0] },

                            // Last comment of the glyff                            
                            "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {} } }
                        }
                    },
                    // Stage 9
                    {
                        $lookup: {
                            "from": "users",
                            "localField": "lastComment.commenterId",
                            "foreignField": "_id",
                            "as": "commenter"
                        }
                    },
                    // Stage 10
                    {
                        $addFields: {
                            "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                        }
                    },
                    // Stage 11
                    {
                        $project: {
                            "commenter": 0,
                            "lastComment.commenterId.hash_password": 0,
                            "lastComment.commenterId.resetPasswordToken": 0,
                            "lastComment.commenterId.verificationToken": 0
                        }
                    }
                ];

                if (sortObjArr.length && sortObjArr[0].$sort.score)
                    delete sortObjArr[0].$sort.score;

                aggregationQueryString = aggregationQueryString.concat(sortObjArr);
                recentGlyphs = yield glyff.aggregate(aggregationQueryString).exec();
                recentGlyphs = JSON.parse(JSON.stringify(recentGlyphs));

                yield Promise.each(recentGlyphs, co.wrap(function* (glifObj, key) {
                    glifObj.user.isProfileHidden = glifObj.user.isProfileHidden ? glifObj.user.isProfileHidden : false;
                    glifObj.parentUser.isProfileHidden = glifObj.parentUser.isProfileHidden ? glifObj.parentUser.isProfileHidden : false;
                    if (!_.isEmpty(glifObj.lastComment)) {
                        glifObj.lastComment.commenterId.isProfileHidden = glifObj.lastComment.commenterId.isProfileHidden ? glifObj.lastComment.commenterId.isProfileHidden : false;
                    }
                }));

                resolve(recentGlyphs);                
            } else {
                reject({ errorCode: 404, errorMessage: 'Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply'});
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/************************************
 AGGREGATION SHARED RECENT MODEL
 ************************************/
exports.aggregationSharedRecentGlyphModel = function(data, isTextBasedSearch) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            var reportedGlyff = yield checkIfGlyffsReportedByUser(data.userId);
            data.reportGlyffIds = reportedGlyff && reportedGlyff.length ? {"_id": {$nin : reportedGlyff}} : {};
            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: {
                        "userId" : data.userId,
                        // "createdAt": { "$gte": data.start }
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
                    $lookup: {
                        "from" : "glyffs",
                        "localField" : "glyphId",
                        "foreignField" : "_id",
                        "as" : "glyphId"
                    }
                },    
                // Stage 4
                {
                    $match: {
                        "glyphId": { $elemMatch: data.queryCondition }
                    }
                },    
                // Stage 5
                {
                    $unwind: {
                        path : "$glyphId",
                    }
                },    
                // Stage 6
                {
                    $project: {
                        "_id" : "$glyphId._id",
                        "isPublic" : "$glyphId.isPublic",
                        "creatorID" : "$glyphId.creatorID",
                        "parentID" : "$glyphId.parentID",
                        "viewCount" : "$glyphId.viewCount",
                        "editCount" : "$glyphId.editCount",
                        "isEditable" : "$glyphId.isEditable",
                        "captionText" : "$glyphId.captionText",
                        "isTemplate" : "$glyphId.isTemplate",
                        "followeeCount" : "$glyphId.followeeCount",
                        "followerCount" : "$glyphId.followerCount",
                        "popularity" : "$glyphId.popularity",
                        "trendingCount" : "$glyphId.trendingCount",
                        "sharedCount" : "$glyphId.sharedCount",
                        "title" : "$glyphId.title",
                        "category" : "$glyphId.category",
                        "creator" : "$glyphId.creator",
                        "type" : "$glyphId.type",
                        "glyffGif": "$glyphId.glyffGif",
                        "glyffThumbnail" : "$glyphId.glyffThumbnail",
                        "glyffCustomised" : "$glyphId.glyffCustomised",
                        "glyffCustomisedGif" : "$glyphId.glyffCustomisedGif",
                        "glyffOriginal" : "$glyphId.glyffOriginal",
                        "createdAt" : "$glyphId.createdAt",
                        "updatedAt" : "$glyphId.updatedAt",
                        "sharedCreatedAt": "$createdAt",
                        "userId" : 1
                    }
                },    
                // Stage 7
                {
                    $group: {
                        _id : {
                            "_id" : "$_id"},
                            info: { $addToSet : {
                                "userId" : "$userId",
                                "isPublic" : "$isPublic",
                                "creatorID" : "$creatorID",
                                "parentID" : "$parentID",
                                "viewCount" : "$viewCount",
                                "editCount" : "$editCount",
                                "isEditable" : "$isEditable",
                                "captionText" : "$captionText",
                                "isTemplate" : "$isTemplate",
                                "followeeCount" : "$followeeCount",
                                "followerCount" : "$followerCount",
                                "popularity" : "$popularity",
                                "trendingCount" : "$trendingCount",
                                "sharedCount" : "$sharedCount",
                                "title" : "$title",
                                "category" : "$category",
                                "creator" : "$creator",
                                "type" : "$type",
                                "glyffGif": "$glyphId.glyffGif",
                                "glyffThumbnail" : "$glyffThumbnail",
                                "glyffCustomised" : "$glyffCustomised",
                                "glyffCustomisedGif" : "$glyffCustomisedGif",
                                "glyffOriginal" : "$glyffOriginal",
                                "createdAt" : "$createdAt",
                                "updatedAt" : "$updatedAt",
                                "sharedCreatedAt" : "$sharedCreatedAt"
                            }
                        }
                    }
                },    
                // Stage 8
                {
                    $sort: {
                        "info.sharedCreatedAt": -1
                    }
                },    
                // Stage 9
                {
                    $project: {
                        _id: "$_id._id",
                        isPublic : {$arrayElemAt: ["$info.isPublic", 0]},
                        creatorID : {$arrayElemAt: ["$info.creatorID", 0]},
                        parentID : {$arrayElemAt: ["$info.parentID", 0]},
                        viewCount : {$arrayElemAt: ["$info.viewCount", 0]},
                        editCount : {$arrayElemAt: ["$info.editCount", 0]},
                        isEditable : {$arrayElemAt: ["$info.isEditable", 0]},
                        captionText : {$arrayElemAt: ["$info.captionText", 0]},
                        isTemplate : {$arrayElemAt: ["$info.isTemplate", 0]},
                        followeeCount : {$arrayElemAt: ["$info.followeeCount", 0]},
                        followerCount : {$arrayElemAt: ["$info.followerCount", 0]},
                        popularity : {$arrayElemAt: ["$info.popularity", 0]},
                        trendingCount : {$arrayElemAt: ["$info.trendingCount", 0]},
                        sharedCount : {$arrayElemAt: ["$info.sharedCount", 0]},
                        title : {$arrayElemAt: ["$info.title", 0]},
                        category : {$arrayElemAt: ["$info.category", 0]},
                        creator : {$arrayElemAt: ["$info.creator", 0]},
                        type : {$arrayElemAt: ["$info.type", 0]},
                        glyffThumbnail : {$arrayElemAt: ["$info.glyffThumbnail", 0]},
                        glyffCustomised : {$arrayElemAt: ["$info.glyffCustomised", 0]},
                        glyffCustomisedGif : {$arrayElemAt: ["$info.glyffCustomisedGif", 0]},
                        glyffOriginal : {$arrayElemAt: ["$info.glyffOriginal", 0]},
                        createdAt : {$arrayElemAt: ["$info.createdAt", 0]},
                        updatedAt : {$arrayElemAt: ["$info.updatedAt", 0]},
                        sharedCreatedAt: {$arrayElemAt: ["$info.sharedCreatedAt", 0]},
                        userId : {$arrayElemAt: ["$info.userId", 0]}
                    }
                },    
                // Stage 10
                {
                    $lookup: {
                        "from" : "favouriteglyphs",
                        "localField" : "_id",
                        "foreignField" : "glyphId",
                        "as" : "favourite"
                    }
                },    
                // Stage 11
                {
                    $lookup: {
                        "from" : "blocks",
                        "localField" : "creatorID",
                        "foreignField" : "blockedId",
                        "as" : "block"
                    }
                },    
                // Stage 12
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "creatorID",
                        "foreignField" : "_id",
                        "as" : "user"
                    }
                },    
                // Stage 13
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "parentID",
                        "foreignField" : "_id",
                        "as" : "parentUser"
                    }
                },
                // Stage 14
                {
                    $lookup: {
                        "from" : "follows",
                        "localField" : "creatorID",
                        "foreignField" : "followeeId",
                        "as" : "checkFollower"
                    }
                },
                // Stage 15
                {
                    $lookup: {
                        "from" : "votedglyffs",
                        "localField" : "_id",
                        "foreignField" : "glyffId",
                        "as" : "votedGlyffs"
                    }
                },
                // Stage 16
                {
                    $project: {
                        "_id" : 1,
                        "isPublic" : 1,
                        "creatorID" : 1,
                        "parentID" : 1,
                        "viewCount" : 1,
                        "editCount" : 1,
                        "commentCount" : 1,
                        "isEditable" : 1,
                        "captionText" : 1,
                        "isTemplate" : 1,
                        "followeeCount" : 1,
                        "followerCount" : 1,
                        "popularity" : 1,
                        "trendingCount" : 1,
                        "sharedCount" : 1,
                        "title" : 1,
                        "category" : 1,
                        "creator" : 1,
                        "type" : 1,
                        "glyffGif": 1,
                        "glyffThumbnail" : 1,
                        "glyffCustomised" : 1,
                        "glyffCustomisedGif" : 1,
                        "referenceGlyffId" : 1,
                        "glyffOriginal" : 1,
                        "createdAt" : 1,
                        "updatedAt" : 1,
                        "sharedCreatedAt" : 1,
                        "userId" : 1,
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                        "captions": 1,
                        "clonerIds": 1,

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isFavourite" : { $cond: { if: { $gt: [{$size :{ $filter: { input: "$favourite", as: "favourite", cond: { $eq: [ "$$favourite.userId",data.userId ] } } } }, 0 ] }, then: true, else: false } },

                        // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                        "userVote": { "$cond": { if: { "$gt":[ {"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'upvote']},{"$eq":["$$upvotes.userId", data.userId]}] }}}},0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'downvote']},{"$eq":["$$upvotes.userId", data.userId]}] }}}}, 0] }, then: "downvote", else: "" } } } },

                        // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow" : {
                            $cond : { if: { "$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}] }}}}, 0 ] }, then: {$cond : {if: {"$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}, {"$eq":["$$checkFollower.isValid",true]}] }}}}, 0 ]},then: 2,else: 1}}, else: 0 } 
                        },

                        "isCommented" : {
                            $cond : {if: {"$gt": [{ "$size": {"$filter":{input:"$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId",data.userId]}}}}, 0 ]},then: 1,else: 0}
                        },

                        "isCloned" : {
                           $cond : {if: {"$in": [ data.userId, "$clonerIds" ]},then: 1,else: 0}
                        },

                        // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block" : { $filter: { input: "$block", as: "block", cond: { $eq: [ "$$block.blockedById",data.userId ] } } },      

                        "user" : { $arrayElemAt: [ "$user", 0 ] },
                        "parentUser" : { $arrayElemAt: [ "$parentUser", 0 ] }
                    }
                },    
                // Stage 17
                {
                    $match: {
                        "block.blockedById": {$nin: [data.userId]},
                        "user.deleteStatus": false
                    }
                },    
                // Stage 18
                {
                    $match: data.reportGlyffIds
                }
            ];
            if(isTextBasedSearch) {
                aggregationQueryString = aggregationQueryString.concat([
                    // Stage 13
                    {
                        $sort: { score: { $meta: "textScore" } }
                    }
                ]);
            }
            var sharedGlyffs = yield shareGlyphs.aggregate(aggregationQueryString).exec();
            resolve(sharedGlyffs);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

exports.removeGlyff = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var glyffData = yield glyff.findOne(data).exec();
            if(!glyffData) return resolve({'message':"Glyff not found",status:'0'});
            if(glyffData.isDeleted) return resolve({'message':"Glyff has been deleted already",status:'0'});

            yield glyff.findByIdAndUpdate(data, {$set: {isDeleted: true}}).exec();
            yield User.findOneAndUpdate({_id: data.creatorID},{$inc: { glyffCount: -1 }}).exec();
            resolve({'message':"Glyff has been deleted successfully",status:'1'});
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        })
    });
}

exports.getTopTrendingGlyph = function(){
    return new Promise(function(resolve, reject){
        co(function*(){
            var trendingGlyffs = yield shareGlyphs.aggregate([
                { 
                    "$match": {
                        "createdAt": { 
                            $lt: new Date(), 
                            $gte: new Date(new Date().setDate(new Date().getDate()-1)) 
                        }
                    }
                },
                { 
                    "$group": {
                        "_id": "$glyphId",
                        "count": { "$sum": 1 },
                    }
                },
                { 
                    "$sort" : { 
                        "count" : -1 
                    }
                }
            ]).exec();
            if(!trendingGlyffs.length) return resolve({'message':"Glyff not found",status:0});

            var glyffDetails = yield glyff.aggregate([
                    // Pipeline Stage 1
                    {
                        $match: {'_id':trendingGlyffs[0]._id}
                    },
                    // Stage 2
                    {
                        $lookup: {
                            "from" : "users",
                            "localField" : "creatorID",
                            "foreignField" : "_id",
                            "as" : "user"
                        }
                    },
                    // Stage 3
                    {
                        $project: {
                            "_id" : 1,
                            "isPublic" : 1,
                            "creatorID" : 1,
                            "parentID" : 1,
                            "isEditable" : 1,
                            "captionText" : 1,
                            "isTemplate" : 1,
                            "followeeCount" : 1,
                            "followerCount" : 1,
                            "popularity" : 1,
                            "trendingCount" : 1,
                            "sharedCount" : 1,
                            "title" : 1,
                            "creator" : 1,
                            "type" : 1,
                            "glyffGif": 1,
                            "glyffThumbnail" : 1,
                            "glyffCustomised" : 1,
                            "glyffCustomisedGif" : 1,
                            "referenceGlyffId" : 1,
                            "glyffOriginal" : 1,
                            "user" : { $arrayElemAt: [ "$user", 0 ] },
                        }
                    }
                ]).exec();

                if(!glyffDetails.length) return resolve({'message':"Glyff not found",status:0});

                return resolve({'message':"Glyff Found",status:'1','data':glyffDetails});
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        })
    });
}

/*************************************************************************************
 AGGREGATION PUBLIC GLYPH MODEL - ALL GLYFFS BASED ON THE PUBLIC/PRIVATE ORDER
 *************************************************************************************/
exports.aggregationFetchAllGlyphModelWithPublicPrivateOrder = function(data, reqType) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if(reportedGlyffs && reportedGlyffs.length) {
                data.queryCondition._id = {$nin : reportedGlyffs};
            }

            var deletedUsers = yield User.find({ deleteStatus: true }, { _id: 1});
            var deletedUserIds = _.map(deletedUsers, '_id');

            // new logic to skip the glyff of those private users whom i dont follow
            var privateNotFollowingUsersArr = yield privateNotFollowingUsers(data.userId);
          
            //checking when request type all then user can getting own memes
            privateNotFollowingUsersArr.map((result,k)=>{
                if(reqType.toLowerCase() === 'all' && result.toString() == data.userId.toString())
                {
                    privateNotFollowingUsersArr.splice(k, 1)
                }
            })
            deletedUserIds = _.uniq(_.concat(deletedUserIds, privateNotFollowingUsersArr));

            // To have my own glyffs in this api
            data.queryCondition.creatorID = { $nin: deletedUserIds}
            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 6
                {
                    $lookup: {
                        "from": "blocks",
                        "localField": "creatorID",
                        "foreignField": "blockedId",
                        "as": "block"
                    }
                },
                // Stage 3
                {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                },
                {
                    $project: {
                        // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.userId] } } },

                        // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                        },
                        "hotness": 1,
                        "createdAt": 1,
                        "updatedAt": 1
                    }
                },
                // Stage 10
                {
                    $match: {
                        "block.blockedById": { $nin: [data.userId] },
                        // "isFollow": 2       // New Logic to show only glyffs of those users whom i follow
                    }
                }
            ];
            var sortObjArr = [];
            if(data.sortQuery && Object.keys(data.sortQuery).length && data.sortQuery.sortParams !== "newest") {
                var sortParamsMapping = {"hotness": "hotness"};
                var sortParam = sortParamsMapping[data.sortQuery.sortParams];
                var sortOrder = data.sortQuery.sortOrder === "asc" ? 1 : -1;                
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                        $sort: {
                            // "isPublic": data.publicPrivateOrder,
                            "score": { $meta: "textScore" }                        
                        }
                    }];
                    if (data.paginationQuery.limit) {
                        sortObjArr.push({
                            $skip: data.paginationQuery.skip
                        });
                        sortObjArr.push({
                            $limit: data.paginationQuery.limit
                        });
                    }
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.updatedAt = -1;
                    eval("sortObjArr[0].$sort.isPublic = data.publicPrivateOrder");
                } else {
                    sortObjArr = [{
                        $sort: { 
                        }
                    }];
                    if (data.paginationQuery.limit) {
                        sortObjArr.push({
                            $skip: data.paginationQuery.skip
                        });
                        sortObjArr.push({
                            $limit: data.paginationQuery.limit
                        });
                    }
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.updatedAt = -1;
                    eval("sortObjArr[0].$sort.isPublic = data.publicPrivateOrder");
                }
            } else {
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                        $sort: {
                            "isPublic": data.publicPrivateOrder,
                            "score": { $meta: "textScore" }, 
                            "updatedAt" : -1
                        }
                    }];
                    if (data.paginationQuery.limit) {
                        sortObjArr.push({
                            $skip: data.paginationQuery.skip
                        });
                        sortObjArr.push({
                            $limit: data.paginationQuery.limit
                        });
                    }
                } else {
                    sortObjArr = [{
                        $sort: {
                            "isPublic": data.publicPrivateOrder, 
                            "updatedAt" : -1
                        }
                    }];
                    if (data.paginationQuery.limit) {
                        sortObjArr.push({
                            $skip: data.paginationQuery.skip
                        });
                        sortObjArr.push({
                            $limit: data.paginationQuery.limit
                        });
                    }
                }
            }
            aggregationQueryString = aggregationQueryString.concat(sortObjArr);
          
            var allGlyffs = yield glyff.aggregate(aggregationQueryString).allowDiskUse(true).exec();

            var glyffIds = _.map(allGlyffs, '_id');
            
            aggregationQueryString = [
                //Stage 1
                {
                    $match: {
                        _id: { $in: glyffIds }
                    }
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "users",
                        "localField": "creatorID",
                        "foreignField": "_id",
                        "as": "user"
                    }
                },
                // Stage 3
                {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                },
                // Stage 4
                // {
                //     $match: {
                //         $or: [
                //             {"creatorID": data.userId},
                //             {"user.isPublic": true},
                //             {
                //                 $and: [
                //                     {"user.isPublic":false},
                //                     {"checkFollower.followerId": data.userId, "checkFollower.isValid": true}
                //                 ]
                //             }
                //         ]
                //     }
                // },
                // Stage 5
                {
                    $lookup: {
                        "from": "favouriteglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "favourite"
                    }
                },
                // Stage 7
                {
                    $lookup: {
                        "from": "users",
                        "localField": "parentID",
                        "foreignField": "_id",
                        "as": "parentUser"
                    }
                },
                // Stage 8
                {
                    $lookup: {
                        "from": "votedglyffs",
                        "localField": "_id",
                        "foreignField": "glyffId",
                        "as": "votedGlyffs"
                    }
                },
                // Stage 7_1
                {
                    $lookup: {
                        "from": "shareglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "sharedGlyffs"
                    }
                },
                // Stage 9
                {
                    $project: {
                        "_id": 1,
                        "isPublic": 1,
                        "creatorID": 1,
                        "parentID": 1,
                        "isEditable": 1,
                        "captionText": 1,
                        "isTemplate": 1,
                        "followeeCount": 1,
                        "followerCount": 1,
                        "popularity": 1,
                        "trendingCount": 1,
                        "sharedCount": 1,
                        "title": 1,
                        "creator": 1,
                        "type": 1,
                        "glyffGif": 1,
                        "glyffThumbnail": 1,
                        "glyffCustomised": 1,
                        "glyffCustomisedGif": 1,
                        "referenceGlyffId": 1,
                        "glyffOriginal": 1,
                        "createdAt": 1,
                        "updatedAt": 1,
                        "editCount": 1,
                        "commentCount": 1,
                        "viewCount": 1,
                        "user": { $arrayElemAt: ["$user", 0] },
                        "parentUser": { $arrayElemAt: ["$parentUser", 0] },
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                        "captions": 1,
                        "clonerIds": 1,

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isFavourite": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$favourite", as: "favourite", cond: { $eq: ["$$favourite.userId", data.userId] } } } }, 0] }, then: true, else: false } },

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.userId] } } } }, 0] }, then: true, else: false } },

                        // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                        "userVote": { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'upvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'downvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "downvote", else: "" } } } },

                        "isCommented": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId", data.userId] } } } }, 0] }, then: 1, else: 0 }
                        },

                        "isCloned": {
                            $cond: { if: { "$in": [data.userId, "$clonerIds"] }, then: 1, else: 0 }
                        },

                        "privateUserFollowing": { "$size": { "$filter": { "input": "$checkFollower", "as": "checkFollower", "cond": { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } },

                        // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                        },

                        // Last comment of the glyff                            
                        "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {} } }
                    }
                },
                // Stage 9
                {
                    $lookup: {
                        "from": "users",
                        "localField": "lastComment.commenterId",
                        "foreignField": "_id",
                        "as": "commenter"
                    }
                },
                // Stage 10
                {
                    $addFields: {
                        "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                    }
                },
                // Stage 11
                {
                    $project: {
                        "commenter": 0,
                        "lastComment.commenterId.hash_password": 0,
                        "lastComment.commenterId.resetPasswordToken": 0,
                        "lastComment.commenterId.verificationToken": 0
                    }
                }
                // Logic to show those glyffs created by me, or public or those private user whom i follow
                // {
                //     $match:{
                //         $or: [
                //             {"creatorID": data.userId},
                //             {"user.isPublic": true},
                //             {
                //                 $and: [
                //                     {"user.isPublic": false},
                //                     {"privateUserFollowing": {$gt: 0}}
                //                 ]
                //             }
                //         ]
                //     }
                // }          
            ];

            if (sortObjArr.length && sortObjArr[0].$sort.score)
                delete sortObjArr[0].$sort.score;

            aggregationQueryString = aggregationQueryString.concat(sortObjArr.splice(0, 1));

            allGlyffs = yield glyff.aggregate(aggregationQueryString).allowDiskUse(true).exec();
            allGlyffs = JSON.parse(JSON.stringify(allGlyffs));

            yield Promise.each(allGlyffs, co.wrap(function* (glifObj, key) {
                glifObj.user.isProfileHidden = glifObj.user.isProfileHidden ? glifObj.user.isProfileHidden : false;
                glifObj.parentUser.isProfileHidden = glifObj.parentUser.isProfileHidden ? glifObj.parentUser.isProfileHidden : false;
                if (!_.isEmpty(glifObj.lastComment)) {
                    glifObj.lastComment.commenterId.isProfileHidden = glifObj.lastComment.commenterId.isProfileHidden ? glifObj.lastComment.commenterId.isProfileHidden : false;
                }
            }));

            resolve(allGlyffs);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

function privateNotFollowingUsers(userId) {
    return new Promise(function(resolve, reject) {
        co(function*(){
            var allPrivateUsers = yield User.find({ isPublic: false }, { _id: 1 });
            var allPrivateUserIds = _.map(allPrivateUsers, '_id');
          
            var privateFriends = yield Follow.find({ "followeeId": { $in: allPrivateUserIds },"followerId": userId, "isValid": true }, { followeeId: 1 }).exec();
            var privateFriendsIds = _.map(privateFriends, 'followeeId');
          
            var nonFriendPrivateUsers = _.differenceWith(allPrivateUserIds, privateFriendsIds, _.isEqual);
            resolve(nonFriendPrivateUsers);
        }).catch(function(err){
            reject(err);
        });
    });
}

/************************************************************************************
 AGGREGATION PUBLIC GLYPH MODEL - ALL GLYFFS BASED ON THE PUBLIC/PRIVATE ORDER
 ************************************************************************************/
exports.aggregationFetchAllGlyphModelWithPublicPrivateOrderForKeyboard = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if(reportedGlyffs && reportedGlyffs.length) {
                data.queryCondition._id = {$nin : reportedGlyffs};
            }
            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 2
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "creatorID",
                        "foreignField" : "_id",
                        "as" : "user"
                    }
                },
                // Stage 3
                {
                    $lookup: {
                        "from" : "follows",
                        "localField" : "creatorID",
                        "foreignField" : "followeeId",
                        "as" : "checkFollower"
                    }
                },
                // Stage 4
                // {
                //     $match: {
                //         $or: [
                //             {"creatorID": data.userId},
                //             {"user.isPublic": true},
                //             {
                //                 $and: [
                //                     {"user.isPublic":false},
                //                     {"checkFollower.followerId": data.userId, "checkFollower.isValid": true}
                //                 ]
                //             }
                //         ]
                //     }
                // },
                // Stage 5
                {
                    $lookup: {
                        "from" : "favouriteglyphs",
                        "localField" : "_id",
                        "foreignField" : "glyphId",
                        "as" : "favourite"
                    }
                },
                // Stage 6
                {
                    $lookup: {
                        "from" : "blocks",
                        "localField" : "creatorID",
                        "foreignField" : "blockedId",
                        "as" : "block"
                    }
                },
                // Stage 7
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "parentID",
                        "foreignField" : "_id",
                        "as" : "parentUser"
                    }
                },
                // Stage 8
                {
                    $lookup: {
                        "from" : "votedglyffs",
                        "localField" : "_id",
                        "foreignField" : "glyffId",
                        "as" : "votedGlyffs"
                    }
                },                
                // Stage 9
                {
                    $project: {
                        "_id" : 1,
                        "isPublic" : 1,
                        "creatorID" : 1,
                        "parentID" : 1,
                        "isEditable" : 1,
                        "captionText" : 1,
                        "isTemplate" : 1,
                        "followeeCount" : 1,
                        "followerCount" : 1,
                        "popularity" : 1,
                        "trendingCount" : 1,
                        "sharedCount" : 1,
                        "title" : 1,
                        "creator" : 1,
                        "type" : 1,
                        "glyffGif": 1,
                        "glyffThumbnail" : 1,
                        "glyffCustomised" : 1,
                        "glyffCustomisedGif" : 1,
                        "referenceGlyffId" : 1,
                        "glyffOriginal" : 1,
                        "createdAt" : 1,
                        "updatedAt" : 1,
                        "editCount" : 1,
                        "commentCount" : 1,
                        "viewCount" : 1,
                        "user": { $arrayElemAt: [ "$user", 0 ] },
                        "parentUser" : { $arrayElemAt: [ "$parentUser", 0 ] },
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                        "captions": 1,
                        "clonerIds": 1,

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isFavourite" :   { $cond: { if:{ $gt: [{$size :{ $filter: { input: "$favourite", as: "favourite", cond: { $eq: [ "$$favourite.userId",data.userId ] } } } }, 0 ] },then:true,else:false }},

                        // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                        "userVote": { "$cond": { if: { "$gt":[ {"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'upvote']},{"$eq":["$$upvotes.userId", data.userId]}] }}}},0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'downvote']},{"$eq":["$$upvotes.userId", data.userId]}] }}}}, 0] }, then: "downvote", else: "" } } } },

                        // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow" : {
                            $cond : { if: { "$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}] }}}}, 0 ] }, then: {$cond : {if: {"$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}, {"$eq":["$$checkFollower.isValid",true]}] }}}}, 0 ]},then: 2,else: 1}}, else: 0 } 
                        },

                        "isCommented" : {
                            $cond : {if: {"$gt": [{ "$size": {"$filter":{input:"$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId",data.userId]}}}}, 0 ]},then: 1,else: 0}
                        },

                        "isCloned" : {
                           $cond : {if: {"$in": [ data.userId, "$clonerIds" ]},then: 1,else: 0}
                        },

                        "privateUserFollowing": { "$size": { "$filter": { "input": "$checkFollower", "as": "checkFollower", "cond": { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } },

                        // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block" : { $filter: { input: "$block", as: "block", cond: { $eq: [ "$$block.blockedById",data.userId ] } } }
                    }
                },
                // Stage 10
                {
                    $match: {
                        "block.blockedById": {$nin: [data.userId]},
                        "user.deleteStatus": false
                    }
                },
                // Logic to show those glyffs created by me, or public or those private user whom i follow
                {
                    $match:{
                        $or: [
                            {"creatorID": data.userId},
                            {"user.isPublic": true},
                            {
                                $and: [
                                    {"user.isPublic": false},
                                    {"privateUserFollowing": {$gt: 0}}
                                ]
                            }
                        ]
                    }
                }                
            ];
            var sortObjArr = [];
            if(data.sortQuery && Object.keys(data.sortQuery).length && data.sortQuery.sortParams !== "newest") {
                var sortParamsMapping = {"hotness": "hotness"};
                var sortParam = sortParamsMapping[data.sortQuery.sortParams];
                var sortOrder = data.sortQuery.sortOrder === "asc" ? 1 : -1;                
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "isPublic": data.publicPrivateOrder,
                                "score": { $meta: "textScore" }                        
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                } else {
                    sortObjArr = [{
                            $sort: { 
                                "isPublic": data.publicPrivateOrder
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                }
            } else {
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "isPublic": data.publicPrivateOrder,
                                "score": { $meta: "textScore" }, 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }                      
                    ];
                } else {
                    sortObjArr = [{
                            $sort: {
                                "isPublic": data.publicPrivateOrder, 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                    ];
                }
            }
            aggregationQueryString = aggregationQueryString.concat(sortObjArr);

            var allGlyffs = yield glyff.aggregate(aggregationQueryString).exec();
            resolve(allGlyffs);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*****************************************************************************************************
 AGGREGATION PUBLIC GLYPH MODEL - GLYFFS OF THOSE PUBLIC USERS, I DON'T FOLLOW
 ****************************************************************************************************/
exports.aggregationFetchPublicGlyphModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if(reportedGlyffs && reportedGlyffs.length) {
                data.queryCondition._id = {$nin : reportedGlyffs};
            }

            var publicActiveUsers = yield User.find({ isPublic: true, deleteStatus: false, _id: { $ne: data.userId } }, {_id: 1}).exec();
            var publicUserIds = _.map(publicActiveUsers, '_id');

            if(publicActiveUsers.length)
                data.queryCondition.creatorID = { $in: publicUserIds };

            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 4
                {
                    $lookup: {
                        "from": "blocks",
                        "localField": "creatorID",
                        "foreignField": "blockedId",
                        "as": "block"
                    }
                },
                // // Stage 6
                {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                },
                {
                    $project: {
                        // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.userId] } } },

                        // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                        },
                        "hotness": 1,
                        "createdAt": 1
                    }
                },
                // Stage 9
                {
                    $match: {
                        "block.blockedById": {$nin: [data.userId]},
                        "isFollow": 0
                    }
                }
            ];
            var sortObjArr = [];
            if(data.sortQuery && Object.keys(data.sortQuery).length && data.sortQuery.sortParams !== "newest") {
                var sortParamsMapping = {"hotness": "hotness"};
                var sortParam = sortParamsMapping[data.sortQuery.sortParams];
                var sortOrder = data.sortQuery.sortOrder === "asc" ? 1 : -1;                
                if(data.isTextBasedSearch) {
                    sortObjArr = [
                        {
                            $sort: {
                                "score": { $meta: "textScore" }                          
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                } else {
                    sortObjArr = [
                        {
                            $sort: { 
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                }
            } else {
                if(data.isTextBasedSearch) {
                    sortObjArr = [
                        {
                            $sort: {
                                "score": { $meta: "textScore" }, 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }                        
                    ];
                } else {
                    sortObjArr = [
                        {
                            $sort: { 
                                "createdAt" : -1
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                    ];
                }
            }
            aggregationQueryString = aggregationQueryString.concat(sortObjArr);

            var publicGlyffs = yield glyff.aggregate(aggregationQueryString).exec();
            var publicGlyffIds = _.map(publicGlyffs, '_id');

            aggregationQueryString = [
                // Stage 1
                {
                    $match :{
                        _id: { $in: publicGlyffIds}
                    }
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "users",
                        "localField": "creatorID",
                        "foreignField": "_id",
                        "as": "user"
                    }
                },
                // Stage 3
                {
                    $lookup: {
                        "from": "favouriteglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "favourite"
                    }
                },
                // Stage 5
                {
                    $lookup: {
                        "from": "users",
                        "localField": "parentID",
                        "foreignField": "_id",
                        "as": "parentUser"
                    }
                },
                // Stage 6
                {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                },
                // Stage 7
                {
                    $lookup: {
                        "from": "votedglyffs",
                        "localField": "_id",
                        "foreignField": "glyffId",
                        "as": "votedGlyffs"
                    }
                },
                // Stage 7_1
                {
                    $lookup: {
                        "from": "shareglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "sharedGlyffs"
                    }
                },
                // Stage 8
                {
                    $project: {
                        "_id": 1,
                        "isPublic": 1,
                        "creatorID": 1,
                        "parentID": 1,
                        "isEditable": 1,
                        "captionText": 1,
                        "isTemplate": 1,
                        "followeeCount": 1,
                        "followerCount": 1,
                        "popularity": 1,
                        "trendingCount": 1,
                        "sharedCount": 1,
                        "title": 1,
                        "creator": 1,
                        "type": 1,
                        "glyffGif": 1,
                        "glyffThumbnail": 1,
                        "glyffCustomised": 1,
                        "glyffCustomisedGif": 1,
                        "referenceGlyffId": 1,
                        "glyffOriginal": 1,
                        "createdAt": 1,
                        "updatedAt": 1,
                        "editCount": 1,
                        "commentCount": 1,
                        "viewCount": 1,
                        "user": { $arrayElemAt: ["$user", 0] },
                        "parentUser": { $arrayElemAt: ["$parentUser", 0] },
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                        "captions": 1,
                        "clonerIds": 1,

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isFavourite": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$favourite", as: "favourite", cond: { $eq: ["$$favourite.userId", data.userId] } } } }, 0] }, then: true, else: false } },

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.userId] } } } }, 0] }, then: true, else: false } },

                        // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                        "userVote": { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'upvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'downvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "downvote", else: "" } } } },

                        // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                        },

                        "isCommented": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId", data.userId] } } } }, 0] }, then: 1, else: 0 }
                        },

                        "isCloned": {
                            $cond: { if: { "$in": [data.userId, "$clonerIds"] }, then: 1, else: 0 }
                        },

                        // Last comment of the glyff                            
                        "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {} } }
                    }
                },
                // Stage 9
                {
                    $lookup: {
                        "from": "users",
                        "localField": "lastComment.commenterId",
                        "foreignField": "_id",
                        "as": "commenter"
                    }
                },
                // Stage 10
                {
                    $addFields: {
                        "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                    }
                },
                // Stage 11
                {
                    $project: {
                        "commenter": 0,
                        "lastComment.commenterId.hash_password": 0,
                        "lastComment.commenterId.resetPasswordToken": 0,
                        "lastComment.commenterId.verificationToken": 0
                    }
                }
            ];

            if (sortObjArr.length && sortObjArr[0].$sort.score) 
                delete sortObjArr[0].$sort.score;

            aggregationQueryString = aggregationQueryString.concat(sortObjArr.splice(0, 1));
            publicGlyffs = yield glyff.aggregate(aggregationQueryString).exec();
            publicGlyffs = JSON.parse(JSON.stringify(publicGlyffs));

            yield Promise.each(publicGlyffs, co.wrap(function* (glifObj, key) {
                glifObj.user.isProfileHidden = glifObj.user.isProfileHidden ? glifObj.user.isProfileHidden : false;
                glifObj.parentUser.isProfileHidden = glifObj.parentUser.isProfileHidden ? glifObj.parentUser.isProfileHidden : false;
                if (!_.isEmpty(glifObj.lastComment)) {
                    glifObj.lastComment.commenterId.isProfileHidden = glifObj.lastComment.commenterId.isProfileHidden ? glifObj.lastComment.commenterId.isProfileHidden : false;
                }
            }));

            resolve(publicGlyffs);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/**********************************
 AGGREGATION PRIVATE GLYPH MODEL
 **********************************/
exports.aggregationFetchPrivateGlyphModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if(reportedGlyffs && reportedGlyffs.length) {
                data.queryCondition._id = {$nin : reportedGlyffs};
            }
            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 2
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "creatorID",
                        "foreignField" : "_id",
                        "as" : "user"
                    }
                },
                // Stage 3
                {
                    $lookup: {
                        "from" : "favouriteglyphs",
                        "localField" : "_id",
                        "foreignField" : "glyphId",
                        "as" : "favourite"
                    }
                },
                // Stage 4
                {
                    $lookup: {
                        "from" : "blocks",
                        "localField" : "creatorID",
                        "foreignField" : "blockedId",
                        "as" : "block"
                    }
                },
                // Stage 5
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "parentID",
                        "foreignField" : "_id",
                        "as" : "parentUser"
                    }
                },
                // Stage 6
                {
                    $lookup: {
                        "from" : "follows",
                        "localField" : "creatorID",
                        "foreignField" : "followeeId",
                        "as" : "checkFollower"
                    }
                },
                // Stage 7
                {
                    $lookup: {
                        "from" : "votedglyffs",
                        "localField" : "_id",
                        "foreignField" : "glyffId",
                        "as" : "votedGlyffs"
                    }
                },
                // Stage 8
                {
                    $project: {
                        "_id" : 1,
                        "isPublic" : 1,
                        "creatorID" : 1,
                        "parentID" : 1,
                        "isEditable" : 1,
                        "captionText" : 1,
                        "isTemplate" : 1,
                        "followeeCount" : 1,
                        "followerCount" : 1,
                        "popularity" : 1,
                        "trendingCount" : 1,
                        "sharedCount" : 1,
                        "title" : 1,
                        "creator" : 1,
                        "type" : 1,
                        "glyffGif": 1,
                        "glyffThumbnail" : 1,
                        "glyffCustomised" : 1,
                        "glyffCustomisedGif" : 1,
                        "referenceGlyffId" : 1,
                        "glyffOriginal" : 1,
                        "glyffGif":1,
                        "createdAt" : 1,
                        "updatedAt" : 1,
                        "editCount" : 1,
                        "commentCount" : 1,
                        "viewCount" : 1,
                        "user": { $arrayElemAt: [ "$user", 0 ] },
                        "parentUser" : { $arrayElemAt: [ "$parentUser", 0 ] },
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                        "captions": 1,
                        "clonerIds": 1,

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isFavourite" : { $cond: { if: { $gt: [{$size :{ $filter: { input: "$favourite", as: "favourite", cond: { $eq: [ "$$favourite.userId",data.userId ] } } } }, 0 ] }, then: true, else: false } },

                        // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                        "userVote": { "$cond": { if: { "$gt":[ {"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'upvote']},{"$eq":["$$upvotes.userId", data.userId]}] }}}},0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'downvote']},{"$eq":["$$upvotes.userId", data.userId]}] }}}}, 0] }, then: "downvote", else: "" } } } },

                        // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow" : {
                            $cond : { if: { "$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}] }}}}, 0 ] }, then: {$cond : {if: {"$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}, {"$eq":["$$checkFollower.isValid",true]}] }}}}, 0 ]},then: 2,else: 1}}, else: 0 } 
                        },

                        "isCommented" : {
                            $cond : {if: {"$gt": [{ "$size": {"$filter":{input:"$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId",data.userId]}}}}, 0 ]},then: 1,else: 0}
                        },

                        "isCloned" : {
                           $cond : {if: {"$in": [ data.userId, "$clonerIds" ]},then: 1,else: 0}
                        },

                        // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block" : { $filter: { input: "$block", as: "block", cond: { $eq: [ "$$block.blockedById",data.userId ] } } }
                    }
                },
                // Stage 9
                {
                    $match: {
                        "block.blockedById": {$nin: [data.userId]}, 
                        "user.isPublic": false,
                        "user.deleteStatus": false
                    }
                },
                // Stage 10
                {
                    $lookup: {
                        "from" : "follows",
                        "localField" : "creatorID",
                        "foreignField" : "followeeId",
                        "as" : "follow"
                    }
                },
                // Stage 11
                {
                    $unwind: {
                        path : "$follow",
                    }
                },
                // Stage 12
                {
                    $match: {"follow.followerId":data.userId, "follow.isValid": true}
                }
            ];

            var sortObjArr = [];
            if(data.sortQuery && Object.keys(data.sortQuery).length && data.sortQuery.sortParams !== "newest") {
                var sortParamsMapping = {"hotness": "hotness"};
                var sortParam = sortParamsMapping[data.sortQuery.sortParams];
                var sortOrder = data.sortQuery.sortOrder === "asc" ? 1 : -1;                
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" }                         
                            }
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                } else {
                    sortObjArr = [{
                            $sort: { 
                            }
                        }
                    ];
                    eval("sortObjArr[0].$sort."+sortParam+"= sortOrder");   // Used eval to dynamic assign search params
                    sortObjArr[0].$sort.createdAt = -1;
                }
            } else {
                if(data.isTextBasedSearch) {
                    sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" }, 
                                "createdAt" : -1
                            }
                        }                        
                    ];
                } else {
                    sortObjArr = [{
                            $sort: { 
                                "createdAt" : -1
                            }
                        }
                    ];
                }
            }

            aggregationQueryString = aggregationQueryString.concat(sortObjArr);
            var privateGlyffs = yield glyff.aggregate(aggregationQueryString).exec();
            resolve(privateGlyffs);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*************************************************************************************************
 AGGREGATION FRIENDS GLYPH MODEL - GLYFFS OF THOSE ACTIVE USERS I FOLLOW (PUBLIC/PRIVATE)
 *************************************************************************************************/
exports.aggregationFetchFriendsGlyphModel = function(data, isTextBasedSearch) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if(reportedGlyffs && reportedGlyffs.length){
                data.queryCondition._id = {$nin : reportedGlyffs};
            }

            var friends = yield Follow.find({ "followerId": data.userId, "isValid": true }, { followeeId: 1 }).exec();
            var friendIds = _.map(friends, 'followeeId');

            // filtering active friends
            friends = yield User.find({ _id: { $in: friendIds }, deleteStatus: false}).exec();
            friendIds = _.map(friends, '_id');

            if(friendIds.length) {
                data.queryCondition.creatorID = { $in: friendIds };

                var aggregationQueryString = [
                    // Stage 1
                    {
                        $match: data.queryCondition
                    },
                    // Stage 4
                    {
                        $lookup: {
                            "from": "blocks",
                            "localField": "creatorID",
                            "foreignField": "blockedId",
                            "as": "block"
                        }
                    },
                    {
                        $project: {
                            // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                            "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.userId] } } },
                            'createdAt': 1,
                            'hotness': 1
                        }
                    },
                    // Stage 9
                    {
                        $match: {
                            "block.blockedById": { $nin: [data.userId] }
                        }
                    }
                ];

                var sortObjArr = [];
                if (data.sortQuery && Object.keys(data.sortQuery).length && data.sortQuery.sortParams !== "newest") {
                    var sortParamsMapping = { "hotness": "hotness" };
                    var sortParam = sortParamsMapping[data.sortQuery.sortParams];
                    var sortOrder = data.sortQuery.sortOrder === "asc" ? 1 : -1;
                    if (data.isTextBasedSearch) {
                        sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" },
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                        ];
                        eval("sortObjArr[0].$sort." + sortParam + "= sortOrder");   // Used eval to dynamic assign search params
                        sortObjArr[0].$sort.createdAt = -1;
                    } else {
                        sortObjArr = [{
                            $sort: {
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                        ];
                        eval("sortObjArr[0].$sort." + sortParam + "= sortOrder");   // Used eval to dynamic assign search params
                        sortObjArr[0].$sort.createdAt = -1;
                    }
                } else {
                    if (data.isTextBasedSearch) {
                        sortObjArr = [{
                            $sort: {
                                "score": { $meta: "textScore" },
                                "createdAt": -1
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                        ];
                    } else {
                        sortObjArr = [{
                            $sort: {
                                "createdAt": -1
                            }
                        },
                        {
                            $skip: data.paginationQuery.skip
                        },
                        {
                            $limit: data.paginationQuery.limit
                        }
                        ];
                    }
                }
                aggregationQueryString = aggregationQueryString.concat(sortObjArr);

                var friendsGlyffs = yield glyff.aggregate(aggregationQueryString).exec();
                var friendGlyffIds = _.map(friendsGlyffs, '_id');
                aggregationQueryString = [
                    {
                        $match: {
                            _id: { $in: friendGlyffIds }
                        }
                    },
                    // Stage 2
                    {
                        $lookup: {
                            "from": "users",
                            "localField": "creatorID",
                            "foreignField": "_id",
                            "as": "user"
                        }
                    },
                    // Stage 3
                    {
                        $lookup: {
                            "from": "favouriteglyphs",
                            "localField": "_id",
                            "foreignField": "glyphId",
                            "as": "favourite"
                        }
                    },
                    // Stage 5
                    {
                        $lookup: {
                            "from": "users",
                            "localField": "parentID",
                            "foreignField": "_id",
                            "as": "parentUser"
                        }
                    },
                    // Stage 6
                    {
                        $lookup: {
                            "from": "follows",
                            "localField": "creatorID",
                            "foreignField": "followeeId",
                            "as": "checkFollower"
                        }
                    },
                    // Stage 7
                    {
                        $lookup: {
                            "from": "votedglyffs",
                            "localField": "_id",
                            "foreignField": "glyffId",
                            "as": "votedGlyffs"
                        }
                    },
                    // Stage 7_1
                    {
                        $lookup: {
                            "from": "shareglyphs",
                            "localField": "_id",
                            "foreignField": "glyphId",
                            "as": "sharedGlyffs"
                        }
                    },
                    // Stage 8
                    {
                        $project: {
                            "_id": 1,
                            "isPublic": 1,
                            "creatorID": 1,
                            "parentID": 1,
                            "isEditable": 1,
                            "captionText": 1,
                            "isTemplate": 1,
                            "followeeCount": 1,
                            "followerCount": 1,
                            "popularity": 1,
                            "trendingCount": 1,
                            "sharedCount": 1,
                            "title": 1,
                            "creator": 1,
                            "type": 1,
                            "glyffGif": 1,
                            "glyffThumbnail": 1,
                            "glyffCustomised": 1,
                            "glyffCustomisedGif": 1,
                            "referenceGlyffId": 1,
                            "glyffOriginal": 1,
                            "createdAt": 1,
                            "updatedAt": 1,
                            "editCount": 1,
                            "commentCount": 1,
                            "viewCount": 1,
                            "user": { $arrayElemAt: ["$user", 0] },
                            "favouriteCount": 1,
                            "credNo": 1,
                            "hotness": 1,
                            "frameWidth": 1,
                            "frameHeight": 1,
                            "isReaction": 1,
                            "isSignatureEnable": 1,
                            "borderSize": 1,
                            "borderColor": 1,
                            "deviceType": 1,
                            "tags": 1,
                            "captions": 1,
                            "clonerIds": 1,
                            "parentUser": { $arrayElemAt: ["$parentUser", 0] },

                            // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                            "isFavourite": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$favourite", as: "favourite", cond: { $eq: ["$$favourite.userId", data.userId] } } } }, 0] }, then: true, else: false } },

                            // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                            "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.userId] } } } }, 0] }, then: true, else: false } },

                            // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                            "userVote": { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'upvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'downvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "downvote", else: "" } } } },

                            // isFollow is a flag which shows whether current user is following glyph creator or not
                            "isFollow": {
                                $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                            },

                            "isCommented": {
                                $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId", data.userId] } } } }, 0] }, then: 1, else: 0 }
                            },

                            "isCloned": {
                                $cond: { if: { "$in": [data.userId, "$clonerIds"] }, then: 1, else: 0 }
                            },
                            
                            // Last comment of the glyff                            
                            "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {}}}
                        }                        
                    },
                    // Stage 9
                    {
                        $lookup: {
                            "from": "users",
                            "localField": "lastComment.commenterId",
                            "foreignField": "_id",
                            "as": "commenter"
                        }
                    },
                    // Stage 10
                    {
                        $addFields: {
                            "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                        }
                    },
                    // Stage 11
                    {
                        $project: {
                            "commenter": 0,
                            "lastComment.commenterId.hash_password": 0,
                            "lastComment.commenterId.resetPasswordToken": 0,
                            "lastComment.commenterId.verificationToken": 0
                        }
                    }
                ];

                if (sortObjArr.length && sortObjArr[0].$sort.score)
                    delete sortObjArr[0].$sort.score;

                aggregationQueryString = aggregationQueryString.concat(sortObjArr.splice(0, 1));
                friendsGlyffs = yield glyff.aggregate(aggregationQueryString).exec();
                friendsGlyffs = JSON.parse(JSON.stringify(friendsGlyffs));

                yield Promise.each(friendsGlyffs, co.wrap(function* (glifObj, key) {
                    glifObj.user.isProfileHidden = glifObj.user.isProfileHidden ? glifObj.user.isProfileHidden : false;
                    glifObj.parentUser.isProfileHidden = glifObj.parentUser.isProfileHidden ? glifObj.parentUser.isProfileHidden : false;
                    if (!_.isEmpty(glifObj.lastComment)) {
                        glifObj.lastComment.commenterId.isProfileHidden = glifObj.lastComment.commenterId.isProfileHidden ? glifObj.lastComment.commenterId.isProfileHidden : false;
                    }
                }));

                resolve(friendsGlyffs);
            } else {
                reject({ errorCode: 404, errorMessage: "Follow people to see their memes here\n\n\nFind people:\nMenu / People / Apply\n\nView public memes:\nMenu / Discover / Apply" });
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*********************************
 AGGREGATION Count GLYPH MODEL
 *********************************/
exports.countFetchPrivateFriendsGlyphModel = function(data, isTextBasedSearch) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
        
            if(reportedGlyffs && reportedGlyffs.length){
                data.queryCondition._id = {$nin : reportedGlyffs};
            }
            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },    
                // Stage 2
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "creatorID",
                        "foreignField" : "_id",
                        "as" : "user"
                    }
                },    
                // Stage 3
                {
                    $lookup: {
                        "from" : "favouriteglyphs",
                        "localField" : "_id",
                        "foreignField" : "glyphId",
                        "as" : "favourite"
                    }
                },    
                // Stage 4
                {
                    $lookup: {
                        "from" : "blocks",
                        "localField" : "creatorID",
                        "foreignField" : "blockedId",
                        "as" : "block"
                    }
                },    
                // Stage 5
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "parentID",
                        "foreignField" : "_id",
                        "as" : "parentUser"
                    }
                },
                // Stage 6
                {
                    $lookup: {
                        "from" : "follows",
                        "localField" : "creatorID",
                        "foreignField" : "followeeId",
                        "as" : "checkFollower"
                    }
                },
                // Stage 7
                {
                    $lookup: {
                        "from" : "votedglyffs",
                        "localField" : "_id",
                        "foreignField" : "glyffId",
                        "as" : "votedGlyffs"
                    }
                },
                // Stage 8
                {
                    $project: {
                        "_id" : 1,
                        "isPublic" : 1,
                        "creatorID" : 1,
                        "parentID" : 1,
                        "isEditable" : 1,
                        "captionText" : 1,
                        "isTemplate" : 1,
                        "followeeCount" : 1,
                        "followerCount" : 1,
                        "popularity" : 1,
                        "trendingCount" : 1,
                        "sharedCount" : 1,
                        "title" : 1,
                        "creator" : 1,
                        "type" : 1,
                        "glyffGif": 1,
                        "glyffThumbnail" : 1,
                        "glyffCustomised" : 1,
                        "glyffCustomisedGif" : 1,
                        "referenceGlyffId" : 1,
                        "glyffOriginal" : 1,
                        "createdAt" : 1,
                        "updatedAt" : 1,
                        "editCount" : 1,
                        "commentCount" : 1,
                        "viewCount" : 1,
                        "user": { $arrayElemAt: [ "$user", 0 ] },
                        "parentUser" : { $arrayElemAt: [ "$parentUser", 0 ] },
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                        "captions": 1,
                        "clonerIds": 1,

                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isFavourite" : { $cond: { if: { $gt: [{$size :{ $filter: { input: "$favourite", as: "favourite", cond: { $eq: [ "$$favourite.userId",data.userId ] } } } }, 0 ] }, then: true, else: false } },                       

                        // userVote is a string which will have 3 values : 1) "" that means user has not voted glyph, 2) "upvote" that means user has upvoted the glyph and 3) "downvote" that means user has downvoted the glyph
                        "userVote": { "$cond": { if: { "$gt":[ {"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'upvote']},{"$eq":["$$upvotes.userId", data.userId]}] }}}},0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{"$size": {"$filter":{input:"$votedGlyffs", as: "upvotes", cond: { "$and":[{"$eq": ["$$upvotes.voteType", 'downvote']},{"$eq":["$$upvotes.userId", data.userId]}] }}}}, 0] }, then: "downvote", else: "" } } } },

                        // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow" : {
                            $cond : { if: { "$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}] }}}}, 0 ] }, then: {$cond : {if: {"$gt": [{ "$size":  {"$filter":{input:"$checkFollower", as: "checkFollower", cond: { "$and": [{"$eq":["$$checkFollower.followerId",data.userId]},{"$eq":["$$checkFollower.followeeId","$creatorID"]}, {"$eq":["$$checkFollower.isValid",true]}] }}}}, 0 ]},then: 2,else: 1}}, else: 0 } 
                        },

                        "isCommented" : {
                            $cond : {if: {"$gt": [{ "$size": {"$filter":{input:"$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId",data.userId]}}}}, 0 ]},then: 1,else: 0}
                        },

                        "isCloned" : {
                           $cond : {if: {"$in": [ data.userId, "$clonerIds" ]},then: 1,else: 0}
                        },

                        // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block" : { $filter: { input: "$block", as: "block", cond: { $eq: [ "$$block.blockedById",data.userId ] } } }
                    }
                },    
                // Stage 9
                {
                    $match: {
                        "block.blockedById": {$nin: [data.userId]}, 
                        "user.isPublic": false,
                        "user.deleteStatus": false
                    }
                },    
                // Stage 10
                {
                    $lookup: {
                        "from" : "follows",
                        "localField" : "creatorID",
                        "foreignField" : "followeeId",
                        "as" : "follow"
                    }
                },    
                // Stage 11
                {
                    $unwind: {
                        path : "$follow",
                    }
                },    
                // Stage 12
                {
                    $match: {"follow.followerId":data.userId, "follow.isValid": true}
                }   
            ];
            if(isTextBasedSearch) {
                aggregationQueryString = aggregationQueryString.concat([
                    // Stage 13
                    {
                        $sort: { score: { $meta: "textScore" } }
                    }
                ]);
            }
            aggregationQueryString = aggregationQueryString.concat([
                // Stage 14
                {
                    $count: "count"
                },    
            ]);
            var glyffCount = yield glyff.aggregate(aggregationQueryString).exec();
            resolve(glyffCount);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

exports.fetchAllGlyphByUserModel = function(glyphObj) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var glyffs = yield glyff.find(glyphObj.queryCondition).exec();
            resolve(glyffs);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

exports.countView = function(data,callback){
    return new Promise(function(resolve, reject){
        co(function*(){
            var viewCount = yield glyff.aggregate([
                {
                    $match: {
                        "creatorID":ObjectId(data),"isDeleted":false
                    }
                },       
                {
                    $group: {
                        _id:null,
                        total:{$sum:'$viewCount'}
                    }
                }
            ]).exec();
            resolve(viewCount);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
} 

exports.deleteMeme = function(glyffId){
    return new Promise(function(resolve, reject){
        co(function*(){
            var glyffObj = yield glyff.findOneAndUpdate({_id: glyffId},{$set: {isDeleted: true}}, {new: true}).exec();
            yield User.findOneAndUpdate({_id: glyffObj.creatorID},{$inc: { glyffCount: -1 }}).exec();
            resolve(true);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    }); 
}

exports.blockMemeByAdmin = function(userId, glyffId){
    return new Promise(function(resolve, reject){
        co(function*(){
            var reportedGlyffs = yield reportglyff.find({glyphId: glyffId}).exec();
            if(!reportedGlyffs.length) {
                var requestObject = {
                    userId: ObjectId(userId),
                    glyphId: ObjectId(glyffId)    
                }; 
                yield ReportGlyffModel.reportGlyffModel(requestObject);
            }
            yield reportglyff.update({glyphId: glyffId}, {$set: {reportApprovedByAdmin: true}},{multi: true}).exec();
            var glyffObj = yield glyff.findOne({_id: glyffId}).exec();
            yield User.findOneAndUpdate({_id: glyffObj.creatorID},{$inc: { glyffCount: -1 }}).exec();
            resolve(true);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        })
    }); 
}   

exports.unblockMemeByAdmin = function(glyffId){
    return new Promise(function(resolve, reject){
        co(function*(){
            var reportedGlyffs = yield reportglyff.find({glyphId: glyffId}).exec();
            if(!reportedGlyffs.length) {
                return reject({errorCode: 404, errorMessage: 'This meme is not blocked yet.'});
            }
            yield reportglyff.update({glyphId: glyffId}, {$set: {reportApprovedByAdmin: false}},{multi: true}).exec();
            var glyffObj = yield glyff.findOne({_id: glyffId}).exec();
            yield User.findOneAndUpdate({_id: glyffObj.creatorID},{$inc: { glyffCount: 1 }}).exec();
            resolve(true);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        })
    }); 
}

exports.checkGlyphCreator = function(userid,glyphid){
    return new Promise(function(resolve, reject){
        co(function*(){
            var glyff = yield glyff.find({_id: glyphid, creatorID: userid, isDeleted: false}).exec();
            resolve(glyff);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    }); 
};

/***************************************
 VOTED (UPVOTE/DOWNVOTE) GLYFF SCHEMA
 ***************************************/
var votedGlyffsSchema = new Schema({
    userId:   { type: Schema.Types.ObjectId, ref: 'users' },
    glyffId:  { type: Schema.Types.ObjectId, ref: 'glyffs' },
    voteType: { type: String, enum: ['upvote','downvote'] },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

var votedGlyffs = mongoose.model('votedGlyffs', votedGlyffsSchema);

/*********************************
 ADD/REMOVE VOTED GLYFF DOCUMENT
 *********************************/
exports.upvoteOrDownvoteGlyff = function(data) {  
  
 var hotness = 10;
var todayDate = new Date().toISOString().slice(0,10);
    return new Promise(function(resolve, reject){
        co(function*(){
            var votedGlyff = yield votedGlyffs.findOne({userId: data.userId, glyffId: data.glyffId}).exec();
            if(votedGlyff) {
                
                //Start New Changes
                   var currentHotness = yield glyff.find({$and:[{"_id":data.glyffId},{ 'hotnessEachDay': { $elemMatch: { "todayDate":todayDate} } }]},{"hotnessEachDay.$": 1 }).exec();
                
            if(currentHotness.length > 0)
                {
                
                    if(currentHotness[0].hotnessEachDay[0].hotness != 0)
                    hotness           =  currentHotness[0].hotnessEachDay[0].hotness - 10;
                    else
                    hotness           =  currentHotness[0].hotnessEachDay[0].hotness;
                    
                    var updateHotness =   yield glyff.update({"_id":data.glyffId,'hotnessEachDay.todayDate':todayDate},{$set:{"hotnessEachDay.$.hotness":hotness}}).exec();
               
                }
            else
                {
                  
                    
                 var pushNewHotness = yield glyff.update({"_id":data.glyffId},{$push:
		                  {"hotnessEachDay":{"hotness":hotness,"todayDate":todayDate}}});
                 
                }
              //End New Changes
                if(votedGlyff.voteType !== data.voteType) {
                    yield votedGlyff.remove();
                    resolve(true);
                } else {
                    resolve(true);
                }
            } 
            
            else {
               
                 //Start New Changes
                   var currentHotness = yield glyff.find({$and:[{"_id":data.glyffId},{ 'hotnessEachDay': { $elemMatch: { "todayDate":todayDate} } }]},{"hotnessEachDay.$": 1 }).exec();
              
            if(currentHotness.length > 0)
                {
                    
                    hotness           =  currentHotness[0].hotnessEachDay[0].hotness + 10;
                    var updateHotness =   yield glyff.updateOne({"_id":data.glyffId,'hotnessEachDay.todayDate':todayDate},{"hotnessEachDay.$.hotness":hotness}).exec();
                    
                }
            else
                {
                    console.log('test12')
                 var pushNewHotness = yield glyff.update({"_id":data.glyffId},{$push:
		                  {"hotnessEachDay":{"hotness":hotness,"todayDate":todayDate}}}).exec();
                 
                }
              //End New Changes
                
                var newVotedGlyff = new votedGlyffs(data);
                yield newVotedGlyff.save();
                resolve(true);
            }
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/****************************************************************
 * FUNCTION USE TO UPDATE MEME HOTNESS ACCORDING TO EACH DAY
 ****************************************************************/

function CalclatehotnessEachDay(glyffyId,date){
    var hotness = 10;
   
    return new Promise(function(resolve, reject) {
        co(function*(){
            var currentHotness = yield glyff.find({$and:[{"_id":glyffId},{ 'hotnessEachDay': { $elemMatch: { "todayDate":date} } }]},{"hotnessEachDay.$": 1 });
            if(currentHotness.length > 0)
                {
                    console.log('resdf')
                    hotness           =  currentHotness[0].hotnessEachDay[0].hotness + 10;
                    var updateHotness =   yield glyff.updateOne({"_id":glyffId},{ 'hotnessEachDay.todayDate':date},{"hotnessEachDay.$.hotness":hotness});
                    if(updateHotness)
                        resolve(true);
                }
            else
                {
                    
                    var pushNewHotness = yield glyff.update({"_id":glyffId},{$push:
		                  {"hotnessEachDay":{"hotness":hotness,"todayDate":date}}});
                    if(pushNewHotness)
                        resolve(true);
                }
           
        }).catch(function(err){
            reject(err);
        });
    });
}




/****************************************************************
 * FUNCTION TO CALCULATE AND UPDATE CREDNO AND HOTNESS OF GLYFF
 ****************************************************************/
exports.calculateAndUpdateGlyphCredNoAndHotness = function(glyffId) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var votedGlyffObj = yield votedGlyffs.aggregate([
                {
                    $match: {
                        glyffId: glyffId
                    }
                },
                {
                    $group: {
                        _id: "$glyffId",
                        upvotes : {"$sum":{"$cond":{if:{"$eq":["$voteType","upvote"]}, then:1, else:0}}},
                        downvotes : {"$sum":{"$cond":{if:{"$eq":["$voteType","downvote"]}, then:1, else:0}}},
                    }
                },
                {
                    $project: {
                        _id: 0,
                        credNo: {"$subtract": ["$upvotes","$downvotes"]}
                    }
                }
            ]).exec();
            var glyph = yield glyff.findOne({_id:glyffId}).exec();
            glyph.credNo = votedGlyffObj.length && Number(votedGlyffObj[0].credNo) > 0 ? Number(votedGlyffObj[0].credNo) : 0;
           
            var cloneCount = yield glyff.count({ parentGlyffId: glyffId });
            var shareCount = yield shareGlyphs.count({ glyphId: glyffId });

            glyph.hotness = calculateHotness(glyph.credNo, Number(glyph.favouriteCount), glyph.comments.length, cloneCount, shareCount, glyph.createdAt, new Date());
            glyph.updatedAt = new Date();
            //New changes By Jatin call calculate trendingness method
         /*  calculateandUpdateTrendingNess(glyffId);*/
            //End new changes
            yield glyph.save();
            resolve(glyph);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

function calculateHotness(credCount, favouriteCount, commentCount, cloneCount, shareCount, createdDate, updatedDate, decayStartDate) {
    createdDate = moment(createdDate);
    updatedDate = moment(updatedDate);

    decayStartDate = decayStartDate ? decayStartDate : decayStartDateForHotness;
    
    // old calculation for hotness
    // return [(credCount * credFactorForHotness) + (favouriteCount * favouriteFactorForHotness)] * (Math.pow([1 + decayRateForHotness] ,[(createdDate.diff(decayStartDateForHotness, 'days')) + (updatedDate.diff(createdDate, 'days') * recentFactorForHotness)]));

    // console.log('cred --- count -> ', credCount, ' credFactor -> ', credFactorForHotness, ' multiplication -> ', (credCount * credFactorForHotness));
    // console.log('fav --- count -> ', favouriteCount, ' favFactor -> ', favouriteFactorForHotness, ' multiplication -> ', (favouriteCount * favouriteFactorForHotness))
    // console.log('comment --- count -> ', commentCount, ' commentFactor -> ', commentFactorForHotness, ' multiplication -> ', (commentCount * commentFactorForHotness))
    // console.log('clone --- count -> ', cloneCount, ' cloneFactor -> ', cloneFactorForHotness, ' multiplication -> ', (cloneCount * cloneFactorForHotness))
    // console.log('share --- count -> ', shareCount, ' shareFactor -> ', shareFactorForHotness, ' multiplication -> ', (shareCount * shareFactorForHotness))
    // console.log('decay Rate --- ', decayRateForHotness, ' decayStartDate - ', decayStartDate, ' createdDate - ', createdDate, ' updatedDate - ', updatedDate, ' recentFactorForHotness - ', recentFactorForHotness)
    // console.log(' power - ', (Math.pow([1 + decayRateForHotness], [(createdDate.diff(decayStartDate, 'days')) + (updatedDate.diff(createdDate, 'days') * recentFactorForHotness)])))

    return [(credCount * credFactorForHotness) + (favouriteCount * favouriteFactorForHotness) + (commentCount * commentFactorForHotness) + (cloneCount * cloneFactorForHotness) + (shareCount * shareFactorForHotness)] * (Math.pow([1 + decayRateForHotness], [(createdDate.diff(decayStartDate, 'days')) + (updatedDate.diff(createdDate, 'days') * recentFactorForHotness)]));
}


/****************************************************************************************************************
 * Get YesterDay Date
****************************************************************************************************************/
function YesterDate(){
	  var date = new Date();

var year = date.getFullYear();

var month = date.getMonth() + 1;
month = (month < 10 ? "0" : "") + month;

var day  = date.getDate()-1;
day = (day < 10 ? "0" : "") + day;
	

var a= year + "-" + month + "-" + day;
    console.log(a)
    return a; 
}


/****************************************************************************************************************
 * Get before YesterDay Date
****************************************************************************************************************/
function beforeYesterDate(){
	  var date = new Date();

var year = date.getFullYear();

var month = date.getMonth() + 1;
month = (month < 10 ? "0" : "") + month;

var day  = date.getDate()-2;
day = (day < 10 ? "0" : "") + day;
	

var a= year + "-" + month + "-" + day;
    return a; 
}










/**************************************************************************
 * FUNCTION TO CALCULATE AND UPDATE FAVOURITECOUNT AND HOTNESS OF GLYFF
 *************************************************************************/
exports.calculateAndUpdateGlyphFavouriteCountAndHotness = function(glyffId) {
var hotness   = 10;
var todayDate = new Date().toISOString().slice(0,10);
    return new Promise(function(resolve, reject){
        co(function*(){
            var favouriteGlyffs = yield favouriteGlyphs.find({glyphId: glyffId},{createdAt: 1}).sort({createdAt: -1}).exec();
            var glyph = yield glyff.findOne({_id:glyffId}).exec();
            glyph.favouriteCount = favouriteGlyffs.length;
            
              //Start New Changes
                   var currentHotness = yield glyff.find({$and:[{"_id":glyffId},{ 'hotnessEachDay': { $elemMatch: { "todayDate":todayDate} } }]},{"hotnessEachDay.$": 1 }).exec();
               
            if(currentHotness.length > 0)
                {
                    
                    hotness           =  currentHotness[0].hotnessEachDay[0].hotness + 10;
                    var updateHotness =   yield glyff.updateOne({"_id":glyffId,'hotnessEachDay.todayDate':todayDate},{"hotnessEachDay.$.hotness":hotness}).exec();
                    
                }
            else
                {
                    
                 var pushNewHotness = yield glyff.update({"_id":glyffId},{$push:
		                  {"hotnessEachDay":{"hotness":hotness,"todayDate":todayDate}}}).exec();
                 
                }
              //End New Changes
            
            
            var cloneCount = yield glyff.count({ parentGlyffId: glyffId });
            var shareCount = yield shareGlyphs.count({ glyphId: glyffId });

            glyph.hotness = calculateHotness(Number(glyph.credNo), favouriteGlyffs.length, glyph.comments.length, cloneCount, shareCount, glyph.createdAt, new Date());
            glyph.updatedAt = new Date();
           // glyph.trendingNess = calculateandUpdateTrendingNess(glyffId);
            yield glyph.save();
            resolve(glyph);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}


/**************************************************************************
* FUNCTION TO CALCULATE AND UPDATE GLYFF TRENDINGNESS
**************************************************************************/

exports.calculateandUpdateTrendingNess = function(glyffId) {
    console.log(glyffId)
    return new Promise(function(resolve, reject){
        co(function*(){
	  var date = new Date();
//yestedate
var year = date.getFullYear();

var month = date.getMonth() + 1;
month = (month < 10 ? "0" : "") + month;

var day  = date.getDate()-1;
day = (day < 10 ? "0" : "") + day;
	

var a= year + "-" + month + "-" + day;
  
 //beforeyester   
   var date1 = new Date();

var year1 = date.getFullYear();

var month1 = date.getMonth() + 1;
month = (month < 10 ? "0" : "") + month;

var day1  = date.getDate()-2;
day = (day < 10 ? "0" : "") + day;
	

var a1= year + "-" + month + "-" + day;
     
    
    
    
    var todayHotness,yesterHotness,beforeYesterHotness,trendingNess;
  var  currentDate        = new Date();
  var todayDate           = new Date().toISOString().slice(0,10); 
/*  var yesterDayDate       = await yesterDate(); 
  var beforeYesterDayDate = await beforeYesterDate(); */
    
    var currentHotness =  yield glyff.find({$and:[{"_id":glyffId},{'hotnessEachDay': { $elemMatch: { "todayDate":todayDate} } }]},{"hotnessEachDay.$": 1 }).exec();
    console.log(currentHotness.length)
  
    if(currentHotness.length >0)
        {
            console.log(currentHotness[0].hotnessEachDay[0].hotness )
        
            todayHotness         = currentHotness[0].hotnessEachDay[0].hotness;
            var yesterDayHotness =  yield glyff.find({$and:[{"_id":glyffId},{ 'hotnessEachDay': { $elemMatch: { "todayDate":a} } }]},{"hotnessEachDay.$": 1 }).exec();
            
                  if(yesterDayHotness.length >0)
                     {
                         yesterHotness             = yesterDayHotness[0].hotnessEachDay[0].hotness;
                        var beforeYesterDayHotness =  yield glyff.find({$and:[{"_id":glyffId},{ 'hotnessEachDay': { $elemMatch: { "todayDate":a1} } }]},{"hotnessEachDay.$": 1 }).exec();
                          if(beforeYesterDayHotness.length >0)
                              beforeYesterHotness   = beforeYesterDayHotness[0].hotnessEachDay[0].hotness;
                          else
                             beforeYesterHotness    = 1;
                         
                         trendingNess = (todayHotness/((currentDate.getHours/24)*100)+yesterHotness/beforeYesterHotness);
                         console.log(trendingNess)
                         var updateGlyfyy = yield glyff.update({"_id":glyffId},{$set:{trendingNess:trendingNess}}).exec();
                         if(updateGlyfyy)
                             resolve(true);
                         else
                             resolve(false);
                              
                     }
            else
            resolve(false);
                
        }
    else 
       resolve(false);
            
               }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}







/**************************************************************************
 * FUNCTION TO CALCULATE THE TRENDINGNESS OF GLYFF
 *************************************************************************/

exports.calculateTrendingness = function(glyffId){
    return new Promise(function(resolve,reject){
        co(function *(){
            var date = new Date();
            var todayDate     = new Date().toISOString().slice(0,10);
            var yesterDayDate = date.setDate(date.getDate() - 1).toISOString().slice(0,10);
            
            var hotnessCurrendate = glyffy.find({$and:[{_id:glyffId},{hotnessEachDay:{$elemMatch:{"todayDate":todayDate}}}]},{"hotnessEachDay.$":1})
             var hotnessYesterDay = glyffy.find({$and:[{_id:glyffId},{hotnessEachDay:{$elemMatch:{"todayDate":todayDate}}}]},{"hotnessEachDay.$":1})
             var hotnessDayBeforeYesterDay = glyffy.find({$and:[{_id:glyffId},{hotnessEachDay:{$elemMatch:{"todayDate":todayDate}}}]},{"hotnessEachDay.$":1})
            
        })
        
    })
}



/*****************************************************************************
 * COMMON FUNCTION TO CALCULATE CREDNO, FAVOURITECOUNT AND HOTNESS OF USER
 *****************************************************************************/
exports.calculateAndUpdateUserCredNoFavouriteCountAndHotness = function(userId){
    return new Promise(function(resolve, reject){
        co(function*(){
            // Old Query
            /* var glyph = yield glyff.aggregate([
                {
                    $match: {
                        creatorID: userId
                    }
                },
                {
                    $group: {
                        _id: "$creatorID",
                        credNo : {"$sum": "$credNo"},
                        favouriteCount : {"$sum": "$favouriteCount"},
                    }
                },
                {
                    $project: {
                        _id: 0,
                        favouriteCount: 1,
                        credNo: 1,
                        hotness : {"$add": [{"$sum": "$credNo"},{"$multiply":[{"$sum": "$favouriteCount"}, favouriteFactorForHotness]}]}
                    }
                }
            ]).exec(); */

            var glyph = yield glyff.aggregate([
                {
                    $match: {
                        creatorID: userId
                    }
                },
                {
                    $group: {
                        _id: "$creatorID",
                        // credNo : {"$sum": "$credNo"},
                        hotness : {"$sum": "$hotness"},
                        favouriteCount : {"$sum": "$favouriteCount"}
                    }
                },
                {
                    $project: {
                        _id: 0,
                        hotness: 1,
                        favouriteCount: 1,
                        // credNo: 1
                    }
                }
            ]).exec();

            var usersWithLowerHotness = yield User.count({ hotness: { $lt: Number(glyph[0].hotness) }, deleteStatus: false});
            var totalNumberOfUsers = yield User.count({ hotness: { $ne: 0 },deleteStatus: false });
            // console.log('usersWithLowerHotness --- ', usersWithLowerHotness)
            // console.log('totalNumberOfUsers --- ', totalNumberOfUsers)
            // console.log('hotness --- ', Number(glyph[0].hotness))
            // console.log(usersWithLowerHotness / totalNumberOfUsers)
            var credNo = (usersWithLowerHotness / totalNumberOfUsers) * 100;
console.log(credNo)
            yield User.findOneAndUpdate({_id: userId},{$set: {credNo: credNo, hotness:Number(glyph[0].hotness), favouriteCount: Number(glyph[0].favouriteCount), updateAt: new Date()}}, {new:true}).exec();
            resolve(true);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*************************************
 * FUNCTION TO FETCH COMMENTS FROM GLYFF
 ************************************/
exports.fetchComments = function(glyffId, offset, limit) {
    return new Promise(function(resolve, reject){
        co(function*(){
            //var glyffObj = yield glyff.findOne({_id: glyffId}).populate("comments.commenterId",{hash_password: 0, resetPasswordToken: 0}).populate("comments.mentionsArr.mentionId",{name: 1}).exec();
            var glyffObj = yield glyff.findOne({_id: glyffId}).populate("comments.commenterId",{hash_password: 0, resetPasswordToken: 0}).exec();
            glyffObj.comments.reverse();
            var comments = glyffObj.comments.slice(offset, (offset+limit));
            resolve(comments);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*************************************
 * FUNCTION TO ADD COMMENTS TO GLYFF
 ************************************/
exports.addComment = function(glyffId, commentObject) {
 var hotness  = 10;
var todayDate = new Date().toISOString().slice(0,10);
    return new Promise(function(resolve, reject){
        co(function*(){
            var glyffObj = yield glyff.findOneAndUpdate({_id: glyffId}, {$push: {comments: commentObject}, $inc: {commentCount: 1}, $set: {updatedAt: new Date()}},{new: true}).populate("comments.commenterId",{hash_password: 0, resetPasswordToken: 0}).exec();
            var newlyAddedComment = glyffObj.comments[glyffObj.comments.length-1];
             //Start New Changes
                   var currentHotness = yield glyff.find({$and:[{"_id":glyffId},{ 'hotnessEachDay': { $elemMatch: { "todayDate":todayDate} } }]},{"hotnessEachDay.$": 1 }).exec();
              
            if(currentHotness.length > 0)
                {
                    
                    hotness           =  currentHotness[0].hotnessEachDay[0].hotness + 10;
                    var updateHotness =   yield glyff.updateOne({"_id":glyffId,'hotnessEachDay.todayDate':todayDate},{"hotnessEachDay.$.hotness":hotness}).exec();
                    
                }
            else
                {
                    
                 var pushNewHotness = yield glyff.update({"_id":glyffId},{$push:
		                  {"hotnessEachDay":{"hotness":hotness,"todayDate":todayDate}}}).exec();
                 
                }
              //End New Changes
            
            //console.log('inside addComment --- ', glyffId, commentObject, comment);
            resolve(newlyAddedComment);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*************************************
 * FUNCTION TO DELETE COMMENTS TO GLYFF
 ************************************/
exports.deleteComment = function(userId, commentId, glyphId) {
var hotness   = 10;
var todayDate = new Date().toISOString().slice(0,10);
    return new Promise(function(resolve, reject){
        co(function*(){
            var result = yield glyff.update({"comments._id": ObjectId(commentId),$or:[{"comments.commenterId": ObjectId(userId)},{"creatorID": ObjectId(userId)}]},{$pull:{ comments: {_id: ObjectId(commentId)}}, $inc: {commentCount: -1}, $set: {updatedAt: new Date()}},{multi:true});
            var glyph = yield glyff.findOne({_id: glyphId},{comments:1}).exec();
            var comments = _.filter(glyph.comments, function(comment) { 
                return comment.commenterId.toString() === userId.toString(); 
            });
            var lastComment = glyph.comments.length ? glyph.comments[glyph.comments.length - 1] : {};
            if(!_.isEmpty(lastComment)) {
                var user = yield User.findOne({ _id: lastComment.commenterId, deleteStatus: false }, { hash_password: 0, resetPasswordToken: 0, verificationToken: 0 });
                lastComment.commenterId = !_.isEmpty(user) ? user : commenterId;
            }
                   //Start New Changes
                   var currentHotness = yield glyff.find({$and:[{"_id":glyphId},{ 'hotnessEachDay': { $elemMatch: { "todayDate":todayDate} } }]},{"hotnessEachDay.$": 1 }).exec();
                
            if(currentHotness.length > 0)
                {
                
                    if(currentHotness[0].hotnessEachDay[0].hotness != 0)
                    hotness           =  currentHotness[0].hotnessEachDay[0].hotness - 10;
                    else
                    hotness           =  currentHotness[0].hotnessEachDay[0].hotness;
                    
                    var updateHotness =   yield glyff.update({"_id":glyphId,'hotnessEachDay.todayDate':todayDate},{$set:{"hotnessEachDay.$.hotness":hotness}}).exec();
               
                }

            
            resolve({ isCommented: comments.length ? 1 : 0, lastComment: lastComment});
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/****************************************** 
 * FUNCTION TO GET GLYFF(S) WITH PROJECTION
 ******************************************/
exports.getGlyffs = function(queryObj, projectionObj) {
    return new Promise(function(resolve, reject) {
        co(function*(){
            var glyffs = yield glyff.find(queryObj, projectionObj).exec();
            return resolve(glyffs);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/***********************
 FETCH POPULAR GLYFFS 
 **********************/
exports.fetchPopularGlyffs = function (data) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            data.queryCondition = data.queryCondition || {};

            var deletedUsers = yield User.find({ deleteStatus: true }, { _id: 1 });
            var deletedUserIds = _.map(deletedUsers, '_id');

            // new logic to skip the glyff of those private users whom i dont follow
            var privateNotFollowingUsersArr = yield privateNotFollowingUsers(data.userId);
            deletedUserIds = _.uniq(_.concat(deletedUserIds, privateNotFollowingUsersArr));
            
            data.queryCondition.creatorID = { $nin: deletedUserIds };
            
            var startDate = new Date();
            if(data.duration === 'week') 
                startDate.setDate(startDate.getDate() - 7);
            else
                startDate.setDate(startDate.getDate() - 30);

            var glyffIds = [];

            var votedGlyffsInGivenDateRange = yield votedGlyffs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyffId",
                        upvotes: { "$sum": { "$cond": { if: { "$eq": ["$voteType", "upvote"] }, then: 1, else: 0 } } },
                        downvotes: { "$sum": { "$cond": { if: { "$eq": ["$voteType", "downvote"] }, then: 1, else: 0 } } },
                    }
                },
                {
                    $project: {
                        _id: 1,
                        credNo: { $cond: { if: { $gt: [{ "$subtract": ["$upvotes", "$downvotes"] }, 0] }, then: { "$subtract": ["$upvotes", "$downvotes"] }, else: 0 } }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(votedGlyffsInGivenDateRange, '_id'));

            var favouriteGlyffsInGivenDateRange = yield favouriteGlyphs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyphId",
                        favouriteCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(favouriteGlyffsInGivenDateRange, '_id'));

            var pipeline = [
                { "$match": { "comments.commentedAt": { $gte: startDate } } },
                {
                    "$project": {
                        "commentCount": {
                            "$size": {
                                "$filter": {
                                    "input": "$comments",
                                    "as": "comments",
                                    "cond": {
                                        $gte: ["$$comments.commentedAt", startDate]
                                    }
                                }
                            }
                        }
                    }
                }
            ];
            var commentedGlyffsInGivenDateRange = yield glyff.aggregate(pipeline);
            glyffIds = _.concat(glyffIds, _.map(commentedGlyffsInGivenDateRange, '_id'));

            var cloneGlyffsInGivenDateRange = yield glyff.aggregate([
                {
                    $match: {
                        parentGlyffId: { $exists: true }, 
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$parentGlyffId",
                        cloneCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(cloneGlyffsInGivenDateRange, '_id'));


            var sharedGlyffsInGivenDateRange = yield shareGlyphs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyphId",
                        sharedCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(sharedGlyffsInGivenDateRange, '_id'));

            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if (reportedGlyffs && reportedGlyffs.length) {
                // Removing Reported glyffs from array
                glyffIds = _.difference(glyffIds, reportedGlyffs);
            }
            data.queryCondition._id = {$in: glyffIds};
        
              var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "users",
                        "localField": "creatorID",
                        "foreignField": "_id",
                        "as": "user"
                    }
                },
                 {
                    $lookup: {
                        "from": "favouriteglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "favourite"
                    }
                },
                // Stage 3
                
                // Stage 5
                {
                    $lookup: {
                        "from": "blocks",
                        "localField": "creatorID",
                        "foreignField": "blockedId",
                        "as": "block"
                    }
                },
                // Stage 4
                
                // Stage 5
                {
                    $lookup: {
                        "from": "shareglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "sharedGlyffs"
                    }
                },
                // Stage 6
                 {
                    $lookup: {
                        "from": "votedglyffs",
                        "localField": "_id",
                        "foreignField": "glyffId",
                        "as": "votedGlyffs"
                    }
                },
                {
                    $lookup: {
                        "from": "users",
                        "localField": "parentID",
                        "foreignField": "_id",
                        "as": "parentUser"
                    }
                },
               {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                },
                
               
                // Stage 8
                {
                    $project: {
                        "_id": 1,
                        "isPublic": 1,
                        "creatorID": 1,
                        "parentID": 1,
                        "isEditable": 1,
                        "captionText": 1,
                        "isTemplate": 1,
                        "followeeCount": 1,
                        "followerCount": 1,
                        "popularity": 1,
                        "trendingCount": 1,
                        "sharedCount": 1,
                        "title": 1,
                        "creator": 1,
                        "type": 1,
                        "glyffGif": 1,
                        "glyffThumbnail": 1,
                        "glyffCustomised": 1,
                        "glyffCustomisedGif": 1,
                        "referenceGlyffId": 1,
                        "glyffOriginal": 1,
                        "createdAt": 1,
                        "updatedAt": 1,
                        "editCount": 1,
                        "commentCount": 1,
                        "viewCount": 1,
                        "user": { $arrayElemAt: ["$user", 0] },
                        "parentUser": { $arrayElemAt: ["$parentUser", 0] },
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                       
                         "isFavourite": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$favourite", as: "favourite", cond: { $eq: ["$$favourite.userId", data.userId] } } } }, 0] }, then: true, else: false } },
                          "isCommented": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId", data.userId] } } } }, 0] }, then: 1, else: 0 }
                        },
                        "privateUserFollowing": { "$size": { "$filter": { "input": "$checkFollower", "as": "checkFollower", "cond": { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } },
                        "userVote": { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'upvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'downvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "downvote", else: "" } } } },
                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                         // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.userId] } } } }, 0] }, then: true, else: false } },
                     // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.userId] } } },
                        "isCloned": {
                            $cond: { if: { "$in": [data.userId, "$clonerIds"] }, then: 1, else: 0 }
                         },
                           // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                        },
                        // Last comment of the glyff                            
                        "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {} } }
                    }
                },
                // Stage 9
                {
                    $match: {
                        "block.blockedById": { $nin: [data.userId] }
                    }
                },
                // Stage 10
                {
                    $lookup: {
                        "from": "users",
                        "localField": "lastComment.commenterId",
                        "foreignField": "_id",
                        "as": "commenter"
                    }
                },
                // Stage 11
                {
                    $addFields: {
                        "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                    }
                },
                // Stage 12
                {
                    $project: {
                        "commenter": 0,
                        "lastComment.commenterId.hash_password": 0,
                        "lastComment.commenterId.resetPasswordToken": 0,
                        "lastComment.commenterId.verificationToken": 0
                    }
                }                
            ];

        var aggregationQueryStringFirst = [
                  {
                    $match: data.queryCondition
                },
                 {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                } 
                ];


            



            var allPopularGlyffs = yield glyff.aggregate(aggregationQueryString).allowDiskUse(true).exec();
           //var allPopularGlyffsFirst = yield glyff.aggregate(aggregationQueryStringFirst).allowDiskUse(true).exec();
            


              /*   allPopularGlyffs = _.concat(allPopularGlyffs, allPopularGlyffsFirst);
                console.log(allPopularGlyffs)*/
            var credCount = 0, favouriteCount = 0, commentCount = 0, cloneCount = 0, shareCount = 0, createdDate, updatedDate; 
         /*   yield Promise.each(allPopularGlyffs, co.wrap(function* (glif) {
                credCount = _.filter(votedGlyffsInGivenDateRange, (votedGlyff) => { return votedGlyff._id.toString() === glif._id.toString() });
                credCount = credCount.length ? credCount[0].credNo : 0;

                favouriteCount = _.filter(favouriteGlyffsInGivenDateRange, (favGlyff) => { return favGlyff._id.toString() === glif._id.toString() });
                favouriteCount = favouriteCount.length ? favouriteCount[0].favouriteCount : 0;

                commentCount = _.filter(commentedGlyffsInGivenDateRange, (commentedGlyff) => { return commentedGlyff._id.toString() === glif._id.toString() });
                commentCount = commentCount.length ? commentCount[0].commentCount : 0;

                cloneCount = _.filter(cloneGlyffsInGivenDateRange, (clonedGlyff) => { return clonedGlyff._id.toString() === glif._id.toString() });
                cloneCount = cloneCount.length ? cloneCount[0].cloneCount : 0;

                shareCount = _.filter(sharedGlyffsInGivenDateRange, (sharedGlyff) => { 
                    return sharedGlyff._id.toString() === glif._id.toString() 
                });
                shareCount = shareCount.length ? shareCount[0].sharedCount : 0;
                
                createdDate = moment(glif.createdAt);
                updatedDate = moment(glif.updatedAt);
                 
                glif.hotness = [(credCount * credFactorForHotness) + (favouriteCount * favouriteFactorForHotness) + (commentCount * commentFactorForHotness) + (cloneCount * cloneFactorForHotness) + (shareCount * shareFactorForHotness)] * (Math.pow([1 + decayRateForHotness], [(createdDate.diff(startDate, 'days')) + (updatedDate.diff(createdDate, 'days') * recentFactorForHotness)]));
            }));
*/
            allPopularGlyffs = _.orderBy(allPopularGlyffs, ['hotness'], ['desc']);
            var popularGlyffs = [];
           
            if(data.limit) {
                data.skip = data.skip ? data.skip : 0;
                popularGlyffs = allPopularGlyffs.slice(data.skip, data.skip + data.limit);
            } else {
                popularGlyffs = allPopularGlyffs;
            }
            popularGlyffs = JSON.parse(JSON.stringify(popularGlyffs));

            yield Promise.each(popularGlyffs, co.wrap(function* (glifObj, key) {
                glifObj.user.isProfileHidden = glifObj.user.isProfileHidden ? glifObj.user.isProfileHidden : false;
                glifObj.parentUser.isProfileHidden = glifObj.parentUser.isProfileHidden ? glifObj.parentUser.isProfileHidden : false;
                if(!_.isEmpty(glifObj.lastComment)) {
                    glifObj.lastComment.commenterId.isProfileHidden = glifObj.lastComment.commenterId.isProfileHidden ? glifObj.lastComment.commenterId.isProfileHidden : false;
                }
            }));



            resolve(popularGlyffs);
        }).catch(function (err) {
            console.log("eerr")
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}

/***********************
 FETCH TOP GLYFFS 
 **********************/
exports.fetchTopGlyffs = function (data) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            data.queryCondition = data.queryCondition || {};

            var deletedUsers = yield User.find({ deleteStatus: true }, { _id: 1 });
            var deletedUserIds = _.map(deletedUsers, '_id');

            // new logic to skip the glyff of those private users whom i dont follow
            var privateNotFollowingUsersArr = yield privateNotFollowingUsers(data.userId);
            deletedUserIds = _.uniq(_.concat(deletedUserIds, privateNotFollowingUsersArr));
            
            data.queryCondition.creatorID = { $nin: deletedUserIds };
            
            var startDate = new Date();
            if(data.duration === 'week') 
                startDate.setDate(startDate.getDate() - 7);
            else
                startDate.setDate(startDate.getDate() - 30);

            var glyffIds = [];

            var votedGlyffsInGivenDateRange = yield votedGlyffs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyffId",
                        upvotes: { "$sum": { "$cond": { if: { "$eq": ["$voteType", "upvote"] }, then: 1, else: 0 } } },
                        downvotes: { "$sum": { "$cond": { if: { "$eq": ["$voteType", "downvote"] }, then: 1, else: 0 } } },
                    }
                },
                {
                    $project: {
                        _id: 1,
                        credNo: { $cond: { if: { $gt: [{ "$subtract": ["$upvotes", "$downvotes"] }, 0] }, then: { "$subtract": ["$upvotes", "$downvotes"] }, else: 0 } }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(votedGlyffsInGivenDateRange, '_id'));

            var favouriteGlyffsInGivenDateRange = yield favouriteGlyphs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyphId",
                        favouriteCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(favouriteGlyffsInGivenDateRange, '_id'));

            var pipeline = [
                { "$match": { "comments.commentedAt": { $gte: startDate } } },
                {
                    "$project": {
                        "commentCount": {
                            "$size": {
                                "$filter": {
                                    "input": "$comments",
                                    "as": "comments",
                                    "cond": {
                                        $gte: ["$$comments.commentedAt", startDate]
                                    }
                                }
                            }
                        }
                    }
                }
            ];
            var commentedGlyffsInGivenDateRange = yield glyff.aggregate(pipeline);
            glyffIds = _.concat(glyffIds, _.map(commentedGlyffsInGivenDateRange, '_id'));

            var cloneGlyffsInGivenDateRange = yield glyff.aggregate([
                {
                    $match: {
                        parentGlyffId: { $exists: true }, 
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$parentGlyffId",
                        cloneCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(cloneGlyffsInGivenDateRange, '_id'));


            var sharedGlyffsInGivenDateRange = yield shareGlyphs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyphId",
                        sharedCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(sharedGlyffsInGivenDateRange, '_id'));

            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if (reportedGlyffs && reportedGlyffs.length) {
                // Removing Reported glyffs from array
                glyffIds = _.difference(glyffIds, reportedGlyffs);
            }
            data.queryCondition._id = {$in: glyffIds};
        
              var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "users",
                        "localField": "creatorID",
                        "foreignField": "_id",
                        "as": "user"
                    }
                },
                 {
                    $lookup: {
                        "from": "favouriteglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "favourite"
                    }
                },
                // Stage 3
                
                // Stage 5
                {
                    $lookup: {
                        "from": "blocks",
                        "localField": "creatorID",
                        "foreignField": "blockedId",
                        "as": "block"
                    }
                },
                // Stage 4
                
                // Stage 5
                {
                    $lookup: {
                        "from": "shareglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "sharedGlyffs"
                    }
                },
                // Stage 6
                 {
                    $lookup: {
                        "from": "votedglyffs",
                        "localField": "_id",
                        "foreignField": "glyffId",
                        "as": "votedGlyffs"
                    }
                },
                {
                    $lookup: {
                        "from": "users",
                        "localField": "parentID",
                        "foreignField": "_id",
                        "as": "parentUser"
                    }
                },
               {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                },
                
               
                // Stage 8
                {
                    $project: {
                        "_id": 1,
                        "isPublic": 1,
                        "creatorID": 1,
                        "parentID": 1,
                        "isEditable": 1,
                        "captionText": 1,
                        "isTemplate": 1,
                        "followeeCount": 1,
                        "followerCount": 1,
                        "popularity": 1,
                        "trendingCount": 1,
                        "sharedCount": 1,
                        "title": 1,
                        "creator": 1,
                        "type": 1,
                        "glyffGif": 1,
                        "glyffThumbnail": 1,
                        "glyffCustomised": 1,
                        "glyffCustomisedGif": 1,
                        "referenceGlyffId": 1,
                        "glyffOriginal": 1,
                        "createdAt": 1,
                        "updatedAt": 1,
                        "editCount": 1,
                        "commentCount": 1,
                        "viewCount": 1,
                        "user": { $arrayElemAt: ["$user", 0] },
                        "parentUser": { $arrayElemAt: ["$parentUser", 0] },
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                       
                         "isFavourite": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$favourite", as: "favourite", cond: { $eq: ["$$favourite.userId", data.userId] } } } }, 0] }, then: true, else: false } },
                          "isCommented": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId", data.userId] } } } }, 0] }, then: 1, else: 0 }
                        },
                        "privateUserFollowing": { "$size": { "$filter": { "input": "$checkFollower", "as": "checkFollower", "cond": { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } },
                        "userVote": { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'upvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'downvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "downvote", else: "" } } } },
                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                         // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.userId] } } } }, 0] }, then: true, else: false } },
                     // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.userId] } } },
                        "isCloned": {
                            $cond: { if: { "$in": [data.userId, "$clonerIds"] }, then: 1, else: 0 }
                         },
                           // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                        },
                        // Last comment of the glyff                            
                        "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {} } }
                    }
                },
                // Stage 9
                {
                    $match: {
                        "block.blockedById": { $nin: [data.userId] }
                    }
                },
                // Stage 10
                {
                    $lookup: {
                        "from": "users",
                        "localField": "lastComment.commenterId",
                        "foreignField": "_id",
                        "as": "commenter"
                    }
                },
                // Stage 11
                {
                    $addFields: {
                        "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                    }
                },
                // Stage 12
                {
                    $project: {
                        "commenter": 0,
                        "lastComment.commenterId.hash_password": 0,
                        "lastComment.commenterId.resetPasswordToken": 0,
                        "lastComment.commenterId.verificationToken": 0
                    }
                }                
            ];

        var aggregationQueryStringFirst = [
                  {
                    $match: data.queryCondition
                },
                 {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                } 
                ];


            



            var allPopularGlyffs = yield glyff.aggregate(aggregationQueryString).allowDiskUse(true).exec();
           //var allPopularGlyffsFirst = yield glyff.aggregate(aggregationQueryStringFirst).allowDiskUse(true).exec();
            


              /*   allPopularGlyffs = _.concat(allPopularGlyffs, allPopularGlyffsFirst);
                console.log(allPopularGlyffs)*/
            var credCount = 0, favouriteCount = 0, commentCount = 0, cloneCount = 0, shareCount = 0, createdDate, updatedDate; 
         /*   yield Promise.each(allPopularGlyffs, co.wrap(function* (glif) {
                credCount = _.filter(votedGlyffsInGivenDateRange, (votedGlyff) => { return votedGlyff._id.toString() === glif._id.toString() });
                credCount = credCount.length ? credCount[0].credNo : 0;

                favouriteCount = _.filter(favouriteGlyffsInGivenDateRange, (favGlyff) => { return favGlyff._id.toString() === glif._id.toString() });
                favouriteCount = favouriteCount.length ? favouriteCount[0].favouriteCount : 0;

                commentCount = _.filter(commentedGlyffsInGivenDateRange, (commentedGlyff) => { return commentedGlyff._id.toString() === glif._id.toString() });
                commentCount = commentCount.length ? commentCount[0].commentCount : 0;

                cloneCount = _.filter(cloneGlyffsInGivenDateRange, (clonedGlyff) => { return clonedGlyff._id.toString() === glif._id.toString() });
                cloneCount = cloneCount.length ? cloneCount[0].cloneCount : 0;

                shareCount = _.filter(sharedGlyffsInGivenDateRange, (sharedGlyff) => { 
                    return sharedGlyff._id.toString() === glif._id.toString() 
                });
                shareCount = shareCount.length ? shareCount[0].sharedCount : 0;
                
                createdDate = moment(glif.createdAt);
                updatedDate = moment(glif.updatedAt);
                 
                glif.hotness = [(credCount * credFactorForHotness) + (favouriteCount * favouriteFactorForHotness) + (commentCount * commentFactorForHotness) + (cloneCount * cloneFactorForHotness) + (shareCount * shareFactorForHotness)] * (Math.pow([1 + decayRateForHotness], [(createdDate.diff(startDate, 'days')) + (updatedDate.diff(createdDate, 'days') * recentFactorForHotness)]));
            }));
*/
            allPopularGlyffs = _.orderBy(allPopularGlyffs, ['hotness'], ['desc']);
            var popularGlyffs = [];
           
            if(data.limit) {
                data.skip = data.skip ? data.skip : 0;
                popularGlyffs = allPopularGlyffs.slice(data.skip, data.skip + data.limit);
            } else {
                popularGlyffs = allPopularGlyffs;
            }
            popularGlyffs = JSON.parse(JSON.stringify(popularGlyffs));

            yield Promise.each(popularGlyffs, co.wrap(function* (glifObj, key) {
                glifObj.user.isProfileHidden = glifObj.user.isProfileHidden ? glifObj.user.isProfileHidden : false;
                glifObj.parentUser.isProfileHidden = glifObj.parentUser.isProfileHidden ? glifObj.parentUser.isProfileHidden : false;
                if(!_.isEmpty(glifObj.lastComment)) {
                    glifObj.lastComment.commenterId.isProfileHidden = glifObj.lastComment.commenterId.isProfileHidden ? glifObj.lastComment.commenterId.isProfileHidden : false;
                }
            }));



            resolve(popularGlyffs);
        }).catch(function (err) {
            console.log("eerr")
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}


/***********************
 FETCH HOT GLYFFS 
 **********************/
exports.fetchHotGlyffs = function (data) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            data.queryCondition = data.queryCondition || {};

            var deletedUsers = yield User.find({ deleteStatus: true }, { _id: 1 });
            var deletedUserIds = _.map(deletedUsers, '_id');

            // new logic to skip the glyff of those private users whom i dont follow
            var privateNotFollowingUsersArr = yield privateNotFollowingUsers(data.userId);
            deletedUserIds = _.uniq(_.concat(deletedUserIds, privateNotFollowingUsersArr));
            
            data.queryCondition.creatorID = { $nin: deletedUserIds };
            
            var startDate = new Date();
            if(data.duration === 'week') 
                startDate.setDate(startDate.getDate() - 7);
            else
                startDate.setDate(startDate.getDate() - 30);

            var glyffIds = [];

            var votedGlyffsInGivenDateRange = yield votedGlyffs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyffId",
                        upvotes: { "$sum": { "$cond": { if: { "$eq": ["$voteType", "upvote"] }, then: 1, else: 0 } } },
                        downvotes: { "$sum": { "$cond": { if: { "$eq": ["$voteType", "downvote"] }, then: 1, else: 0 } } },
                    }
                },
                {
                    $project: {
                        _id: 1,
                        credNo: { $cond: { if: { $gt: [{ "$subtract": ["$upvotes", "$downvotes"] }, 0] }, then: { "$subtract": ["$upvotes", "$downvotes"] }, else: 0 } }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(votedGlyffsInGivenDateRange, '_id'));

            var favouriteGlyffsInGivenDateRange = yield favouriteGlyphs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyphId",
                        favouriteCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(favouriteGlyffsInGivenDateRange, '_id'));

            var pipeline = [
                { "$match": { "comments.commentedAt": { $gte: startDate } } },
                {
                    "$project": {
                        "commentCount": {
                            "$size": {
                                "$filter": {
                                    "input": "$comments",
                                    "as": "comments",
                                    "cond": {
                                        $gte: ["$$comments.commentedAt", startDate]
                                    }
                                }
                            }
                        }
                    }
                }
            ];
            var commentedGlyffsInGivenDateRange = yield glyff.aggregate(pipeline);
            glyffIds = _.concat(glyffIds, _.map(commentedGlyffsInGivenDateRange, '_id'));

            var cloneGlyffsInGivenDateRange = yield glyff.aggregate([
                {
                    $match: {
                        parentGlyffId: { $exists: true }, 
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$parentGlyffId",
                        cloneCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(cloneGlyffsInGivenDateRange, '_id'));


            var sharedGlyffsInGivenDateRange = yield shareGlyphs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyphId",
                        sharedCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(sharedGlyffsInGivenDateRange, '_id'));

            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if (reportedGlyffs && reportedGlyffs.length) {
                // Removing Reported glyffs from array
                glyffIds = _.difference(glyffIds, reportedGlyffs);
            }
            data.queryCondition._id = {$in: glyffIds};
        
              var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "users",
                        "localField": "creatorID",
                        "foreignField": "_id",
                        "as": "user"
                    }
                },
                 {
                    $lookup: {
                        "from": "favouriteglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "favourite"
                    }
                },
                // Stage 3
                
                // Stage 5
                {
                    $lookup: {
                        "from": "blocks",
                        "localField": "creatorID",
                        "foreignField": "blockedId",
                        "as": "block"
                    }
                },
                // Stage 4
                
                // Stage 5
                {
                    $lookup: {
                        "from": "shareglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "sharedGlyffs"
                    }
                },
                // Stage 6
                 {
                    $lookup: {
                        "from": "votedglyffs",
                        "localField": "_id",
                        "foreignField": "glyffId",
                        "as": "votedGlyffs"
                    }
                },
                {
                    $lookup: {
                        "from": "users",
                        "localField": "parentID",
                        "foreignField": "_id",
                        "as": "parentUser"
                    }
                },
               {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                },
                
               
                // Stage 8
                {
                    $project: {
                        "_id": 1,
                        "isPublic": 1,
                        "creatorID": 1,
                        "parentID": 1,
                        "isEditable": 1,
                        "captionText": 1,
                        "isTemplate": 1,
                        "followeeCount": 1,
                        "followerCount": 1,
                        "popularity": 1,
                        "trendingCount": 1,
                        "sharedCount": 1,
                        "title": 1,
                        "creator": 1,
                        "type": 1,
                        "glyffGif": 1,
                        "glyffThumbnail": 1,
                        "glyffCustomised": 1,
                        "glyffCustomisedGif": 1,
                        "referenceGlyffId": 1,
                        "glyffOriginal": 1,
                        "createdAt": 1,
                        "updatedAt": 1,
                        "editCount": 1,
                        "commentCount": 1,
                        "viewCount": 1,
                        "user": { $arrayElemAt: ["$user", 0] },
                        "parentUser": { $arrayElemAt: ["$parentUser", 0] },
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                       
                         "isFavourite": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$favourite", as: "favourite", cond: { $eq: ["$$favourite.userId", data.userId] } } } }, 0] }, then: true, else: false } },
                          "isCommented": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId", data.userId] } } } }, 0] }, then: 1, else: 0 }
                        },
                        "privateUserFollowing": { "$size": { "$filter": { "input": "$checkFollower", "as": "checkFollower", "cond": { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } },
                        "userVote": { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'upvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'downvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "downvote", else: "" } } } },
                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                         // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.userId] } } } }, 0] }, then: true, else: false } },
                     // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.userId] } } },
                        "isCloned": {
                            $cond: { if: { "$in": [data.userId, "$clonerIds"] }, then: 1, else: 0 }
                         },
                           // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                        },
                        // Last comment of the glyff                            
                        "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {} } }
                    }
                },
                // Stage 9
                {
                    $match: {
                        "block.blockedById": { $nin: [data.userId] }
                    }
                },
                // Stage 10
                {
                    $lookup: {
                        "from": "users",
                        "localField": "lastComment.commenterId",
                        "foreignField": "_id",
                        "as": "commenter"
                    }
                },
                // Stage 11
                {
                    $addFields: {
                        "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                    }
                },
                // Stage 12
                {
                    $project: {
                        "commenter": 0,
                        "lastComment.commenterId.hash_password": 0,
                        "lastComment.commenterId.resetPasswordToken": 0,
                        "lastComment.commenterId.verificationToken": 0
                    }
                }                
            ];

        var aggregationQueryStringFirst = [
                  {
                    $match: data.queryCondition
                },
                 {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                } 
                ];


            



            var allPopularGlyffs = yield glyff.aggregate(aggregationQueryString).allowDiskUse(true).exec();
           //var allPopularGlyffsFirst = yield glyff.aggregate(aggregationQueryStringFirst).allowDiskUse(true).exec();
            


              /*   allPopularGlyffs = _.concat(allPopularGlyffs, allPopularGlyffsFirst);
                console.log(allPopularGlyffs)*/
            var credCount = 0, favouriteCount = 0, commentCount = 0, cloneCount = 0, shareCount = 0, createdDate, updatedDate; 
         /*   yield Promise.each(allPopularGlyffs, co.wrap(function* (glif) {
                credCount = _.filter(votedGlyffsInGivenDateRange, (votedGlyff) => { return votedGlyff._id.toString() === glif._id.toString() });
                credCount = credCount.length ? credCount[0].credNo : 0;

                favouriteCount = _.filter(favouriteGlyffsInGivenDateRange, (favGlyff) => { return favGlyff._id.toString() === glif._id.toString() });
                favouriteCount = favouriteCount.length ? favouriteCount[0].favouriteCount : 0;

                commentCount = _.filter(commentedGlyffsInGivenDateRange, (commentedGlyff) => { return commentedGlyff._id.toString() === glif._id.toString() });
                commentCount = commentCount.length ? commentCount[0].commentCount : 0;

                cloneCount = _.filter(cloneGlyffsInGivenDateRange, (clonedGlyff) => { return clonedGlyff._id.toString() === glif._id.toString() });
                cloneCount = cloneCount.length ? cloneCount[0].cloneCount : 0;

                shareCount = _.filter(sharedGlyffsInGivenDateRange, (sharedGlyff) => { 
                    return sharedGlyff._id.toString() === glif._id.toString() 
                });
                shareCount = shareCount.length ? shareCount[0].sharedCount : 0;
                
                createdDate = moment(glif.createdAt);
                updatedDate = moment(glif.updatedAt);
                 
                glif.hotness = [(credCount * credFactorForHotness) + (favouriteCount * favouriteFactorForHotness) + (commentCount * commentFactorForHotness) + (cloneCount * cloneFactorForHotness) + (shareCount * shareFactorForHotness)] * (Math.pow([1 + decayRateForHotness], [(createdDate.diff(startDate, 'days')) + (updatedDate.diff(createdDate, 'days') * recentFactorForHotness)]));
            }));
*/
            allPopularGlyffs = _.orderBy(allPopularGlyffs, ['hotnessEachDay.hotness'], ['desc']);
            var popularGlyffs = [];
           
            if(data.limit) {
                data.skip = data.skip ? data.skip : 0;
                popularGlyffs = allPopularGlyffs.slice(data.skip, data.skip + data.limit);
            } else {
                popularGlyffs = allPopularGlyffs;
            }
            popularGlyffs = JSON.parse(JSON.stringify(popularGlyffs));

            yield Promise.each(popularGlyffs, co.wrap(function* (glifObj, key) {
                glifObj.user.isProfileHidden = glifObj.user.isProfileHidden ? glifObj.user.isProfileHidden : false;
                glifObj.parentUser.isProfileHidden = glifObj.parentUser.isProfileHidden ? glifObj.parentUser.isProfileHidden : false;
                if(!_.isEmpty(glifObj.lastComment)) {
                    glifObj.lastComment.commenterId.isProfileHidden = glifObj.lastComment.commenterId.isProfileHidden ? glifObj.lastComment.commenterId.isProfileHidden : false;
                }
            }));



            resolve(popularGlyffs);
        }).catch(function (err) {
            console.log("eerr")
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}

/***********************
 FETCH Trending GLYFFS 
 **********************/
exports.fetchTrendingGlyffs = function (data) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            data.queryCondition = data.queryCondition || {};

            var deletedUsers = yield User.find({ deleteStatus: true }, { _id: 1 });
            var deletedUserIds = _.map(deletedUsers, '_id');

            // new logic to skip the glyff of those private users whom i dont follow
            var privateNotFollowingUsersArr = yield privateNotFollowingUsers(data.userId);
            deletedUserIds = _.uniq(_.concat(deletedUserIds, privateNotFollowingUsersArr));
            
            data.queryCondition.creatorID = { $nin: deletedUserIds };
            
            var startDate = new Date();
            if(data.duration === 'week') 
                startDate.setDate(startDate.getDate() - 7);
            else
                startDate.setDate(startDate.getDate() - 30);

            var glyffIds = [];

            var votedGlyffsInGivenDateRange = yield votedGlyffs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyffId",
                        upvotes: { "$sum": { "$cond": { if: { "$eq": ["$voteType", "upvote"] }, then: 1, else: 0 } } },
                        downvotes: { "$sum": { "$cond": { if: { "$eq": ["$voteType", "downvote"] }, then: 1, else: 0 } } },
                    }
                },
                {
                    $project: {
                        _id: 1,
                        credNo: { $cond: { if: { $gt: [{ "$subtract": ["$upvotes", "$downvotes"] }, 0] }, then: { "$subtract": ["$upvotes", "$downvotes"] }, else: 0 } }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(votedGlyffsInGivenDateRange, '_id'));

            var favouriteGlyffsInGivenDateRange = yield favouriteGlyphs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyphId",
                        favouriteCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(favouriteGlyffsInGivenDateRange, '_id'));

            var pipeline = [
                { "$match": { "comments.commentedAt": { $gte: startDate } } },
                {
                    "$project": {
                        "commentCount": {
                            "$size": {
                                "$filter": {
                                    "input": "$comments",
                                    "as": "comments",
                                    "cond": {
                                        $gte: ["$$comments.commentedAt", startDate]
                                    }
                                }
                            }
                        }
                    }
                }
            ];
            var commentedGlyffsInGivenDateRange = yield glyff.aggregate(pipeline);
            glyffIds = _.concat(glyffIds, _.map(commentedGlyffsInGivenDateRange, '_id'));

            var cloneGlyffsInGivenDateRange = yield glyff.aggregate([
                {
                    $match: {
                        parentGlyffId: { $exists: true }, 
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$parentGlyffId",
                        cloneCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(cloneGlyffsInGivenDateRange, '_id'));


            var sharedGlyffsInGivenDateRange = yield shareGlyphs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyphId",
                        sharedCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(sharedGlyffsInGivenDateRange, '_id'));

            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if (reportedGlyffs && reportedGlyffs.length) {
                // Removing Reported glyffs from array
                glyffIds = _.difference(glyffIds, reportedGlyffs);
            }
            data.queryCondition._id = {$in: glyffIds};
        
              var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "users",
                        "localField": "creatorID",
                        "foreignField": "_id",
                        "as": "user"
                    }
                },
                 {
                    $lookup: {
                        "from": "favouriteglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "favourite"
                    }
                },
                // Stage 3
                
                // Stage 5
                {
                    $lookup: {
                        "from": "blocks",
                        "localField": "creatorID",
                        "foreignField": "blockedId",
                        "as": "block"
                    }
                },
                // Stage 4
                
                // Stage 5
                {
                    $lookup: {
                        "from": "shareglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "sharedGlyffs"
                    }
                },
                // Stage 6
                 {
                    $lookup: {
                        "from": "votedglyffs",
                        "localField": "_id",
                        "foreignField": "glyffId",
                        "as": "votedGlyffs"
                    }
                },
                {
                    $lookup: {
                        "from": "users",
                        "localField": "parentID",
                        "foreignField": "_id",
                        "as": "parentUser"
                    }
                },
               {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                },
                
               
                // Stage 8
                {
                    $project: {
                        "_id": 1,
                        "isPublic": 1,
                        "creatorID": 1,
                        "parentID": 1,
                        "isEditable": 1,
                        "captionText": 1,
                        "isTemplate": 1,
                        "followeeCount": 1,
                        "followerCount": 1,
                        "popularity": 1,
                        "trendingCount": 1,
                        "sharedCount": 1,
                        "title": 1,
                        "creator": 1,
                        "type": 1,
                        "glyffGif": 1,
                        "glyffThumbnail": 1,
                        "glyffCustomised": 1,
                        "glyffCustomisedGif": 1,
                        "referenceGlyffId": 1,
                        "glyffOriginal": 1,
                        "createdAt": 1,
                        "updatedAt": 1,
                        "editCount": 1,
                        "commentCount": 1,
                        "viewCount": 1,
                        "user": { $arrayElemAt: ["$user", 0] },
                        "parentUser": { $arrayElemAt: ["$parentUser", 0] },
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                       
                         "isFavourite": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$favourite", as: "favourite", cond: { $eq: ["$$favourite.userId", data.userId] } } } }, 0] }, then: true, else: false } },
                          "isCommented": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId", data.userId] } } } }, 0] }, then: 1, else: 0 }
                        },
                        "privateUserFollowing": { "$size": { "$filter": { "input": "$checkFollower", "as": "checkFollower", "cond": { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } },
                        "userVote": { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'upvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'downvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "downvote", else: "" } } } },
                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                         // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.userId] } } } }, 0] }, then: true, else: false } },
                     // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.userId] } } },
                        "isCloned": {
                            $cond: { if: { "$in": [data.userId, "$clonerIds"] }, then: 1, else: 0 }
                         },
                           // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                        },
                        // Last comment of the glyff                            
                        "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {} } }
                    }
                },
                // Stage 9
                {
                    $match: {
                        "block.blockedById": { $nin: [data.userId] }
                    }
                },
                // Stage 10
                {
                    $lookup: {
                        "from": "users",
                        "localField": "lastComment.commenterId",
                        "foreignField": "_id",
                        "as": "commenter"
                    }
                },
                // Stage 11
                {
                    $addFields: {
                        "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                    }
                },
                // Stage 12
                {
                    $project: {
                        "commenter": 0,
                        "lastComment.commenterId.hash_password": 0,
                        "lastComment.commenterId.resetPasswordToken": 0,
                        "lastComment.commenterId.verificationToken": 0
                    }
                }                
            ];

        var aggregationQueryStringFirst = [
                  {
                    $match: data.queryCondition
                },
                 {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                } 
                ];


            



            var allPopularGlyffs = yield glyff.aggregate(aggregationQueryString).allowDiskUse(true).exec();
           //var allPopularGlyffsFirst = yield glyff.aggregate(aggregationQueryStringFirst).allowDiskUse(true).exec();
            


              /*   allPopularGlyffs = _.concat(allPopularGlyffs, allPopularGlyffsFirst);
                console.log(allPopularGlyffs)*/
            var credCount = 0, favouriteCount = 0, commentCount = 0, cloneCount = 0, shareCount = 0, createdDate, updatedDate; 
         /*   yield Promise.each(allPopularGlyffs, co.wrap(function* (glif) {
                credCount = _.filter(votedGlyffsInGivenDateRange, (votedGlyff) => { return votedGlyff._id.toString() === glif._id.toString() });
                credCount = credCount.length ? credCount[0].credNo : 0;

                favouriteCount = _.filter(favouriteGlyffsInGivenDateRange, (favGlyff) => { return favGlyff._id.toString() === glif._id.toString() });
                favouriteCount = favouriteCount.length ? favouriteCount[0].favouriteCount : 0;

                commentCount = _.filter(commentedGlyffsInGivenDateRange, (commentedGlyff) => { return commentedGlyff._id.toString() === glif._id.toString() });
                commentCount = commentCount.length ? commentCount[0].commentCount : 0;

                cloneCount = _.filter(cloneGlyffsInGivenDateRange, (clonedGlyff) => { return clonedGlyff._id.toString() === glif._id.toString() });
                cloneCount = cloneCount.length ? cloneCount[0].cloneCount : 0;

                shareCount = _.filter(sharedGlyffsInGivenDateRange, (sharedGlyff) => { 
                    return sharedGlyff._id.toString() === glif._id.toString() 
                });
                shareCount = shareCount.length ? shareCount[0].sharedCount : 0;
                
                createdDate = moment(glif.createdAt);
                updatedDate = moment(glif.updatedAt);
                 
                glif.hotness = [(credCount * credFactorForHotness) + (favouriteCount * favouriteFactorForHotness) + (commentCount * commentFactorForHotness) + (cloneCount * cloneFactorForHotness) + (shareCount * shareFactorForHotness)] * (Math.pow([1 + decayRateForHotness], [(createdDate.diff(startDate, 'days')) + (updatedDate.diff(createdDate, 'days') * recentFactorForHotness)]));
            }));
*/
            allPopularGlyffs = _.orderBy(allPopularGlyffs, ['trendingNess'], ['desc']);
            var popularGlyffs = [];
           
            if(data.limit) {
                data.skip = data.skip ? data.skip : 0;
                popularGlyffs = allPopularGlyffs.slice(data.skip, data.skip + data.limit);
            } else {
                popularGlyffs = allPopularGlyffs;
            }
            popularGlyffs = JSON.parse(JSON.stringify(popularGlyffs));

            yield Promise.each(popularGlyffs, co.wrap(function* (glifObj, key) {
                glifObj.user.isProfileHidden = glifObj.user.isProfileHidden ? glifObj.user.isProfileHidden : false;
                glifObj.parentUser.isProfileHidden = glifObj.parentUser.isProfileHidden ? glifObj.parentUser.isProfileHidden : false;
                if(!_.isEmpty(glifObj.lastComment)) {
                    glifObj.lastComment.commenterId.isProfileHidden = glifObj.lastComment.commenterId.isProfileHidden ? glifObj.lastComment.commenterId.isProfileHidden : false;
                }
            }));



            resolve(popularGlyffs);
        }).catch(function (err) {
            console.log("eerr")
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}



/***********************
 FETCH New GLYFFS 
 **********************/
exports.fetchNewGlyffs = function (data) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            data.queryCondition = data.queryCondition || {};

            var deletedUsers = yield User.find({ deleteStatus: true }, { _id: 1 });
            var deletedUserIds = _.map(deletedUsers, '_id');

            // new logic to skip the glyff of those private users whom i dont follow
            var privateNotFollowingUsersArr = yield privateNotFollowingUsers(data.userId);
            deletedUserIds = _.uniq(_.concat(deletedUserIds, privateNotFollowingUsersArr));
            
            data.queryCondition.creatorID = { $nin: deletedUserIds };
            
            var startDate = new Date();
            if(data.duration === 'week') 
                startDate.setDate(startDate.getDate() - 7);
            else
                startDate.setDate(startDate.getDate() - 30);

            var glyffIds = [];

            var votedGlyffsInGivenDateRange = yield votedGlyffs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyffId",
                        upvotes: { "$sum": { "$cond": { if: { "$eq": ["$voteType", "upvote"] }, then: 1, else: 0 } } },
                        downvotes: { "$sum": { "$cond": { if: { "$eq": ["$voteType", "downvote"] }, then: 1, else: 0 } } },
                    }
                },
                {
                    $project: {
                        _id: 1,
                        credNo: { $cond: { if: { $gt: [{ "$subtract": ["$upvotes", "$downvotes"] }, 0] }, then: { "$subtract": ["$upvotes", "$downvotes"] }, else: 0 } }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(votedGlyffsInGivenDateRange, '_id'));

            var favouriteGlyffsInGivenDateRange = yield favouriteGlyphs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyphId",
                        favouriteCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(favouriteGlyffsInGivenDateRange, '_id'));

            var pipeline = [
                { "$match": { "comments.commentedAt": { $gte: startDate } } },
                {
                    "$project": {
                        "commentCount": {
                            "$size": {
                                "$filter": {
                                    "input": "$comments",
                                    "as": "comments",
                                    "cond": {
                                        $gte: ["$$comments.commentedAt", startDate]
                                    }
                                }
                            }
                        }
                    }
                }
            ];
            var commentedGlyffsInGivenDateRange = yield glyff.aggregate(pipeline);
            glyffIds = _.concat(glyffIds, _.map(commentedGlyffsInGivenDateRange, '_id'));

            var cloneGlyffsInGivenDateRange = yield glyff.aggregate([
                {
                    $match: {
                        parentGlyffId: { $exists: true }, 
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$parentGlyffId",
                        cloneCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(cloneGlyffsInGivenDateRange, '_id'));


            var sharedGlyffsInGivenDateRange = yield shareGlyphs.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$glyphId",
                        sharedCount: { $sum: 1 }
                    }
                }
            ]).exec();
            glyffIds = _.concat(glyffIds, _.map(sharedGlyffsInGivenDateRange, '_id'));

            var reportedGlyffs = yield checkIfGlyffsReportedByUser(data.userId);
            if (reportedGlyffs && reportedGlyffs.length) {
                // Removing Reported glyffs from array
                glyffIds = _.difference(glyffIds, reportedGlyffs);
            }
            data.queryCondition._id = {$in: glyffIds};
        
              var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },
                // Stage 2
                {
                    $lookup: {
                        "from": "users",
                        "localField": "creatorID",
                        "foreignField": "_id",
                        "as": "user"
                    }
                },
                 {
                    $lookup: {
                        "from": "favouriteglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "favourite"
                    }
                },
                // Stage 3
                
                // Stage 5
                {
                    $lookup: {
                        "from": "blocks",
                        "localField": "creatorID",
                        "foreignField": "blockedId",
                        "as": "block"
                    }
                },
                // Stage 4
                
                // Stage 5
                {
                    $lookup: {
                        "from": "shareglyphs",
                        "localField": "_id",
                        "foreignField": "glyphId",
                        "as": "sharedGlyffs"
                    }
                },
                // Stage 6
                 {
                    $lookup: {
                        "from": "votedglyffs",
                        "localField": "_id",
                        "foreignField": "glyffId",
                        "as": "votedGlyffs"
                    }
                },
                {
                    $lookup: {
                        "from": "users",
                        "localField": "parentID",
                        "foreignField": "_id",
                        "as": "parentUser"
                    }
                },
               {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                },
                
               
                // Stage 8
                {
                    $project: {
                        "_id": 1,
                        "isPublic": 1,
                        "creatorID": 1,
                        "parentID": 1,
                        "isEditable": 1,
                        "captionText": 1,
                        "isTemplate": 1,
                        "followeeCount": 1,
                        "followerCount": 1,
                        "popularity": 1,
                        "trendingCount": 1,
                        "sharedCount": 1,
                        "title": 1,
                        "creator": 1,
                        "type": 1,
                        "glyffGif": 1,
                        "glyffThumbnail": 1,
                        "glyffCustomised": 1,
                        "glyffCustomisedGif": 1,
                        "referenceGlyffId": 1,
                        "glyffOriginal": 1,
                        "createdAt": 1,
                        "updatedAt": 1,
                        "editCount": 1,
                        "commentCount": 1,
                        "viewCount": 1,
                        "user": { $arrayElemAt: ["$user", 0] },
                        "parentUser": { $arrayElemAt: ["$parentUser", 0] },
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                        "frameWidth": 1,
                        "frameHeight": 1,
                        "isReaction": 1,
                        "isSignatureEnable": 1,
                        "borderSize": 1,
                        "borderColor": 1,
                        "deviceType": 1,
                        "tags": 1,
                       
                         "isFavourite": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$favourite", as: "favourite", cond: { $eq: ["$$favourite.userId", data.userId] } } } }, 0] }, then: true, else: false } },
                          "isCommented": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$comments", as: "comments", cond: { "$eq": ["$$comments.commenterId", data.userId] } } } }, 0] }, then: 1, else: 0 }
                        },
                        "privateUserFollowing": { "$size": { "$filter": { "input": "$checkFollower", "as": "checkFollower", "cond": { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } },
                        "userVote": { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'upvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "upvote", else: { "$cond": { if: { "$gt": [{ "$size": { "$filter": { input: "$votedGlyffs", as: "upvotes", cond: { "$and": [{ "$eq": ["$$upvotes.voteType", 'downvote'] }, { "$eq": ["$$upvotes.userId", data.userId] }] } } } }, 0] }, then: "downvote", else: "" } } } },
                        // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                         // isFavourite is a flag which shows whether current user has mark the glyph favourite or not
                        "isShared": { $cond: { if: { $gt: [{ $size: { $filter: { input: "$sharedGlyffs", as: "sharedGlyffs", cond: { $eq: ["$$sharedGlyffs.userId", data.userId] } } } }, 0] }, then: true, else: false } },
                     // block is an array which is user further in pipeline to remove those glyphs whose creator is blocked
                        "block": { $filter: { input: "$block", as: "block", cond: { $eq: ["$$block.blockedById", data.userId] } } },
                        "isCloned": {
                            $cond: { if: { "$in": [data.userId, "$clonerIds"] }, then: 1, else: 0 }
                         },
                           // isFollow is a flag which shows whether current user is following glyph creator or not
                        "isFollow": {
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", data.userId] }, { "$eq": ["$$checkFollower.followeeId", "$creatorID"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
                        },
                        // Last comment of the glyff                            
                        "lastComment": { $cond: { if: { "$gt": [{ "$size": "$comments" }, 0] }, then: { $arrayElemAt: ["$comments", -1] }, else: {} } }
                    }
                },
                // Stage 9
                {
                    $match: {
                        "block.blockedById": { $nin: [data.userId] }
                    }
                },
                // Stage 10
                {
                    $lookup: {
                        "from": "users",
                        "localField": "lastComment.commenterId",
                        "foreignField": "_id",
                        "as": "commenter"
                    }
                },
                // Stage 11
                {
                    $addFields: {
                        "lastComment.commenterId": { $arrayElemAt: ["$commenter", 0] }
                    }
                },
                // Stage 12
                {
                    $project: {
                        "commenter": 0,
                        "lastComment.commenterId.hash_password": 0,
                        "lastComment.commenterId.resetPasswordToken": 0,
                        "lastComment.commenterId.verificationToken": 0
                    }
                }                
            ];

        var aggregationQueryStringFirst = [
                  {
                    $match: data.queryCondition
                },
                 {
                    $lookup: {
                        "from": "follows",
                        "localField": "creatorID",
                        "foreignField": "followeeId",
                        "as": "checkFollower"
                    }
                } 
                ];


            



            var allPopularGlyffs = yield glyff.aggregate(aggregationQueryString).allowDiskUse(true).exec();
           //var allPopularGlyffsFirst = yield glyff.aggregate(aggregationQueryStringFirst).allowDiskUse(true).exec();
            


              /*   allPopularGlyffs = _.concat(allPopularGlyffs, allPopularGlyffsFirst);
                console.log(allPopularGlyffs)*/
            var credCount = 0, favouriteCount = 0, commentCount = 0, cloneCount = 0, shareCount = 0, createdDate, updatedDate; 
         /*   yield Promise.each(allPopularGlyffs, co.wrap(function* (glif) {
                credCount = _.filter(votedGlyffsInGivenDateRange, (votedGlyff) => { return votedGlyff._id.toString() === glif._id.toString() });
                credCount = credCount.length ? credCount[0].credNo : 0;

                favouriteCount = _.filter(favouriteGlyffsInGivenDateRange, (favGlyff) => { return favGlyff._id.toString() === glif._id.toString() });
                favouriteCount = favouriteCount.length ? favouriteCount[0].favouriteCount : 0;

                commentCount = _.filter(commentedGlyffsInGivenDateRange, (commentedGlyff) => { return commentedGlyff._id.toString() === glif._id.toString() });
                commentCount = commentCount.length ? commentCount[0].commentCount : 0;

                cloneCount = _.filter(cloneGlyffsInGivenDateRange, (clonedGlyff) => { return clonedGlyff._id.toString() === glif._id.toString() });
                cloneCount = cloneCount.length ? cloneCount[0].cloneCount : 0;

                shareCount = _.filter(sharedGlyffsInGivenDateRange, (sharedGlyff) => { 
                    return sharedGlyff._id.toString() === glif._id.toString() 
                });
                shareCount = shareCount.length ? shareCount[0].sharedCount : 0;
                
                createdDate = moment(glif.createdAt);
                updatedDate = moment(glif.updatedAt);
                 
                glif.hotness = [(credCount * credFactorForHotness) + (favouriteCount * favouriteFactorForHotness) + (commentCount * commentFactorForHotness) + (cloneCount * cloneFactorForHotness) + (shareCount * shareFactorForHotness)] * (Math.pow([1 + decayRateForHotness], [(createdDate.diff(startDate, 'days')) + (updatedDate.diff(createdDate, 'days') * recentFactorForHotness)]));
            }));
*/
            allPopularGlyffs = _.orderBy(allPopularGlyffs, ['createdAt'], ['desc']);
            var popularGlyffs = [];
           
            if(data.limit) {
                data.skip = data.skip ? data.skip : 0;
                popularGlyffs = allPopularGlyffs.slice(data.skip, data.skip + data.limit);
            } else {
                popularGlyffs = allPopularGlyffs;
            }
            popularGlyffs = JSON.parse(JSON.stringify(popularGlyffs));

            yield Promise.each(popularGlyffs, co.wrap(function* (glifObj, key) {
                glifObj.user.isProfileHidden = glifObj.user.isProfileHidden ? glifObj.user.isProfileHidden : false;
                glifObj.parentUser.isProfileHidden = glifObj.parentUser.isProfileHidden ? glifObj.parentUser.isProfileHidden : false;
                if(!_.isEmpty(glifObj.lastComment)) {
                    glifObj.lastComment.commenterId.isProfileHidden = glifObj.lastComment.commenterId.isProfileHidden ? glifObj.lastComment.commenterId.isProfileHidden : false;
                }
            }));



            resolve(popularGlyffs);
        }).catch(function (err) {
            console.log("eerr")
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}

/****************************************************************************************************************
 * User list who made an action (favourite/clone/share/vote) on particular glyff
****************************************************************************************************************/
exports.getUsersListOfGlyffActions = function (userId, queryObj) {
    return new Promise(function (resolve, reject) {
        co(function* () {
            if (['favourite', 'share', 'clone', 'vote'].indexOf(queryObj.action) < 0) {
                return reject({ errorCode: 500, errorMessage: 'Improper action.' }); 
            }

            var userList = [], userIds= [];
            if(queryObj.action === 'favourite') {
                var favouriteGlyffs = yield favouriteGlyphs.find({ glyphId: queryObj.glyphId }, { userId: 1 }).exec();
                userIds = _.map(favouriteGlyffs, 'userId');
            } else if(queryObj.action === 'share') {
                var sharedGlyffs = yield shareGlyphs.find({ glyphId: queryObj.glyphId }, { userId: 1 }).exec();
                userIds = _.map(sharedGlyffs, 'userId');
            } else if (queryObj.action === 'clone') {
                var clonedGlyffs = yield glyff.find({ parentGlyffId: queryObj.glyphId }, { creatorID: 1 }).exec();
                userIds = _.map(clonedGlyffs, 'creatorID');
            } else if (queryObj.action === 'vote') {
                var votedGlyphs = yield votedGlyffs.find({ glyffId: queryObj.glyphId, voteType: 'upvote' }, { userId: 1 }).exec();
                userIds = _.map(votedGlyphs, 'userId');
            }

            var queryParams = {
                $and: [
                    { role: { $ne: 'admin' } },
                    { _id: { $in: userIds } },
                    { userVerified: true },
                    { deleteStatus: false }
                ]
            };

            if(queryObj.searchTerm) {
                queryParams.$and.push({ $text: { $search: queryObj.searchTerm } }); 
            }

            var aggregationQueryString = [
                // Pipeline Stage 1
                {
                    $match: queryParams
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
                            { "block.blockedById": { $ne: queryObj.userId } },
                            { "_id": { $ne: queryObj.userId } }
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
                            $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", queryObj.userId] }, { "$eq": ["$$checkFollower.followeeId", "$_id"] }] } } } }, 0] }, then: { $cond: { if: { "$gt": [{ "$size": { "$filter": { input: "$checkFollower", as: "checkFollower", cond: { "$and": [{ "$eq": ["$$checkFollower.followerId", queryObj.userId] }, { "$eq": ["$$checkFollower.followeeId", "$_id"] }, { "$eq": ["$$checkFollower.isValid", true] }] } } } }, 0] }, then: 2, else: 1 } }, else: 0 }
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
                        "viewCount": 1,
                        "favouriteCount": 1,
                        "credNo": 1,
                        "hotness": 1,
                    }
                }
            ];

            if (queryObj.limit) {
                var limitArr = [
                    {
                        $skip: parseInt(queryObj.offset)
                    },
                    {
                        $limit: parseInt(queryObj.limit)
                    }
                ];
                
                aggregationQueryString = aggregationQueryString.concat(limitArr);
            }

            var users = yield User.aggregate(aggregationQueryString).allowDiskUse(true).exec();

            userIds = _.map(users, '_id');

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
            resolve(users);
        }).catch(function (err) {
            err = err && err.errorCode ? err : { errorCode: 500, errorMessage: err };
            reject(err);
        });
    });
}


