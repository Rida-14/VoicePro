import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Lock, Bell, Palette, Globe, Shield,
  Trash2, Save, Edit2, Camera, ChevronRight, Eye, EyeOff, X,
  Volume2, Mic
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, updateProfile, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    profile_picture: user?.profile_picture || null,
  });

  // Sync profile data when AuthContext user finishes loading from backend
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        profile_picture: user.profile_picture || null,
      });
      setSettings(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          focusSounds: user.focus_sounds ?? true,
          voiceFeedback: user.voice_feedback ?? true,
          taskReminders: user.task_reminders ?? true,
        },
        appearance: {
          ...prev.appearance,
          theme: user.theme || 'dark',
          language: user.language || 'en',
        }
      }));
    }
  }, [user]);

  const fileInputRef = useRef(null);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Delete Account Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const [settings, setSettings] = useState({
    notifications: {
      focusSounds: user?.focus_sounds ?? true,
      voiceFeedback: user?.voice_feedback ?? true,
      taskReminders: user?.task_reminders ?? true,
      weeklyReport: true
    },
    appearance: {
      theme: user?.theme || 'dark',
      language: user?.language || 'en'
    },
    privacy: { profilePublic: false, showActivity: true },
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(profileData);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error("Passwords do not match!");
    }
    if (passwordData.newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    setLoading(true);
    try {
      await api.put('/auth/password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      toast.success("Password successfully updated!");
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
    setDeletePassword('');
    setShowDeletePassword(false);
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm account deletion.');
      return;
    }

    setLoading(true);
    try {
      await api.delete('/auth/account', {
        data: { password: deletePassword }
      });
      toast.success("Account permanently deleted.");
      setShowDeleteModal(false);
      logout();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete account. Incorrect password?");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingToggle = async (category, setting, explicitValue = null) => {
    const newValue = explicitValue !== null ? explicitValue : !settings[category][setting];

    // Update local state immediately for UI snappiness
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], [setting]: newValue },
    }));

    // Determine the field name for backend
    let backendField = null;
    if (category === 'notifications') {
      const mapping = {
        focusSounds: 'focus_sounds',
        voiceFeedback: 'voice_feedback',
        taskReminders: 'task_reminders'
      };
      backendField = mapping[setting];
    } else if (category === 'appearance') {
      backendField = setting; // 'theme' or 'language'
    }

    if (backendField) {
      try {
        await updateProfile({ [backendField]: newValue });
      } catch (error) {
        toast.error("Failed to save preference");
        // Revert on failure
        setSettings(prev => ({
          ...prev,
          [category]: { ...prev[category], [setting]: explicitValue !== null ? settings[category][setting] : !newValue },
        }));
      }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return toast.error('Image size should be less than 2MB');
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, profile_picture: reader.result });
        setIsEditing(true); // Auto-trigger edit mode so they know they have to save
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setProfileData({ ...profileData, profile_picture: null });
    setIsEditing(true); // Auto-trigger edit mode so they know they have to save
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, desc: 'Personal details' },
    { id: 'security', label: 'Security', icon: Shield, desc: 'Password & protection' },
  ];

  // Spring animation for tab content
  const contentVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: {
      opacity: 1, y: 0, scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    },
    exit: { opacity: 0, y: -15, scale: 0.98, transition: { duration: 0.2 } }
  };

  return (
    <div className="profile-page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-left">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account preferences and security.</p>
        </div>
      </motion.div>

      <div className="profile-container">

        {/* Box Structure Sidebar */}
        <motion.div
          className="settings-sidebar"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="tab-icon-wrapper">
                  <Icon size={20} />
                </div>
                <div className="tab-text">
                  <span className="tab-label">{tab.label}</span>
                  <span className="tab-desc">{tab.desc}</span>
                </div>
                {isActive && <ChevronRight size={16} className="tab-arrow" />}
              </button>
            );
          })}
        </motion.div>

        {/* Box Structure Content Area */}
        <div className="settings-content">
          <AnimatePresence mode="wait">

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div key="profile" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="settings-pane glass-box">
                <div className="pane-header">
                  <div>
                    <h2 className="pane-title">Profile Information</h2>
                    <p className="pane-subtitle">Update your personal details here.</p>
                  </div>
                  {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="btn-minimal">
                      <Edit2 size={16} /> Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleProfileUpdate}>
                  <div className="avatar-section">
                    <div className="avatar-container">
                      {profileData.profile_picture ? (
                        <img
                          src={profileData.profile_picture}
                          alt="Profile"
                          className="avatar-circle"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="avatar-circle">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/jpeg, image/png, image/webp"
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        className="avatar-overlay"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera size={20} />
                      </button>
                    </div>
                    <div className="avatar-text">
                      <h3>Profile Photo</h3>
                      <p>Recommended: Square JPG, PNG. Max 2MB.</p>
                      {profileData.profile_picture && isEditing && (
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={handleRemovePhoto}
                          style={{
                            marginTop: '12px',
                            padding: '6px 14px',
                            fontSize: '0.85rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: 'var(--radius-md)'
                          }}
                        >
                          <Trash2 size={14} style={{ marginRight: '6px' }} /> Remove Photo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="setting-card form-card">
                      <label className="input-label">Full Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        disabled={!isEditing}
                        className="refined-input"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="setting-card form-card">
                      <label className="input-label">Email Address</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        disabled={!isEditing}
                        className="refined-input"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="form-actions">
                      <button type="button" onClick={() => setIsEditing(false)} className="btn-ghost">Cancel</button>
                      <button type="submit" className="btn-primary-solid" disabled={loading}>
                        Save Changes
                      </button>
                    </motion.div>
                  )}
                </form>
              </motion.div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <motion.div key="security" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="settings-pane glass-box">
                <div className="pane-header">
                  <div>
                    <h2 className="pane-title">Security</h2>
                    <p className="pane-subtitle">Manage your password and protection.</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange}>
                  <div className="setting-card form-card mb-md">
                    <label className="input-label">Current Password</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="refined-input"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="setting-card form-card">
                      <label className="input-label">New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="refined-input"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="setting-card form-card">
                      <label className="input-label">Confirm Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="refined-input"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-actions mt-lg">
                    <button type="submit" className="btn-primary" disabled={loading}>
                      <Lock size={16} /> Update Password
                    </button>
                  </div>
                </form>

                <div className="divider" />

                <div className="danger-card">
                  <div className="danger-text">
                    <h3>Delete Account</h3>
                    <p>Permanently remove your account and all of its contents. This action is not reversible.</p>
                  </div>
                  <button type="button" className="btn-danger" onClick={handleDeleteAccount} disabled={loading}>
                    <Trash2 size={16} /> Delete Account
                  </button>
                </div>
              </motion.div>
            )}


          </AnimatePresence>
        </div>
      </div>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-container"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
            >
              <div className="modal-header">
                <div>
                  <h2 style={{ color: 'var(--red)' }}>Delete Account</h2>
                  <p className="modal-subtitle">Permanently delete your account and all data.</p>
                </div>
                <button onClick={() => setShowDeleteModal(false)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>

              <div className="form-card" style={{ marginBottom: '24px' }}>
                <label className="input-label">Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showDeletePassword ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="refined-input"
                    placeholder="Enter your current password"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                  >
                    {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAccount}
                  className="btn-danger"
                  disabled={loading || !deletePassword}
                >
                  <Trash2 size={16} /> Confirm Deletion
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;