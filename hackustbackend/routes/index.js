var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send("hello david")
});

router.post('/search', function(req, res, next) {
    var startSearchingAnswer = {
        "userID":req.body.userID,
        "queryID":req.body.userID + "1",
        "numPeopleFound":"0",
        "status":"searching",
        "meetingLocation":{
            "longitude": req.body.route.startLongitude,
            "latitude": req.body.route.startLatitude,
            "radius": req.body.preferences.maxDistance
        }
    };
    res.send(startSearchingAnswer)
});

router.post('/check', function(req, res, next) {
    var checkAnswer = {
        "userID":req.body.userID,
        "queryID": req.body.queryID,
        "numPeopleFound":"0",
        "status":"found",
        "numFound": "2",
        "meetingLocation":{
            "longitude": req.body.route.startLongitude,
            "latitude": req.body.route.startLatitude,
            "radius": req.body.route.maxDistance
        },
        "foundPeople":[
            {
                "longitude":"1111",
                "latitude": "1111"
            },{
                "longitude":"2222",
                "latitude": "2222"
            }
        ]

    }
    res.send(startSearchingAnswer)
});

router.post('/metPeople', function(req, res, next) {
    res.send()
});

module.exports = router;
