/**********************
 SCHEMA INITIALISTAION
 **********************/
const   Schema  = require('mongoose').Schema,
        Promise = require('bluebird'),
        co      = require('co');

/*********************
 CONTACT SCHEMA
 *********************/
 var contactSchema = new Schema({
    email:          {type: String, default: ''},
    name:           {type: String, default: ''},
    mobile:         {type: String, default: ''},
    deviceId:       {type: String, default: ''},
    deviceType:     {type: String, enum: ['ios','android']},
    user:           {type: Schema.Types.ObjectId, ref: 'users'},
    contactUser:    {type: Schema.Types.ObjectId, ref: 'users'},
    isFollow:       {type: Number, enum: [-1, 0, 1, 2], default: -1},   // whether user is following contactUser
    createdAt:      {type: Date},
    updatedAt:      {type: Date, default: Date.now}
});

 var contacts = mongoose.model('contacts', contactSchema);

/**************
 EXPORT SCHEMA
 *************/
module.exports = {
    contacts : contacts
}

