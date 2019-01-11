var animator = function(marker, logger) {

    var FrameResponse = function (currentLocation, nextFrameLocation, fromLocation, toLocation) {
        this.currentLocation = currentLocation;
        this.nextFrameLocation = nextFrameLocation;
        this.fromLocation = fromLocation;
        this.toLocation = toLocation;
    };

    this.animateTo = function(currentLocation, newLocation, options) {

        this.animationHandler = null;

        var defaultOptions = {
            duration: 10,
            onAnimationComplete: function () { },
            onFrame: null
        };

        var animationHandler = {
            stop: function () {
                animationRunning = false;
                window.cancelAnimationFrame ? window.cancelAnimationFrame(self.animationHandler) : clearTimeout(self.animationHandler);
            }
        };

        var setRequestAnimationFrame = function() {
            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        };

        var setCancelAnimationFrame = function () {
            window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;
        };

        options = Object.assign({}, defaultOptions, options);

        var startLocation = currentLocation;
        startLocation.timestamp = marker.timestamp;

        logger("START POINT: ", startLocation);
        logger("END POINT: ", newLocation);

        var degrees = startLocation.vehicleBearing(newLocation);
        var animationRunning = true;
        var self = this;

        setRequestAnimationFrame();
        setCancelAnimationFrame();

        this.rotate(degrees);

        animate(new Date().getTime());


        function animate(startTime) {

            if (!animationRunning) return;

            var elapsedTime = new Date().getTime() - startTime;
            var durationRatio = elapsedTime / options.duration;
            var currentFrameLatLng = self.getCurrentLocation().latLng();
            var nextFrameLatLng;

            // animation ongoing
            if (durationRatio < 1) {
                nextFrameLatLng = new ProviderLocation(
                    startLocation.lat + (newLocation.lat - startLocation.lat) * durationRatio,
                    startLocation.lng + (newLocation.lng - startLocation.lng) * durationRatio
                );

                if (window.requestAnimationFrame) {
                    return self.animationHandler = window.requestAnimationFrame(function () {
                        animate(startTime)
                    });
                }

                return self.animationHandler = setTimeout(function () {
                    animate(startTime)
                }, elapsedTime);
            }

            //last frame animation
            if (durationRatio >= 1) {
                marker.timestamp = newLocation.timestamp;
                nextFrameLatLng = newLocation;
                if (typeof options.onAnimationComplete === 'function') options.onAnimationComplete();
            }

            var frameCbResponse = new FrameResponse(
                currentFrameLatLng, nextFrameLatLng, startLocation, newLocation
            );

            marker.setPosition(nextFrameLatLng);

            if (typeof options.onFrame === 'function') {
                options.onFrame(frameCbResponse, animationHandler);
            }
        }

        return animationHandler;
    }
};
