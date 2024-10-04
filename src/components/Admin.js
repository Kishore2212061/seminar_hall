import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import '../styles/Admin.css';
import { getAuth } from "firebase/auth";
import { signOut } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const seminarHalls = [
  { id: 1, name: 'CSE' },
  { id: 2, name: 'MECH' },
  { id: 3, name: 'IT' },
  { id: 4, name: 'AIDS' },
  { id: 5, name: 'ECE' },
  { id: 6, name: 'EEE' },
  { id: 7, name: 'CIVIL' },
];

const timeSlots = [
  { id: 1, time: '9:15 AM - 10:05 AM', start: '09:15', end: '10:05' },
  { id: 2, time: '10:05 AM - 10:55 AM', start: '10:05', end: '10:55' },
  { id: 3, time: '11:10 AM - 12:00 PM', start: '11:10', end: '12:00' },
  { id: 4, time: '12:00 PM - 12:50 PM', start: '12:00', end: '12:50' },
  { id: 5, time: 'Lunch Break (12:50 PM - 1:50 PM)', isBreak: true },
  { id: 6, time: '1:50 PM - 2:40 PM', start: '13:50', end: '14:40' },
  { id: 7, time: '2:40 PM - 3:30 PM', start: '14:40', end: '15:30' },
  { id: 8, time: '3:30 PM - 4:30 PM', start: '15:30', end: '16:30' },
  { id: 9, time: '4:30 PM - 5:15 PM', start: '16:30', end: '17:15' },
];

const Admin = () => {
  const [bookings, setBookings] = useState({});
  const [weekDates, setWeekDates] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const auth = getAuth();
  const user = auth.currentUser;
  const loggedInDepartment = user
    ? user.email.match(/^hod(\w+)/)[1].toUpperCase()
    : 'CSE';

  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = () => {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef);

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const newBookings = {};

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const departmentName = data.department;
          const bookingDate = new Date(data.startTime).toISOString().split('T')[0];

          if (!newBookings[departmentName]) {
            newBookings[departmentName] = {};
          }

          if (!newBookings[departmentName][bookingDate]) {
            newBookings[departmentName][bookingDate] = [];
          }

          newBookings[departmentName][bookingDate].push(data);
        });

        setBookings(newBookings);
      });

      return () => unsubscribe();
    };

    fetchBookings();

    const startOfWeek = new Date();
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date.toISOString().split('T')[0];
    });
    setWeekDates(dates);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  const generateReport = () => {
    const doc = new jsPDF();
    const title = `Booking Report for ${loggedInDepartment} Department`;
    doc.text(title, 10, 10);

    const tableColumn = ['Date', 'Time Slot', 'Staff Name', 'Status'];
    const tableRows = [];

    const filteredDates = weekDates.filter(date => {
      return date >= startDate && date <= endDate;
    });

    filteredDates.forEach((date) => {
      timeSlots.forEach((slot) => {
        const isBooked = bookings[loggedInDepartment]?.[date]?.some(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          const slotStart = new Date(`${date}T${slot.start}:00`);
          const slotEnd = new Date(`${date}T${slot.end}:00`);
          return (bookingStart < slotEnd && bookingEnd > slotStart) && !slot.isBreak;
        });

        const bookedStaffNames = bookings[loggedInDepartment]?.[date]?.filter(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          const slotStart = new Date(`${date}T${slot.start}:00`);
          const slotEnd = new Date(`${date}T${slot.end}:00`);
          return (bookingStart < slotEnd && bookingEnd > slotStart) && !slot.isBreak;
        }).map(booking => booking.staffName).join(', ');

        tableRows.push([
          new Date(date).toLocaleDateString(),
          slot.time,
          bookedStaffNames || (slot.isBreak ? 'Break' : 'Not Booked'),
          isBooked ? 'Booked' : slot.isBreak ? 'Break' : 'Available'
        ]);
      });
    });

    doc.autoTable(tableColumn, tableRows, { startY: 20 });
    doc.save(`seminar_hall_bookings_${loggedInDepartment}.pdf`);
  };

  return (
    <div className="admin-container">
      <h1>Seminar Hall Booking - Admin View</h1>
      <h2>{loggedInDepartment} Department - This Week's Bookings</h2>

      <table className="booking-table">
        <thead>
          <tr>
            <th>Time Slot</th>
            {weekDates.map((date) => (
              <th key={date}>{new Date(date).toLocaleDateString()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot) => (
            <tr key={slot.id}>
              <td>{slot.time}</td>
              {weekDates.map((date) => {
                const currentTime = new Date();
                const isBooked = bookings[loggedInDepartment]?.[date]?.some(booking => {
                  const bookingStart = new Date(booking.startTime);
                  const bookingEnd = new Date(booking.endTime);
                  const slotStart = new Date(`${date}T${slot.start}:00`);
                  const slotEnd = new Date(`${date}T${slot.end}:00`);
                  return (bookingStart < slotEnd && bookingEnd > slotStart) && !slot.isBreak;
                });

                const hasFinished = bookings[loggedInDepartment]?.[date]?.some(booking => {
                  const bookingEnd = new Date(booking.endTime);
                  return bookingEnd < currentTime;
                });

                const bookedStaffNames = bookings[loggedInDepartment]?.[date]?.filter(booking => {
                  const bookingStart = new Date(booking.startTime);
                  const bookingEnd = new Date(booking.endTime);
                  const slotStart = new Date(`${date}T${slot.start}:00`);
                  const slotEnd = new Date(`${date}T${slot.end}:00`);
                  return (bookingStart < slotEnd && bookingEnd > slotStart) && !slot.isBreak;
                }).map(booking => booking.staffName).join(', ');

                let cellClass = '';
                let cellContent = '';

                if (slot.isBreak) {
                  cellClass = 'break';
                  cellContent = 'Break';
                } else if (hasFinished && isBooked) {
                  cellClass = 'finished';
                  cellContent = 'Finished';
                } else if (!isBooked && currentTime > new Date(`${date}T${slot.end}:00`)) {
                  cellClass = 'not-booked';
                  cellContent = 'Not Booked';
                } else if (isBooked) {
                  cellClass = 'booked';
                  cellContent = bookedStaffNames || 'Booked';
                } else {
                  cellClass = 'available';
                  cellContent = 'Available';
                }

                return (
                  <td key={date} className={cellClass}>{cellContent}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>


      <div className="date-range-selector">
        <label htmlFor="startDate">Start Date: </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <label htmlFor="endDate">End Date: </label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <button className="generate-report-btn" onClick={generateReport}>Generate Report</button>
      <button className="logout-btn" onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Admin;
