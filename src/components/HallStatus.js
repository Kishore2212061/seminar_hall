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
  const [existingBookings, setExistingBookings] = useState([]);
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
      const bookings = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExistingBookings(bookings);
    };

    fetchBookings();
  }, [department]);

  const handleBooking = async () => {
    if (!startTime || !endTime || !purpose || !staffName) {
      alert("Please fill in all fields.");
      return;
    }

    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);

    if (startDateTime < new Date()) {
      alert("Start time cannot be in the past.");
      return;
    }

    if (endDateTime <= startDateTime) {
      alert("End time must be after start time.");
      return;
    }

    const hasConflict = existingBookings.some((booking) => {
      const existingStart = new Date(booking.startTime);
      const existingEnd = new Date(booking.endTime);
      return (startDateTime < existingEnd && endDateTime > existingStart);
    });

    if (hasConflict) {
      alert("The seminar hall is already booked during this time.");
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
      });

      console.log("Booking added with ID: ", docRef.id);

      setExistingBookings((prev) => [
        ...prev,
        { id: docRef.id, startTime, endTime, purpose, staffName, department, bookedBy: user.email },
      ]);

      // Clear input fields
      setStartTime("");
      setEndTime("");
      setPurpose("");
      setStaffName("");

    } catch (error) {
      console.error("Error adding booking: ", error);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
      setExistingBookings((prev) => prev.filter((booking) => booking.id !== bookingId));
      console.log("Booking cancelled");
    } catch (error) {
      console.error("Error cancelling booking: ", error);
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
    
        padding: "15px",
        margin: "10px 0",
        fontSize: "10px",
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
       
        padding: "15px",
        margin: "10px 0",
        fontSize: "10px",
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
      
        padding: "10px",
        margin: "10px 0",
        fontSize: "10px",
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
      
        padding: "10px",
        margin: "10px 0",
        fontSize: "10px",
        border: "1px solid #ccc",
        borderRadius: "5px",
      }}
    />
  </label>
  <button onClick={handleBooking}>
    Book Hall
  </button>
</div>


{existingBookings.length > 0 && (
  <div className="bookings-container">
    <h3>Existing Bookings</h3>
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
              <button onClick={() => handleCancelBooking(booking.id)}>Cancel</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}


      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default HallStatus;
