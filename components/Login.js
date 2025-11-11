"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Users, Eye, EyeOff, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        userType: 'student'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    const { login, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Check for success message from registration
    useEffect(() => {
        const message = searchParams?.get?.('message');
        if (message) {
            setSuccessMessage(message);
            const email = searchParams.get('email');
            if (email) setFormData(prev => ({ ...prev, email }));
            // optionally clear query params by replacing the URL without them
            try { router.replace('/login'); } catch (e) { /* ignore */ }
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        const { email, password, userType } = formData;

        const result = await login(email, password, userType);

        if (result.success) {
            // Redirect based on role or to profile for now
            const role = result.user?.profile?.type || userType;
            if (role === 'faculty') {
                router.replace('/faculty-dashboard');
            } else if (role === 'student') {
                router.replace('/profile');
            } else {
                router.replace('/');
            }
        } else {
            setError(result.error || 'Login failed');
        }
    };

    const handleDemoLogin = (userType) => {
        setFormData({
            email: userType === 'student' ? 'john.doe@university.edu' : 'sarah.wilson@university.edu',
            password: 'demo123',
            userType
        });
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Left Column - Branding */}
                <div className="login-branding">
                    <div className="login-brand-content">
                        <h1 className="login-title">ProfLink</h1>
                        <p className="login-tagline">
                            Connect with professors and students. <br />
                            Manage your consultations seamlessly.
                        </p>
                    </div>
                </div>

                {/* Right Column - Login Form */}
                <div className="login-form-section">
                    <div className="login-form-container">
                        {/* Success Message */}
                        {successMessage && (
                            <div className="alert alert-success">
                                <div className="alert-content">
                                    <CheckCircle className="alert-icon alert-icon-success" />
                                    <div>
                                        <span className="alert-text alert-text-success">{successMessage}</span>
                                        {location.state?.showEmailVerification && (
                                            <div className="email-verification-notice">
                                                <div className="email-verification-content">
                                                    <Mail className="email-icon" />
                                                    <span className="email-text">
                                                        📧 Check your email for verification link
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="alert alert-error">
                                <div className="alert-content">
                                    <AlertCircle className="alert-icon alert-icon-error" />
                                    <span className="alert-text alert-text-error">{error}</span>
                                </div>
                            </div>
                        )}                        {/* Login Form */}
                        <form onSubmit={handleLogin} className="login-form">
                            <input
                                name="email"
                                type="email"
                                placeholder="Email address"
                                className="login-input"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            
                            <div className="password-field">
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    className="login-input"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                                </button>
                            </div>

                            {/* User Type Selection */}
                            <div className="user-type-selection">
                                <label className={`user-type-option ${formData.userType === 'student' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="userType"
                                        value="student"
                                        checked={formData.userType === 'student'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <User className="option-icon" />
                                    Student
                                </label>
                                <label className={`user-type-option ${formData.userType === 'faculty' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="userType"
                                        value="faculty"
                                        checked={formData.userType === 'faculty'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <Users className="option-icon" />
                                    Faculty
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="login-submit-btn"
                            >
                                {loading ? (
                                    <div className="loading-content">
                                        <div className="loading-spinner"></div>
                                        Logging in...
                                    </div>
                                ) : (
                                    'Log In'
                                )}
                            </button>

                            <Link href="/forgot-password" className="forgot-link">
                                Forgotten password?
                            </Link>
                        </form>

                        <div className="form-divider"></div>

                        {/* Create Account Button */}
                        <Link href="/register" className="create-account-btn">
                            Create New Account
                        </Link>

                        {/* Demo Access */}
                        <div className="demo-section">
                            <p className="demo-text">Quick Demo Access:</p>
                            <div className="demo-buttons">
                                <button
                                    type="button"
                                    onClick={() => handleDemoLogin('student')}
                                    className="demo-btn"
                                >
                                    <User className="option-icon" />
                                    Student Demo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDemoLogin('faculty')}
                                    className="demo-btn"
                                >
                                    <Users className="option-icon" />
                                    Faculty Demo
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="login-footer">
                        <p className="terms-text">
                            I agree to the <strong>Terms & Conditions</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;