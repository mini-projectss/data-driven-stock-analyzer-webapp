import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Edit, Save, LogOut, User } from 'lucide-react';

interface UserProfileProps {
  onLogout?: () => void;
}

export function UserProfile({ onLogout }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    username: 'john_trader',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe'
  });
  const [editData, setEditData] = useState(userData);

  const handleSave = () => {
    setUserData(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(userData);
    setIsEditing(false);
  };

  const getInitials = () => {
    return (userData.firstName[0] + userData.lastName[0]).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="glass-card p-6">
        <div className="flex items-center space-x-6">
          {/* Avatar */}
          <Avatar className="w-20 h-20">
            <AvatarFallback 
              className="text-2xl font-semibold text-white"
              style={{ 
                background: 'linear-gradient(135deg, #6c63ff 0%, #302b63 100%)'
              }}
            >
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1">
            <h1 className="text-3xl text-white font-semibold mb-2">
              User Profile
            </h1>
            <p className="text-neutral-text/80">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {!isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={onLogout}
                  variant="outline"
                  className="border-error-red/30 text-error-red hover:bg-error-red hover:text-white"
                  style={{ borderColor: 'var(--error-red)', color: 'var(--error-red)' }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="border-white/20 text-neutral-text hover:border-error-red hover:text-error-red"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* User Details */}
      <Card className="glass-card p-6">
        <h2 className="text-xl text-white font-semibold mb-6">
          Account Information
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-neutral-text">
                Username
              </Label>
              <Input
                id="username"
                value={isEditing ? editData.username : userData.username}
                onChange={(e) => setEditData({...editData, username: e.target.value})}
                disabled={!isEditing}
                className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60 disabled:opacity-60"
              />
            </div>

            <div>
              <Label htmlFor="firstName" className="text-neutral-text">
                First Name
              </Label>
              <Input
                id="firstName"
                value={isEditing ? editData.firstName : userData.firstName}
                onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                disabled={!isEditing}
                className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-neutral-text">
                Email Address
              </Label>
              <Input
                id="email"
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
              <Label htmlFor="lastName" className="text-neutral-text">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={isEditing ? editData.lastName : userData.lastName}
                onChange={(e) => setEditData({...editData, lastName: e.target.value})}
                disabled={!isEditing}
                className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 p-4 bg-accent-teal/10 border border-accent-teal/30 rounded-lg">
            <p className="text-sm text-neutral-text">
              <strong>Note:</strong> Changes will be saved to your profile. Make sure all information is accurate.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}