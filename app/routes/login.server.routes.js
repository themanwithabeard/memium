/**********************
 GLYFF MODULE ROUTING
 **********************/
 module.exports = function(app, express) {

    // Require modules
    var login = require('../controllers/login.server.controller');
    var globals = require('../../configs/globals');
    var upload = require('../../configs/aws').upload;
    var router = express.Router();

    // Routing
    router.post('/signup', upload.single('file'), login.signup);
    router.post('/signin', login.signin);
    router.post('/signupfb', upload.single('file'), login.signupfb);
    router.get('/signout', globals.isAuthorised, login.signout);
    router.post('/changePassword/:userId', globals.isAuthorised, login.changePassword);
    router.post('/forgotPassword', login.forgotPassword);
    router.post('/resetPassword', login.resetPassword);
    router.get('/checkEmail', login.checkEmail);
    router.get('/checkUsername', login.checkUsername);
    router.post('/checkVerificationToken', login.checkVerificationToken);
    router.post('/setDeviceToken', globals.isAuthorised, login.setDeviceToken);
    router.get('/checkSessionPersisted/:userId', globals.checkForSessionPersistance);

    // new api for update device token 
    router.post('/updateDeviceToken', globals.isAuthorised, login.updateDeviceToken);

    app.use(config.baseApiUrl, router);
};
