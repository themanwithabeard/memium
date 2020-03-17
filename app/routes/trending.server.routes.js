/**********************
 GLYFF MODULE ROUTING
 **********************/
module.exports = function(app, express) {

    // Require modules
    var trend = require('../controllers/trending.server.controller');
    var router = express.Router();

    // Routing


    app.use(config.baseApiUrl, router);
};
