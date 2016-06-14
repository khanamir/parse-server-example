var _ = require('underscore');

var pushNotificationManager = require('cloud/modules/pushNotificationManager.js');

var appID;
var currentUser;


// Module Exports - defined at top for quick readability
module.exports = {
  acceptRequest: function (request, response) {
    acceptRequest(request, response);
  },  
  rejectRequest: function (request, response) {
    rejectRequest(request, response);
  }
};


/*
* This function is called when a user accepts a request  
* request_id and app_id are required parameters
*/

function acceptRequest(request, response) {

  var data = request.params;
  if (!(data && data.request_id && data.app_id)) {
    console.error('Invalid request received. Missing group or app id');
    response.error('Invalid request received. Missing group or app id');
    return;
  }

  console.log("setting app id and current user");

  appID = data.app_id;
  currentUser = request.user;

  console.log("setting up feedRequest query");

  var requestID = data.request_id;
  var Feed = Parse.Object.extend("Feed");
  var feedQuery = new Parse.Query(Feed);

  console.log("getting feedRequest");

  feedQuery.get(requestID).then(function(feedRequest){

    var promises = [];

    //getting the feedRequest again to destroy it after the other functions finish
    var Feed = Parse.Object.extend("Feed");
    var feedQuery = new Parse.Query(Feed);
    promises.push(feedQuery.get(feedRequest.id));

    console.log("feedRequest type: " + feedRequest.get('type'));

    var requestType = feedRequest.get('type');
    console.log("requestType: "+ requestType);

    if (requestType == "GroupJoin"){

      promises.push(acceptGroupJoin(feedRequest));

    }else if (requestType == "GroupInvitation"){

      promises.push(acceptGroupInvitation(feedRequest));

    }else if (requestType == "EventAdd" || requestType == "EventChange"){

      promises.push(acceptEvent(feedRequest));

    }else if (requestType == "MessageFlag"){

      promises.push(acceptThreadMessageDelete(feedRequest));

    }else if (requestType == "ThreadFlag"){

      promises.push(acceptThreadDelete(feedRequest));

    }

    return Parse.Promise.when(promises);

  }).then(function(feedRequest){

    console.log("destroying feedRequest");
    return feedRequest.destroy();

  }).then(function(){

    console.log("completed acceptRequest successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end acceptRequest


/*
* This function is called when a group join request is accepted  
*/

function acceptGroupJoin(feedRequest) {

  Parse.Promise.when([
    feedRequest.get("group"),
    feedRequest.get("fromUser"),
    feedRequest.get("toUsers")
  ]).then(function(group, user, toUsers){

    var promises = [];

    group.add('joinedUsers', user);
    group.remove('pendingUsers', user);

    promises.push(group.save());
    promises.push(pushNotificationManager.sendGroupRefreshNotification(group.id));
    promises.push(pushNotificationManager.sendFeedNotification(toUsers));
    promises.push(pushNotificationManager.sendGroupJoinAcceptedNotification(user));

    return Parse.Promise.when(promises);

  });

} //end acceptGroupJoin


/*
* This function is called when a group invitation is accepted  
*/

function acceptGroupInvitation(feedRequest) {

  feedRequest.set('type', 'GroupJoin');

  Parse.Promise.when([
    feedRequest.get("group"),
    feedRequest.get("fromUser"),
    feedRequest.get("toUsers"),
    feedRequest.save()
  ]).then(function(group, user, toUsers, feedRequestSaved){

    var promises = [];

    var Feed = Parse.Object.extend("Feed");
    var feedQuery = new Parse.Query(Feed);
    feedQuery.equalTo('churchId', appID);
    feedQuery.equalTo('requestStatus', 'request');
    feedQuery.equalTo('group', group);
    feedQuery.equalTo('type', 'GroupInvitation');
    feedQuery.containsAll('toUsers', toUsers);

    promises.push(feedQuery.first());

    group.add('joinedUsers', currentUser);
    promises.push(group.save());

    promises.push(pushNotificationManager.sendGroupRefreshNotification(group.id));
    promises.push(pushNotificationManager.sendFeedNotification(toUsers));
    promises.push(pushNotificationManager.sendGroupJoinAcceptedNotification(user)); 
    return Parse.Promise.when(promises);

  }).then(function(oldInvitation){

    if (oldInvitation) {
      return oldInvitation.destroy();
    }else{
      return;
    }
    
  });

} //end acceptGroupInvitation


/*
* This function is called when an event add or change is accepted  
*/

function acceptEvent(feedRequest) {

  console.log("acceptEvent");

  var promises = [];

  groupPointer = feedRequest.get("group");

  var Group = Parse.Object.extend("Group");
  var groupQuery = new Parse.Query(Group);

  promises.push(groupQuery.get(groupPointer.id));

  eventPointer = feedRequest.get("event");
  toUsers = feedRequest.get("toUsers");

  //destroy the old event
  promises.push(updateEvent(eventPointer));

  eventPointer.set("isPending", false);
  promises.push(eventPointer.save());

  promises.push(pushNotificationManager.sendFeedNotification(toUsers));

  Parse.Promise.when(promises).then(function(group){

    //compile the user list to send the final notification
    adminUsers = group.get("adminUsers");
    joinedUsers = group.get("joinedUsers");

    var userList = _.union(adminUsers, joinedUsers);
    userList = _.without(userList, currentUser);

    if (userList) {
      return promises.push(pushNotificationManager.sendEventRefreshNotification(eventPointer.id, group.id, userList));
    }else{
      return;
    }
    
  });

} //end acceptEventAdd


/*
* This function handles deleting of the old event and the edited event pointer  
*/

function updateEvent(eventPointer){

  console.log("updateEvent");

  var GroupEvent = Parse.Object.extend("GroupEvent");
  var eventQuery = new Parse.Query(GroupEvent);

  eventQuery.get(eventPointer.id).then(function(theEvent){

    console.log("got theEvent");

    var promises = [];

    var editedEventPointer = theEvent.get('editedEvent');
    if (editedEventPointer) {

      console.log("editedEventPointer is present");

      var editedEventQuery = new Parse.Query(GroupEvent);
      promises.push(editedEventQuery.get(editedEventPointer.id));

      theEvent.set('editedEvent', null);
      promises.push(theEvent.save());

    }
    return Parse.Promise.when(promises);

  }).then(function(editedEvent){

    console.log("got editedEvent");

    if (editedEvent) {

      console.log("destroying editedEvent");
      return editedEvent.destroy();

    }else{

      return;

    }

});

}//end updateEvent

/*
* This function is called when thread message flag is accepted  
*/

function acceptThreadMessageDelete(feedRequest) {

  console.log("acceptThreadMessageDelete");

  threadMessagePointer = feedRequest.get("threadMessage");

  var ThreadMessage = Parse.Object.extend("ThreadMessage");
  var threadMessageQuery = new Parse.Query(ThreadMessage);

  threadMessageQuery.get(threadMessagePointer.id).then(function(theThreadMessage){

    return theThreadMessage.destroy();

  });

} //end acceptThreadMessageDelete

/*
* This function is called when thread flag is accepted  
*/

function acceptThreadDelete(feedRequest) {

  console.log("acceptThreadDelete");

  threadPointer = feedRequest.get("thread");

  var Thread = Parse.Object.extend("Thread");
  var threadQuery = new Parse.Query(Thread);

  threadQuery.get(threadPointer.id).then(function(theThread){

    return theThread.destroy();

  });

} //end acceptThreadDelete

/*
* This function is called when a user rejects a request  
* request_id and app_id are required parameters
*/

function rejectRequest(request, response) {

  var data = request.params;
  if (!(data && data.request_id && data.app_id)) {
    console.error('Invalid request received. Missing group or app id');
    response.error('Invalid request received. Missing group or app id');
    return;
  }

  console.log("setting app id and current user");

  appID = data.app_id;
  currentUser = request.user;

  console.log("setting up feedRequest query");

  var requestID = data.request_id;
  var Feed = Parse.Object.extend("Feed");
  var feedQuery = new Parse.Query(Feed);

  console.log("getting feedRequest");

  feedQuery.get(requestID).then(function(feedRequest){

    var promises = [];

    //getting the feedRequest again to destroy it after the other functions finish
    var Feed = Parse.Object.extend("Feed");
    var feedQuery = new Parse.Query(Feed);
    promises.push(feedQuery.get(feedRequest.id));

    console.log("feedRequest type: " + feedRequest.get('type'));

    var requestType = feedRequest.get('type');
    console.log("requestType: "+ requestType);

    if (requestType == "GroupJoin"){

      promises.push(rejectGroupJoin(feedRequest));

    }else if (requestType == "GroupInvitation"){

      promises.push(rejectGroupInvitation(feedRequest));

    }else if (requestType == "EventAdd" || requestType == "EventChange"){

      promises.push(rejectEvent(feedRequest));

    }

    return Parse.Promise.when(promises);

  }).then(function(feedRequest){

    console.log("destroying feedRequest");
    return feedRequest.destroy();

  }).then(function(){

    console.log("completed rejectRequest successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end rejectRequest


/*
* This function is called when a group join request is rejected  
*/

function rejectGroupJoin(feedRequest) {

  Parse.Promise.when([
    feedRequest.get("group"),
    feedRequest.get("fromUser"),
    feedRequest.get("toUsers")
  ]).then(function(group, user, toUsers){

    var promises = [];

    group.remove('pendingUsers', user);

    promises.push(group.save());
    promises.push(pushNotificationManager.sendGroupRefreshNotification(group.id));

    return Parse.Promise.when(promises);

  });

} //end rejectGroupJoin


/*
* This function is called when a group invitation is rejected  
*/

function rejectGroupInvitation(feedRequest) {

  var group = feedRequest.get('group');
  var toUsers = feedRequest.get('toUsers');
  var promises = [];

  var Feed = Parse.Object.extend("Feed");
  var feedQuery = new Parse.Query(Feed);
  feedQuery.equalTo('churchId', appID);
  feedQuery.equalTo('requestStatus', 'request');
  feedQuery.equalTo('group', group);
  feedQuery.equalTo('type', 'GroupInvitation');
  feedQuery.containsAll('toUsers', toUsers);

  promises.push(feedQuery.first());
  promises.push(pushNotificationManager.sendGroupRefreshNotification(group.id));

  Parse.Promise.when(promises).then(function(oldInvitation){

    if (oldInvitation) {
      return oldInvitation.destroy();
    }else{
      return;
    }
    
  });

} //end rejectGroupInvitation


/*
* This function is called when an event add or change is accepted  
*/

function rejectEvent(feedRequest) {

  console.log("rejectEvent");

  eventPointer = feedRequest.get("event");

  var GroupEvent = Parse.Object.extend("GroupEvent");
  var eventQuery = new Parse.Query(GroupEvent);

  eventQuery.get(eventPointer.id).then(function(theEvent){

    return theEvent.destroy();

  });

} //end rejectEvent


