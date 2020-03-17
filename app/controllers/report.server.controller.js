/**************************
 MODULE INITIALISATION
 **************************/
const   Glyff               = require('../models/glyff.server.model'),
        ObjectId            = require('mongodb').ObjectID,
        Follow              = require('../models/users.server.model').follow,
        ReportGlyffModel    = require('../models/report.server.model'),
        User                = require('../models/users.server.model').user,
        Promise             = require('bluebird'),
        co                  = require('co'),
        globals             = require('../../configs/globals'),
        isUserDeleted = require('../../configs/globals').checkWhetherUserIsDeleted;

/**************************
 REPORT COUNT API
 **************************/
exports.reportOfCount = function (req, res, next) {
    co(function*(){
        // Validating the fields
        if(!req.params.userId) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
    
        var userDeleted = yield isUserDeleted(req.params.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var queryCondition = { "creatorID": ObjectId(req.params.userId), "category": "new", "isDeleted": false, $or: [{ "isSecret": { $exists: false } }, { $and: [{ "isSecret": { $exists: true } }, { $or: [{ "isSecret": false }, { "isSecret": true, creatorID: req.params.userId }] }] }]};
        
        var requestObject = {
            "queryCondition": queryCondition
        };
        var count = yield Glyff.countGlyphModel(requestObject);
        var countObject = { memes: count };
        var queryUserObject = {"_id": ObjectId(req.params.userId), "userVerified": true, "deleteStatus": true};
        var user = yield User.findOne(queryUserObject, {hash_password: 0}).exec();
        if(user){
            countObject.shares = user.sharedCount;
        }
        count = yield Glyff.countView(req.params.userId);
        if(count.length){
            countObject.views = count[0].total;    
        } else {
           countObject.views = 0;   
        }
        var followerCount = yield Follow.count({followeeId:ObjectId(req.params.userId), isValid: true});
        countObject.Followers = followerCount;
        return  res.status(200).json({status: 1, message: "Different counts found successfully", code: 200, data: { count: countObject} } );
    }).catch(function(err){
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}

function CapitlizeString(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

/**************************
 BLOCK USER LIST API
 **************************/
exports.reportGlyff = function (req, res, next) {
    co(function*(){
        // Validating the fields
        if(!req.body.userId) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
    
        if(!req.body.glyphId) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
    
        if (String(req.body.userId) == String(req.body.glyphId)) return res.status(400).json({status: 0, message: "Bad Request", data: [], code: 400});
    
        var userDeleted = yield isUserDeleted(req.body.userId);
        if(userDeleted) return res.status(400).json({status: 0, message: userDeleted, data: [], code: 400});

        var requestObject = {
            userId: ObjectId(req.body.userId),
            glyphId: ObjectId(req.body.glyphId)    
        };
        var reportGlyff = yield ReportGlyffModel.findReportGlyffModel(requestObject);
        if(reportGlyff.length) return res.status(400).json({status: 0, message: "Meme is already reported",data: [] });

        yield ReportGlyffModel.reportGlyffModel(requestObject);
        var userDetailLink = 'http://ec2-52-53-136-248.us-west-1.compute.amazonaws.com:3001/#/admin/user-management/user-detail/'+req.body.userId;
        var memeDetailLink = 'http://ec2-52-53-136-248.us-west-1.compute.amazonaws.com:3001/#/admin/meme-management/meme-detail/'+req.body.glyphId;
    
        var reporter = yield User.findOne({_id: ObjectId(req.body.userId)});
        var reportedGlyff = yield Glyff.getGlyffs({_id: ObjectId(req.body.glyphId)}, {type:1, glyffOriginal:1, glyffCustomised:1, glyffCustomisedGif:1, glyffGif:1});
        reportedGlyff = JSON.parse(JSON.stringify(reportedGlyff[0]));
        var glyffUrl = reportedGlyff.type === 'image' ? (reportedGlyff.glyffCustomised ? reportedGlyff.glyffCustomised : reportedGlyff.glyffOriginal) : (reportedGlyff.glyffCustomisedGif ? reportedGlyff.glyffCustomisedGif : reportedGlyff.glyffGif);

        yield globals.sendMail({
            to: 'Memium <support@memium.app>',
            subject: "Meme Reported",
            message: '<a href="'+ userDetailLink +'" target="_blank">'+ CapitlizeString(reporter.name) +' ('+reporter.nickname+')</a> just reported the following meme: <br><br> <a href="'+memeDetailLink+'" target="_blank"><img src="'+glyffUrl+'"/></a><br>'
        });
        return res.status(200).json({status: 1, message: "Meme is reported successfully"});
    }).catch(function(err){
        console.log(err);
        err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
        return res.status(err.errorCode).json({status: 0, message: err.errorMessage, data: [], code: err.errorCode });
    });
}