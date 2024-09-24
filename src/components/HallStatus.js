<<<<<<< HEAD
import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, runTransaction } from "firebase/firestore";
import { signOut } from "firebase/auth";
import "../styles/Auth.css";
=======
import React, { useEffect, useState } from "react";
import { db } from "../firebase.js"; // Assumed Firebase is initialized in this file
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
>>>>>>> cfb4f498972e867945918905de532b106db5dbe8

const HallStatus = ({ department, user }) => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [staffName, setStaffName] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [existingBookings, setExistingBookings] = useState([]);

  useEffect(() => {
<<<<<<< HEAD
    const fetchBookings = async () => {
      const q = query(collection(db, "bookings"), where("department", "==", department));
      const querySnapshot = await getDocs(q);
      const currentTime = new Date();
  
      const validBookings = [];
      const expiredBookings = [];
  
      querySnapshot.forEach((doc) => {
        const bookingData = { id: doc.id, ...doc.data() };
        const bookingEndTime = new Date(bookingData.endTime);
  
        // If the end time is before the current time, mark as expired
        if (bookingEndTime < currentTime) {
          expiredBookings.push(doc.id); // Add to expired list
        } else {
          validBookings.push(bookingData); // Add to valid bookings list
        }
      });
  
      // Delete expired bookings
      for (const bookingId of expiredBookings) {
        await deleteDoc(doc(db, "bookings", bookingId));
      }
  
      // Sort valid bookings by start time
      validBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
      // Update state with only valid bookings
      setExistingBookings(validBookings);
    };
  
    fetchBookings();
  
    // Set interval to automatically check every 5 minutes
    const interval = setInterval(fetchBookings, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval); // Cleanup on component unmount
  }, [department]);
  
  const handleBooking = async () => {
    if (isBooking) return; // Prevent further clicks while booking
    setIsBooking(true); // Disable the button
  
    if (!startTime || !endTime || !purpose || !staffName || !password) { // Check for password as well
      alert("Please fill in all fields, including password.");
=======
    fetchExistingBookings();
  }, [department]);

  const fetchExistingBookings = async () => {
    try {
      const q = query(collection(db, "bookings"), where("department", "==", department));
      const querySnapshot = await getDocs(q);
      const bookings = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExistingBookings(bookings);
    } catch (error) {
      console.error("Error fetching bookings: ", error);
    }
  };

  const handleBooking = async () => {
    if (isBooking) return; // Prevent multiple clicks
    setIsBooking(true);

    if (!startTime || !endTime || !purpose || !staffName || !sessionPassword) {
      alert("Please fill in all fields, including session password.");
>>>>>>> cfb4f498972e867945918905de532b106db5dbe8
      setIsBooking(false);
      return;
    }
  
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
  
    if (startDateTime < new Date()) {
      alert("Start time cannot be in the past.");
      setIsBooking(false);
      return;
    }
  
    if (endDateTime <= startDateTime) {
      alert("End time must be after start time.");
      setIsBooking(false);
      return;
    }
<<<<<<< HEAD
  
    try {
      // Run a transaction to ensure booking happens atomically
      await runTransaction(db, async (transaction) => {
        const q = query(collection(db, "bookings"), where("department", "==", department));
        const querySnapshot = await getDocs(q);
  
        let hasConflict = false;
  
        querySnapshot.forEach((doc) => {
          const bookingData = doc.data();
          const existingStart = new Date(bookingData.startTime);
          const existingEnd = new Date(bookingData.endTime);
  
          // Check for exact overlap or overlap within the same second
          if (
            (startDateTime <= existingEnd && endDateTime >= existingStart) || // Overlapping time ranges
            (startDateTime.getTime() === existingStart.getTime() && endDateTime.getTime() === existingEnd.getTime()) // Exact second match
          ) {
            hasConflict = true; // Conflict found
          }
        });
  
        if (hasConflict) {
          throw new Error("The seminar hall is already booked during this time.");
        }
  
        // If no conflict, proceed with booking
        await transaction.set(doc(collection(db, "bookings")), {
          department,
          startTime,
          endTime,
          purpose,
          staffName,
          bookedBy: user.email,
          password, // Store password in Firestore
        });
      });
  
      alert("Booking successful!");
  
      // Update the state with the new booking
      setExistingBookings((prev) => [
        ...prev,
        { startTime, endTime, purpose, staffName, department, bookedBy: user.email, password },
=======

    try {
      // Step 1: Create a temporary lock
      const lockRef = await addDoc(collection(db, "booking_locks"), {
        department,
        startTime,
        endTime,
        staffName,
        createdAt: new Date(),
      });

      // Step 2: Fetch existing bookings and check for conflicts
      const q = query(collection(db, "bookings"), where("department", "==", department));
      const querySnapshot = await getDocs(q);

      const hasConflict = querySnapshot.docs.some((doc) => {
        const booking = doc.data();
        const existingStart = new Date(booking.startTime);
        const existingEnd = new Date(booking.endTime);

        return (startDateTime < existingEnd && endDateTime > existingStart);
      });

      if (hasConflict) {
        await deleteDoc(doc(db, "booking_locks", lockRef.id));
        alert("The seminar hall is already booked during this time.");
        setIsBooking(false);
        return;
      }

      // Step 4: If no conflict, proceed with booking
      const docRef = await addDoc(collection(db, "bookings"), {
        department,
        startTime,
        endTime,
        purpose,
        staffName,
        bookedBy: user.email,
        sessionPassword,
      });

      // Step 5: Remove the lock after successful booking
      await deleteDoc(doc(db, "booking_locks", lockRef.id));

      // Update existing bookings
      setExistingBookings((prev) => [
        ...prev,
        { id: docRef.id, startTime, endTime, purpose, staffName, department, bookedBy: user.email, sessionPassword },
>>>>>>> cfb4f498972e867945918905de532b106db5dbe8
      ]);
  
      // Clear input fields
      setStartTime("");
      setEndTime("");
      setPurpose("");
      setStaffName("");
<<<<<<< HEAD
      setPassword(""); // Clear password field
  
    } catch (error) {
      alert(error.message || "Error booking the seminar hall.");
      console.error("Error adding booking: ", error);
=======
      setSessionPassword("");

    } catch (error) {
      alert("Error processing booking: " + error.message);
>>>>>>> cfb4f498972e867945918905de532b106db5dbe8
    } finally {
      setIsBooking(false); // Re-enable the button after the process
    }
  };
  

  const handleCancelBooking = async (id, sessionPasswordInput) => {
    const booking = existingBookings.find((b) => b.id === id);
    if (booking.sessionPassword !== sessionPasswordInput) {
      alert("Incorrect session password.");
      return;
    }

<<<<<<< HEAD
    if (enteredPassword === bookingPassword) { // Match the entered password with the booking's password
      try {
        await deleteDoc(doc(db, "bookings", bookingId));
        setExistingBookings((prev) => prev.filter((booking) => booking.id !== bookingId));
        alert("Booking cancelled");
      } catch (error) {
        console.error("Error cancelling booking: ", error);
      }
    } else {
      alert("Incorrect password. Unable to cancel the booking.");
=======
    try {
      await deleteDoc(doc(db, "bookings", id));
      setExistingBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      alert("Error cancelling booking: " + error.message);
>>>>>>> cfb4f498972e867945918905de532b106db5dbe8
    }
  };

  return (
    <div className="hall-status">
      <h2>Seminar Hall Booking for {department}</h2>

      <div className="booking-form">
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          placeholder="Start Time"
        />
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          placeholder="End Time"
        />
        <input
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Purpose"
        />
        <input
          type="text"
          value={staffName}
          onChange={(e) => setStaffName(e.target.value)}
          placeholder="Staff Name"
        />
        <input
          type="password"
          value={sessionPassword}
          onChange={(e) => setSessionPassword(e.target.value)}
          placeholder="Session Password"
        />
        <button onClick={handleBooking} disabled={isBooking}>
          {isBooking ? "Booking..." : "Book Seminar Hall"}
        </button>
      </div>

<<<<<<< HEAD
      {existingBookings.length > 0 && (
  <div className="bookings-container">
    <h3>Existing Bookings</h3>
    <div style={{ overflow: "auto", maxHeight: "300px" }}>
      <table className="bookings-table">
        <thead>
          <tr>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Purpose</th>
            <th>Staff Name</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {existingBookings.map((booking) => (
            <tr key={booking.id}>
              <td>{convertToIST(booking.startTime)}</td>
              <td>{convertToIST(booking.endTime)}</td>
              <td>{booking.purpose}</td>
              <td>{booking.staffName}</td>
              <td>
                <button onClick={() => handleCancelBooking(booking.id, booking.password)}>Cancel</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

      <button onClick={handleLogout}>Logout</button>
=======
      <div className="existing-bookings">
        <h3>Existing Bookings</h3>
        {existingBookings.length === 0 ? (
          <p>No bookings available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Purpose</th>
                <th>Staff Name</th>
                <th>Booked By</th>
                <th>Cancel</th>
              </tr>
            </thead>
            <tbody>
              {existingBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{new Date(booking.startTime).toLocaleString()}</td>
                  <td>{new Date(booking.endTime).toLocaleString()}</td>
                  <td>{booking.purpose}</td>
                  <td>{booking.staffName}</td>
                  <td>{booking.bookedBy}</td>
                  <td>
                    {booking.bookedBy === user.email ? (
                      <button
                        onClick={() => {
                          const sessionPasswordInput = prompt(
                            "Enter session password to cancel booking:"
                          );
                          handleCancelBooking(booking.id, sessionPasswordInput);
                        }}
                      >
                        Cancel
                      </button>
                    ) : (
                      "Not allowed"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
>>>>>>> cfb4f498972e867945918905de532b106db5dbe8
    </div>
  );
};

export default HallStatus;
