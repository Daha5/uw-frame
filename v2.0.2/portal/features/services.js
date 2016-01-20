'use strict';

define(['angular'], function(angular) {

  var app = angular.module('portal.features.services', []);

  app.factory('portalFeaturesService', ['$http', 'miscService', 'keyValueService', 'SERVICE_LOC', 'KV_KEYS', function($http, miscService, keyValueService, SERVICE_LOC, KV_KEYS) {
    var featuresPromise = $http.get(SERVICE_LOC.featuresInfo, { cache: true});

    var TYPES = {
      "ANNOUNCEMENTS" : KV_KEYS.LAST_VIEWED_ANNOUNCEMENT_ID,
      "POPUP" : KV_KEYS.LAST_VIEWED_POPUP_ID
    };

    var getFeatures = function() {
      return featuresPromise.success(
        function(data, status) { //success function
          return data.features;
        }).error(function(data, status) { // failure function
          miscService.redirectUser(status, "Get features info");
        });
    };

    var saveLastSeenFeature = function(type, id) {
      if(keyValueService.isKVStoreActivated()) {
        var storage = {};
        storage.id = id;
        keyValueService.setValue(type, storage)
          .then(function(result){
            console.log("Saved feature id to " + result + " successfully.");
          });
      }
    };

    var getLastSeenFeature = function(type){
      return keyValueService.getValue(type);
    }

    var dbStoreLastSeenFeature = function() {
      return keyValueService.isKVStoreActivated();
    }

    return {
      getFeatures : getFeatures,
      saveLastSeenFeature : saveLastSeenFeature,
      getLastSeenFeature : getLastSeenFeature,
      dbStoreLastSeenFeature : dbStoreLastSeenFeature,
      TYPES : TYPES
    };

  }]);

  return app;

});
