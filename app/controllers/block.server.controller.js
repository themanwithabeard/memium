/**************************
 MODULE INITIALISATION
 **************************/
const   mongoose    = require('mongoose'),
        ObjectId    = require('mongodb').ObjectID,
        BlockModel  = require('../models/block.server.model'),
        Follow      = require('../models/users.server.model').follow,
        Promise     = require('bluebird'),
        co          = require('co'),
        isUserDeleted = require('../../configs/globals').checkWhetherUserIsDeleted;

/**************************
 BLOCK USER LIST API
 **************************/
exports.blockUser = function (req, res, next) {
    co(function*(){
        // Validating the fields
        if(!req.body.blockedById) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
        
        var userDeleted = yield isUserDeleted(req.body.blockedById);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});
        
        if(!req.body.blockedId) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});    
        if (String(req.body.blockedById) == String(req.body.blockedId)) return res.status(400).json({status: 0, message: "User cannot block themselves.", data: [], code: 400});
        
        var requestObject = {
            blockedById: ObjectId(req.body.blockedById),
            blockedId: ObjectId(req.body.blockedId),
        };
        var block = yield BlockModel.findBlockModel(requestObject);
        if(block.length) return res.status(400).json({status: 0, message: "User is already blocked",data: [] });

        yield BlockModel.blockModel(requestObject);
        yield Follow.update({ $or: [{ 'followeeId': ObjectId(req.body.blockedId), 'followerId': ObjectId(req.body.blockedById) }, { 'followeeId': ObjectId(req.body.blockedById), 'followerId': ObjectId(req.body.blockedId) }]}, {$set: {"isValid": "false"}}, {"multi": true}).exec();

        return res.status(200).json({status: 1, message: "User is blocked successfully"});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

/**************************
 UNBLOCK USER LIST API
 **************************/
exports.unblockUser = function (req, res, next) {
    co(function*(){
        // Validating the fields
        if(!req.body.blockedById) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
    
        var userDeleted = yield isUserDeleted(req.body.blockedById);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        if(!req.body.blockedId) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
    
        if (String(req.body.blockedById) == String(req.body.blockedId)) return res.status(400).json({status: 0, message: "User cannot unblock themselves.", data: [], code: 400});
    
        var requestObject = {
            blockedById: ObjectId(req.body.blockedById),
            blockedId: ObjectId(req.body.blockedId),
        };
        var block = yield BlockModel.findBlockModel(requestObject);
        if(!block.length) return res.status(400).json({status: 0, message: "There are no user to unblock",data: [] });
        
        yield BlockModel.unblockModel(requestObject);
        yield Follow.update({ $or: [{ 'followeeId': ObjectId(req.body.blockedId), 'followerId': ObjectId(req.body.blockedById) }, { 'followeeId': ObjectId(req.body.blockedById), 'followerId': ObjectId(req.body.blockedId) }]}, {$set: {"isValid": "true"}}, {"multi": true}).exec();

        return res.status(200).json({status: 1, message: "User is unblocked successfully"});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}

/**************************
 FETCH BLOCK USER LIST API
 **************************/
exports.fetchBlockUsers = function (req, res, next) {
    co(function*(){
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var limit = parseInt(req.query.limit);
        var offset = parseInt(req.query.offset);
        var pageSortQuery = { sort: { createdAt: -1 }, skip: offset, limit: limit };
        var queryCondition = {"blockedById": ObjectId(req.params.userId)};
        var requestObject = {
            "queryCondition": queryCondition,
            "pageSortQuery" : pageSortQuery
        };
        var blocks = yield BlockModel.fetchBlockUsersModel(requestObject);
        if(!blocks.length) return res.status(404).json({status: 0, message: "You don't have any blocked users",data: [] });
        
        var hasMoreRecords = limit > blocks.length ? 0 : 1;
        return res.status(200).json({status: 1, message: "Blocker list found successfully", data: { blocks:blocks, hasMoreRecords: hasMoreRecords, offset: offset }});
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [] });
    });
}