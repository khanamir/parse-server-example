/**
 * Push Notification Manager
 * @name PushManager
 *
 * 
*/


var express = require('express');
var _ = require('underscore');

//Create an express application instance
var app = express();

var currentUser;


// Module Exports - defined at top for quick readability
module.exports = {

  sendGroupRefresh: function (request, response) {
    sendGroupRefresh(request, response);
  },sendFeedUpdate: function (request, response) {
    sendFeedUpdate(request, response);
  },sendPendingRequest: function (request, response) {
    sendPendingRequest(request, response);
  },sendEventRefresh: function (request, response) {
    sendEventRefresh(request, response);
  },sendThreadRefresh: function (request, response) {
    sendThreadRefresh(request, response);
  },sendNewThread: function (request, response) {
    sendNewThread(request, response);
  },sendThreadMessage: function (request, response) {
    sendThreadMessage(request, response);
  },


  sendFeedNotification: function (userList) {
    sendFeedNotification(userList);
  },
  sendGroupRefreshNotification: function (groupID) {
    sendGroupRefreshNotification(groupID);
  },
  sendRequestJoinGroupNotification: function (userList, message) {
    sendRequestJoinGroupNotification(userList, message);
  },
  sendGroupInviteNotification: function (groupID, userList, message) {
    sendGroupInviteNotification(groupID, userList, message);
  },
  sendPendingRemoveNotification: function (userList) {
    sendPendingRemoveNotification(userList);
  },
  cancelInvitationNotification: function (user) {
    cancelInvitationNotification(user);
  },
  sendGroupJoinAcceptedNotification: function (user) {
    sendGroupJoinAcceptedNotification(user);
  },
  sendEventRefreshNotification: function (eventID, groupID, userList) {
    sendEventRefreshNotification(eventID, groupID, userList);
  }

};


//Endpoint Functions - Used to directly call push notifications from app

/*
* This function is called when the app sends a notification to refresh the group data  
* group_id is the required parameter
*/

