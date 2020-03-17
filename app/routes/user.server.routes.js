/**********************
 GLYFF MODULE ROUTING
 **********************/
 module.exports = function(app, express) {

    // Require modules
    var user = require('../controllers/user.server.controller');
    var globals = require('../../configs/globals');
    var upload = require('../../configs/aws').upload;
    var router = express.Router();
    
    // Routing
    router.get('/peopleList', globals.isAuthorised, user.peopleList);
    router.get('/recommendedPeople', globals.isAuthorised, user.getRecommendedPeople);
    router.get('/userProfile/:userId', globals.isAuthorised, user.userProfile);
    router.post('/setFollow/:userId', globals.isAuthorised, user.setFollow);
    router.post('/editProfile/:userId', globals.isAuthorised, upload.single('file'), user.editProfile);
    router.post('/acceptFollowRequest/:userId', globals.isAuthorised, user.acceptFollowRequest);
    router.post('/denyFollowRequest/:userId', globals.isAuthorised, user.denyFollowRequest);
    router.get('/searchPeople', globals.isAuthorised, user.searchPeople);
    router.get('/fetchFollowees/:userId', globals.isAuthorised, user.fetchFollowees);
    router.get('/fetchFollowers/:userId', globals.isAuthorised, user.fetchFollowers);
    router.post('/userList/:userId', globals.isAuthorised, user.userList);
    //router.get('/deleteUserByAdmin/:userId/:deleteUserId', globals.isAuthorised, user.deleteUserByAdmin);
    router.post('/blockMemeByAdmin/:userId', globals.isAuthorised, user.blockMemeByAdmin);
    router.post('/unblockMemeByAdmin/:userId', globals.isAuthorised, user.unblockMemeByAdmin);
    router.get('/searchUsersForMentions/:userId', globals.isAuthorised, user.searchUserForMentions);
    router.post('/hideOrUnhideUser/:userId', globals.isAuthorised, user.hideOrUnhideUser);
    router.post('/deleteAccount/:userId', globals.isAuthorised, user.deleteAccount);
    
    app.use(config.baseApiUrl, router);

};
