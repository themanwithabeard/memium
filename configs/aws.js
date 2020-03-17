/****************************
 MODULE INITIALISATION
 ****************************/
 var aws = require('aws-sdk'),
 multer = require('multer'),
 multerS3 = require('multer-s3');

 aws.config.update({
    secretAccessKey: '4XyBG60tuPePNjS539GFDnkfWfw9cjTW2fSg8/oi',
    accessKeyId: 'AKIAJH7AOEJZHCFNICRA',
    region: 'us-west-1'
});

 var s3 = new aws.S3();


/***********************************************
 cloud image uploader using multer-s3
 Pass the bucket name to the bucketName param to upload the file to the bucket
 ***********************************************/

 var upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'glyphoto',
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
        },
        key: function (req, file, cb) {
            var res = file.originalname.split(".");
            var imageName = res[0]+Date.now().toString()+'.'+res[1];
            cb(null, imageName);
        }
    })
})

/**************
 EXPORT SCHEMA
 *************/
 module.exports = {
    upload:      upload,
    s3: s3
}
// exports.upload = upload
