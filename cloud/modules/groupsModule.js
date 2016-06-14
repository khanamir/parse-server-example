
var _ = require('underscore');

var pushNotificationManager = require('cloud/modules/pushNotificationManager.js');


// Module Exports - defined at top for quick readability

module.exports = {
  joinGroup: function (request, response) {
    joinGroup(request, response);
  },
  inviteToGroup: function (request, response) {
    inviteToGroup(request, response);
  },
  requestJoinGroup: function (request, response) {
    requestJoinGroup(request, response);
  },
  cancelJoinGroup: function (request, response) {
    cancelJoinGroup(request, response);
  },
  cancelInviteUserToGroup: function (request, response) {
    cancelInviteUserToGroup(request, response);
  }
};


/*
* This function is called when a user joins a group  
* user_id, group_id and app_id are required parameters
*/

function joinGroup(request, response) {

  var data = request.params;
  if (!(data && data.group_id && data.app_id && data.user_id)) {
    console.error('Invalid request received. Missing group, user or app id');
    response.error('Invalid request received. Missing group, user or app id');
    return;
  }

  var appID = data.app_id;
  var currentUser = request.user;
  var requestedUserID = data.user_id;
  var groupID = data.group_id;

  var requestedUserPointer = new Parse.User();
  requestedUserPointer.id = requestedUserID;
  
  var Group = Parse.Object.extend("Group");
  var groupPointer = new Group();
  groupPointer.id = groupID;

  var groupQuery = new Parse.Query(Group);
  var userQuery = new Parse.Query('_User');

  Parse.Promise.when([
    groupQuery.get(groupID),
    userQuery.get(requestedUserID),
  ]).then(function(group, user){

    var promises = [];

      //create a new join request feed item
    var Feed = Parse.Object.extend("Feed");
    var joinRequest = new Feed();
    joinRequest.set('churchId', appID);
    joinRequest.set('group', group);
    joinRequest.set('fromUser', currentUser);
    joinRequest.set('requestStatus', 'feed');
    joinRequest.set('toUsers', [user]);
    joinRequest.set('type', 'GroupJoin');

    var joinedUsers = group.get("joinedUsers");
    if (_.contains(joinedUsers, user)) {
      console.log('joinedUsers already contains user');
    }else{

      console.log('joinedUsers does not contain user');
      group.add('joinedUsers', user);
      promises.push(group.save());

    }

    promises.push(joinRequest.save());
    promises.push(pushNotificationManager.sendGroupRefreshNotification(group.id));
    promises.push(pushNotificationManager.sendFeedNotification([user]));

    return Parse.Promise.when(promises);

  }).then(function(){

    console.log("completed requestJoinGroup successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end joinGroup


/*
* This function is called when a user invites a user to a group  
* user_id, group_id and app_id are required parameters
*/

function inviteToGroup(request, response) {

  var data = request.params;
  if (!(data && data.group_id && data.app_id && data.user_id)) {
    console.error('Invalid request received. Missing group, user or app id');
    response.error('Invalid request received. Missing group, user or app id');
    return;
  }

  var appID = data.app_id;
  var currentUser = request.user;
  var requestedUserID = data.user_id;
  var groupID = data.group_id;

  var requestedUserPointer = new Parse.User();
  requestedUserPointer.id = requestedUserID;
  
  var Group = Parse.Object.extend("Group");
  var groupPointer = new Group();
  groupPointer.id = groupID;

  var groupQuery = new Parse.Query(Group);
  var userQuery = new Parse.Query('_User');

  Parse.Promise.when([
    groupQuery.get(groupID),
    userQuery.get(requestedUserID),
  ]).then(function(group, user){

    var promises = [];

    //only create an invitation if they are not currently joined
    var joinedUsers = group.get("joinedUsers");
    if (_.contains(joinedUsers, user)) {
      console.log('joinedUsers already contains user');
    }else{

      //create a new join request feed item
      var Feed = Parse.Object.extend("Feed");
      var joinRequest = new Feed();
      joinRequest.set('churchId', appID);
      joinRequest.set('group', group);
      joinRequest.set('fromUser', currentUser);
      joinRequest.set('requestStatus', 'request');
      joinRequest.set('toUsers', [user]);
      joinRequest.set('type', 'GroupInvitation');
      joinRequest.set('groupInviteManager', 'owner');
      joinRequest.set('groupInvitationUser', currentUser);

      promises.push(joinRequest.save());

      var pendingUsers = group.get("pendingUsers");
      if (_.contains(pendingUsers, user)) {

        console.log('pendingUsers already contains user');

      }else{
        console.log('pendingUsers does not contain user');
        group.add('pendingUsers', user);
        promises.push(group.save());
      }

      var groupTitle = group.get('title');
      var firstName = currentUser.get('firstName');
      var lastName = currentUser.get('lastName');
      var message = firstName + ' ' + lastName + " has invited you to " + groupTitle + " group.";

      promises.push(pushNotificationManager.sendGroupInviteNotification(group.id, [user], message));

    }

    return Parse.Promise.when(promises);

  }).then(function(){

    console.log("completed inviteToGroup successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end inviteToGroup


/*
* This function is called when a user requests that they or another user be added to a group  
* user_id, group_id and app_id are required parameters
*/

function requestJoinGroup(request, response) {

  var data = request.params;
  if (!(data && data.group_id && data.app_id && data.user_id)) {
    console.error('Invalid request received. Missing group, user or app id');
    response.error('Invalid request received. Missing group, user or app id');
    return;
  }

  var appID = data.app_id;
  var currentUser = request.user;
  var requestedUserID = data.user_id;
  var groupID = data.group_id;

  var requestedUserPointer = new Parse.User();
  requestedUserPointer.id = requestedUserID;
  
  var Group = Parse.Object.extend("Group");
  var groupPointer = new Group();
  groupPointer.id = groupID;

  var groupQuery = new Parse.Query(Group);
  var userQuery = new Parse.Query('_User');

  Parse.Promise.when([
    groupQuery.get(groupID),
    userQuery.get(requestedUserID),
  ]).then(function(group, user){

    var userPointer;
    var promises = [];

      //create a new join request feed item
    var Feed = Parse.Object.extend("Feed");
    var joinRequest = new Feed();
    joinRequest.set('churchId', appID);
    joinRequest.set('group', group);
    joinRequest.set('fromUser', user);
    joinRequest.set('requestStatus', 'request');

    if (currentUser.id == user.id) { //user is requesting to join themselves

      userPointer = currentUser;

      joinRequest.set('toUsers', group.get('adminUsers'));
      joinRequest.set('type', 'GroupJoin');

    }else{ //a user is requesting that another user join

      userPointer = user;

      joinRequest.set('toUsers', [userPointer]);
      joinRequest.set('groupInvitationUser', currentUser);
      joinRequest.set('type', 'GroupInvitation');

    }

    var pendingUsers = group.get("pendingUsers");
    if (_.contains(pendingUsers, user)) {

      console.log('pendingUsers already contains user');

    }else{
      console.log('pendingUsers does not contain user');
      group.add('pendingUsers', userPointer);
      promises.push(group.save());
    }
    
    var userList = group.get('adminUsers');
    var groupTitle = group.get('title');
    var firstName = user.get('firstName');
    var lastName = user.get('lastName');
    var message = firstName + ' ' + lastName + " requested join to " + groupTitle;

    promises.push(joinRequest.save());

    //don't try to send notification if there are no admin users.
    if (userList) {
      promises.push(pushNotificationManager.sendRequestJoinGroupNotification(userList, message));
    }
    
    return Parse.Promise.when(promises);

  }).then(function(){

    console.log("completed requestJoinGroup successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end requestJoinGroup


/*
* This function is called when the user cancels their request to join a group.  
* group_id and app_id are required parameters
*/

function cancelJoinGroup(request, response) {

  var data = request.params;
  if (!(data && data.group_id && data.app_id)) {
    console.error('Invalid request received. No group or app id');
    response.error('Invalid request received. No group or app id');
    return;
  }
  var currentUser = request.user;
  var appID = data.app_id;
  var groupID = data.group_id;

  var Group = Parse.Object.extend("Group");
  var groupPointer = new Group();
  groupPointer.id = groupID;

  var groupQuery = new Parse.Query(Group);

  var requestQuery = new Parse.Query("Feed");
  requestQuery.equalTo('churchId', appID);
  requestQuery.equalTo('group', groupPointer);
  requestQuery.equalTo('fromUser', currentUser);
  requestQuery.equalTo('requestStatus', "request");
  requestQuery.equalTo('type', "GroupJoin");

  //concurrently run each query, then pass results
  Parse.Promise.when([
    groupQuery.get(groupID),
    requestQuery.find(),
  ]).then(function(group, requests){

    var promises = [];

    var pendingUsers = group.get("pendingUsers");

    var pendingList = _.filter(pendingUsers, function(user){ return user.id === currentUser.id; });

    for (var i = 0; i < pendingList.length; i++) {
      console.log('deleting user from pendingUsers');
      var userObject = pendingList[i];
      group.remove('pendingUsers', userObject);
    }
    promises.push(group.save());

    var userList = group.get('adminUsers');
    promises.push(pushNotificationManager.sendPendingRemoveNotification(userList));

    for (var i = 0; i < requests.length; i++) {
      var request = requests[i];
      promises.push(request.destroy());
    }

    return Parse.Promise.when(promises);

  }).then(function(){

    console.log("completed cancelJoinGroup successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });

} //end cancelJoinGroup


/*
* This function is called when a group admin cancels an invitation  
* user_id, group_id and app_id are required parameters
*/

function cancelInviteUserToGroup(request, response) {

  var data = request.params;
  if (!(data && data.group_id && data.app_id && data.user_id)) {
    console.error('Invalid request received. Missing group, user or app id');
    response.error('Invalid request received. Missing group, user or app id');
    return;
  }
  var currentUser = request.user;
  var invitedUserID = data.user_id;
  var userPointer = new Parse.User();
  userPointer.id = invitedUserID;
  var appID = data.app_id;
  var groupID = data.group_id;
  var Group = Parse.Object.extend("Group");
  var groupPointer = new Group();
  groupPointer.id = groupID;

  var groupQuery = new Parse.Query(Group);
  groupQuery.include('pendingUsers');

  var inviteQuery = new Parse.Query("Feed");
  inviteQuery.equalTo('groupInvitationUser', currentUser);
  inviteQuery.equalTo('churchId', appID);
  inviteQuery.equalTo('group', groupPointer);
  inviteQuery.equalTo('requestStatus', "request");
  inviteQuery.equalTo('type', "GroupInvitation");
  inviteQuery.equalTo('toUsers', userPointer);

  var userQuery = new Parse.Query('_User');

  //concurrently run each query, then pass results
  Parse.Promise.when([
    groupQuery.get(groupID),
    inviteQuery.find(),
    userQuery.get(invitedUserID)
  ]).then(function(group, requests, user){

    var userPointer;
    var promises = [];

    //remove user from pendingUsers
    var pendingUsers = group.get("pendingUsers");
    var pendingList = _.filter(pendingUsers, function(user){ return user.id === invitedUserID; });

    for (var i = 0; i < pendingList.length; i++) {
      console.log('deleting user from pendingUsers');
      var userObject = pendingList[i];
      group.remove('pendingUsers', userObject);
    }
    promises.push(group.save());
    
    var userList = group.get('adminUsers');
    promises.push(pushNotificationManager.cancelInvitationNotification(user));

    for (var i = 0; i < requests.length; i++) {
      console.log('removing request from feed');
      var request = requests[i];
      promises.push(request.destroy());
    }

    return Parse.Promise.when(promises);

  }).then(function(){

    console.log("completed cancelInviteUserToGroup successfully");
    response.success("success");

  }, function(error){

    console.error(error);
    response.error(error);

  });


} //end cancelInviteUserToGroup
