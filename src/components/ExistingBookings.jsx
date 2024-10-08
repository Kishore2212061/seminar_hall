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

const ExistingBookings = ({ selectedStartTime, selectedEndTime }) => {
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
  </div>
  );
};

export default ExistingBookings;
