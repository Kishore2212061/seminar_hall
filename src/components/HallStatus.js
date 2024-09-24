import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, runTransaction } from "firebase/firestore";
import { signOut } from "firebase/auth";
import "../styles/Auth.css";

const HallStatus = () => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [staffName, setStaffName] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [existingBookings, setExistingBookings] = useState([]);
  const [isBooking, setIsBooking] = useState(false);
  const user = auth.currentUser;
  const department = user.email.slice(0, 3).toUpperCase();

  // Convert time to Indian Standard Time (IST)
  const convertToIST = (date) => {
    return new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  };

  // Fetch existing bookings and delete expired ones
  useEffect(() => {
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

      // Update state with only valid bookings
      setExistingBookings(validBookings);
    };

    fetchBookings();

    // Set interval to automatically check every 5 minutes
    const interval = setInterval(fetchBookings, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval); // Cleanup on component unmount
  }, [department]);

  // Handle seminar hall booking
  const handleBooking = async () => {
    if (isBooking) return; // Prevent further clicks while booking
    setIsBooking(true); // Disable the button

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
      // Use Firestore transaction to ensure atomicity and avoid double booking
      await runTransaction(db, async (transaction) => {
        const q = query(collection(db, "bookings"), where("department", "==", department));
        const querySnapshot = await getDocs(q);

        const hasConflict = querySnapshot.docs.some((doc) => {
          const booking = doc.data();
          const existingStart = new Date(booking.startTime);
          const existingEnd = new Date(booking.endTime);
          return (startDateTime < existingEnd && endDateTime > existingStart);
        });

        if (hasConflict) {
          throw new Error("The seminar hall is already booked during this time.");
        }

        // If no conflict, add the booking
        await addDoc(collection(db, "bookings"), {
          department,
          startTime,
          endTime,
          purpose,
          staffName,
          bookedBy: user.email,
          sessionPassword,
        });
      });

      alert("Booking successful!");

      setExistingBookings((prev) => [
        ...prev,
        { startTime, endTime, purpose, staffName, department, bookedBy: user.email, sessionPassword },
      ]);

      // Clear input fields
      setStartTime("");
      setEndTime("");
      setPurpose("");
      setStaffName("");
      setSessionPassword("");

    } catch (error) {
      alert(error.message || "Error booking seminar hall.");
    } finally {
      setIsBooking(false); // Re-enable the button after the process
    }
  };

  // Handle seminar hall booking cancellation
  const handleCancelBooking = async (bookingId, password) => {
    const bookingToCancel = existingBookings.find((booking) => booking.id === bookingId);

    if (bookingToCancel.sessionPassword !== password) {
      alert("Incorrect session password. You cannot cancel this booking.");
      return;
    }

    try {
      await deleteDoc(doc(db, "bookings", bookingId));
      alert("Booking cancelled successfully.");

      setExistingBookings((prev) => prev.filter((booking) => booking.id !== bookingId));
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Error cancelling booking.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="hall-status-container">
      <h2>Seminar Hall Status for {department}</h2>

      <div>
        <h3>Book the Seminar Hall</h3>
        <label>
          Start Time:
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={{
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />
        </label>
        <label>
          End Time:
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            style={{
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />
        </label>
        <label>
          Purpose:
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            style={{
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />
        </label>
        <label>
          Staff Name:
          <input
            type="text"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            style={{
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />
        </label>
        <label>
          Session Password:
          <input
            type="password"
            value={sessionPassword}
            onChange={(e) => setSessionPassword(e.target.value)}
            style={{
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />
        </label>
        <button onClick={handleBooking} disabled={isBooking}>
          {isBooking ? "Booking..." : "Book Hall"}
        </button>
      </div>

      <div>
        <h3>Existing Bookings</h3>
        {existingBookings.length > 0 ? (
          <ul>
            {existingBookings.map((booking) => (
              <li key={booking.id}>
                <strong>Purpose:</strong> {booking.purpose} <br />
                <strong>Staff:</strong> {booking.staffName} <br />
                <strong>Start:</strong> {convertToIST(booking.startTime)} <br />
                <strong>End:</strong> {convertToIST(booking.endTime)} <br />
                <label>
                  Session Password to Cancel:
                  <input type="password" onChange={(e) => setSessionPassword(e.target.value)} />
                </label>
                <button onClick={() => handleCancelBooking(booking.id, sessionPassword)}>Cancel Booking</button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No bookings available.</p>
        )}
      </div>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default HallStatus;
