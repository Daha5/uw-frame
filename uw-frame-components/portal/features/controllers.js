'use strict';

define(['angular','require'], function(angular, require) {
  var app = angular.module('portal.features.controllers', []);


  app.controller('PortalFeaturesController', ['miscService',
                                              '$localStorage',
                                              '$sessionStorage',
                                              '$scope',
                                              '$document',
                                              'FEATURES',
                                              '$modal',
                                              'portalFeaturesService',
                                              '$sanitize',
                                              'MISC_URLS',
                                              function(miscService,
                                                       $localStorage,
                                                       $sessionStorage,
                                                       $scope,
                                                       $document,
                                                       FEATURES,
                                                       $modal,
                                                       portalFeaturesService,
                                                       $sanitize,
                                                       MISC_URLS) {
    $scope.features = [];
    $scope.MISC_URLS = MISC_URLS;
    if (FEATURES.enabled) {
      portalFeaturesService.getFeatures().then(function(data) {
        var features = data;
        if (features.length > 0) {
          $scope.features = features;
        }
      });
    }
  }]);

  app.controller('PortalPopupController', ['$localStorage',
                                           '$sessionStorage',
                                           '$rootScope',
                                           '$scope',
                                           '$document',
                                           'FEATURES',
                                           'filterFilter',
                                           '$modal',
                                           'portalFeaturesService',
                                           'miscService',
                                           '$sanitize',
                                  function($localStorage,
                                           $sessionStorage,
                                           $rootScope,
                                           $scope,
                                           $document,
                                           FEATURES,
                                           filterFilter,
                                           $modal,
                                           portalFeaturesService,
                                           miscService,
                                           $sanitize) {

     //scope functions ---------------------------------------------------------

     //need this due to isolated scope
     $scope.pushGAEvent = function(a,b,c) {
       miscService.pushGAEvent(a,b,c);
     }

     $scope.markAnnouncementsSeen = function(announcement, liked) {
       //make sure sessionStorage.seenAnnouncements is at least initialized before trying to modify it
       $sessionStorage.seenAnnoucements = $sessionStorage.seenAnnoucements || [];
       $sessionStorage.seenAnnoucements.push(announcement.id);
       //push change to storage to keep it in sync
       portalFeaturesService.saveLastSeenFeature(portalFeaturesService.TYPES.ANNOUNCEMENTS, $localStorage.lastSeenAnnouncementId);
       
       //set the features in scope to reflect new announcement dismissal
       postGetData($scope.features, true);
       
       //send ga event for features, if they read more or dismissed, and what was the last id
       miscService.pushGAEvent('feature',liked ? 'read more' : 'dismissed', announcement.id);
     }

     //local functions ---------------------------------------------------------

     var postGetData = function(features, justSaved) {
       if (features.length > 0) {
         $scope.features = features; //just setting this to scope so we can use it later

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
             
         }

         //Handles mascot announcement
         if("BUCKY" === $scope.mode || "BUCKY_MOBILE" === $scope.mode) {
           //do bucky announcement
           var announcements = filterFilter(features, {isBuckyAnnouncement : true});
           if(announcements && announcements.length != 0) {
             
             //filter down to ones they haven't seen
             //function that returns true/false if announcment has been seen
             var hasNotSeen = function(feature) {
               var compare = $localStorage.lastSeenAnnouncementId || 0;
               if(feature.id <= compare) {
                 return false;
               } else {
                 //check dates
                 var today = Date.parse(new Date());
                 var startDate = Date.parse(new Date(feature.goLiveYear, feature.goLiveMonth, feature.goLiveDay));
                 var expirationDate = feature.buckyAnnouncement.endDate;

                 if(startDate <= today && today <= expirationDate) {
                   return true;
                 } else if(expirationDate < today){
                   //expired state, mark as read so its faster next time
                   $localStorage.lastSeenAnnouncementId = feature.id;
                   return false;
                 } else {
                   //hasn't started yet
                   return false;
                 }
               }
             }
             
             //If seenAnnouncements not in sesssion storage, grab them from persistant storage
             if(!$sessionStorage.seenAnnoucements && portalFeaturesService.dbStoreLastSeenFeature()){
                 portalFeaturesService.getLastSeenFeature(portalFeaturesService.TYPES.ANNOUNCEMENTS).then(function(data){
                     $localStorage.lastSeenAnnouncementId = data.id || $localStorage.lastSeenAnnouncementId;
                   });
             }
             $scope.announcements = announcements.filter(hasNotSeen);
             
             //Sets the mascot for the announcement
             if($rootScope.portal && $rootScope.portal.theme) {
               $scope.buckyImg = $rootScope.portal.theme.mascotImg || 'img/robot-taco.gif';
             } else {
               $scope.buckyImg = 'img/robot-taco.gif';
             }
             //Sets watcher so if you switch themes, you switch mascot
             $rootScope.$watch('portal.theme', function(newVal, oldVal) {
               if(newVal === oldVal) {
                 return;
               } else {
                 $scope.buckyImg = newVal.mascotImg || 'img/robot-taco.gif';
               }
             });
           }
         } else {
           //this is to setup popup modal stuff
           var popupFeatures = filterFilter(features, {isPopup : true});
           if(popupFeatures.length != 0) {
             $scope.latestFeature = popupFeatures[popupFeatures.length -1];
             var today = Date.parse(new Date());
             var startDate = Date.parse(new Date($scope.latestFeature.popup.startYear, $scope.latestFeature.popup.startMonth, $scope.latestFeature.popup.startDay));
             var endDate = Date.parse(new Date($scope.latestFeature.popup.endYear, $scope.latestFeature.popup.endMonth, $scope.latestFeature.popup.endDay));

             var featureIsLive = today > startDate && today < endDate;
             var featureIsEnabled = $scope.latestFeature.popup.enabled;

             var displayPopup = function() {
                 $modal.open({
                   animation: $scope.animationsEnabled,
                   templateUrl: require.toUrl('./partials/features-modal-template.html'),
                   size: 'lg',
                   scope: $scope
                 });
                 $localStorage.lastSeenFeature = $scope.latestFeature.id;
                 portalFeaturesService.saveLastSeenFeature(portalFeaturesService.TYPES.POPUP, $localStorage.lastSeenFeature);
             };

             if(featureIsLive && featureIsEnabled) {
               if(portalFeaturesService.dbStoreLastSeenFeature()) {
                 portalFeaturesService.getLastSeenFeature(portalFeaturesService.TYPES.POPUP)
                    .then(function(data){//success
                      $localStorage.lastSeenFeature = data.id || $localStorage.lastSeenFeature;
                      if ($localStorage.lastSeenFeature < $scope.latestFeature.id) {
                        displayPopup();
                      }
                    }, function() {//fail
                      //fallback to localstorage
                      if ($localStorage.lastSeenFeature < $scope.latestFeature.id) {
                        displayPopup();
                      }
                    });
               } else if ($localStorage.lastSeenFeature < $scope.latestFeature.id) {
                 displayPopup();
               }
             }
           }
         }
       }
     }

     var init = function() {
      if (FEATURES.enabled && !$rootScope.GuestMode) {
        $rootScope.seenAnnoucements = [];
        $scope.features = [];
        portalFeaturesService.getFeatures().then(function(data) {
          postGetData(data, false);
        });
      }
    };

    //run function -------------------------------------------------------------
    init();

  }]);

  return app;
});
