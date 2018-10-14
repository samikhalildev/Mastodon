var express = require("express");
var router = express.Router();
var mongoose = require("mongoose");
var Availability = require("../models/availability");


router.get("/", ensureAuthenticated, function(req, res) {
    viewAllDoctors(res, req);

});

// ID Parameter URL
router.get("/:id", ensureAuthenticated, function(req, res) {
    var id = req.params.id;
    updateBooking(res, req.params.id, req);
    
});

// This function will find all the doctors in the DB.
function viewAllDoctors(res, req){
    
    Availability.find({}, function (error, availabilities) {
        console.log("My appoints are :" + availabilities);
        console.log("Error is " + error);
        
        res.render("bookAppointments", {avail: availabilities});
    });

    // User.find({userType: "doctor"}, function (err, docs) {
    //     res.render("bookAppointments", {doctors: docs});
    // });
}

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.flash("error_msg", "You are not logged in");
        res.redirect("/users/login");
    }
}
function updateBooking(res, id, req) {
    var user = req.user;
    query = { $set:
        {
             "appointment.student" : req.user.name, "appointment.booked" :true
        }
        };

    Availability.findById(id, function(err, availability) {
        //If the clicked availability is not already booked
        if (availability) {
            if (availability.appointment.booked == false) {
                console.log("Clicked appointment is not booked");
                //Update it
            Availability.updateOne({_id: id}, query, function(err, availability) {
                if (err) throw err;
                viewAllDoctors(res, req);
            });
             } else {
                Availability.find({}, function (error, availabilities) {
                    res.render("bookAppointments", {error: "This appointment is already booked", avail: availabilities});
                });
                return; 

             }
        } else {
            Availability.find({}, function (error, availabilities) {
                res.render("bookAppointments", {error: "No appointments found with this ID", avail: availabilities});
            });
            return;
        }
        
    });
    // Availability.updateAvailability(user.name, id, true, function(err, availability) {
    //     if (err) {
    //         console.log("Error updating availability: "+err);
    //         throw err;
    //     }
    //     viewAllDoctors(res)
    // });

    

}

module.exports = router;