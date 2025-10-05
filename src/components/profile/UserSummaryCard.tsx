import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Edit, Save, LogOut, User, Crown } from 'lucide-react';

import { auth, db } from '../../firebase'; // Adjust path to your firebase config
import { doc, getDoc, setDoc } from "firebase/firestore";

interface UserSummaryCardProps {
  onLogout?: () => void;
}

interface UserData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  membershipTier: 'Free User' | 'Premium User';
}

export function UserSummaryCard({ onLogout }: UserSummaryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    membershipTier: 'Free User'
  });
  const [editData, setEditData] = useState<UserData>(userData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as UserData;
          setUserData(data);
          setEditData(data);
        } else {
          console.warn("No user profile found!");
          // Optionally, initialize user profile here or leave blank
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSave = async () => {
    setUserData(editData);
    setIsEditing(false);

    if (!auth.currentUser) return;

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(userDocRef, editData, { merge: true });
      // Optionally add success feedback here
    } catch (error) {
      console.error("Error updating profile: ", error);
      // Optionally add error feedback here
    }
  };

  const handleCancel = () => {
    setEditData(userData);
    setIsEditing(false);
  };

  const getInitials = () => {
    if (!userData.firstName || !userData.lastName) return '';
    return (userData.firstName[0] + userData.lastName[0]).toUpperCase();
  };

  const getTierColor = () => {
    return userData.membershipTier === 'Premium User' ? '#FFD700' : '#9CA3AF';
  };

  const getTierIcon = () => {
    return userData.membershipTier === 'Premium User' ? Crown : User;
  };

  if (loading) {
    return (
      <Card className="glass-card overflow-hidden p-6 text-white">
        Loading user profile...
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      {/* Gradient Header */}
      <div 
        className="p-6 pb-4"
        style={{ 
          background: 'linear-gradient(135deg, #302b63 0%, #0f0c29 100%)'
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <Avatar className="w-16 h-16 border-2 border-white/20">
              <AvatarFallback 
                className="text-xl font-semibold text-white"
                style={{ 
                  background: 'linear-gradient(135deg, #6c63ff 0%, #302b63 100%)'
                }}
              >
                {getInitials()}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div>
              <h2 className="text-2xl text-white font-semibold mb-1">
                {userData.firstName} {userData.lastName}
              </h2>
              <p className="text-neutral-text/80 mb-2">
                @{userData.username}
              </p>
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ 
                  borderColor: getTierColor(), 
                  color: getTierColor() 
                }}
              >
                {React.createElement(getTierIcon(), { className: "w-3 h-3 mr-1" })}
                {userData.membershipTier}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {!isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="bg-accent-teal hover:bg-accent-teal/90 text-white"
                  style={{ backgroundColor: 'var(--accent-teal)' }}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit Profile
                </Button>
                <Button
                  onClick={onLogout}
                  size="sm"
                  variant="outline"
                  className="border-error-red/30 text-error-red hover:bg-error-red hover:text-white"
                  style={{ borderColor: 'var(--error-red)', color: 'var(--error-red)' }}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  onClick={handleCancel}
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-neutral-text hover:border-error-red hover:text-error-red"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* User Details */}
      <div className="p-6 pt-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-username" className="text-neutral-text text-sm">
              Username
            </Label>
            <Input
              id="edit-username"
              value={isEditing ? editData.username : userData.username}
              onChange={(e) => setEditData({...editData, username: e.target.value})}
              disabled={!isEditing}
              className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60 disabled:opacity-60"
            />
          </div>

          <div>
            <Label htmlFor="edit-email" className="text-neutral-text text-sm">
              Email Address
            </Label>
            <Input
              id="edit-email"
              type="email"
              value={userData.email}
              disabled
              className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60 opacity-60"
            />
            <p className="text-xs text-neutral-text/60 mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <Label htmlFor="edit-firstName" className="text-neutral-text text-sm">
              First Name
            </Label>
            <Input
              id="edit-firstName"
              value={isEditing ? editData.firstName : userData.firstName}
              onChange={(e) => setEditData({...editData, firstName: e.target.value})}
              disabled={!isEditing}
              className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60 disabled:opacity-60"
            />
          </div>

          <div>
            <Label htmlFor="edit-lastName" className="text-neutral-text text-sm">
              Last Name
            </Label>
            <Input
              id="edit-lastName"
              value={isEditing ? editData.lastName : userData.lastName}
              onChange={(e) => setEditData({...editData, lastName: e.target.value})}
              disabled={!isEditing}
              className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60 disabled:opacity-60"
            />
          </div>
        </div>

        {isEditing && (
          <div className="mt-4 p-3 bg-accent-teal/10 border border-accent-teal/30 rounded-lg">
            <p className="text-sm text-neutral-text">
              <strong>Note:</strong> Changes will be saved to your profile. Make sure all information is accurate.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
