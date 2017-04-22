var express = require('express');
var loki = require('lokijs');
var distance = require('google-distance');
var router = express.Router();
var db = new loki('loki.json');
var rides = db.addCollection('rides');
var geo = require('node-geo-distance');
distance.apiKey = 'AIzaSyBh0x0MLQAfAdttJuxcJL7IA2BlEz2eNqY';
var debugmode = true;

router.post('/search', function (req, res, next) {
    var userId = req.body.userId;
    var maxDistance = Number(req.body.preferences.maxDistance);
    var minPeople = Number(req.body.preferences.minPeople);
    var coordinationStart = {
        longitude: Number(req.body.route.startLongitude),
        latitude: Number(req.body.route.startLatitude)
    };
    var coordinationEnd = {
        longitude: Number(req.body.route.endLongitude),
        latitude: Number(req.body.route.endLatitude)
    };

    var availableRides = findAvailableRides(coordinationStart, coordinationEnd, maxDistance);


    if (availableRides.length < 1) {
        addNewRide(userId, maxDistance, minPeople, coordinationStart, coordinationEnd);
    } else {
        updateTheRide(userId, minPeople, availableRides, maxDistance, coordinationStart, coordinationEnd);
    }

    var findPeopleCallback = {
        "status": "searching",
        "estimated_Time": "10 minutes"
    };
    res.send(findPeopleCallback);
});


router.post('/check', function (req, res, next) {
    var checkAnswer = getPeopleStatus(req.body.userId);
    if(debugmode) console.log(req.body.userId);
    res.send(checkAnswer[0]);
});

router.get('/all', function (req, res, next) {
    res.send(rides.where(function (obj) {
        return true;
    }));
});


var addNewRide = function (userId, maxDistance, minPeople, coordinationStart, coordinationEnd) {
    var newride = {
        "numPeople": 1,
        "status": "searching",
        "minPeople": Number(minPeople),
        "people": [
            {
                "userId": userId,
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
    if(debugmode)console.log("New Ride Added");
    if(debugmode)console.log(JSON.stringify(newride,null,4));
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

var updateTheRide = function (userId, minPeople, availableRides, maxDistance, coordinationStart, coordinationEnd) {
    var updatedRide = availableRides[0];
    rides.remove(updatedRide);
    updatedRide.people[updatedRide.numPeople] = {
        "userId": userId,
        "maxDistanceToWalk": maxDistance,
        "longitudeStart": coordinationStart.longitude,
        "latitudeStart" : coordinationStart.latitude,
        "longitudeEnd": coordinationEnd.longitude,
        "latitudeEnd" : coordinationEnd.latitude
    };
    updatedRide.minPeople = Math.max(Number(updatedRide.minPeople), Number(minPeople));
    updatedRide.numPeople = updatedRide.numPeople+1;

    if(updatedRide.numPeople >= updatedRide.minPeople){
        updatedRide.status = "done";
        longitudeStartSum = 0;
        latitudeStartSum = 0;
        longitudeEndSum = 0;
        latitueEndSum = 0;
        for(var i = 0; i < numPeople; i++){
            longitudeStartSum +=  updatedRide.people[i].longitudeStart;
            latitudeStartSum +=  updatedRide.people[i].latitudeStart;
            longitudeEndSum +=  updatedRide.people[i].longitudeEnd;
            latitueEndSum +=  updatedRide.people[i].latitudeEnd;
        }
        updatedRide.meetingLocation.longitude = longitudeStartSum/numPeople;
        updatedRide.meetingLocation.latitude = latitudeStartSum/numPeople;
        updatedRide.dropoffLocation.longitude = longitudeEndSum/numPeople;
        updatedRide.dropoffLocation.latitude = latitueEndSum/numPeople;
    }
    if(debugmode) console.log("Updated a ride");
    if(debugmode) console.log(JSON.stringify(updatedRide, null, 4));

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
        return okay;
    });
};

module.exports = router;
