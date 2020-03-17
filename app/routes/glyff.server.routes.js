/**********************
 GLYFF MODULE ROUTING
 **********************/
 module.exports = function(app, express) {

    // Require modules
    var glyff = require('../controllers/glyff.server.controller');
    var globals = require('../../configs/globals');
    var upload = require('../../configs/aws').upload;
    var router = express.Router();

    // Routing 
    var cpUpload = upload.fields([{ name: 'glyffOriginal', maxCount: 1 }, { name: 'glyffCustomised', maxCount: 1 }]);
    router.post('/saveGlyff/:userId', globals.isAuthorised, cpUpload, glyff.saveGlyff);
    router.post('/saveSticker', globals.isAuthorised, glyff.saveSticker);
    router.get('/getSticker/:userId/:type',globals.isAuthorised, glyff.getSticker);
    router.get('/fetchUserGlyff/:userId', globals.isAuthorised, glyff.fetchUserGlyff);
    router.get('/searchCaptionBasedGlyphs', globals.isAuthorised, glyff.searchCaptionBasedGlyphs);
    router.get('/searchCaptionBasedGlyphsForKeyboard', globals.isAuthorised, glyff.searchCaptionBasedGlyphsForKeyboard);
    router.get('/getPopular', globals.isAuthorised, glyff.getPopular);
    router.get('/getGlyffActionUserList', globals.isAuthorised, glyff.getUsersListOfGlyffActions);
    router.post('/editGlyph/:userId/:glyphId', globals.isAuthorised, cpUpload, glyff.saveGlyff);
     router.post('/editGlyphDetails/:glyphId', globals.isAuthorised, cpUpload, glyff.editGlyphDetails);
    router.post('/saveGlyffFavourite', globals.isAuthorised, glyff.saveGlyffFavourite);
    router.post('/removeFavouriteGlyff', globals.isAuthorised, glyff.removeFavouriteGlyff);
    router.get('/fetchGlyffDetail/:glyphId', globals.isAuthorised, glyff.fetchGlyffDetail);
    router.post('/shareGlyff', globals.isAuthorised, glyff.shareGlyff);
    router.post('/removeGlyff', globals.isAuthorised, glyff.removeGlyff);
    router.post('/fetchGlyffByUser/:userId', globals.isAuthorised, glyff.fetchGlyffByUser);
    router.post('/viewGlyff', globals.isAuthorised, glyff.viewGlif);
    router.post('/getFavouriteCountUser/:userId', globals.isAuthorised, glyff.getFavouriteCountUser);
    router.post('/fetchAllGlif/:userId', globals.isAuthorised, glyff.fetchAllGlif);
    router.get('/deleteMemeByAdmin/:userId/:glyffId', globals.isAuthorised, glyff.deleteMemeByAdmin);
    router.post('/voteGlyff', globals.isAuthorised, glyff.voteGlyff);
    router.get('/fetchRelatedGlyffs/:glyffId', globals.isAuthorised, glyff.fetchRelatedGlyffs);
    //router.get('/fetchRelatedGlyffsForAdmin/:glyffId', globals.isAuthorised, glyff.fetchRelatedGlyffsForAdmin);
    router.post('/fetchClones/:userId', globals.isAuthorised, glyff.fetchClones);
    //router.post('/addGlyffViewCount', globals.isAuthorised, glyff.addGlyffViewCount);
    
    // Apis for comments
    router.get('/comments/:userId/:glyffId', globals.isAuthorised, glyff.fetchComments);
    router.post('/comments/:userId/:glyffId', globals.isAuthorised, glyff.addComment);
    router.delete('/comments/:userId/:glyphId/:commentId', globals.isAuthorised, glyff.deleteComment);

    app.use(config.baseApiUrl, router);
};
