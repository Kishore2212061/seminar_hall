import React, { useEffect, useState } from 'react';
import { db } from '../firebase'; // Import your Firebase configuration
import { collection, query, onSnapshot } from 'firebase/firestore';
import '../styles/HallBooking.css';
import HallStatus from './HallStatus';
import { getAuth } from "firebase/auth";

// List of seminar halls (departments)
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
  { id: 8, time: '3:30 PM - 4:30 PM', start: '16:15', end: '16:30' },
  { id: 9, time: '4:30 PM - 5:15 PM', start: '16:30', end: '17:15' },
];

const HallBooking = () => {
  const [bookings, setBookings] = useState({});
  const [selectedStartTime, setStartTime] = useState('');
  const [selectedEndTime, setEndTime] = useState('');
  const auth = getAuth();
  const user = auth.currentUser;

  // Check if user is authenticated before accessing email
  const loggedInDepartment = user ? user.email.split('@')[0].toUpperCase() : 'CSE'; // Use default if user is not defined

  useEffect(() => {
    const fetchBookings = () => {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef);

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const newBookings = {};

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const departmentName = data.department;
          const startTime = new Date(data.startTime).toISOString();
          const endTime = new Date(data.endTime).toISOString();

          const today = new Date().toISOString().split('T')[0];
          const fullStartTime = new Date(`${today}T${data.startTime.split('T')[1]}`);
          const fullEndTime = new Date(`${today}T${data.endTime.split('T')[1]}`);

          const bookedSlots = timeSlots.filter((slot) => {
            return (
              fullStartTime >= new Date(`${today}T${slot.start}:00`) &&
              fullEndTime <= new Date(`${today}T${slot.end}:00`) && 
              slot.isBreak !== true 
            );
          });

          if (bookedSlots.length > 0) {
            const hallId = seminarHalls.find(hall => hall.name === departmentName)?.id;
            if (hallId) {
              if (!newBookings[hallId]) {
                newBookings[hallId] = [];
              }
              bookedSlots.forEach(slot => newBookings[hallId].push(slot.id));
            }
          }
        });

        setBookings(newBookings);
      });

      return () => unsubscribe();
    };

    fetchBookings();
  }, []);

  const handleSlotClick = (slot) => {
    const today = new Date().toISOString().split('T')[0];
    setStartTime(`${today}T${slot.start}`);
    setEndTime(`${today}T${slot.end}`);
  };

  return (
    <div className="booking-container">
      <h1>Seminar Hall Booking</h1>
      <div className="grid-container">
        {seminarHalls.filter(hall => hall.name === loggedInDepartment).map((hall) => (
          <div key={hall.id} className="hall-section">
            <h2>{hall.name}</h2>
            <table className="booking-table">
              <thead>
                <tr>
                  <th>Time Slot</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => {
                  const isBooked = bookings[hall.id]?.includes(slot.id);
                  const canBook = hall.name === loggedInDepartment;

                  return (
                    <tr
                      key={slot.id}
                      className={slot.isBreak ? 'break-row' : ''}
                      style={{
                        cursor: isBooked || !canBook ? 'default' : 'pointer',
                        backgroundColor: isBooked ? '#ffcccc' : canBook ? '#ccffcc' : '#ccc',
                      }}
                    >
                      <td>{slot.time}</td>
                      <td>
                        {slot.isBreak ? (
                          'Break'
                        ) : isBooked ? (
                          'Booked'
                        ) : (
                          <button 
                            onClick={() => handleSlotClick(slot)} 
                            className="book-button"
                          >
                            Book
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <HallStatus selectedStartTime={selectedStartTime} selectedEndTime={selectedEndTime} />
    </div>
  );
};

export default HallBooking;
