'use strict';

define(['angular'], function(angular) {

  var app = angular.module('portal.features.services', []);

  app.factory('portalFeaturesService', ['$http',
                                        '$q',
                                        '$localStorage',
                                        '$sessionStorage',
                                        'miscService',
                                        'keyValueService',
                                        'PortalGroupService',
                                        'KV_KEYS',
                                        'FEATURES',
                                        'filterFilter',
                                        function($http,
                                                 $q,
                                                 $localStorage,
                                                 $sessionStorage,
                                                 miscService,
                                                 keyValueService,
                                                 PortalGroupService,
                                                 KV_KEYS,
                                                 FEATURES,
                                                 filterFilter) {
    var featuresPromise, filteredFeaturesPromise;

    var TYPES = {
      "ANNOUNCEMENTS" : KV_KEYS.LAST_VIEWED_ANNOUNCEMENT_ID,
      "POPUP" : KV_KEYS.LAST_VIEWED_POPUP_ID,
      "SEEN_ANNOUNCEMENTS": "SEEN_ANNOUNCEMENTS"
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
        return featuresPromise;'use strict';

        define(['angular'], function(angular) {

          var app = angular.module('portal.features.services', []);

          app.factory('portalFeaturesService', ['$http',
                                                '$q',
                                                '$localStorage',
                                                '$sessionStorage',
                                                'miscService',
                                                'keyValueService',
                                                'PortalGroupService',
                                                'KV_KEYS',
                                                'FEATURES',
                                                'filterFilter',
                                                function($http,
                                                         $q,
                                                         $localStorage,
                                                         $sessionStorage,
                                                         miscService,
                                                         keyValueService,
                                                         PortalGroupService,
                                                         KV_KEYS,
                                                         FEATURES,
                                                         filterFilter) {
            var featuresPromise, filteredFeaturesPromise;

            var TYPES = {
              "ANNOUNCEMENTS" : KV_KEYS.LAST_VIEWED_ANNOUNCEMENT_ID,
              "POPUP" : KV_KEYS.LAST_VIEWED_POPUP_ID,
              "SEEN_ANNOUNCEMENTS": "SEEN_ANNOUNCEMENTS"
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
            
            var markAnnouncmentSeen = function(announcementID){
              return $q(function(resolve, reject){
                //make sure sessionStorage.seenAnnouncements is at least initialized before trying to modify it
                  $sessionStorage.seenAnnoucements = $sessionStorage.seenAnnoucements || [];
                  $sessionStorage.seenAnnoucements.push(announcementID);
                  //push change to storage to keep it in sync
                  saveLastSeenFeature(TYPES.ANNOUNCEMENTS, $localStorage.lastSeenAnnouncementId);
                  resolve(null);
              });
            }
            
            var handleLegacyMigration = function(){
             
             // handle legacy lastSeenFeature from persistedDB
             if($sessionStorage.seenAnnoucements && !Array.isArray($sessionStorage.seenAnnoucements)){ 
               $sessionStorage.seenAnnoucements = [];
               markAnnouncmentSeen($sessionStorage.seenAnnoucements);
             }
             
             // handle legacy local storage
             if ($localStorage.lastSeenFeature === -1) {
               if ($localStorage.hasSeenWelcome) {
                 $localStorage.lastSeenFeature = 1;
               } else {
                 $localStorage.lastSeenFeature = 0;
               }
               delete $localStorage.hasSeenWelcome;
             }
             //handle legacy local storage round 2
             if($localStorage.lastSeenFeature){
               for(i = 0; i<$localStorage.lastSeenFeature; i++){
                 markAnnouncementsSeen(i, false);
               }
               delete $localStorage.lastSeenFeature;
             }
             
            }
            
            var getUnseenAnnouncements = function(){
              return getFeatures().then(function(features){
                return $q(function(resolve, reject){
                  if(features){
                    var announcements = filterFilter(features, {isBuckyAnnouncement : true});
                    //do mascot announcement
                    if (announcements.length > 0) {
                      var announcements = filterFilter(features, {isBuckyAnnouncement : true});
                      //filter down to ones they haven't seen
                      if(announcements && announcements.length != 0) {
                        //function that returns true/false if announcment has been not been seen / seen
                        var hasNotSeen = function(feature, seenAnnouncments) {
                          if(seenAnnouncments.indexOf(feature.id) != -1){
                            return false;
                          }
                          //check dates
                          var today = Date.parse(new Date());
                          var startDate = Date.parse(new Date(feature.goLiveYear, feature.goLiveMonth, feature.goLiveDay));
                          var expirationDate = feature.buckyAnnouncement.endDate;
                          if(startDate <= today && today <= expirationDate) {
                            return true;
                          } else if(expirationDate < today){
                            //expired state, mark as read so its faster next time
                            markAnnouncementsSeen(feature.id, false);
                            return false;
                          } else {
                            //hasn't started yet
                            return false;
                          }
                        }
                        var seenAnnouncments = getSeenAnnouncements();
                        var filteredAnnouncements = announcements.filter(seenAnnouncments, data);
                        resolve(filteredAnnouncements);
                    }
                  }else{
                    resolve([]);
                  }
              }
              });
              });
            }
            
            var getSeenAnnouncements = function(){
              return $q(function(resolve, reject){
                if(!$sessionStorage.seenAnnoucements){
                    $sessionStorage.seenAnnoucements = keyValueService.getValue(TYPES.ANNOUNCEMENTS);
                }
                handleLegacyMigration();
                resolve($sessionStorage.seenAnnoucements);
              });
            }

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
              TYPES : TYPES,
              getUnseenAnnouncements:getUnseenAnnouncements,
              markAnnouncmentSeen: markAnnouncmentSeen
            };

          }]);

          return app;

        });

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
    
    var markAnnouncmentSeen = function(announcementID){
      return $q(function(resolve, reject){
        //make sure sessionStorage.seenAnnouncements is at least initialized before trying to modify it
          $sessionStorage.seenAnnoucements = $sessionStorage.seenAnnoucements || [];
          $sessionStorage.seenAnnoucements.push(announcementID);
          //push change to storage to keep it in sync
          saveLastSeenFeature(TYPES.ANNOUNCEMENTS, $localStorage.lastSeenAnnouncementId);
          resolve(null);
      });
    }
    
    var handleLegacyMigration = function(){
     
     // handle legacy lastSeenFeature from persistedDB
     if($sessionStorage.seenAnnoucements && !Array.isArray($sessionStorage.seenAnnoucements)){ 
       $sessionStorage.seenAnnoucements = [];
       markAnnouncmentSeen($sessionStorage.seenAnnoucements);
     }
     
     // handle legacy local storage
     if ($localStorage.lastSeenFeature === -1) {
       if ($localStorage.hasSeenWelcome) {
         $localStorage.lastSeenFeature = 1;
       } else {
         $localStorage.lastSeenFeature = 0;
       }
       delete $localStorage.hasSeenWelcome;
     }
     //handle legacy local storage round 2
     if($localStorage.lastSeenFeature){
       for(i = 0; i<$localStorage.lastSeenFeature; i++){
         markAnnouncementsSeen(i, false);
       }
       delete $localStorage.lastSeenFeature;
     }
     
    }
    
    var getUnseenAnnouncements = function(){
      return getFeatures().then(function(features){
        return $q(function(resolve, reject){
          if(features){
            var announcements = filterFilter(features, {isBuckyAnnouncement : true});
            //do mascot announcement
            if (announcements.length > 0) {
              var announcements = filterFilter(features, {isBuckyAnnouncement : true});
              //filter down to ones they haven't seen
              if(announcements && announcements.length != 0) {
                //function that returns true/false if announcment has been not been seen / seen
                var hasNotSeen = function(feature) {
                  var seenAnnouncments = getSeenAnnouncements();
                  if(seenAnnouncments.indexOf(feature.id) != -1){
                    return false;
                  }
                  //check dates
                  var today = Date.parse(new Date());
                  var startDate = Date.parse(new Date(feature.goLiveYear, feature.goLiveMonth, feature.goLiveDay));
                  var expirationDate = feature.buckyAnnouncement.endDate;
                  if(startDate <= today && today <= expirationDate) {
                    return true;
                  } else if(expirationDate < today){
                    //expired state, mark as read so its faster next time
                      markAnnouncmentSeen(feature.id, false);
                    return false;
                  } else {
                    //hasn't started yet
                    return false;
                  }
                }
                
                var filteredAnnouncements = announcements.filter(hasNotSeen);
                resolve(filteredAnnouncements);
            }
          }else{
            resolve([]);
          }
      }
      });
      });
    }
    
    var getSeenAnnouncements = function(){
        if(!$sessionStorage.seenAnnoucements){
            //$sessionStorage.seenAnnoucements = keyValueService.getValue(TYPES.ANNOUNCEMENTS);
            $sessionStorage.seenAnnoucements=[];
        }
        //handleLegacyMigration();
        return $sessionStorage.seenAnnoucements;
    }

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
      TYPES : TYPES,
      getUnseenAnnouncements:getUnseenAnnouncements,
      markAnnouncmentSeen: markAnnouncmentSeen
    };

  }]);

  return app;

});
