import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, runTransaction } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import "jspdf-autotable"; // Ensure to install this package
import "../styles/Auth.css";
import { storage } from '../firebase.js';
const HallStatus = () => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [staffName, setStaffName] = useState("");
  const [password, setPassword] = useState(""); 
  const [existingBookings, setExistingBookings] = useState([]);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };
  
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
    
      // Process each document in the querySnapshot
      querySnapshot.forEach(async (docSnapshot) => {
        const bookingData = { id: docSnapshot.id, ...docSnapshot.data() };
        const bookingEndTime = new Date(bookingData.endTime);
    
        // If booking has finished and is still marked as active, update status
        if (bookingEndTime < currentTime && bookingData.status === "active") {
          try {
            const bookingRef = doc(db, "bookings", docSnapshot.id);
            await runTransaction(db, async (transaction) => {
              transaction.update(bookingRef, { status: "finished" });
            });
            bookingData.status = "finished"; // Update the local booking data
          } catch (error) {
            console.error("Transaction failed: ", error);
          }
        }
    
        // Only add bookings that have not finished yet
        if (bookingEndTime >= currentTime || bookingData.status === "active") {
          validBookings.push(bookingData);
        }
      });
    
      // Sort valid bookings by start time
      validBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
      // Update state with valid bookings (ongoing or upcoming)
      setExistingBookings(validBookings);
    };
    
    // Call fetchBookings initially and then set interval to refresh every 5 minutes
    fetchBookings();
    
    const interval = setInterval(fetchBookings, 5 * 60 * 1000); // 5-minute interval
    
    // Cleanup the interval when component unmounts
    return () => clearInterval(interval);
  
  }, [department]);
  
  
  const handleBooking = async () => {
    if (isBooking) return; // Prevent further clicks while booking
    setIsBooking(true); // Disable the button
  
    if (!startTime || !endTime || !purpose || !staffName || !password) {
      alert("Please fill in all fields, including password.");
      setIsBooking(false);
      return;
    }
  
    const startDate = new Date(startTime).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    
    // Calculate max booking date (one week from today)
    const maxBookingDate = new Date();
    maxBookingDate.setDate(maxBookingDate.getDate() + 7); // One week from today
    const maxBookingDateString = maxBookingDate.toISOString().split("T")[0];
  
    if (startDate < today || startDate > maxBookingDateString) {
      alert("You can only book for today or within the next week.");
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
          status: "active" // Default status when booking is created
        });
      });
  
      alert("Booking successful!");
  
      // Update the state with the new booking
      setExistingBookings((prev) => [
        ...prev,
        { startTime, endTime, purpose, staffName, department, bookedBy: user.email, password, status: "active" },
      ]);
  
      // Clear input fields
      setStartTime("");
      setEndTime("");
      setPurpose("");
      setStaffName("");
      setPassword(""); // Clear password field
  
    } catch (error) {
      alert(error.message || "Error booking the seminar hall.");
      console.error("Error adding booking: ", error);
    } finally {
      setIsBooking(false); // Re-enable the button after the process
    }
  };
  
  const handleCancelBooking = async (bookingId, bookingPassword) => {
    const enteredPassword = prompt("Enter the Session Id to cancel this booking:");
  
    if (enteredPassword === bookingPassword) {
      try {
        // Delete booking from Firestore
        const bookingDocRef = doc(db, "bookings", bookingId);
        await deleteDoc(bookingDocRef);
  
        // Update local state to remove the booking from the list
        setExistingBookings((prevBookings) =>
          prevBookings.filter((booking) => booking.id !== bookingId)
        );
  
        alert("Booking cancelled successfully");
  
      } catch (error) {
        console.error("Error cancelling booking: ", error);
      }
    } else {
      alert("Incorrect Session Id. Unable to cancel the booking.");
    }
  };
  
  
  // Function to generate the PDF report
  const generateReport = async () => {
  
    if (!selectedDate) {
      alert("Please select a date");
      return;
    }
  
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
  
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
  
    // Fetch bookings for the selected date based on endTime only
    const q = query(
      collection(db, "bookings"),
      where("department", "==", department),
  
    );
  
    const querySnapshot = await getDocs(q);
  
    // Map all bookings into an array and filter by start time
    const allBookings = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  
    const filteredBookings = allBookings.filter(booking => {
      const bookingStart = new Date(booking.startTime);
      return bookingStart >= startOfDay && bookingStart <= endOfDay;
    });
  
    // Sort bookings by start time
    filteredBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
    // Generate the PDF report using jsPDF
    const doc = new jsPDF();
  
    // Title
    doc.text(`Report for Seminar Hall Bookings on ${selectedDate} (${department})`, 10, 10);
  
    // Add the table headers
    const tableColumn = ['Start Time', 'End Time', 'Purpose', 'Staff Name', 'Status'];
    const tableRows = [];
  
    // Populate the rows with booking data
    filteredBookings.forEach(booking => {
      const bookingRow = [
        convertToIST(booking.startTime),
        convertToIST(booking.endTime),
        booking.purpose,
        booking.staffName,
        booking.status
      ];
      tableRows.push(bookingRow);
    });
  
    // Generate the table in the PDF
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20, // Starting point for the table
    });
  
    // Save the PDF
    const pdfFileName = `Booking_Report_${department}_${selectedDate}.pdf`;
    doc.save(pdfFileName);
  
    // Upload the PDF to Firebase Storage
    const pdfBlob = doc.output('blob'); // Convert PDF to blob
    const pdfRef = ref(storage, `reports/${pdfFileName}`); // Reference to storage location
    
    await uploadBytes(pdfRef, pdfBlob).then((snapshot) => {
      console.log('Uploaded PDF to storage:', snapshot);
  
    });
    
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
          Session Id (for cancellation):
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

{existingBookings.length > 0 ? (
  <div>
    <h3>Existing Bookings</h3>
    <table className="bookings-table" style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Start Time</th>
          <th style={{ border: "1px solid #ddd", padding: "8px" }}>End Time</th>
          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Purpose</th>
          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Staff Name</th>
          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Action</th>
        </tr>
      </thead>
      <tbody>
        {existingBookings.map((booking) => (
          <tr key={booking.id}>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{convertToIST(booking.startTime)}</td>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{convertToIST(booking.endTime)}</td>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{booking.purpose}</td>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{booking.staffName}</td>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>
            {booking.status === "finished" ? (
  <span>Finished</span>  // Show "Finished" if the booking is finished
) : (
  <button onClick={() => handleCancelBooking(booking.id, booking.password)}>Cancel</button>  // Show "Cancel" button if the booking is not finished
)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
) : (
  <p>No existing bookings available.</p>
)}

<div>
        <h3>Generate Report</h3>
        <label>
          Select Date:
          <input type="date" value={selectedDate} onChange={handleDateChange} />
        </label>
        <button onClick={generateReport}>Generate Report
      </button>      </div>
    </div>
  );
};

export default HallStatus;
