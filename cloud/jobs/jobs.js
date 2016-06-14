
//This can be used to save all (up to 1000) series messages and therefore update all Series messageCount values in their afterSave hooks

Parse.Cloud.job("saveAllSeriesMessages", function(request, status) {

  var seriesMessageQuery = new Parse.Query("SeriesMessage");
  seriesMessageQuery.limit(1000);

  Parse.Promise.when([

    seriesMessageQuery.find()

  ]).then(function(seriesMessageArray){

    var promises = [];

    for (var i = seriesMessageArray.length - 1; i >= 0; i--) {

      seriesMessage = seriesMessageArray[i];
      promises.push(seriesMessage.save());

    }

    return Parse.Promise.when(promises);

  }).then(function(){

    console.log("completed updateAllSeriesMessageCounts");
    status.success("success");

  }, function(error){

    console.error(error);
    status.error(error);

  });

});