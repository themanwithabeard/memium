

// let deviceToken = "6DFFDE69BB84A9270FC78F6B09E16E3AFD4F9CD322D2ED920A270968A79C0C31";
//
// var note = new apn.Notification();
//
// note.expiry = Math.floor(Date.now() / 1000) + 7200; // Expires 1 hour from now.
// note.badge = 3;
// note.sound = "ping.aiff";
// note.alert = "\uD83D\uDCE7 \u2709 You have a new message from nodejs developer";
// note.payload = {'messageFrom': 'Abhinav Rajpurohit'};
//

const   Promise = require('bluebird'),
        mongoose = require('mongoose'),
        User    = require('../app/models/users.server.model').user,
        co      = require('co');


exports.pushNotification = function(notificationDetails) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var glyphUrl = notificationDetails.glyphThumbnail || '';
            var fromUserImageUrl = notificationDetails.fromUserImageUrl || '';
            var glyphType = notificationDetails.glyphType || '';
            let deviceToken = notificationDetails.device_token;

            // one condition check for user collection for android side one mistake firebase account in the project
            let userAppcode = yield User.findOne({device_token:deviceToken});
           // console.log(userAppcode,'userAppcode')
            if (notificationDetails.deviceType === "android" && notificationDetails.device_token) {                
                var FCM = require('fcm-node');
                var serverKey
                if(userAppcode && userAppcode.appCode != undefined)
                {
                    serverKey = "AAAAJIu60u0:APA91bHWIAAJmM-d57gOcOh3_n0b95hCbogNUvWR0NV7brQxuz7QuxVEYvRimN_k3vzpYgdv1w_KGRBB-lahflSz4H8oklh4QgXfUsfHTuc-CNg_BXmUX35segp5Daibgeru8jhp2IjT"
                }
                else
                {
                     serverKey = 'AAAADEGhrM8:APA91bEikrKkCp38_LEiSL3hUZP4DkXI-wQ3smrN0KXCoU8W0lhwtFH2spQw5z1_EI4icP1CrZzt036-G50g_1r82s5OnmSsl_LI8-VgUqTxuZyXoUp4xiy_UVK04rgSvjgrM3ZPhlrc'; //put your server key here
                }
               
                var fcm = new FCM(serverKey);
                //console.log(notificationDetails, "notificationDetails--------------")
                var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
                    to: deviceToken, 
                    //to: 'erX1vgzhs2g:APA91bG2G2zPZPzZu_6ryB-8Dl6GDU773hFCyE2g-QrucIUGSsyq5hrj38gZRe5DRnGgQSRWnJabLuK9WKeJB3hJjAGgFw6XenpqCX4cOyX2sK2aLty12AnBSI_fDeDArkxMI0e0kBV_', // simulator's deviceToken
                    content_available: true,
                    mutable_content: true,
                    
                    // notification: {
                    // },
                    
                    data: {  //you can send only notification or only data(or include both)
                        "title": 'Memium', 
                        "body": notificationDetails.message, 
                        "badge": notificationDetails.badge,
                        "messageFrom": notificationDetails.name,
                        "attachment-url" : fromUserImageUrl,
                        "type": notificationDetails.type,
                        "mediaType": glyphType,
                        "mediaUrl" : glyphUrl
                    }
                };
                
                fcm.send(message, function(err, response){
                    if (err) {
                        // console.log("Error while sending notification using FCM! ", err);
                        resolve(0);
                    } else {
                        //console.log("Notification sent successfully with response: ", response);
                        resolve(response);
                    }
                });
            } else if (notificationDetails.deviceType === "ios" && notificationDetails.device_token){                
                var path = require('path');
                var fs = require('fs');
                var apn = require('apn');
                var options = {
                    token: {
                        key: fs.readFileSync(path.resolve(__dirname + '/AuthKey_MS83AW98T7.p8')),
                        keyId: "MS83AW98T7",
                        teamId: "FBQHPJYPVA"
                    },
                    production: true
                };
                // var options = {
                //     key:  fs.readFileSync(path.resolve(__dirname+'/Memium_APNs_Production_Dev_Certificate.pem')),
                //     cert: fs.readFileSync(path.resolve(__dirname+'/Memium_APNs_Production_Dev_Certificate.pem')),
                //     production: false
                // };
                console.log('options --- ', options);
                var apnProvider = new apn.Provider(options);
                //console.log(notificationDetails, "notificationDetails--------------")
            
                var note = new apn.Notification();
                note.topic = 'com.memium.memium';
                note.expiry = Math.floor(Date.now() / 1000) + 7200; // Expires 1 hour from now.
                note.badge = notificationDetails.badge;
                note.sound = "ping.aiff";
                note.alert = notificationDetails.message;
                // note.alert = "\uD83D\uDCE7 \u2709 "+notificationDetails.message;
                note.mutableContent = 1;
                note.payload = {'messageFrom': notificationDetails.name, "data": {
                    "attachment-url": fromUserImageUrl
                }, 'type': notificationDetails.type,"mediaType": glyphType,"mediaUrl" : glyphUrl};
            
                console.log(note, "noteeeeeeeeeeeeeeee")
            
                apnProvider.send(note, deviceToken).then( (result) => {
                    console.log(JSON.stringify(result), "result");
                    if(result) {
                        console.log(result);                        
                        resolve(result);
                    }
                });
            } else {
                resolve(true);
            }
        }).catch(function(err){
            console.log('err --- ', err);
            
            err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            resolve(true);
        });
    });
}

