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

     $scope.markAnnouncementsSeen = function(announcementID, liked) {
       portalFeaturesService.markAnnouncmentSeen(announcementID).then(function(){
           portalFeaturesService.getUnseenAnnouncements().then(function(data){
               $scope.announcements = data;
           });
       });
       //send ga event for features, if they read more or dismissed, and what was the last id
       miscService.pushGAEvent('feature',liked ? 'read more' : 'dismissed', announcementID);
     }

     //local functions ---------------------------------------------------------

     var postGetData = function(features) {
       
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

     var init = function() {
      if (FEATURES.enabled && !$rootScope.GuestMode) {
        $scope.features = [];
        $scope.announcements = [];
        portalFeaturesService.getFeatures().then(function(data) {
            $scope.features = data;
            postGetData(data);
        });
        portalFeaturesService.getUnseenAnnouncements().then(function(data) {
            $scope.announcements = data;
        });
      }
    };

    //run function -------------------------------------------------------------
    init();

  }]);

  return app;
});
