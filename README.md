# maps-journey-replay
Javascript Library that loads a journey JSON object (coordinates + timestamp) and creates a replay on a map.

## Demo

![Maps Journey Replay](https://i.imgur.com/qxDeW48.png)

## Journey JSON form    at:
```JSON
[
  {
	"lat": 53.94632335995299,
	"lng": -1.3704424708440581,
	"timestamp": 1486291045000
  },
  {
	"lat": 53.94624075051081,
	"lng": -1.3701714873316115,
	"timestamp": 1486291052000
  },
  .....
 ]
```

## Initializing the library example:

```javascript
    var mapJourneyReplay = new journeyReplay({
        type: journeyReplay.REPLAY_TYPE.DYNAMIC_MARKER_AND_POLY_LINES_COLORED_BY_SPEED,
        logger: console.log,
        gradientGenerator: function (options) {
            return new GradientGenerator({colours: options.speedColours, steps: options.steps}).hex()
        },
        fetchMapPoints: {
            url: 'http://192.168.64.2/journey.json'
        },
        mapProvider: googleMaps,
        marker: {
	    icon: 'images/bus.svg',
            anchor: [39, 60],
            size: [100, 100],
            scaledSize: [100, 75],
            onFrame: function (currentFrame, speed, distance, animationHandler) {
                // do stuff
            },
            onLocation: function (currentLocation) {
                // do stuff
            }
        },
	speedColours : ["#00ff00", "#ffff00", "#ff0000"],
	colourSteps : 100
    });

    mapJourneyReplay.marker.onFrame(function (currentFrame, speed, distance, animationHandler) {
        // do stuff
    });

    mapJourneyReplay.marker.onLocation(function (currentLocation) {
        // do stuff
    });

    journeyReplay.init();
```

## Options

|       Key      |                       Default Value                         |                          Value Type                          | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|:--------------:|:-----------------------------------------------------------:|:------------------------------------------------------------:|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|      type      |                       `STATIC_MARKER`                       |                            `string`                          | Specifies how to replay the journey. There are 5 replay types:                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|                |                                                             |                                                              | - STATIC_MARKER - moves the marker from location to location without any animation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
|                |                                                             |                                                              | - STATIC_MARKER_AND_POLY_LINES - jumps the marker from location to location without any animation and draws a polyline between locations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|                |                                                             |                                                              | - DYNAMIC_MARKER - moves the marker from location to location with animation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|                |                                                             |                                                              | - DYNAMIC_MARKER_AND_POLY_LINES - moves the marker from location to location with animation and draws a polyline between locations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
|                |                                                             |                                                              | - DYNAMIC_MARKER_AND_POLY_LINES_COLORED_BY_SPEED - moves the marker from location to location with animation and draws a colorized polyline between locations based on the speed (calculated from the timestamp)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|     logger     |                        `console.log`                        |                 `function (message: string) {}`               | Logs to the output informations useful for debugging. By default it uses console.log, other options are: - null - customLogger(message: string)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|      domID     |                            `map`                            |                            `string`                          | The id of the DOM element where the map is loaded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| fetchMapPoints |         `{   url: null,   onDone: function () {} }`         |                    `object: FetchMapPoints`                  | fetchMapPoints is an object that has 2 properties: - url that is a string - onDone which is called after the JSON has been loaded                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|   mapProvider  |                         `googleMaps`                        |                         `function: Maps`                     | mapProvider takes a constructor function that must implement a list of methods See `Maps interface` to see all the methods that needs implemented. By using this interface maps from other providers can be implemented as well. By default the implemented interface is for googleMaps.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|     marker     | `{   onFrame: function () {},   onLocation: function () {} }` |                        `object Marker`                       | The marker key contains 2 callbacks: - onFrame, called for each frame of the animation - onLocation, called for each location from the JSON file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|   speedColors  |             `["#00ff00", "#ffff00", "#ff0000"]`             |                         `string[]`                           | Array with hex colours that represents the polyline colorisation by speed. The first element in the array is the lowest speed colour and the last is the highest speed colour. This property must be used with the colourSteps option.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|   colorSteps   |                            `100`                            |                            `int`                             | Defines in how many steps you can get the highest speed colour from the lowest. Each step represents 1km, so after 100km will be used the highest speed colour.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## Default Options Object

```javascript
var defaults = {
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
        icon: '../images/bus.svg',
        anchor: [39, 60],
        size: [100, 100],
        scaledSize: [100, 75],
        onFrame: function () {},
        onLocation: function () {}
    }
};
```
## Maps Interface

```javascript
function Maps () {
  this.initMap = function (options) {}
  this.onMapIdle = function (callback) {}
  this.setCenter = function (latLng) {}
  this.marker = function (icon, location) {
      this.changeIcon = function (iconPath) {}
      this.rotate = function (rotationAngle) {}
      this.remove = function () {}
      this.getLocation = function () {}
      this.setPosition = function (newLatLng) {}
      this.animateTo = function (newLocation, options) {}
  }
  this.polyLine = function (options) {
      this.remove = function () {}
  }
  this.resetMap = function () {}
  this.removeMarkers = function () {}
  this.removePolylines = function () {}
}
```

## Objects

```javascript
var fetchMapPoints = {
    url: 'string',
    onDone: function () {}
}

var marker = {
    onFrame: function () {},
    onLocation: function () {}
}
```
