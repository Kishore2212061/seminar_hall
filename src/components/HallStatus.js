import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {onSnapshot, collection, addDoc, query, where, getDocs, deleteDoc, doc, runTransaction } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import "jspdf-autotable"; // Ensure to install this package
import "../styles/Auth.css";
import { storage } from '../firebase.js';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './Login.js';

const HallStatus = ({ selectedStartTime, selectedEndTime }) => {
  let [startTime, setStartTime] = useState("");
  let [endTime, setEndTime] = useState("");
  let strt;
  let en;
  const [purpose, setPurpose] = useState("");
  const [staffName, setStaffName] = useState("");
  const [password, setPassword] = useState(""); 
  const [existingBookings, setExistingBookings] = useState([]);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [staffNames, setStaffNames] = useState([]); // Array to hold staff names
  const [filteredStaffNames, setFilteredStaffNames] = useState([]); // Array for filtered suggestions
  const navigate = useNavigate();
  const auth = getAuth();
  const [focused, setFocused] = useState(false); 
  const staffNamesList = ['mr.Alice Johnson', 'Bob Smith', 'Charlie Brown', 'David Wilson', 'Eva Adams'];

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };
  
  const user = auth.currentUser;
  const department = user.email.split('@')[0].toUpperCase();

  // Convert time to Indian Standard Time (IST)
  const convertToIST = (date) => {
    return new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  };
  useEffect(() => {
    if (selectedStartTime) {
      setStartTime(selectedStartTime);
      document.getElementById("startt").value=selectedStartTime;
    
    }
    if (selectedEndTime) {
      setEndTime(selectedEndTime);
      document.getElementById("endd").value=selectedEndTime;

    }
  }, [selectedStartTime, selectedEndTime]);

  
  useEffect(() => {
    const fetchBookings = async () => {
      const bookingsRef = collection(db, "bookings");
      const q = query(bookingsRef, where("department", "==", department));

      const currentTime = new Date();
      const validBookings = [];

      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const newValidBookings = [];

        // Process each document in the querySnapshot
        querySnapshot.forEach(async (docSnapshot) => {
          const bookingData = { id: docSnapshot.id, ...docSnapshot.data() };
          const bookingEndTime = new Date(bookingData.endTime);

          // If the booking has finished and is still marked as active, update status
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

          // Only add bookings that are ongoing or upcoming
          if (bookingEndTime >= currentTime || bookingData.status === "active") {
            newValidBookings.push(bookingData);
          }
        });

        // Sort the valid bookings by start time
        newValidBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

        // Update the state with valid bookings
        setExistingBookings(newValidBookings);
      });

      // Cleanup the subscription when the component unmounts
      return () => unsubscribe();
    };

    fetchBookings();

  }, [department]);

 

  onAuthStateChanged(auth, (user) => {
    if (user) {
  
      // Handle the mobile back button (or browser back navigation)
      window.onpopstate = function () {
        // This event is triggered when the back button is pressed
        signOut(auth)
          .then(() => {
          })
          .catch((error) => {
          });
      };
  
      // Also handle when the user closes the browser window or tab
      window.onbeforeunload = function () {
        signOut(auth)
          .then(() => {
          })
          .catch((error) => {
          });
      };
    } else {
    }
  });

  const handleBooking = async () => {
    if (isBooking) return; // Prevent further clicks while booking
    setIsBooking(true); // Disable the button
    strt=document.getElementById("startt").value;
    en=document.getElementById("endd").value;

    if (!strt || !en || !purpose || !staffName || !password) {
      alert("Please fill in all fields, including password.");
      setIsBooking(false);
      return;
    }
  
    const startDate = new Date(strt).toISOString().split("T")[0];
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
  
    const startDateTime = new Date(strt);
    const endDateTime = new Date(en);
    if (startDateTime < new Date()) {
      alert("Bookings cannot be in the past.");
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
            (startDateTime < existingEnd && endDateTime > existingStart) || // Overlapping time ranges
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
          startTime:strt,
          endTime:en,
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
  const handleStaffNameChange = (e) => {
    const input = e.target.value;
    setStaffName(input);
  
    if (input) {
      // Filter staff names based on the input and limit the results to 2
      const filtered = staffNamesList
        .filter(name => name.toLowerCase().includes(input.toLowerCase()))
        .slice(0, 2); // Limit the results to 2 suggestions
      setFilteredStaffNames(filtered);
    } else {
      setFilteredStaffNames([]); // Clear the suggestions if input is empty
    }
  };
  

  const handleSuggestionClick = (name) => {
    setStaffName(name);
    setFilteredStaffNames([]); // Hide the suggestions after clicking
  };

  // Handle focus and blur events
  const handleFocus = () => {
    setFocused(true);
  };
  const handleBlur = () => {
    setTimeout(() => setFocused(false), 10); // Delay hiding suggestions slightly to allow click
  };

const handleCancelBooking = async (bookingId, bookingPassword) => {
  const enteredPassword = prompt("Enter the Session Id to cancel this booking:");

  if (enteredPassword === bookingPassword) {
    try {
      // Delete booking from Firestore
      const bookingDocRef = doc(db, "bookings", bookingId);
      await deleteDoc(bookingDocRef);

      // No need to update local state manually since Firestore's onSnapshot will handle it
      alert("Booking cancelled successfully");

    } catch (error) {
      console.error("Error cancelling booking: ", error);
    }
  } else {
    alert("Incorrect Session Id. Unable to cancel the booking.");
  }
};

  
const generateReport = async () => {
  if (!selectedDate && !staffName) {
      alert("Please select a date or provide a staff name");
      return;
  }

  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch all bookings for the selected department
  const q = query(
      collection(db, "bookings"),
      where("department", "==", department)
  );

  const querySnapshot = await getDocs(q);

  // Map all bookings into an array
  const allBookings = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
  }));

  // Filter bookings based on selected cases
  const filteredBookings = allBookings.filter(booking => {
      const bookingStart = new Date(booking.startTime);
      
      // Case 1: Filter by date only
      const isDateMatched = selectedDate ? (bookingStart >= startOfDay && bookingStart <= endOfDay) : true;
      
      // Case 2: Filter by staff name
      const isStaffMatched = staffName ? booking.staffName === staffName : true;

      // Return true if either case is satisfied
      return isDateMatched && isStaffMatched;
  });

  // Sort bookings by start time
  filteredBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  // Generate the PDF report using jsPDF
  const doc = new jsPDF();

  // Title
  const title = `Report for Seminar Hall Bookings${selectedDate ? ` on ${selectedDate}` : ''}${staffName ? ` by ${staffName}` : ''} (${department})`;
  doc.text(title, 10, 10);

  // Add the table headers
  const tableColumn = ['Start Time', 'End Time', 'Staff Name', 'Purpose', 'Status'];
  const tableRows = [];

  // Add data to the rows
  filteredBookings.forEach(booking => {
      const bookingData = [
          convertToIST(booking.startTime),
          convertToIST(booking.endTime),
          booking.staffName,
          booking.purpose,
          booking.status,
      ];
      tableRows.push(bookingData);
  });

  // Add the table to the PDF
  doc.autoTable(tableColumn, tableRows, { startY: 20 });

  // Save the PDF
  doc.save(`seminar_hall_bookings_${selectedDate || 'all'}_${staffName || 'all'}.pdf`);
};

  

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Redirect to login page after logout
      navigate("/login");
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  }
const today = new Date().toISOString().slice(0, 16); // Current date and time in YYYY-MM-DDTHH:MM format
const oneWeekFromToday = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16); // 7 days from now


  return (
    <div className="hall-status-container">
      <h2>Seminar Hall Status for {department}</h2>
      <form autoComplete="off">
      <div>
        <h3>Book the Seminar Hall</h3>
        <label>
        Start Time:
        <input
          // disabled="TRUE"
          type="datetime-local"
          onChange={(e) => setStartTime(e.target.value)}
          min={today} // Set minimum date and time to current time
          max={oneWeekFromToday} // Set maximum date and time to 7 days from now
          style={{
            border: "1px solid #ccc",
            borderRadius: "5px",
            color: "hsl(0,100%, 10%)",/* Increase the lightness percentage for brighter color */
            background: "linear-gradient(145deg, #235CFA, #82aaff)", /* Gradient on button */

          }}
          
        id="startt" />
      </label>
      <label>
        End Time:
        <input
          // disabled="TRUE"
          type="datetime-local"
          onChange={(e) => setEndTime(e.target.value)}
          min={today} // Set minimum date and time to current time
          max={oneWeekFromToday} // Set maximum date and time to 7 days from now
          style={{
            border: "1px solid #ccc",
            borderRadius: "5px",
            color: "hsl(0,100%, 10%)",/* Increase the lightness percentage for brighter color */
            background: "linear-gradient(145deg, #235CFA, #82aaff)", /* Gradient on button */

          }}
       id="endd" />
      </label>
      <div className="form-group">
        <label htmlFor="staffName">Staff Name:</label>
        <input
          type="text"
          id="staffName"
          value={staffName}

          onChange={handleStaffNameChange} // Updated handler for input change
          onFocus={handleFocus} // Trigger on focus
          onBlur={handleBlur}   // Trigger on blur
          required
        />
        {focused&&filteredStaffNames.length > 0  &&(
          <ul className="suggestions-list">
            {filteredStaffNames.map((name, index) => (
              <li key={index} onClick={() => handleSuggestionClick(name)}>
                {name}
              </li>
              
            ))}
            
          </ul>
        )}
      </div>
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
          Session Id (for cancellation):
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
            name={`staffName-${Math.random()}`} // Use a dynamic or randomized name
            autoComplete="off"
          />
        </label>
        <button onClick={handleBooking} disabled={isBooking}>
          {isBooking ? "Booking..." : "Book Hall"}
        </button>
      </div>
      </form>

{existingBookings.length > 0 ? (
  <div>
    <h3>Existing Bookings</h3>
    <div className="bookings-table">
    <table className="bookings-container" style={{ borderCollapse: "collapse", width: "100%",tableLayout:"auto"}}>
      <thead>
        <tr>
          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Start Time</th>
          <th style={{ border: "1px solid #ddd", padding: "8px" }}>End Time</th>
          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Staff Name</th>
          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Purpose</th>
          <th style={{ border: "1px solid #ddd", padding: "8px" }}>Action</th>
        </tr>
      </thead>
      <tbody>
        {existingBookings.map((booking) => (
          <tr key={booking.id}>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{convertToIST(booking.startTime)}</td>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{convertToIST(booking.endTime)}</td>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{booking.staffName}</td>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{booking.purpose}</td>
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
  <br />
  <div className="form-group">
        <label htmlFor="staffName">Staff Name:</label>
        <input
          type="text"
          id="staffName"
          value={staffName}

          onChange={handleStaffNameChange} // Updated handler for input change
          onFocus={handleFocus} // Trigger on focus
          onBlur={handleBlur}   // Trigger on blur
          required
        />
        {focused&&filteredStaffNames.length > 0  &&(
          <ul className="suggestions-list">
            {filteredStaffNames.map((name, index) => (
              <li key={index} onClick={() => handleSuggestionClick(name)}>
                {name}
              </li>
              
            ))}
            
          </ul>
        )}
      </div>
  <br />
  <button onClick={generateReport}>Generate Report</button>
  <button class="logout-btn" onClick={handleLogout}>Logout</button>
</div>

  </div>
  );
};

export default HallStatus;