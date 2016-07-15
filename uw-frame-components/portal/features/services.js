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


    var getSeenAnnouncments = function(){
      return $q(function(resolve, reject){
        if($sessionStorage.seenAnnouncmentIds){
          return resolve($sessionStorage.seenAnnouncmentIds);
        }else{
          //if Session Storage is available, choose it
          //else go to keyValueStore
          return resolve([]);
        }
            
      });
    }

    var getSeenPopups = function(){
      return $q(function(resolve, reject){
        if($sessionStorage.seenPopupIds){
          return resolve($sessionStorage.seenPopupIds);
        }else{
          //if Session Storage is available, choose it
          //else go to keyValueStore
          return resolve([]);
        }
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
    
    var markPopupSeen = function(popupID){
      //Store in session storage
      if(!$sessionStorage.seenPopupIds){
        $sessionStorage.seenPopupIds = [popupID];
      }else{
        $sessionStorage.seenPopupIds.push(popupID);
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

    
    var getUnseenPopups = function(){
      var successFn, errorFn;
      
      successFn = function(data){
        var popupFeatures = filterFilter(data[0], {isPopup : true});
        if(popupFeatures.length != 0){
          
          var today = Date.parse(new Date());
          
          var filterExpiredPopups = function(feature){
            var startDate = Date.parse(new Date(feature.popup.startYear, feature.popup.startMonth, feature.popup.startDay));
            var endDate = Date.parse(new Date(feature.popup.endYear, feature.popup.endMonth, feature.popup.endDay));
            return (today > startDate && today < endDate);
            //TODO add the expired ones to read
          }
          
          var filterUnEnabledPopups = function(feature){
              return feature.popup.enabled;
          }
          
          var filterSeenPopups = function(feature){
              if(data[1].indexOf(feature.id) !== -1){
                  return false;
              }
              return true;
          }
          
          var filteredPopupFeatures = popupFeatures.filter(filterSeenPopups).filter(filterExpiredPopups).filter(filterUnEnabledPopups);
         
          return filteredPopupFeatures;
          
        }
      }
      
      errorFn = function(reason){
          console.log("error retreiving unseenPopups: " +  response.status);
          return null;
      };
        
      return $q.all([getFeatures(), getSeenPopups()]).then(successFn, errorFn);
    }

    return {
      getFeatures : getFeatures,
      getUnseenAnnouncements: getUnseenAnnouncements,
      markAnnouncementSeen: markAnnouncementSeen,
      markPopupSeen:markPopupSeen,
      getUnseenPopups: getUnseenPopups
    };

  }]);

  return app;

});
