var express = require('express');
var loki = require('lokijs');
var distance = require('google-distance');
var router = express.Router();
var db = new loki('loki.json');
var rides = db.addCollection('rides');
var geo = require('node-geo-distance');
distance.apiKey = 'AIzaSyBh0x0MLQAfAdttJuxcJL7IA2BlEz2eNqY';

router.post('/search', function (req, res, next) {
    var userId = req.body.userID;
    var maxDistance = req.body.preferences.maxDistance;
    var minPeople = req.body.preferences.minPeople;
    var coordinationStart = {
        longitude: Number(req.body.route.startLongitude),
        latitude: Number(req.body.route.startLatitude)
    };
    var coordinationEnd = {
        longitude: Number(req.body.route.endLongitude),
        latitude: Number(req.body.route.endLatitude)
    };
    var numPeopleFound = 1;

    var availableRides = findAvailableRides(coordinationStart, coordinationEnd, maxDistance);
    console.log(availableRides);

    if (availableRides.length < 1) {
        addNewRide(minPeople, coordinationStart, coordinationEnd);
    }else{
        updateTheRide(availableRides, maxDistance, coordinationStart);
    }

    var findPeopleCallback = {
        "status": "searching",
        "estimated_Time": "10 minutes"
    };
    res.send(findPeopleCallback)
});


router.post('/check', function (req, res, next) {
    var checkAnswer = getPeopleStatus(req.body.userId);
    res.send(checkAnswer)
});


var addNewRide = function (minPeople, coordinationStart, coordinationEnd) {
    var newride = {
        "numPeople": 1,
        "status": "searching",
        "minPeople": minPeople,
        "people": [
            {
                "userId": req.body.userID,
                "maxDistanceToWalk": maxDistance,
                "longitudeStart":coordinationStart.longitude,
                "latitudeStart": coordinationStart.latitude,
                "longitudeEnd":coordinationEnd.longitude,
                "latitudeEnd": coordinationEnd.latitude
            }
        ],
        "meetingLocation": {
            "longitude":coordinationStart.longitude,
            "latitude": coordinationStart.latitude,
            "timeToMeet": "12:32"
        },
        "dropoffLocation": {
            "longitude":coordinationEnd.longitude,
            "latitude": coordinationEnd.latitude,
            "timeItTakes": "30 min"
        }
    };
    console.log("newRide");
    rides.insert(newride);
};
var getPeopleStatus = function (userId) {
    return rides.where(function (obj) {
        for (var i = 0; i < obj.numPeople; i++) {
            var person = obj.people[i];
            if(person.userId == userId) return true;
        }
        return false;
    })
};

var updateTheRide = function (availableRides, maxDistance, coordinationStart) {
    var updatedRide = availableRides[0];
    rides.remove(updatedRide);
    updatedRide.people[updatedRide.numPeople] = {
        "userId": req.body.userID,
        "maxDistanceToWalk": maxDistance,
        "longitude": coordinationStart.longitude,
        "latitude": coordinationStart.latitude
    };
    updatedRide.minPeople = Math.max(Number(updatedRide.minPeople), Number(req.body.preferences.minPeople))
    updatedRide.numPeople = 2;

    if(updatedRide.numPeople >= minPeople){
        updatedRide.status = "done";
    }
    rides.insert(updatedRide);

};
var findAvailableRides = function (coordinationStart, coordinationEnd, maxDistance) {

    return rides.where(function (obj) {
        var okay = true;
        if(obj.status == "searching") {
            for (var i = 0; i < obj.numPeople; i++) {
                var person = obj.people[i];

                var coordStartPeople = {
                    longitude: Number(person.longitudeStart),
                    latitude: Number(person.latitudeStart)
                };

                var coordEndPeople = {
                    longitude: Number(person.longitudeEnd),
                    latitude: Number(person.latitudeEnd)
                };

                var distanceStart = geo.vincentySync(coordinationStart, coordStartPeople);
                var distanceEnd = geo.vincentySync(coordinationEnd, coordEndPeople);

                //if the distance between two people are bigger than they
                // are willing to walk, it is not an okay ride
                if (distanceStart > maxDistance + person.maxDistanceToWalk ||
                    distanceEnd > maxDistance + person.maxDistanceToWalk) {
                    okay = false;
                }
            }
        }else{
            okay = false;
        }
        console.log(okay);
        return okay;
    });
};

module.exports = router;
