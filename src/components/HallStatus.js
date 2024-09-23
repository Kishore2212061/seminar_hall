import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import "../styles/Auth.css";

const HallStatus = () => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [staffName, setStaffName] = useState("");
  const [password, setPassword] = useState(""); // Add password for booking
  const [existingBookings, setExistingBookings] = useState([]);
  const [isBooking, setIsBooking] = useState(false);
  const user = auth.currentUser;
  const department = user.email.slice(0, 3).toUpperCase();

  // Convert time to Indian Standard Time (IST)
  const convertToIST = (date) => {
    return new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  };

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

  const handleBooking = async () => {
    if (isBooking) return; // Prevent further clicks while booking
    setIsBooking(true); // Disable the button

    if (!startTime || !endTime || !purpose || !staffName || !password) { // Check for password as well
      alert("Please fill in all fields, including password.");
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

    const hasConflict = existingBookings.some((booking) => {
      const existingStart = new Date(booking.startTime);
      const existingEnd = new Date(booking.endTime);
      return (startDateTime < existingEnd && endDateTime > existingStart);
    });

    if (hasConflict) {
      alert("The seminar hall is already booked during this time.");
      setIsBooking(false);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "bookings"), {
        department,
        startTime,
        endTime,
        purpose,
        staffName,
        bookedBy: user.email,
        password, // Store password in Firestore
      });

      console.log("Booking added with ID: ", docRef.id);

      setExistingBookings((prev) => [
        ...prev,
        { id: docRef.id, startTime, endTime, purpose, staffName, department, bookedBy: user.email, password },
      ]);

      // Clear input fields
      setStartTime("");
      setEndTime("");
      setPurpose("");
      setStaffName("");
      setPassword(""); // Clear password field

    } catch (error) {
      console.error("Error adding booking: ", error);
    } finally {
      setIsBooking(false); // Re-enable the button after the process
    }
  };

  const handleCancelBooking = async (bookingId, bookingPassword) => {
    const enteredPassword = prompt("Enter the session key to cancel this booking:"); // Ask for password input

    if (enteredPassword === bookingPassword) { // Match the entered password with the booking's password
      try {
        await deleteDoc(doc(db, "bookings", bookingId));
        setExistingBookings((prev) => prev.filter((booking) => booking.id !== bookingId));
        console.log("Booking cancelled");
      } catch (error) {
        console.error("Error cancelling booking: ", error);
      }
    } else {
      alert("Incorrect session key. Unable to cancel the booking.");
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
          Session Key[Random]:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
    </div>
  );
};

export default HallStatus;
