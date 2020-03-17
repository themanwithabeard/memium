/**********************
 SCHEMA INITIALISTAION
 **********************/
 var Schema = require('mongoose').Schema;
 var User = require('../models/users.server.model').user;


/************
 NOTIFICATIONS SCHEMA
 ************/
 var notificationsSchema = new Schema({
    updatedAt:          {
        type: Date,
        default: Date.now
    },
    createdAt:          {
        type: Date,
        default: Date.now
    },
    type:               {type: String, default: ''},
    toName:              {type: String, default: ''},
    fromName:            {type: String, default: ''},
    toUserImageUrl:     {type: String, default: ''},
    fromUserImageUrl:   {type: String, default: ''},
    glyphImageUrl:      {type: String, default: ''},
    glyffId:            {type: Schema.Types.ObjectId, ref: 'glyffs' },
    fromUserID:         {type: Schema.Types.ObjectId, ref: 'users' },
    toUserID:           {type: Schema.Types.ObjectId, ref: 'users' },
    fromMessage:        {type: String, default: ''},
    toMessage:          {type: String, default: ''},
    glyphType:          {type: String, default: ''},
    isPublic:           Boolean,
    isDenied:           Boolean,
    followUserImageUrl: {type: String, default: ''},
    isToReverseFollowing:{type:Boolean,default: false},
    isFromReverseFollowing:{type:Boolean,default: false},
    isFromAcceptedFollowRequest:{type:Boolean,default: false},
    isToAcceptedFollowRequest:{type:Boolean,default: false}
});

 var notifications = mongoose.model('notifications', notificationsSchema);


/**************
 EXPORT SCHEMA
 *************/
 module.exports = {
    notifications:      notifications
}