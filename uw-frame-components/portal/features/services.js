'use strict';

define(['angular'], function(angular) {

  var app = angular.module('portal.features.services', []);

  app.factory('portalFeaturesService', ['$http',
                                        '$q',
                                        'miscService',
                                        'keyValueService',
                                        'PortalGroupService',
                                        '$sessionStorage',
                                        'filterFilter',
                                        'KV_KEYS',
                                        'FEATURES',
                                        function($http,
                                                 $q,
                                                 miscService,
                                                 keyValueService,
                                                 PortalGroupService,
                                                 $sessionStorage,
                                                 filterFilter,
                                                 KV_KEYS,
                                                 FEATURES) {
    var featuresPromise, filteredFeaturesPromise;

    var TYPES = {
      "ANNOUNCEMENTS" : KV_KEYS.LAST_VIEWED_ANNOUNCEMENT_ID,
      "POPUP" : KV_KEYS.LAST_VIEWED_POPUP_ID
    };

    var getFeatures = function() {
      if(!featuresPromise) {
        featuresPromise = $http.get(FEATURES.serviceURL, { cache: true})
                               .then(function(results, status) { //success function
                                  return results.data;
                               },function(data, status) { // failure function
                                  miscService.redirectUser(status, "Get features info");
                               });
      }
      if(FEATURES.groupFiltering && PortalGroupService.groupsServiceEnabled) {
        if(filteredFeaturesPromise) {
          //cache shortcut
          return filteredFeaturesPromise;
        }
        var successFn = function(results){
          var array = results[0];
          var groups = results[1];
          return PortalGroupService.filterArrayByGroups(array, groups, 'groups');
        };
        var errorFn = function(reason) {
          miscService.redirectUser(reason.status, 'q for filtered features');
        }
        filteredFeaturesPromise = $q.all([featuresPromise,
                                          PortalGroupService.getGroups()
                                         ])
                                    .then(successFn, errorFn);
        return filteredFeaturesPromise;
      } else {
        return featuresPromise;
      }
    };//end get features

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

    var getSeenAnnouncments = function(){
        return $q(function(resolve, reject){
            if($sessionStorage.seenAnnouncmentIds){
                return resolve($sessionStorage.seenAnnouncmentIds);
            }else{
                return resolve([]);
            }

            //if Session Storage is available, choose it
            //else go to keyValueStore
        });
    }

    var markAnnouncementSeen = function(announcementID){
      //Store in session storage
      if(!$sessionStorage.seenAnnouncmentIds){
          $sessionStorage.seenAnnouncmentIds = [announcementID];
      }else{
          $sessionStorage.seenAnnouncmentIds.push(announcementID);
      }
    }

    var getUnseenAnnouncements = function(){
        var successFn, errorFn;

        successFn = function(data){
            //features in data[0]
            //seenAnnouncments in data[1]

            var announcements = filterFilter(data[0], {isBuckyAnnouncement : true});

            if(announcements && announcements.length != 0) {
                //filter down to ones they haven't seen
                var hasNotSeen = function(feature) {
                  if(data[1].indexOf(feature.id) !== -1) {
                    return false;
                  } else {
                    //check dates
                    var today = Date.parse(new Date());
                    var startDate = Date.parse(new Date(feature.goLiveYear, feature.goLiveMonth, feature.goLiveDay));
                    var expirationDate = feature.buckyAnnouncement.endDate;
                    if(startDate <= today && today <= expirationDate) {
                      return true;
                    } else if(expirationDate < today){
                      markAnnouncementSeen(feature.id);
                      return false;
                    } else {
                      //hasn't started yet
                      return false;
                    }
                  }
                }

                return announcements.filter(hasNotSeen);

            }

        };

        errorFn = function(reason){
            console.log("error retreiving unseenAnnouncements: " +  response.status);
            return null;
        };

        var getUnseenAnnouncementsPromise = $q.all([getFeatures(), getSeenAnnouncments()]).then(successFn, errorFn);

        return getUnseenAnnouncementsPromise;
    }


    var getLastSeenFeature = function(type){
      var lastSeenFeature = keyValueService.getValue(type);
      return lastSeenFeature;
    }

    var dbStoreLastSeenFeature = function() {
      return keyValueService.isKVStoreActivated();
    }

    return {
      getFeatures : getFeatures,
      saveLastSeenFeature : saveLastSeenFeature,
      getLastSeenFeature : getLastSeenFeature,
      dbStoreLastSeenFeature : dbStoreLastSeenFeature,
      getUnseenAnnouncements: getUnseenAnnouncements,
      markAnnouncementSeen: markAnnouncementSeen,
      TYPES : TYPES
    };

  }]);

  return app;

});
