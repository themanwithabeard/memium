/**********************
 MODULE INITIALISTAION
 **********************/
 var express = require('express');
 common = require('./env/configs');
 notification = require('./notification');
 config = common.config();
 bodyParser = require('body-parser');
 jwt = require('jsonwebtoken');
 cors = require('cors');
 fs = require('file-system');
 morgan = require('morgan');
 var path = require("path");
 var apn = require('apn');

/******************
 APP INITIALISTAION
 ******************/
 module.exports = function() {

    var app = express();

    app.use(bodyParser.urlencoded({
        limit: '50mb',
        extended: true
    }));

    app.use(bodyParser.json({limit: '50mb'}));

    // use morgan to log requests to the console
    app.use(morgan('dev'));

    app.use(cors());

    // Including Routing
    require('../app/routes/block.server.routes.js')(app, express);
    require('../app/routes/user.server.routes.js')(app, express);
    require('../app/routes/glyff.server.routes.js')(app, express);
    require('../app/routes/login.server.routes.js')(app, express);
    require('../app/routes/trending.server.routes.js')(app, express);
    require('../app/routes/notifications.server.routes')(app, express);
    require('../app/routes/report.server.routes')(app, express);
    require('../app/routes/sync.server.routes.js')(app, express);

    return app;
};
