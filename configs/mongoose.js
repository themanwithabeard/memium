/**********************
 MODULE INITIALISTAION
 **********************/
common = require('./env/configs');
mongoose = require('mongoose');
config = common.config();


/***********************************
 MODEL REQUIRE & MONGOOSE CONNECTION
 ***********************************/
module.exports = function() {

    // Mongoose connection
	var db = mongoose.connect(config.db);

    // Including model files
    require('../app/models/users.server.model');
    require('../app/models/glyff.server.model');
    require('../app/models/report.server.model');
    require('../app/models/contacts.server.model');
    return db;

};