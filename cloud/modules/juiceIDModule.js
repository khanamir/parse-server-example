/**
 * Login With JuiceID for Mobile Applications
 * *** PLEASE READ ***
 *
 * This is an extension of Parse's OAuth 2.0 for Web Apps Login With GitHub example and Tyler Adams' Google+ example here: https://groups.google.com/forum/#!topic/parse-developers/UUvTreGYOrI.
 *
*/

/**
* In the Data Browser, set the Class Permissions for these 2 classes to
*   disallow public access for Get/Find/Create/Update/Delete operations.
* Only the master key should be able to query or write to these classes.
*/
var TokenStorage = Parse.Object.extend("TokenStorage");

/**
* Create a Parse ACL which prohibits public access.  This will be used
*   in several places throughout the application, to explicitly protect
*   Parse User, TokenRequest, and TokenStorage objects.
*/
var restrictedAcl = new Parse.ACL();
restrictedAcl.setPublicReadAccess(false);
restrictedAcl.setPublicWriteAccess(false);

/**
* Load needed modules.
*/
var express = require('express');
var querystring = require('querystring');
var _ = require('underscore');
var Buffer = require('buffer').Buffer;

/**
* Create an express application instance
*/
var app = express();

/**
* Global app configuration section
*/
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(express.bodyParser());    // Middleware for reading request body

// Module Exports - defined at top for quick readability
module.exports = {

  accessJuiceIDUser: function (request, response) {
    accessJuiceIDUser(request, response);
  },
  addUserToDefaultGroup: function (user) {
    addUserToDefaultGroup(user);
  }

};

/*
* This function is called on login or registration from client app.  
* The "profile" dictionary returned after login using JuiceID should be included as a parameter
*/

function accessJuiceIDUser (request, response) {
  var data = request.params;
  var token;
  /**
   * Validate that token and state have been passed in as query parameters.
   * Render an error page if this is invalid.
   */
  if (!(data && data.profile)) {
    response.error('Invalid auth response received.');
    return;
  }
  //Parse.Cloud.useMasterKey();
  var userProfile = data.profile;
  var appID = data.app_id;

  Parse.Promise.as().then(function() {

    if (userProfile && userProfile.user_id && userProfile.id_token) {
        return upsertJuiceIDUser(userProfile, appID);
    } else {
        return Parse.Promise.error("Unable to parse JuiceID data");
    }

  },{useMasterKey: true}).then(function(user) {
    /**
     * Send back the session token in the response to be used with 'become/becomeInBackground' functions
     */
    response.success(user.getSessionToken());
  }, function(error) {
    /**
     * If the error is an object error (e.g. from a Parse function) convert it
     *   to a string for display to the user.
     */
    if (error && error.code && error.error) {
      error = error.code + ' ' + error.error;
    }
    response.error(JSON.stringify(error));
  });

}



//Private methods are not exported

 /**
 * This function checks to see if this user has logged in before.
 * If the user is found, update the accessToken (if necessary) and return
 *   the users session token.  If not found, return the newJuiceIDUser promise.
 */
var upsertJuiceIDUser = function(userData, appID) {

  var query = new Parse.Query(TokenStorage);
  var accessToken = userData.id_token;
  var userID = appID+"|"+userData.user_id;

  query.equalTo('accountId', userID);
  //query.ascending('createdAt');
  // Check if this ID has previously logged in, using the master key
  return query.first({ useMasterKey: true }).then(function(tokenData) {

    // If not, create a new user.
    if (!tokenData) {
      return newJuiceIDUser(userData, userID, appID);
    }

    // If found, fetch the user.
    var user = tokenData.get('user');
    return user.fetch({ useMasterKey: true }).then(function(user) {

      return addUserToDefaultGroup(user);

    }).then(function(user) {

      // Update the access_token if it is different.
      if (accessToken !== tokenData.get('access_token')) {
        tokenData.set('access_token', accessToken);
      }

      /**
       * This save will not use an API request if the token was not changed.
       * e.g. when a new user is created and upsert is called again.
       */
      return tokenData.save(null, { useMasterKey: true });

    }).then(function(obj) {

      // Return the user object.
      return Parse.Promise.as(user);

    });

  });

};

/**
 * This function creates a Parse User with a random login and password, and
 *   associates it with an object in the TokenStorage class.
 * Once completed, this will return upsertJuiceIDUser.  This is done to protect
 *   against a race condition:  In the rare event where 2 new users are created
 *   at the same time, only the first one will actually get used.
 */
var newJuiceIDUser = function(userData, userID, appID) {

var accessToken = userData.id_token;

var user = new Parse.User();
// Generate a random username and password.
var username = new Buffer(24);
var password = new Buffer(24);
_.times(24, function(i) {
  username.set(i, _.random(0, 255));
  password.set(i, _.random(0, 255));
});

user.set("username", username.toString('base64'));
user.set("password", password.toString('base64'));

user.set("churchId", appID);
user.set("isSuperAdmin", false);

if (userData.email) {

  user.set("userEmail", userData.email);
  var appEmail = appID+"_"+userData.email;
  user.set("email", appEmail);

}
if (userData.firstName) {
  user.set("firstName", userData.firstName);
}
if (userData.lastName) {
  user.set("lastName", userData.lastName);
}
user.set("accountType", 'JuiceID');

// Sign up the new User
return user.signUp().then(function(user) {

  // create a new TokenStorage object to store the user+JuiceID association.
  var ts = new TokenStorage();
  ts.set('user', user);
  ts.set('accountId', userID);
  ts.set('access_token', accessToken);
  ts.setACL(restrictedAcl);
  // Use the master key because TokenStorage objects should be protected.
  return ts.save(null, { useMasterKey: true });

}).then(function(tokenStorage) {
  return upsertJuiceIDUser(userData, appID);
});

};


/**
This function makes sure all users are added to a default group
**/

function addUserToDefaultGroup(user) {

  var Group = Parse.Object.extend("Group");
  var groupQuery = new Parse.Query(Group);

  //The ID for the Rock Church group
  groupQuery.get("RwcNeAiqbc").then(function(group){

    var promises = [];

    var joinedUsers = group.get("joinedUsers");
    var joinedList = _.filter(joinedUsers, function(theUser){ return theUser.id === user.id; });

    if (joinedList.length > 0) {
      console.log('default group joinedUsers already contains user');
    }else{
      console.log('default group joinedUsers does not contain user');
      group.add('joinedUsers', user);
      promises.push(group.save());
    }
    return Parse.Promise.when(promises);

  }).then(function(){

    console.log("completed adding user to default group successfully");
    return user;

  }, function(error){

    console.log("completed adding user to default group unsuccessfully");
    return user;

  });


}


/**
 * Attach the express app to Cloud Code to process the inbound request.
 */
app.listen();

