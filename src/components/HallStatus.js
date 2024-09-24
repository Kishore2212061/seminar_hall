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

const HallStatus = ({ department, user }) => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [staffName, setStaffName] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [existingBookings, setExistingBookings] = useState([]);

  useEffect(() => {
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
      ]);

      // Clear input fields
      setStartTime("");
      setEndTime("");
      setPurpose("");
      setStaffName("");
      setSessionPassword("");

    } catch (error) {
      alert("Error processing booking: " + error.message);
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

    try {
      await deleteDoc(doc(db, "bookings", id));
      setExistingBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      alert("Error cancelling booking: " + error.message);
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
    </div>
  );
};

export default HallStatus;
