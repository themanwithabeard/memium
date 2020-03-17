/**************************
 FOLLOWEE LIST API
 **************************/
exports.fetchFollowees = function (req, res) {

    if(!(req.query.user_id && req.query.limit && req.query.offset)){
        res.status(404).json({status: 0, message: "Bad Request Invalid Parameters", data: [] });
        return false;
    }

    // API call to fetch followers list
    var limit = parseInt(req.query.limit);
    var offset = parseInt(req.query.offset);
    var userId = ObjectId(req.query.user_id);

    Follow.aggregate(

        // Pipeline
        [

             // Stage 1
            // {
            //     $sort: { userName : 1 }
            // },

            // Stage 2
            {
                $match: {
                    "followerId": userId,
                    "isValid": true
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
                    "localField" : "followeeId",
                    "foreignField" : "_id",
                    "as" : "user"
                }
            },

            {
                $unwind: "$user"
            },

            {
                $sort: { "user.name" : 1 }
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
                }
            },
           
        ], function(err, follow) {
        if(err) { res.status(500).json({status: 0, message: err, data: [], code: 500}); return false;}
        if(!follow.length) { res.status(404).json({status: 0, message: "You are not following to anyone.", data: [], code: 404 }); return false; }

        Follow.count({"followerId": userId}, function(err,count){
            follow.map(function(data,key){
                follow[key].user.isFollowed = true;
            });
            res.status(200).json({status: 1, message: "Followee found successfully", data: { follow: follow, count: count, offset: offset } } );
            return false;
        })
    });
}