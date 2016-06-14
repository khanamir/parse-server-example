//
// Cloudinary Objects Module
//

// Module Exports - defined at top for quick readability

module.exports = {

  //endpoint exports
  sign_cloudinary_upload_request: function(request, response) {
    sign_cloudinary_upload_request(request, response);
  },
  photo_thumbnail_url: function(request, response) {
    photo_thumbnail_url(request, response);
  }
  
};


/* Cloudinary Parse Module for image storage */ 
var cloudinary = require("cloud/cloudinary");


/// The following lines install a beforeSave filter for the given field within the given object
var PHOTO_OBJECT_NAME = "Picture";
var VIDEO_OBJECT_NAME = "Video";
var CLOUDINARY_IDENTIFIER_FIELD_NAME = "cloudinaryIdentifier";
/// You can either use and modify the example beforeSaveFactory in this file, or use the one from the library:
// beforeSaveFactory(object_name, field_name);
cloudinary.beforeSaveFactory(PHOTO_OBJECT_NAME, CLOUDINARY_IDENTIFIER_FIELD_NAME);
cloudinary.beforeSaveFactory(VIDEO_OBJECT_NAME, CLOUDINARY_IDENTIFIER_FIELD_NAME);

/**
 * The following declaration exposes a cloud code function that enables you
 * to sign a direct-upload request from your app. 
 * @note This function assumes no extra parameters are needed for the upload.
 * @note This function embeds the username in the cloudinary tags field and eagerly creates a thumbnail.
 */
function sign_cloudinary_upload_request(request, response) {

    if (!request.user || !request.user.authenticated()) {
        response.error("Needs an authenticated user");
        return;
    }

    response.success(
        cloudinary.sign_upload_request({tags: request.user.getUsername()})
    );

}

/**
 * The following declaration exposes a cloud code function that enables you to get a 
 * thumbnail url for Cloudinary of a the Photo entity. 
 * Cloud-based image manipulation URLs can also be generated on the mobile apps based 
 * on the identifier returned when uploading a object using the beforeSaveFactory above.
 */
function photo_thumbnail_url(request, response) {

    if (!request.user || !request.user.authenticated()) {
        response.error("Needs an authenticated user");
        return;
    }

    var query = new Parse.Query(PHOTO_OBJECT_NAME);
    query.get(request.params.objectId, {

      success: function(result) {

        response.success({
            url: cloudinary.url(result.get(CLOUDINARY_IDENTIFIER_FIELD_NAME), {crop: "fill", width: 150, height: 150})	
        });

      },
      error: function() {
        response.error("image lookup failed");
      }

    });

}