exports.backgroundPushNotifcation = function(notificationObject) {
    return new Promise(function(resolve, reject){
        co(function*(){
            var deviceToken = notificationObject.deviceToken;
            var deviceType = notificationObject.deviceType;

             // one condition check for user collection for android side one mistake firebase account in the project
             let userAppcode = yield User.findOne({deviceToken:deviceToken});

            if (deviceType === 'android' && deviceToken) {
                var FCM = require('fcm-node');
                var serverKey
                if(userAppcode && userAppcode.appCode != undefined)
                {
                    serverKey = "AAAAJIu60u0:APA91bHWIAAJmM-d57gOcOh3_n0b95hCbogNUvWR0NV7brQxuz7QuxVEYvRimN_k3vzpYgdv1w_KGRBB-lahflSz4H8oklh4QgXfUsfHTuc-CNg_BXmUX35segp5Daibgeru8jhp2IjT"; //put your server key here 
                }
                else
                {
                     serverKey = 'AAAADEGhrM8:APA91bEikrKkCp38_LEiSL3hUZP4DkXI-wQ3smrN0KXCoU8W0lhwtFH2spQw5z1_EI4icP1CrZzt036-G50g_1r82s5OnmSsl_LI8-VgUqTxuZyXoUp4xiy_UVK04rgSvjgrM3ZPhlrc'; //put your server key here
                }
              //  var serverKey = 'AAAADEGhrM8:APA91bEikrKkCp38_LEiSL3hUZP4DkXI-wQ3smrN0KXCoU8W0lhwtFH2spQw5z1_EI4icP1CrZzt036-G50g_1r82s5OnmSsl_LI8-VgUqTxuZyXoUp4xiy_UVK04rgSvjgrM3ZPhlrc'; //put your server key here
                var fcm = new FCM(serverKey);
                
                var notification = { 
                    to: deviceToken, 
                    content_available: true,
                    mutable_content: true,                    
                    data: {
                        "status": notificationObject.status,
                        "message": notificationObject.message
                    }
                };
                
                fcm.send(notification, function(err, response){
                    if (err) {
                        //console.log("Error while sending notification using FCM!");
                        resolve(1);
                    } else {
                        //console.log("Notification sent successfully with response: ", response);
                        resolve(1);
                    }
                });
            } else if (deviceType === 'ios' && deviceToken){
                var path = require('path');
                var fs = require('fs');
                var apn = require('apn');
                // var options = {
                //     key:  fs.readFileSync(path.resolve(__dirname+'/Memium_APNs_Production_Dev_Certificate.pem')),
                //     cert: fs.readFileSync(path.resolve(__dirname+'/Memium_APNs_Production_Dev_Certificate.pem')),
                //     production: false
                // };

                var options = {
                    token: {
                        key: fs.readFileSync(path.resolve(__dirname + '/AuthKey_MS83AW98T7.p8')),
                        keyId: "MS83AW98T7",
                        teamId: "FBQHPJYPVA"
                    },
                    production: true
                };
                
                var apnProvider = new apn.Provider(options);
                var note = new apn.Notification();
                note.topic = 'com.memium.memium';
                note.expiry = Math.floor(Date.now() / 1000) + 7200; // Expires 1 hour from now.
                //note.badge = 1;

                // Uncomment this lines for silent/background notifications
                note.contentAvailable = 1;
                note.sound = "";

                // Comment below line for silent/background notification
                //note.sound = "ping.aiff";          
                      
                note.alert = notificationObject.message;
                // note.alert = "\uD83D\uDCE7 \u2709 "+notificationDetails.message;

                note.mutableContent = 1;
                note.payload = {
                    "status": notificationObject.status,
                    "message": notificationObject.message
                };
            
                //console.log(note, "noteeeeeeeeeeeeeeee")
            
                apnProvider.send(note, deviceToken).then( (result) => {
                    // console.log(result, "result");
                    if(result) {
                        return resolve(1);
                    }
                    resolve(1)
                });
            } else {
                resolve(1);
            }
        }).catch(function(err){
            //err = err && err.errorCode ? err : {errorCode: 500, errorMessage: err};
            resolve(1);
        });
    });
}
