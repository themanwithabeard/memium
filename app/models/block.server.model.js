/**********************
 SCHEMA INITIALISTAION
 **********************/
const   Schema  = require('mongoose').Schema,
        Promise = require('bluebird'),
        co      = require('co');

/*********************
 BLOCK SCHEMA
 *********************/
var blockSchema = new Schema({
    blockedById:   { type: Schema.Types.ObjectId, ref: 'users' },
    blockedId:   { type: Schema.Types.ObjectId, ref: 'users' },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

var block = mongoose.model('blocks', blockSchema);

/*****************
 SAVE BLOCK MODEL
 *****************/
exports.blockModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var newBlock = new block(data);
            var blockObj = yield newBlock.save();
            resolve(blockObj);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*****************
 FETCH BLOCK MODEL
 *****************/
exports.fetchBlockUsersModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            data.queryCondition = data.queryCondition || {};
            data.pageSortQuery = data.pageSortQuery || {};

            var blockObj = yield block.aggregate([
                // Pipeline Stage 1
                {
                    $match: data.queryCondition
                },    
                // Stage 2
                {
                    $lookup: {
                        "from" : "users",
                        "localField" : "blockedId",
                        "foreignField" : "_id",
                        "as" : "blockedUserDetail"
                    }
                },    
                // Stage 3
                {
                    $sort: {
                        createdAt: -1
                    }
                },    
                // Stage 4
                {
                    $skip: data.pageSortQuery.skip
                },    
                // Stage 5
                {
                    $limit: data.pageSortQuery.limit
                },    
                // Stage 6
                {
                    $project: {
                        "blockedById" : 1,
                        "createdAt" : 1,
                        "blockedUserDetail" : { $arrayElemAt: [ "$blockedUserDetail", 0 ] }
                    }
                },    
            ]).exec();
            resolve(blockObj);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        })
    });
}

/*****************
 COUNT BLOCK MODEL
 *****************/
exports.countBlockModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            //data.queryCondition = data.queryCondition || {};
            var blockCount = yield block.count(data);
            resolve(blockCount);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*****************
 UNBLOCK MODEL
 *****************/
exports.unblockModel = function(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            yield block.remove({blockedById: data.blockedById, blockedId: data.blockedId}); 
            resolve(true);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*****************
 FIND BLOCK MODEL
 *****************/
exports.findBlockModel = function(data, callback) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var blockObj = yield block.find({blockedById: data.blockedById, blockedId: data.blockedId}).exec();
            resolve(blockObj);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}


