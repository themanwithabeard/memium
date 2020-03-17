/****************************
 SYNC/DATA UPLOAD MODULE ROUTING
 ****************************/
module.exports = function(app, express) {

    // Require modules
    var sync = require('../controllers/sync.server.controller');
    var globals = require('../../configs/globals');
    var router = express.Router();
    
    // Routing
    // For Phonebook Contacts
    router.post('/contacts/upload/:userId', globals.isAuthorised, sync.uploadContacts);
    router.get('/contacts/:userId', globals.isAuthorised, sync.fetchContacts);
    router.post('/followContacts/:userId', globals.isAuthorised, sync.followContacts);

    // For FB Friends
    router.post('/facebookFriendList/:userId', globals.isAuthorised, sync.fetchFacebookFriends);
    router.post('/followFacebookFriends/:userId', globals.isAuthorised, sync.followFacebookFriends);
    
    app.use(config.baseApiUrl, router);

};
