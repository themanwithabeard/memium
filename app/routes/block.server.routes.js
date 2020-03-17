/**********************
 BLOCK MODULE ROUTING
 **********************/
module.exports = function(app, express) {

    // Require modules
    var block = require('../controllers/block.server.controller');
    var globals = require('../../configs/globals');
    var router = express.Router();

    // Routing
    router.post('/blockUser/:userId', globals.isAuthorised, block.blockUser);
    router.get('/fetchBlockUsers/:userId', globals.isAuthorised, block.fetchBlockUsers);
    router.post('/unblockUser/:userId', globals.isAuthorised, block.unblockUser);

    app.use(config.baseApiUrl, router);
};
