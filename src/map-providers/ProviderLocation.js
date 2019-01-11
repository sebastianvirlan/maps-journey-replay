var ProviderLocation = function(lat, lng, timestamp) {

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
