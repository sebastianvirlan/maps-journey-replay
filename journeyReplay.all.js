var Location = function(lat, lng, timestamp) {
    this.lat = lat;
    this.lng = lng;
    this.timestamp = timestamp;

    this.latLng = function() {
        return {lat: this.lat, lng: this.lng}
    }
};

var Locations = function(locations) {
    var _locations = locations.map(function(location){
        return new Location(location.lat, location.lng, location.timestamp);
    });

    this.all = function() {
        return _locations;
    };

    this.get = function(index) {
        return _locations[index];
    };

    this.getPrevious = function(index) {
        return this.get(index - 1);
    };

    this.getTimestamp = function(index) {
        return this.get(index).timestamp;
    };

    this.first = function() {
        return this.get(0);
    };

    this.last = function() {
        return this.get(_locations.length - 1);
    };

    this.count = function() {
        return _locations.length;
    };

    this.timeToPrevious = function(index) {
        return this.getTimestamp(index) - this.getTimestamp(index - 1);
    };
};

var lib = {
    distanceBetweenPoints: function(p1, p2) {

        // Convert degrees to radians
        var lat1 = p1.lat * Math.PI / 180.0;
        var lon1 = p1.lng * Math.PI / 180.0;

        var lat2 = p2.lat * Math.PI / 180.0;
        var lon2 = p2.lng * Math.PI / 180.0;

        // radius of earth in metres
        var r = 6378100;

        // P
        var rho1 = r * Math.cos(lat1);
        var z1 = r * Math.sin(lat1);
        var x1 = rho1 * Math.cos(lon1);
        var y1 = rho1 * Math.sin(lon1);

        // Q
        var rho2 = r * Math.cos(lat2);
        var z2 = r * Math.sin(lat2);
        var x2 = rho2 * Math.cos(lon2);
        var y2 = rho2 * Math.sin(lon2);

        // Dot product
        var dot = (x1 * x2 + y1 * y2 + z1 * z2);
        var cos_theta = dot / (r * r);

        var theta = Math.acos(cos_theta);
        // Distance in Metres
        return r * theta;
    },
    averageKPHSpeed: function(distance, t1, t2) {
        var time_s = (t2 - t1) / 1000.0;
        var speed_mps = distance / time_s;
        return (speed_mps * 3600.0) / 1000.0;
    },
    httpRequest: function(obj) {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', obj.url, true);
        xobj.onreadystatechange = function() {
            if (xobj.readyState === 4 && xobj.status === 200) {
                obj.success(xobj.responseText);
            }
        };
        xobj.send(null);
    },
    validURL: function(url) {
        var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
            '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
        return pattern.test(url);
    },
    vehicleBearing: function (startPoint, endPoint) {
        var point1 = new google.maps.LatLng(startPoint.lat, startPoint.lng);
        var point2 = new google.maps.LatLng(endPoint.lat, endPoint.lng);

        return google.maps.geometry.spherical.computeHeading(point1, point2);
    }
};

