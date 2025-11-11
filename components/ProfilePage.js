import React from 'react';
import { useAuth } from '../context/AuthContext';
import MyProfile from './MyProfile';
import FacultyProfile from './FacultyProfile';

const ProfilePage = () => {
  const { currentUser } = useAuth();
  const role = (currentUser?.profile?.type || currentUser?.type) || 'student';

  if (role === 'faculty') {
    return <FacultyProfile />;
  }
  if (role === 'student') {
    return <MyProfile />;
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <h2 className="text-3xl font-bold mb-2">My Profile</h2>
      <p className="text-muted-foreground">Your account role is not recognized. Please contact support.</p>
    </div>
  );
};

export default ProfilePage;