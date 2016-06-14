/**

 * Load needed modules.
 */

var _ = require('underscore');
var express = require('express');
//Create an express application instance
var app = express();
//Global app configuration
app.use(express.bodyParser());    // Middleware for reading request body

//Require Modules
var juiceIDModule = require('cloud/modules/juiceIDModule.js');
var groupsModule = require('cloud/modules/groupsModule.js');
var requestsModule = require('cloud/modules/requestsModule.js');
var pushNotificationsModule = require('cloud/modules/pushNotificationManager.js');
var cloudinaryObjectsModule = require('cloud/modules/cloudinaryObjectsModule.js');

//Jobs
var backgroundJobs = require('cloud/jobs/jobs.js');

//JuiceID Module Endpoint
Parse.Cloud.define("accessJuiceIDUser", juiceIDModule.accessJuiceIDUser);

//GroupsModule Endpoints
Parse.Cloud.define("joinGroup", groupsModule.joinGroup);
Parse.Cloud.define("inviteToGroup", groupsModule.inviteToGroup);
Parse.Cloud.define("requestJoinGroup", groupsModule.requestJoinGroup);
Parse.Cloud.define("cancelJoinGroup", groupsModule.cancelJoinGroup);
Parse.Cloud.define("cancelInviteUserToGroup", groupsModule.cancelInviteUserToGroup);

//Requests Module Endpoints
Parse.Cloud.define("acceptRequest", requestsModule.acceptRequest);
Parse.Cloud.define("rejectRequest", requestsModule.rejectRequest);

//PushNotificationsManager Endpoints
Parse.Cloud.define("sendGroupRefresh", pushNotificationsModule.sendGroupRefresh);
Parse.Cloud.define("sendEventRefresh", pushNotificationsModule.sendEventRefresh);
Parse.Cloud.define("sendFeedUpdate", pushNotificationsModule.sendFeedUpdate);
Parse.Cloud.define("sendPendingRequest", pushNotificationsModule.sendPendingRequest);
Parse.Cloud.define("sendThreadRefresh", pushNotificationsModule.sendThreadRefresh);
Parse.Cloud.define("sendNewThread", pushNotificationsModule.sendNewThread);
Parse.Cloud.define("sendThreadMessage", pushNotificationsModule.sendThreadMessage);

//Cloudinary Object Endpoints
Parse.Cloud.define("sign_cloudinary_upload_request", cloudinaryObjectsModule.sign_cloudinary_upload_request);
Parse.Cloud.define("photo_thumbnail_url", cloudinaryObjectsModule.photo_thumbnail_url);


Parse.Cloud.afterSave("SeriesMessage", function(request) {

  console.log("performing afterSave on seriesMessage: " + request.object.id);

   if (!(request.object.get("series"))) {
    console.error('No series attached to seriesMessage');
    return;
  }else{
  	console.log("seriesMessage " + request.object.id + " belongs to Series " + request.object.get("series").id);
  }

  var seriesID = request.object.get("series").id;
  var Series = Parse.Object.extend("Series");
  var seriesPointer = new Series();
  seriesPointer.id = seriesID;

  var seriesQuery = new Parse.Query("Series");
  var seriesMessageQuery = new Parse.Query("SeriesMessage");
  seriesMessageQuery.equalTo('series', seriesPointer);

  Parse.Promise.when([

    seriesQuery.get(seriesID),
    seriesMessageQuery.find()

  ]).then(function(messageSeries, messages){

    var promises = [];

    if (messages) {

    	console.log("--> Series " + messageSeries.id + " has " + messages.length + " messages");
    	messageSeries.set("messageCount", messages.length);
    	promises.push(messageSeries.save());

    }

    return Parse.Promise.when(promises);

  }).then(function(){

    console.log("completed SeriesMessage afterSave");

  }, function(error){

    console.error(error);

  });

}); //end SeriesMessage afterSave


//Prevent deletion of groups and threadsb

Parse.Cloud.beforeDelete("Group", function(request, response) {

  response.error("Groups cannot currently be deleted");

});

Parse.Cloud.beforeDelete("Thread", function(request, response) {

  response.error("Threads cannot currently be deleted");

});
