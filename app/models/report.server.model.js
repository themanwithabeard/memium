/**********************
 SCHEMA INITIALISTAION
 **********************/
const   Schema  = require('mongoose').Schema,
        Promise = require('bluebird'),
        co      = require('co');

/*********************
 REPORT SCHEMA
 *********************/
 var reportSchema = new Schema({
    userId:   { type: Schema.Types.ObjectId, ref: 'users' },
    glyphId:   { type: Schema.Types.ObjectId, ref: 'glyffs' },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isReported:{type: Boolean, default: false},
    reportApprovedByAdmin:{type: Boolean, default: false}
});

 var reportglyff = mongoose.model('reportglyffs', reportSchema);

/**************
 EXPORT SCHEMA
 *************/

/*****************
 SAVE GLYPH MODEL
 *****************/
function reportGlyffModel(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var newReportGlyff = new reportglyff(data);
            var reportGlyff = yield newReportGlyff.save();
            resolve(reportGlyff);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}

/*****************
 FIND BLOCK MODEL
 *****************/
 function findReportGlyffModel(data) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var reportGlyff = yield reportglyff.find({userId: data.userId, glyphId: data.glyphId}).exec();
            resolve(reportGlyff);
        }).catch(function(err){
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            reject(err);
        });
    });
}
module.exports = {
    reportglyff : reportglyff ,
    findReportGlyffModel:findReportGlyffModel,
    reportGlyffModel:reportGlyffModel
}

