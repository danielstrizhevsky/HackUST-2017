var express = require('express');
var loki = require('lokijs');
var distance = require('google-distance');
var router = express.Router();
var db = new loki('loki.json');
var donerides = db.addCollection('donerides');
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

router.post('/cancel', function (req, res, next) {
    var userId = req.body.userId;
    removeFromRides(userId);
    res.send({"status": "canceled"});
});

router.post('/confirm', function (req, res, next) {
    var confirmAnswer = confirmPerson(req.body.userId);

    res.send({"status": "confirmed"});
});


router.post('/check', function (req, res, next) {
    var checkAnswer = getPeopleStatus(req.body.userId)[0];
    if(debugmode) console.log("checking for " + req.body.userId);
    res.send(checkAnswer);
});

router.get('/all', function (req, res, next) {
    res.send(rides.where(function (obj) {
        return true;
    }));
});

var removeFromRides = function (userId) {
    var ride = getPeopleStatus(userId)[0];
    rides.remove(ride);
    var people = [];
    var counter = 0;
    var minPeople = 1;
    ride.numPeople = Number(ride.numPeople) - 1;
    for(var i = 0; i < ride.people.length; i++){
        if(ride.people[i].userId != userId){
            minPeople = Math.max(minPeople, Number(ride.people[i].minPeople));
            people[counter] = ride.people[i];
            counter++;
        }
    }
    ride.people = people;
    ride.minPeople = minPeople;
    if(debugmode)console.log(userId + " canceled!");
    if(debugmode)console.log(JSON.stringify(ride,null,4));

    if(ride.people.length > 0){
        rides.insert(ride);
    }

};

var confirmPerson = function (userId) {
    var doneride = getPeopleStatus(userId)[0];
    donerides.remove(doneride);
    var isAllTrue = true;
    for(var i = 0; i < doneride.people.length; i++){
        if(doneride.people[i].userId == userId){
            doneride.people[i].confirmed = "True"
        }
        if(doneride.people[i].confirmed == "False"){
            isAllTrue = false;
        }
    }
    if(!isAllTrue){
        donerides.insert(doneride);
    }

};
var addNewRide = function (userId, maxDistance, minPeople, coordinationStart, coordinationEnd) {
    var newride = {
        "numPeople": 1,
        "status": "searching",
        "minPeople": Number(minPeople),
        "people": [
            {
                "userId": userId,
                "minPeople": Number(minPeople),
                "maxDistanceToWalk": maxDistance,
                "longitudeStart":coordinationStart.longitude,
                "latitudeStart": coordinationStart.latitude,
                "longitudeEnd":coordinationEnd.longitude,
                "latitudeEnd": coordinationEnd.latitude,
                "confirmed": "False"
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
    var ride = donerides.where(function (obj) {
        for (var i = 0; i < obj.numPeople; i++) {
            var person = obj.people[i];
            if(person.userId == userId) return true;
        }
        return false;
    });

    if (ride.length == 0){
        ride = rides.where(function (obj) {
            for (var i = 0; i < obj.numPeople; i++) {
                var person = obj.people[i];
                if(person.userId == userId) return true;
            }
            return false;
        });
    }

    return ride;
};

var updateTheRide = function (userId, minPeople, availableRides, maxDistance, coordinationStart, coordinationEnd) {
    var updatedRide = availableRides[0];
    rides.remove(updatedRide);
    updatedRide.people[updatedRide.numPeople] = {
        "userId": userId,
        "minPeople": Number(minPeople),
        "maxDistanceToWalk": maxDistance,
        "longitudeStart": coordinationStart.longitude,
        "latitudeStart" : coordinationStart.latitude,
        "longitudeEnd": coordinationEnd.longitude,
        "latitudeEnd" : coordinationEnd.latitude,
        "confirmed": "False"
    };
    updatedRide.minPeople = Math.max(Number(updatedRide.minPeople), Number(minPeople));
    updatedRide.numPeople = updatedRide.numPeople+1;

    if(updatedRide.numPeople >= updatedRide.minPeople){
        updatedRide.status = "done";
        longitudeStartSum = 0;
        latitudeStartSum = 0;
        longitudeEndSum = 0;
        latitueEndSum = 0;
        for(var i = 0; i < updatedRide.numPeople; i++){
            longitudeStartSum +=  updatedRide.people[i].longitudeStart;
            latitudeStartSum +=  updatedRide.people[i].latitudeStart;
            longitudeEndSum +=  updatedRide.people[i].longitudeEnd;
            latitueEndSum +=  updatedRide.people[i].latitudeEnd;
        }
        updatedRide.meetingLocation.longitude = longitudeStartSum/updatedRide.numPeople;
        updatedRide.meetingLocation.latitude = latitudeStartSum/updatedRide.numPeople;
        updatedRide.dropoffLocation.longitude = longitudeEndSum/updatedRide.numPeople;
        updatedRide.dropoffLocation.latitude = latitueEndSum/updatedRide.numPeople;
        donerides.insert(updatedRide);
        if(debugmode) console.log("Finished searching a ride.");
        if(debugmode) console.log(JSON.stringify(updatedRide, null, 4));
    }else{
        if(debugmode) console.log("Updated a ride");
        if(debugmode) console.log(JSON.stringify(updatedRide, null, 4));

        rides.insert(updatedRide);
    }


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
