/**********************
 NOTIFICATIONS MODULE ROUTING
 **********************/
 module.exports = function(app, express) {

    // Require modules
    var notifications = require('../controllers/notifications.server.controller');
    var globals = require('../../configs/globals');
    var router = express.Router();

    // Routing
    router.get('/notifications/:userId', globals.isAuthorised, notifications.getNotifications);
    router.get('/glyphNotifications/:userId', globals.isAuthorised, notifications.glyphNotifications);
    router.post('/changePushNotificationsStatus/:userId', globals.isAuthorised, notifications.changePushNotificationsStatus);

    app.use(config.baseApiUrl, router);
};
