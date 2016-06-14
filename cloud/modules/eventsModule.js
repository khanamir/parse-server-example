
var pushNotificationManager = require('cloud/modules/pushNotificationManager.js');

var appID;
var currentUser;

// Module Exports - defined at top for quick readability
module.exports = {
	addEventToGroup: function (request, response) {
    addEventToGroup(request, response);
  	},
  	requestAddEventToGroup: function (request, response) {
    requestAddEventToGroup(request, response);
  	}
};



/*
* This function is called when a user accepts a request  
* request_id and app_id are required parameters
*/

function addEventToGroup(request, response) {

  var data = request.params;
  if (!(data && data.group_id && data.event_id && data.app_id)) {
    console.error('Invalid request received. Missing group or app id');
    response.error('Invalid request received. Missing group or app id');
    return;
  }



} //end addEventToGroup

