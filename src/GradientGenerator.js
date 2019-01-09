function GradientGenerator (options) {
    var _self = this;

    this.colours = options['colours'].map(function (colour) {
        return toRgb(colour)
    });

    // Minus one to make room for the final breakpoint
    this.steps = options['steps'] - 1;

    // Number of gradients to calculate
    this.gradient_count = this.colours.length - 1;

    // SubSteps per gradient
    this.substeps = parseInt(this.steps / this.gradient_count);

    // Remaining steps
    this.remainder = this.steps % this.gradient_count;

    this.generate = function () {
        var gradients = timesArr(this.gradient_count).reduce(function (accumulator, currentValue) {
            var steps = _self.substeps;
            if (_self.remainder > 0) { // Add a step if there are leftovers still
                steps++;
                _self.remainder--;
            }
            return accumulator.concat(gradientFor(_self.colours[currentValue], _self.colours[currentValue+1], steps));
        }, []);
        gradients.push(this.colours[this.colours.length - 1]);
        return gradients;
    };

    this.hex = function () {
        return this.generate().map(function (colour) {
            return toHex(colour)
        });
    };

    this.rgb = function () {
        return this.generate().map(function (colour) {
            return toRgb(colour)
        });
    };

    function gradientFor (colour1, colour2, steps) {
        // Calculate a single colour-to-colour gradient
        return timesArr(steps).reduce(function (accumulator, currentValue) {
            var ratio = currentValue / steps;
            var r = colour2[0] * ratio + colour1[0] * (1 - ratio);
            var g = colour2[1] * ratio + colour1[1] * (1 - ratio);
            var b = colour2[2] * ratio + colour1[2] * (1 - ratio);
            accumulator.push([ r, g, b ]);
            return accumulator;
        }, []);
    }

    function timesArr (times) {
        return new Array(times).fill(0).map(function(value, index) {
            return index;
        })
    }

    function isHex (colour) {
        return typeof colour === "string" && !!(colour.match(/^#[a-fA-F0-9]{6}$/))
    }

    function isRgb (colour) {
        return colour instanceof Array && colour.length === 3
            && !colour.map(function(c, i) {
                return !!(parseInt(c).toString().match(/^([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])$/))
            }).includes(false)
    }

    function toRgb (colour) {
        if (isRgb(colour)) return colour;
        if (isHex(colour)) {
           return [
               parseInt(colour.slice(1, 3), 16),
               parseInt(colour.slice(3, 5), 16),
               parseInt(colour.slice(5, 7), 16)
           ];
        }

        throw colourError();
    }

    function toHex (colour) {
        if (isHex(colour)) return colour;
        if (isRgb(colour)) {
            return colour.reduce(function (accumulator, currentValue) {
                var str = parseInt(currentValue).toString(16);
                var hex = str.length === 1 ? str.concat(str) : str;

                return accumulator.concat(hex)
            }, "#")
        }

        throw colourError();
    }

    function colourError (colour) {
        new Error(colour + ' is not a valid RGB or Hex colour')
    }
}