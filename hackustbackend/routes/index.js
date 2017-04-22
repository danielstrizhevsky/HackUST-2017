var express = require('express');
var loki = require('lokijs');
var distance = require('google-distance');
var router = express.Router();
var db = new loki('loki.json');
var rides = db.addCollection('rides');
var fullRides = db.addCollection('fullRides');
var geo = require('node-geo-distance');
distance.apiKey = 'AIzaSyBh0x0MLQAfAdttJuxcJL7IA2BlEz2eNqY';

var createRide = function () {
    //1-Add people to existing rides that are still searching for more
    //After adding 1 person to the ride check if prerequisites are done
    //2-Create a new ride if there arent any good ride.
};

router.post('/search', function (req, res, next) {
    var userId = req.body.userID;
    var maxDistance = req.body.preferences.maxDistance;
    var coordinationStart = {
        longitude: Number(req.body.route.startLongitude),
        latitude: Number(req.body.route.startLatitude)
    };
    var coordinationEnd = {
        longitude: Number(req.body.route.endLongitude),
        latitude: Number(req.body.route.endLatitude)
    };
    var numPeopleFound = 1;

    var availableRides = rides.where(function (obj) {
        var okay = true;
        for (var i = 0; i < obj.numPeople; i++) {
            var person = obj.people[i];
            //make sure there arent any duplicate userIDs
            // if(req.body.userID == person.userID){
            //TODO make sure there is no problem if this happens
            //     okay = false;
            // }

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

            console.log("distance: " + distanceStart);
            //if the distance between two people are bigger than they
            // are willing to walk, it is not an okay ride
            if (distanceStart > maxDistance + person.maxDistanceToWalk ||
                distanceEnd > maxDistance + person.maxDistanceToWalk) {
                okay = false;
            }

            console.log("distance: " + distanceStart);

            if (distanceStart > maxDistance + person.maxDistanceToWalk) {
                okay = false;
            }



        }
        console.log(okay);
        return okay;
    });

    console.log(availableRides);

    if (availableRides.length < 1) {
        var newride = {
            "numPeople": 1,
            "status": "searching",
            "minPeople": req.body.preferences.minNumPeople,
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
    }else if(availableRides.length == 1) {
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
        numPeopleFound = 2;
        rides.insert(updatedRide);
        console.log("********update ride*******");
        console.log(updatedRide)
    }else{
        //TODO find the best ride

    }

    var findPeopleCallback = {
        "userID": userId,
        "numPeopleFound": "1",
        "status": "searching",
        "meetingLocation": {
            "longitude": coordinationStart.longitude,
            "latitude": coordinationStart.latitude,
            "radius": maxDistance
        }
    };

    res.send(findPeopleCallback)
});


router.post('/check', function (req, res, next) {
    var person = people.find({"userID": req.body.userID});
    var checkAnswer = {
        "userID": req.body.userID,
        "queryID": req.body.queryID,
        "numPeopleFound": "0",
        "status": "found",
        "numFound": 2,
        "meetingLocation": person.meetingLocation,
        "foundPeople": [
            {
                "longitude": "1111",
                "latitude": "1111"
            }, {
                "longitude": "2222",
                "latitude": "2222"
            }
        ]
    };
    res.send(checkAnswer)
});

router.post('/metPeople', function (req, res, next) {
    res.send()
});

module.exports = router;
