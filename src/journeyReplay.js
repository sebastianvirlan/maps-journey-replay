var journeyReplay = function(optionsObj) {

    var REPLAY_TYPE = {
        STATIC_MARKER                   : _playStaticMarker,
        STATIC_MARKER_AND_POLY_LINES    : _playStaticMarkerAndPolyLine,
        DYNAMIC_MARKER                  : _playDynamicMarker,
        DYNAMIC_MARKER_AND_POLY_LINES                   : _playDynamicMarkerAndPolyLine,
        DYNAMIC_MARKER_AND_POLY_LINES_COLORED_BY_SPEED  : _playDynamicMarkerAndPolyLineColored
    };

    var _defaults = {
        logger          : console.log,
        type            : REPLAY_TYPE.STATIC_MARKER,
        domID           : 'map',
        mapProvider     : null,
        colorSteps      : 100,
        speedColors     : ["#00ff00", "#ffff00", "#ff0000"],
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

        this.timeToNext = function(index) {
            return this.getTimestamp(index) - this.getTimestamp(index + 1);
        };
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
    var _initMap  = function(mapProvider, onMapLoaded) {
        _mapProvider = new mapProvider(optionsObj.logger);
        _mapProvider.initMap({});
        _mapProvider.onMapIdle(onMapLoaded);
        _loadMarker();
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

        optionsObj.marker.onLocation();
        var duration = (_speed * (MapLocations.timeToPrevious(fromIndex) - _timeRemaining)) / 100;

        _dynamicMarker.animateTo(MapLocations.get(fromIndex), {
            duration  : duration,
            timestamp : MapLocations.getTimestamp(fromIndex),
            onFrame   : function(position, animation) {
                var distance  = lib.distanceBetweenPoints(position.start, position.finish);
                var speed     = lib.averageKPHSpeed(distance, position.start.timestamp, position.finish.timestamp);

                var args = Array.prototype.slice.call(arguments);
                args.splice(1, 0, distance);
                args.splice(1, 0, speed);

                if(typeof callbackOnFrame === 'function') callbackOnFrame.apply(this, args);
                optionsObj.marker.onFrame();
            },
            onAnimationComplete  : function() {
                _resetTimeRemaining();
                _setCurrentLocationIndex(fromIndex);
                _playDynamicMarker(fromIndex + 1, callbackOnFrame);
                optionsObj.logger('Completed!');
            }
        });
    }

    function _playDynamicMarkerAndPolyLine(fromIndex) {
        _playDynamicMarker(fromIndex, function(position){
            _createPolyLine({ coordinates: [position.currentLatLng, position.next] });
        });
    }

    function _playDynamicMarkerAndPolyLineColored(fromIndex) {
        optionsObj.logger('Starting from index ' + fromIndex);
        _playDynamicMarker(fromIndex, function(position, speed){
            _createPolyLine({
                coordinates: [position.currentLatLng, position.next],
                color: _getGradientColor(parseInt(speed))
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
        _gradients = optionsObj.gradientGenerator({ speedColors: optionsObj.speedColors, steps: steps});
    };

    var _getGradientColor = function(index) {
        if(index > _gradients.length)
            return _gradients[_gradients.length - 1];

        if(index <= 0)
            return _gradients[0];

        return _gradients[index - 1]
    };

    var startJourney =  function() {
        _playFromIndex(1);
    };

    var _loadMarker = function () {
        _mapProvider.setCenter(MapLocations.get(0));
        _dynamicMarker = _createMarker(optionsObj.marker.icon, MapLocations.get(0));
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

                    _initMap(optionsObj.mapProvider, function () {
                        startJourney();
                    });
                }
            })
        }
        _generateGradient(optionsObj.colorSteps);
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
    DYNAMIC_MARKER_AND_POLY_LINES_COLORED_BY_SPEED  : 'DYNAMIC_MARKER_AND_POLY_LINES_COLORED_BY_SPEED'
};
