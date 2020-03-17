/**********************
 GLYFF MODULE ROUTING
 **********************/
 module.exports = function(app, express) {

    // Require modules
    var report = require('../controllers/report.server.controller');
    var globals = require('../../configs/globals');
    var router = express.Router();

    // Routing
    router.get('/reportOfCount/:userId', globals.isAuthorised, report.reportOfCount);
    router.post('/reportGlyff', globals.isAuthorised, report.reportGlyff);

    app.use(config.baseApiUrl, router);
};
