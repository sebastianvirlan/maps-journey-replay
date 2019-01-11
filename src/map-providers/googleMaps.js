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

            // logger(markerObject.getIcon().url);

            if(!markerDom) logger('markerDom not found!');
            // if(!markerDom) this.rotate(rotationAngle);

            // logger(object.getIcon().url);
            if(!markerDom) return;

            // logger('Rotate to: ' + rotationAngle);

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
            logger("START POINT: ", startLocation);
            logger("END POINT: ", newLocation);

            var degrees                 = startLocation.vehicleBearing(newLocation);
            var animationRunning        = true;
            var self                    = this;

            this.animationHandler = null;
            // this.timestamp = null;

            var animationHandler = {
                stop: function() {
                    animationRunning = false;
                    window.cancelAnimationFrame ? window.cancelAnimationFrame(self.animationHandler) : clearTimeout(self.animationHandler);
                }
                // changeDuration: function(duration) {
                //     animationRunning    = false;
                //     options.duration    = duration;
                //     startLatLng         = self.getLocation().latLng();
                //     animationRunning    = true;
                // }
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
                logger("Image loaded, adding marker with image !");
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
                console.error("Cannot load image, adding marker without image");
                markerObject = new google.maps.Marker({
                    position: location.latLng(),
                    map: map,
                    title: 'Marker demo',
                    zIndex: 1
                });
            };

            image.src = icon;

            // var image = {
            //     url: icon,
            //     anchor: new google.maps.Point(40, 60),
            //     size: new google.maps.Size(150, 150),
            //     // scaledSize: new google.maps.Size(100, 75)
            //     // size: new google.maps.Size(150, 150)
            //     // path: 'M29.395,0H17.636c-3.117,0-5.643,3.467-5.643,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644V6.584C35.037,3.467,32.511,0,29.395,0z M34.05,14.188v11.665l-2.729,0.351v-4.806L34.05,14.188zM32.618,10.773c-1.016,3.9-2.219,8.51-2.219,8.51H16.631l-2.222-8.51C14.41,10.773,23.293,7.755,32.618,10.773z M15.741,21.713v4.492l-2.73-0.349V14.502L15.741,21.713z M13.011,37.938V27.579l2.73,0.343v8.196L13.011,37.938z M14.568,40.882l2.218-3.336h13.771l2.219,3.336H14.568z M31.321,35.805v-7.872l2.729-0.355v10.048L31.321,35.805z',
            //     // anchor: new google.maps.Point(23, 50),
            //     // rotation: 11,
            //     // fillOpacity: 1,
            //     // strokeOpacity: 1,
            //     // fillColor: '#F0B645'
            // };


            logger("📍 Creating Marker with coords:");
            logger(location);

            // var markerOptions = {
            //     map: map,
            //     position: location.latLng(),
            //     icon: image,
            //     timestamp: location.timestamp,
            //     optimized: false
            // };

            // object = new google.maps.Marker(markerOptions);

            // markers.push(object);

            // google.maps.event.addListener(object, 'load', function () {
            //     logger('ok');
            // });

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
