var googleMaps = function (logger) {
    var markers   = [];
    var polyLines = [];
    var map       = null;

    this.initMap = function(options) {
        if(options === undefined) options = {};

        map = new google.maps.Map(document.getElementById(options.domID || 'map'), {
            center: {
                lat: options.lat,
                lng: options.lng
            },
            zoom: options.zoom || 25
        });
    };

    this.onMapIdle = function(callback) {
         google.maps.event.addListenerOnce(map, 'tilesloaded', callback);
    };

    this.setCenter = function(latLng) {
        latLng = new google.maps.LatLng(latLng.lat, latLng.lng);
        map.setCenter(latLng)
    };

    this.marker = function(icon, location) {
        var markerObject  = null;
        var _self = this;
        this.timestamp = null;

        var Location = function(lat, lng, timestamp) {

            this.lat = lat;
            this.lng = lng;
            this.timestamp = timestamp || null;

            this.latLng = function() {
                return { lat: this.lat, lng: this.lng }
            };

            this.vehicleBearing = function (location) {
                return lib.vehicleBearing(this.latLng(), location);
            };
        };

        this.changeIcon = function(iconPath) {
            var icon = markerObject.getIcon();
            icon.url = iconPath;
            markerObject.setIcon(icon);
        };
        this.rotate = function(rotationAngle) {

            var markerDom = document.querySelector('img[src="'+ markerObject.getIcon().url +'"]');

            if(!markerDom) {
                logger.info('markerDom not found!');
                return;
            }

            logger.info('Rotate Marker to: ' + rotationAngle + ' degrees');

            markerDom.style.transform = 'rotate(' + rotationAngle + 'deg)';
            markerDom.style.transformOrigin = '39px 60px';

        };
        this.remove = function() {
            markerObject.setMap(null);
        };
        this.getLocation = function () {
            var position = markerObject.getPosition();
            return new Location(position.lat(), position.lng());
        };
        this.setPosition = function (newLatLng) {
            markerObject.setPosition(new google.maps.LatLng(newLatLng.lat, newLatLng.lng));
        };
        this.animateTo = function(newLocation, options) {
            var defaultOptions = {
                duration:               10,
                onAnimationComplete:    null,
                onFrame:                null
            };

            options                 = Object.assign({}, defaultOptions, options);

            var startLocation         = this.getLocation();
            startLocation.timestamp = _self.timestamp;

            logger.info("START POINT: ", startLocation);
            logger.info("END POINT: ", newLocation);

            if (startLocation.timestamp > newLocation.timestamp) {
                logger.warn("The START POINT timestamp is greater than the END POINT timestamp. This issue will cause the marker not to move. Sorting the locations by timestamp might solve the issue.")
            }

            if (startLocation.timestamp === newLocation.timestamp) {
                logger.warn("The START POINT timestamp is equal with the END POINT timestamp. This will cause the marker not to move.")
            }

            var degrees                 = startLocation.vehicleBearing(newLocation);
            var animationRunning        = true;
            var self                    = this;

            this.animationHandler = null;

            var animationHandler = {
                stop: function() {
                    animationRunning = false;
                    window.cancelAnimationFrame ? window.cancelAnimationFrame(self.animationHandler) : clearTimeout(self.animationHandler);
                }
            };

            setRequestAnimationFrame();
            setCancelAnimationFrame();

            this.rotate(degrees);

            animate(new Date().getTime(), startLocation);


            function animate (startTime, startLocation) {

                if(!animationRunning) return;

                var elapsedTime        = new Date().getTime() - startTime;
                var durationRatio       = elapsedTime / options.duration;
                var currentFrameLatLng  = self.getLocation().latLng();
                var frameCallbackOptions = {
                    currentLatLng: currentFrameLatLng,
                    fromLocation: new Location(startLocation.lat, startLocation.lng, startLocation.timestamp),
                    toLocation: newLocation
                };

                // animation ongoing
                if(durationRatio < 1) {
                    var nextFrameLatLng = new Location(
                        startLocation.lat + (newLocation.lat - startLocation.lat) * durationRatio,
                        startLocation.lng + (newLocation.lng - startLocation.lng) * durationRatio
                    );

                    if (typeof options.onFrame === 'function')
                        options.onFrame(Object.assign({ nextLocation: nextFrameLatLng }, frameCallbackOptions), animationHandler);

                    self.setPosition(nextFrameLatLng);

                    if (window.requestAnimationFrame)
                        return self.animationHandler = window.requestAnimationFrame(function() { animate(startTime, startLocation) });

                    return self.animationHandler = setTimeout(function() { animate(startTime, startLocation) }, 17);
                }

                //last frame animation
                if(durationRatio >= 1) {
                    _self.timestamp = newLocation.timestamp;
                    if (typeof options.onFrame === 'function')
                        options.onFrame(Object.assign({ nextLocation: newLocation }, frameCallbackOptions), animationHandler);

                    self.setPosition(newLocation);

                    if (typeof options.onAnimationComplete === 'function') options.onAnimationComplete();
                }
            }

            function setRequestAnimationFrame () {
                window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
            }

            function setCancelAnimationFrame () {
                window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;
            }

            return animationHandler;
        };

        var _create = function() {
            var image = new Image();
            image.onload = function () {
                logger.info("Marker Image loaded, adding marker on map");
                markerObject = new google.maps.Marker({
                    position: location.latLng(),
                    map: map,
                    icon: {
                        url: icon,
                        origin: new google.maps.Point(0, 0),
                        anchor: new google.maps.Point(40, 60),
                        size: new google.maps.Size(150, 150)
                    },
                    optimized: false
                });
            };

            _self.timestamp = location.timestamp;

            image.onerror = function () {
                logger.error("Cannot load image, adding marker without image");
                markerObject = new google.maps.Marker({
                    position: location.latLng(),
                    map: map,
                    title: 'Marker demo',
                    zIndex: 1
                });
            };

            image.src = icon;

            logger.info("Initializing Marker with coords:", location);

            return this;
        };

        _create();

        return this;
    };

    this.polyLine = function(options) {

        var object = null;

        var _create = function() {
            object = new google.maps.Polyline({
                path: options.coordinates || [],
                geodesic: true,
                strokeColor: options.colour || '#000',
                strokeOpacity: options.opacity || 1.0,
                strokeWeight: options.strokeWeight || 4
            });
            polyLines.push(object);
            object.setMap(map);
        };

        this.remove = function() {
            object.setMap(null);
        };

        _create();

        return this;
    };

    this.resetMap = function() {
        this.removeMarkers();
        this.removePolylines();
    };

    this.removeMarkers = function() {
        markers.forEach(function(marker, index){
            marker.setMap(null);
        });

        markers = [];
    };

    this.removePolylines = function() {
        polyLines.forEach(function(polyLine, index){
            polyLine.setMap(null);
        });

        polyLines = [];
    }
};