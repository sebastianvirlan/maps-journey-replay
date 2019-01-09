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