function sendGroupRefresh(request, response) {

  var data = request.params;
  if (!(data && data.group_id)) {
    console.error('Invalid request received. Missing group or app id');
    response.error('Invalid request received. Missing group or app id');
    return;
  }

  var groupID = data.group_id;

  Parse.Promise.when([
    sendGroupRefreshNotification(groupID)
  ]).then(function(){

    console.log("completed sendGroupRefresh successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end sendGroupRefresh


/*
* This function is called when the app sends a notification to the feed of a group  
* group_id is the required parameter
*/

function sendFeedUpdate(request, response) {

  var data = request.params;
  if (!(data && data.group_id)) {
    console.error('Invalid request received. Missing group id');
    response.error('Invalid request received. Missing group id');
    return;
  }

  var groupID = data.group_id;

  var Group = Parse.Object.extend("Group");
  var groupQuery = new Parse.Query(Group);
  groupQuery.include('group');

  groupQuery.get(groupID).then(function(group){

    var adminUsers = group.get('adminUsers');
    var joinedUsers = group.get('joinedUsers');
    var allUsers = _.union(adminUsers, joinedUsers);
    allUsers = _.uniq(allUsers);
    var userList = _.filter(allUsers, function(user){ return user.id != currentUser.id; });

    return sendFeedNotification(userList);

  }).then(function(){

    console.log("completed sendFeedUpdate successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end sendFeedUpdate


/*
* This function is called when the app sends a notification of a pending request to group admins 
* group_id is the required parameter
*/

function sendPendingRequest(request, response) {

  var data = request.params;
  if (!(data && data.group_id)) {
    console.error('Invalid request received. Missing group id');
    response.error('Invalid request received. Missing group id');
    return;
  }

  var groupID = data.group_id;

  var Group = Parse.Object.extend("Group");
  var groupQuery = new Parse.Query(Group);
  groupQuery.include('group');

  groupQuery.get(groupID).then(function(group){

    var userList = group.get('adminUsers');
    return sendPendingNotification(userList);

  }).then(function(){

    console.log("completed sendPendingRequest successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end sendPendingRequest


/*
* This function is called when the app sends a notification to the group when an event is edited 
* group_id and event_id are the required parameter
*/

function sendEventRefresh(request, response) {

  var data = request.params;
  if (!(data && data.group_id && data.event_id)) {
    console.error('Invalid request received. Missing group id');
    response.error('Invalid request received. Missing group id');
    return;
  }

  var eventID = data.event_id;
  var groupID = data.group_id;

  var Group = Parse.Object.extend("Group");
  var groupQuery = new Parse.Query(Group);
  groupQuery.include('group');

  groupQuery.get(groupID).then(function(group){

    var adminUsers = group.get('adminUsers');
    var joinedUsers = group.get('joinedUsers');
    var allUsers = _.union(adminUsers, joinedUsers);
    allUsers = _.uniq(allUsers);
    var userList = _.filter(allUsers, function(user){ return user.id != currentUser.id; });
    return sendEventRefreshNotification(eventID, groupID, userList);

  }).then(function(){

    console.log("completed sendEventRefresh successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end sendEventRefresh


/*
* This function is called when the app sends a notification to refresh the thread  
* thread_id is the required parameter
*/

function sendThreadRefresh(request, response) {

  var data = request.params;
  if (!(data && data.thread_id)) {
    console.error('Invalid request received. Missing thread_id');
    response.error('Invalid request received. Missing thread_id');
    return;
  }

  var threadID = data.thread_id;

  var Thread = Parse.Object.extend("Thread");
  var threadQuery = new Parse.Query(Thread);
  threadQuery.include('group');

  threadQuery.get(threadID).then(function(thread){

    var groupPointer = thread.get('group');
    var Group = Parse.Object.extend("Group");
    var groupQuery = new Parse.Query(Group);

    return groupQuery.get(groupPointer.id);

  }).then(function(group){

    console.log("threadID: " + threadID + " , " + "groupID: " + group.id);

    var adminUsers = group.get('adminUsers');
    var joinedUsers = group.get('joinedUsers');
    var userList = _.union(adminUsers, joinedUsers);

    return sendThreadRefreshNotification(threadID, userList);

  }).then(function(){

    console.log("completed sendGroupRefresh successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end sendThreadRefresh


/*
* This function is called when the app sends a notification for a new thread  
* thread_id is the required parameter
*/

function sendNewThread(request, response) {

  var data = request.params;
  if (!(data && data.thread_id)) {
    console.error('Invalid request received. Missing thread_id');
    response.error('Invalid request received. Missing thread_id');
    return;
  }

  currentUser = request.user;
  var threadID = data.thread_id;
  var theThread;

  var Thread = Parse.Object.extend("Thread");
  var threadQuery = new Parse.Query(Thread);
  threadQuery.include('group');

  threadQuery.get(threadID).then(function(thread){

    theThread = thread;
    var groupPointer = thread.get('group');
    var Group = Parse.Object.extend("Group");
    var groupQuery = new Parse.Query(Group);

    return groupQuery.get(groupPointer.id);

  }).then(function(group){

    console.log("threadID: " + threadID + " , " + "groupID: " + group.id);

    var adminUsers = group.get('adminUsers');
    var joinedUsers = group.get('joinedUsers');
    var allUsers = _.union(adminUsers, joinedUsers);
    allUsers = _.uniq(allUsers);
    var userList = _.filter(allUsers, function(user){ return user.id != currentUser.id; });

    var threadTitle = theThread.get('title');
    var firstName = currentUser.get('firstName');
    var lastName = currentUser.get('lastName');
    var name = firstName + ' ' + lastName;
    var message = name + " created a new thread called " + threadTitle;

    return sendNewThreadNotification(threadID, group.id, userList, message);

  }).then(function(){

    console.log("completed sendNewThread successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end sendNewThread

/*
* This function is called when the app sends a notification to refresh the thread  
* thread_id is the required parameter
*/

function sendThreadMessage(request, response) {

  var data = request.params;
  if (!(data && data.thread_message_id && data.message)) {
    console.error('Invalid request received. Missing thread_message_id or message');
    response.error('Invalid request received. Missing thread_message_id or message');
    return;
  }

  var alertsEnabled = false;

  if (data.alerts_enabled) {
    alertsEnabled = data.alerts_enabled;
  }

  currentUser = request.user;
  var message = data.message;

  var threadMessageID = data.thread_message_id;
  var ThreadMessage = Parse.Object.extend("ThreadMessage");
  var threadMessageQuery = new Parse.Query(ThreadMessage);
  threadMessageQuery.include('thread');
  
  var theThreadMessage;
  var theThread;

  threadMessageQuery.get(threadMessageID).then(function(threadMessage){

    theThreadMessage = threadMessage;
    var threadPointer = theThreadMessage.get('thread');

    var Thread = Parse.Object.extend("Thread");
    var threadQuery = new Parse.Query(Thread);
    threadQuery.include('group');

    return threadQuery.get(threadPointer.id);

  }).then(function(thread){

    theThread = thread;
    var groupPointer = thread.get('group');
    var Group = Parse.Object.extend("Group");
    var groupQuery = new Parse.Query(Group);

    return groupQuery.get(groupPointer.id);

  }).then(function(group){

    console.log("threadMessageID: " + threadMessageID + " , " + "threadID: " + theThread.id + " , " + "groupID: " + group.id);

    var adminUsers = group.get('adminUsers');
    var joinedUsers = group.get('joinedUsers');
    var allUsers = _.union(adminUsers, joinedUsers);
    allUsers = _.uniq(allUsers);
    var userList = _.filter(allUsers, function(user){ return user.id != currentUser.id; });

    console.log("userList:" + userList );

    var systemMessage;
    var isAdmin = false;

    for (var i = adminUsers.length - 1; i >= 0; i--) {
      user = adminUsers[i];

      if (user.id === currentUser.id){
          isAdmin = true;
          break;
      }

    }

    //only show push notification alert is message is from admin
    if(isAdmin && alertsEnabled){
      console.log("user is admin");
      systemMessage = message;
    }

    return sendThreadMessageNotification(theThread.id, threadMessageID, group.id, userList, message, systemMessage);

  }).then(function(){

    console.log("completed sendThreadMessage successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end sendThreadMessage


//
//Cloud Functions - Used to send push notifications from cloud code
//


//sent to the current user when their feed updates
function sendFeedNotification(userList){

  console.log('sendFeedNotification called');

  if (!userList) {
    console.error('userList must be passed as parameter.');
    return error('userList must be passed as parameter.');
  }

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.containedIn("user", userList);

  console.log('push query constructed');

  Parse.Push.send({
  where: query,
  data: {
     action:"org.church.rockmobile.PUSH_ACTION",
     type:"PushFeed"
  }
  }, { success: function() { 

      return "sendFeedNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true
    
  });

}

//sent to entire group when a user joins a group
function sendGroupRefreshNotification(groupID){

  console.log('sendGroupRefreshNotification called');

  if (!groupID) {
    console.error('groupID must be passed as parameter.');
    return error('groupID must be passed as parameter.');
  }

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.exists("user");

  console.log('push query constructed');

  Parse.Push.send({
  where: query,
  data: {
     action:"org.church.rockmobile.PUSH_ACTION",
     groupId: groupID,
     type:"PushGroupRefresh"
  }
  }, { success: function() { 

      return "sendGroupRefreshNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true

  });

}


//sent to group admins when a user requests to join a group
function sendRequestJoinGroupNotification(userList, message){

  console.log('sendGroupJoinRequestNotification called');

  if (!(userList && message)) {
    console.error('userlist and message must be passed as parameter.');
    return error('userlist and message must be passed as parameter.');
  }

  console.log(message);

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.containedIn("user", userList);

  console.log('push query constructed');

  Parse.Push.send({
  where: query,
  data: {
     action:"org.church.rockmobile.PUSH_ACTION",
     message: message,
     type:"PushGroupJoinRequest"
  }
  }, { success: function() { 

      return "sendGroupJoinRequestNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true

  });

}

//sent to user when they are invited tocontainedIn a group
function sendGroupInviteNotification(groupID, userList, message){

  console.log('sendGroupInviteNotification called');

  if (!(userList && message)) {
    console.error('groupID, userlist and message must be passed as parameter.');
    return error('groupID, userlist and message must be passed as parameter.');
  }

  console.log(message);

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.containedIn("user", userList);

  console.log('push query constructed');

  Parse.Push.send({
  where: query,
  data: {
     action:"org.church.rockmobile.PUSH_ACTION",
     alert: message,
     type:"PushGroupInvite",
     badge:"Increment",
     groupId:groupID
  }
  }, { success: function() { 

      return "sendGroupInviteNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true

  });

}


//sent to admin users when a request is pending
function sendPendingNotification(userList){

  console.log('sendPendingNotification called');

  if (!userList) {
    console.error('userList must be passed as parameter.');
    return error('userList must be passed as parameter.');
  }

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.containedIn("user", userList);

  console.log('push query constructed');

  Parse.Push.send({
  where: query,
  data: {
     action:"org.church.rockmobile.PUSH_ACTION",
     type:"PushPending"
  }
  }, { success: function() { 

      return "sendPendingNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true

  });

}


//sent when user cancels request to join a group
function sendPendingRemoveNotification(userList){

  console.log('sendPendingRemoveNotification called');

  if (!userList) {
    console.error('userList must be passed as parameter.');
    return error('userList must be passed as parameter.');
  }

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.containedIn("user", userList);

  console.log('push query constructed');

  Parse.Push.send({
  where: query,
  data: {
     action:"org.church.rockmobile.PUSH_ACTION",
     type:"PushPendingRemove"
  }
  }, { success: function() { 

      return "sendPendingRemoveNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true

  });

}


//sent when group admin cancels invitation
function cancelInvitationNotification(user){

  console.log('cancelInvitationNotification called');

  if (!user) {
    console.error('User must be passed as parameter.');
    return error('User must be passed as parameter.');
  }

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.equalTo("user", user);

  console.log('push query constructed');

  Parse.Push.send({
  where: query,
  data: {
     action:"org.church.rockmobile.PUSH_ACTION",
     type:"PushCancelInvitation"
  }
  }, { success: function() { 

      return "cancelInvitationNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true

  });

}

//sent when group admin accepts group join request
function sendGroupJoinAcceptedNotification(user){

  console.log('sendGroupJoinAcceptedNotification called');

  if (!user) {
    console.error('User must be passed as parameter.');
    return error('User must be passed as parameter.');
  }

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.equalTo("user", user);

  console.log('push query constructed');

  Parse.Push.send({
  where: query,
  data: {
     action:"org.church.rockmobile.PUSH_ACTION",
     type:"PushGroupJoinAccepted"
  }
  }, { success: function() { 

      return "sendGroupJoinAcceptedNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true

  });

}


//sent to user when they are invited tocontainedIn a group
function sendEventRefreshNotification(eventID, groupID, userList){

  console.log('sendEventRefreshNotification called');

  if (!(userList && eventID && groupID)) {
    console.error('groupID, userlist and eventID must be passed as parameters.');
    return error('groupID, userlist and eventID must be passed as parameters.');
  }

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.containedIn("user", userList);

  console.log('push query constructed');

  Parse.Push.send({
  where: query,
  data: {
     action:"org.church.rockmobile.PUSH_ACTION",
     eventId:eventID,
     groupId:groupID,
     type:"PushEventRefresh"
  }
  }, { success: function() { 

      return "sendEventRefreshNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true

  });

}

//sent to group users when a thread is updated
function sendThreadRefreshNotification(threadID, userList){

  console.log('sendThreadRefreshNotification called');

  if (!(userList && threadID)) {
    console.error('threadID must be passed as parameters.');
    return;
  }

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.containedIn("user", userList);

  console.log('push query constructed');

  Parse.Push.send({
  where: query,
  data: {
     action:"org.church.rockmobile.PUSH_ACTION",
     threadId:threadID,
     type:"PushThreadRefresh"
  }
  }, { success: function() { 

      return "sendThreadRefreshNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true

  });

}


//sent to group users when a thread is created
function sendNewThreadNotification(threadID, groupID, userList, message){

  console.log('sendThreadRefreshNotification called');

  if (!(userList && threadID && groupID && message)) {
    console.error('groupID, threadID , userList and message must be passed as parameters.');
    return;
  }

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.containedIn("user", userList);

  console.log('push query constructed');

  Parse.Push.send({
  where: query,
  data: {
     action:"org.church.rockmobile.PUSH_ACTION",
     threadId:threadID,
     type:"PushNewThread",
     badge:'Increment',
     groupId:groupID,
     alert:message
  }
  }, { success: function() { 

      return "sendThreadRefreshNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true

  });

}


//sent to group users when a message is added to a thread
function sendThreadMessageNotification(threadID, threadMessageID, groupID, userList, message, systemMessage){

  console.log('sendThreadMessageNotification called');

  if (!(threadID && userList && threadMessageID && groupID && message)) {
    console.error('groupID, threadMessageID , userList and message must be passed as parameters.');
    return;
  }

  //Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.Installation);
  query.containedIn("user", userList);

  console.log('push query constructed');

  var pushData;

  if (systemMessage) {

    pushData = {
     action:"org.church.rockmobile.PUSH_ACTION",
     threadId:threadID,
     threadMessageId:threadMessageID,
     type:"PushThreadMessage",
     badge:'Increment',
     groupId:groupID,
     appMessage:message,
     alert:systemMessage
    };

  }else{

    pushData = {
     action:"org.church.rockmobile.PUSH_ACTION",
     threadId:threadID,
     threadMessageId:threadMessageID,
     type:"PushThreadMessage",
     groupId:groupID,
     appMessage:message,
    };

  }

  Parse.Push.send({
  where: query,
  data: pushData
  }, { success: function() { 

      return "sendThreadRefreshNotification completed successfully.";

    }, error: function(err) { 

      return error(err);

    },

    useMasterKey: true

  });

}