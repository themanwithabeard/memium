/**********************
 SCHEMA INITIALISTAION
 **********************/
 var Schema = require('mongoose').Schema;
 var ObjectId = Schema.ObjectId;
 mongoose = require('mongoose');
 bcrypt     = require('bcryptjs');  


/*********************
 AUTHENTICATION SCHEMA
 *********************/
 var authenticationSchema = new Schema({
    userId:   { type: Schema.Types.ObjectId, ref: 'users' },
    token:  String,
    createdAt: {
        type: Date,
        default: Date.now
    },
});

 var authentication = mongoose.model('authentication', authenticationSchema);

/*********************
 FOLLOW SCHEMA
 *********************/
 var followSchema = new Schema({
    followerId:   { type: Schema.Types.ObjectId, ref: 'users' },
    followeeId:   { type: Schema.Types.ObjectId, ref: 'users' },
    createdAt: {
        type: Date,
        default: Date("<YYYY-mm-ddTHH:MM:ssZ>")
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    isValid:  Boolean,
});

 var follow = mongoose.model('follows', followSchema);


 var pushNotification = new Schema({
    type: {type: String},
    category: {type: String}
});

/************
 USER SCHEMA
 ************/
 var userSchema = new Schema({
    // objectId:String,
    // _id: Schema.Types.ObjectId,
    updatedAt:{
        type: Date,
        default: Date.now
    },
    createdAt:{
        type: Date,
        default: Date.now
    },
    username:{type:String,default:''},
    nickname:{type:String,default:''},
    email: {
        type: String,
        unique: true, 
        trim: true,
        sparse: true 
    },
    userVerified:  Boolean,
    name:           {type:String,default:''},
    verificationToken:           {type:String,default:''},
    resetPasswordToken:           {type:String,default:''},
    language:       {type:String,default:''},
    mobile:         {type:String,default:''},
    followerCount:  {type:Number,default:0},
    followeeCount:  {type:Number,default:0},
    isFollowed:  {type:Number,default:0},
    isContactSync:  {type:Boolean,default:true},
    isPublic:       Boolean,
    glyffCount:     {type:Number,default:0},
    image:       {type:String,default:''},
    imageThumbnail:       {type:String,default:''},
    trendingCount:  {type:Number,default:0},
    sharedCount:    {type:Number,default:0},
    fb_id:          {type:String,default:''},
    instagram_id:          {type:String,default:''},
    fb_profile_pic_url:{type:String,default:''},
    hash_password: {
        type: String,default:''
    },
    gender:         {type:String,default:''},
    device_token:   {type:String,default:''},
    deviceType:     {type: String, enum: ['ios','android','']},
    appCode: {type:String}, // appCode value for android current version 
    push_notifications: [pushNotification],
    badge: {type:Number,default:0},

    // For searching and sorting users based on this following fields
    favouriteCount:     {type: Number, default: 0}, // it will be cumulative credNo of user's all glyffs' favouriteCount
    credNo:             {type: Number, default: 0}, // it will be cumulative credNo of user's all glyffs' credNo
    hotness:            {type: Number, default: 0}, // it will be cumulative hotness of user's all glyffs' hotness
    role: String ,   // Just for admin
    deleteStatus: {type: Boolean, default: false},
    isProfileHidden: Boolean
});

 userSchema.methods.comparePassword = function(password) {
    return bcrypt.compareSync(password, this.hash_password);
};

var user = mongoose.model('users', userSchema);


module.exports = {
    Authentication:     authentication,
    user:       user,
    follow: follow,
}