var journeyReplay = function(optionsObj) {

    var REPLAY_TYPE = {
        STATIC_MARKER                   : _playStaticMarker,
        STATIC_MARKER_AND_POLY_LINES    : _playStaticMarkerAndPolyLine,
        DYNAMIC_MARKER                  : _playDynamicMarker,
        DYNAMIC_MARKER_AND_POLY_LINES                   : _playDynamicMarkerAndPolyLine,
        DYNAMIC_MARKER_AND_POLY_LINES_COLOURED_BY_SPEED  : _playDynamicMarkerAndPolyLineColoured
    };

    var _defaults = {
        logger          : console.log,
        type            : REPLAY_TYPE.STATIC_MARKER,
        domID           : 'map',
        mapProvider     : null,
        colourSteps      : 100,
        speedColours     : ["#00ff00", "#ffff00", "#ff0000"],
        fetchMapPoints: {
            url: null,
            onDone: function () {}
        },
        marker: {
            onFrame: function () {},
            onLocation: function () {}
        },
        gradientGenerator: null
    };

    if(optionsObj.fetchMapPoints) {
        optionsObj.fetchMapPoints = Object.assign(_defaults.fetchMapPoints, optionsObj.fetchMapPoints);
    }

    if(optionsObj.marker) {
        optionsObj.marker = Object.assign(_defaults.marker, optionsObj.marker);
    }

    optionsObj = Object.assign(_defaults, optionsObj);

    optionsObj.logger("Initialized mapReplay with options: ");
    optionsObj.logger(optionsObj);

    var _mapProvider =  null;
    var MapLocations = null;

    var _speed                  = 100; // 100% is real speed
    var _timeRemaining          = 0;
    var _currentLocationIndex   = 0;
    var _currentStepDate        = null;
    var _timeouts               = [];
    var _dynamicMarker          = null;
    var _gradients              = [];

    var _self = this;

    var setLocations = function (locations){
        MapLocations = new Locations(locations);
    };

    /* MAP WRAPPERS */
    var _initMap  = function(onMapLoaded) {
        _mapProvider = new optionsObj.mapProvider(optionsObj.logger);
        _mapProvider.initMap(MapLocations.get(0));
        _mapProvider.onMapIdle(onMapLoaded);
        _loadMarker(MapLocations.get(0));
    };

    var _createMarker = function(icon, options) {
        return new _mapProvider.marker(icon, options);
    };

    var _createPolyLine = function(options) {
        return new _mapProvider.polyLine(options);
    };
    /* END MAP WRAPPERS */

    /* JOURNEY REPLAY TYPES */
    function _playDynamicMarker(fromIndex, callbackOnFrame) {
        if(fromIndex === MapLocations.count())  return;

        _updateCurrentStepDate();

        var currentLocation = MapLocations.get(fromIndex);
        var duration = (_speed * (MapLocations.timeToPrevious(fromIndex) - _timeRemaining)) / 100;

        _dynamicMarker.animateTo(currentLocation, {
            duration  : duration,
            timestamp : MapLocations.getTimestamp(fromIndex),
            onFrame   : function(position, animation) {
                var distance  = lib.distanceBetweenPoints(position.fromLocation, position.toLocation);
                var speed     = lib.averageKPHSpeed(distance, position.fromLocation.timestamp, position.toLocation.timestamp);

                var args = Array.prototype.slice.call(arguments);
                args.splice(1, 0, { distance: distance, unit: 'meters'  });
                args.splice(1, 0, { speed: speed, unit: 'kmh' });

                if(typeof callbackOnFrame === 'function') callbackOnFrame.apply(this, args);
                optionsObj.marker.onFrame.apply(this, args);
            },
            onAnimationComplete  : function() {
                _resetTimeRemaining();
                _setCurrentLocationIndex(fromIndex);
                _playDynamicMarker(fromIndex + 1, callbackOnFrame);
                optionsObj.marker.onLocation(currentLocation);
                optionsObj.logger('Completed!');
            }
        });
    }

    function _playDynamicMarkerAndPolyLine(fromIndex) {
        _playDynamicMarker(fromIndex, function(position){
            _createPolyLine({ coordinates: [position.currentLatLng, position.nextLocation] });
        });
    }

    function _playDynamicMarkerAndPolyLineColoured(fromIndex) {
        optionsObj.logger('Starting from index ' + fromIndex);
        _playDynamicMarker(fromIndex, function(position, speedObj){
            _createPolyLine({
                coordinates: [position.currentLatLng, position.nextLocation],
                colour: _getGradientColour(parseInt(speedObj.speed))
            });
        });
    }

    function _playStaticMarker(fromIndex) {
        _forEachLocationFromIndex(fromIndex, function(currentIndex) {
            _createMarker(MapLocations.get(currentIndex));
        });
    }

    function _playStaticMarkerAndPolyLine(fromIndex) {
        _forEachLocationFromIndex(fromIndex, function(index) {
            _createMarker(MapLocations.get(index));

            if(index === 0) return;

            _createPolyLine(
                { coordinates: [ MapLocations.get(index - 1).latLng(), MapLocations.get(index).latLng() ] }
            );
        });
    }
    /* END JOURNEY REPLAY TYPES */

    var _checkPlayType = function () {
        if(REPLAY_TYPE[optionsObj.type] === undefined) throw 'Unsupported MapReplay type.';
    };

    var _playFromIndex = function(fromIndex) {
        REPLAY_TYPE[optionsObj.type](fromIndex);
    };

    var _resetTimeRemaining = function () {
        _timeRemaining = 0;
    };

    var _setCurrentLocationIndex = function(index) {
        _currentLocationIndex = index;
    };

    var _updateCurrentStepDate = function() {
        _currentStepDate = new Date();
    };

    var _forEachLocationFromIndex = function(fromIndex, eachLocationCB) {
        MapLocations.all().slice(fromIndex).forEach(function(location, index) {
            var substrTimestamp = (fromIndex > 0 ?  MapLocations.getPrevious(fromIndex).timestamp : MapLocations.get(fromIndex).timestamp);
            var iteration       = location.timestamp - substrTimestamp - _timeRemaining;

            _timeouts.push(
                window.setTimeout(function(){
                    _currentStepDate = new Date();

                    _setCurrentLocationIndex(fromIndex + index);
                    index = _currentLocationIndex;

                    if(typeof eachLocationCB === 'function')
                        eachLocationCB(index);

                }, (iteration * (_self.speed)) / 100)
            );
        });
    };

    var _generateGradient = function(steps) {
        if (!optionsObj.gradientGenerator) {
            throw new Error('No gradient processor specified')
        }
        _gradients = optionsObj.gradientGenerator({ speedColours: optionsObj.speedColours, steps: steps});
    };

    var _getGradientColour = function(index) {
        if(index > _gradients.length)
            return _gradients[_gradients.length - 1];

        if(index <= 0)
            return _gradients[0];

        return _gradients[index - 1]
    };

    var startJourney =  function() {
        _playFromIndex(1);
    };

    var _loadMarker = function (location) {
        _mapProvider.setCenter(location);
        _dynamicMarker = _createMarker(optionsObj.marker.icon, MapLocations.get(0));
        optionsObj.marker.onLocation(location);
    };

    var _loadJourney = function () {
        if(optionsObj.fetchMapPoints && lib.validURL(optionsObj.fetchMapPoints.url))
        {
            lib.httpRequest({
                url: optionsObj.fetchMapPoints.url,
                success: function(data) {

                    if(typeof optionsObj.fetchMapPoints.onDone === 'function')
                        optionsObj.fetchMapPoints.onDone(data);

                    setLocations(JSON.parse(data));

                    _initMap(function () {
                        startJourney();
                    });
                }
            })
        }
        _generateGradient(optionsObj.colourSteps);
    };

    this.init = function() {
        _checkPlayType();
        _loadJourney();
    };

    this.marker = {
        onFrame: function (callback) {
            optionsObj.marker.onFrame = callback;
        },
        onLocation: function (callback) {
            optionsObj.marker.onLocation = callback;
        }
    }
};

/* MARKER PLAYING TYPES */
journeyReplay.REPLAY_TYPE = {
    STATIC_MARKER                  : 'STATIC_MARKER',
    STATIC_MARKER_AND_POLY_LINES   : 'STATIC_MARKER_AND_POLY_LINES',
    DYNAMIC_MARKER                  : 'DYNAMIC_MARKER',
    DYNAMIC_MARKER_AND_POLY_LINES                   : 'DYNAMIC_MARKER_AND_POLY_LINES',
    DYNAMIC_MARKER_AND_POLY_LINES_COLOURED_BY_SPEED  : 'DYNAMIC_MARKER_AND_POLY_LINES_COLOURED_BY_SPEED'
};
