const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.mentionUser = functions.database.ref("users/{uid}/chat/mentions/{mentionID}").onWrite(async function(change, context) {
    var uid = context.params.uid;
    var mentionID = context.params.mentionID;
    var mention = change.after.val();

    console.log("[Mention] UID " + mention.from + " (" + mention.fromuser + ") mentioned UID " + uid + "saying: " + mention.message);

    var deviceTokens = await admin.database().ref("users/" + uid + "/chat/tokens").once("value");
    
    if (!deviceTokens.hasChildren()) {
        console.log("    - No devices to send notification to.");
    } else {
        console.log("    - Sending to available devices: " + deviceTokens.numChildren());

        var notificationPayload = {
            notification: {
                title: mention.fromuser + " mentioned you!",
                body: mention.message,
                icon: "https://gameproxy.host/media/Small.png",
                click_action: "https://gameproxy.host/chat/console.html?mention=" + mentionID
            }
        };

        var deviceTokensArray = Object.keys(deviceTokens.val());
        var notificationResponse = await admin.messaging().sendToDevice(deviceTokensArray, notificationPayload);
        var badDeviceTokens = [];

        if (notificationResponse != null) {
            notificationResponse.forEach(function(result, index) {
                var error = result.error;

                if (error) {
                    console.warn("    - A bad token has been found, and it may be removed due to error: ", error.code);

                    if (error.code == "messaging/invalid-registration-token" || error.code == "messaging/registration-token-not-registered") {
                        badDeviceTokens.push(deviceTokens.ref.child(deviceTokensArray[index]).remove());
                    }
                }
            });
        }

        return Promise.all(tokensToRemove);
    }
});