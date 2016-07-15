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

     $scope.markAnnouncementSeen = function(announcementID, liked){
         portalFeaturesService.markAnnouncementSeen(announcementID);
         //persist it (coming later)

         //if on xs-small nav, hide the drop down from hamburger button
         if($scope.headerCtrl) {
             $scope.headerCtrl.navbarCollapsed = true;
           }

         //reloadAnnouncements
         portalFeaturesService.getUnseenAnnouncements().then(function(unseenAnnouncements) {
           $scope.announcements = unseenAnnouncements;
         });

         miscService.pushGAEvent('feature',liked ? 'read more' : 'dismissed', $localStorage.lastSeenAnnouncementId);
     }

     //local functions ---------------------------------------------------------

     var setMascot = function(){
         if($rootScope.portal && $rootScope.portal.theme) {
             $scope.buckyImg = $rootScope.portal.theme.mascotImg || 'img/robot-taco.gif';
           } else {
             $scope.buckyImg = 'img/robot-taco.gif';
           }
           $rootScope.$watch('portal.theme', function(newVal, oldVal) {
             if(newVal === oldVal) {
               return;
             } else {
               $scope.buckyImg = newVal.mascotImg || 'img/robot-taco.gif';
             }
           });
     }

     var getPopUps = function(features, justSaved){
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
        // handle legacy local storage
        if ($localStorage.lastSeenFeature === -1) {
          if ($localStorage.hasSeenWelcome) {
            $localStorage.lastSeenFeature = 1;
          } else {
            $localStorage.lastSeenFeature = 0;
          }
          delete $localStorage.hasSeenWelcome;
        }
        //end handle legacy local storage

        //Mode is set to bucky or bucky_mobile to signal mascot init of controller
        if("BUCKY" === $scope.mode || "BUCKY_MOBILE" === $scope.mode) {
          portalFeaturesService.getUnseenAnnouncements().then(function(unseenAnnouncements) {
            $scope.announcements = unseenAnnouncements;
          });
          setMascot();
        }else{
          portalFeaturesService.getFeatures().then(function(features) {
            getPopUps(features, false);
          });
        }
      }
    };

    //run function -------------------------------------------------------------
    init();

  }]);

  return app;
});
