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
