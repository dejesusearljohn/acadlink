"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { User, Users, Eye, EyeOff, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { RegisterFormData } from '../types';

const CreateAccount: React.FC = () => {
    const [formData, setFormData] = useState<RegisterFormData>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        userType: 'student'
    });
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [emailVerificationSent, setEmailVerificationSent] = useState<boolean>(false);
    
    const { register } = useAuth();
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError('');
        if (success) setSuccess('');
    };

    const validateForm = (): boolean => {
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields');
            return false;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError('');
        setSuccess('');

        const { firstName, lastName, email, password, userType } = formData;

        const result = await register({
            firstName,
            lastName,
            email,
            password,
            userType,
        });

        if (result.success) {
            setSuccess('Account created! Please verify your email to continue.');
            setEmailVerificationSent(true);
            const msg = encodeURIComponent('Account created successfully! Please verify your email before logging in.');
            const q = `/login?message=${msg}&showEmailVerification=true&email=${encodeURIComponent(email)}`;
            router.replace(q);
        } else {
            setError(result.error || 'Failed to create account');
        }

        setLoading(false);
    };

    return (
        <div className="bg-facebook-bg">
            <div className="facebook-container">
                <div className="facebook-branding">
                    <div className="facebook-brand-content">
                        <Image 
                            src="/AcadLinkLogo.png" 
                            alt="AcadLink" 
                            width={300} 
                            height={300} 
                            className="facebook-logo" 
                            priority
                        />
                        <p className="facebook-tagline">
                            Join our community. <br />
                            Connect with professors and students today.
                        </p>
                    </div>
                </div>

                <div className="facebook-form-section">
                    <div className="facebook-form-container">
                        <h2 className="create-account-title">Create New Account</h2>
                        
                        {success && (
                            <div className="alert alert-success">
                                <div className="alert-content">
                                    <CheckCircle className="alert-icon" />
                                    <span className="alert-message">{success}</span>
                                </div>
                                {emailVerificationSent && (
                                    <p className="alert-note">
                                        📧 Please check your email for verification link before logging in.
                                    </p>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-error">
                                <div className="alert-content">
                                    <AlertCircle className="alert-icon" />
                                    <span className="alert-message">{error}</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="facebook-form">
                            <div className="name-fields">
                                <input
                                    name="firstName"
                                    type="text"
                                    placeholder="First name"
                                    className="facebook-input"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                />
                                <input
                                    name="lastName"
                                    type="text"
                                    placeholder="Last name"
                                    className="facebook-input"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <input
                                name="email"
                                type="email"
                                placeholder="Email address"
                                className="facebook-input"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            
                            <div className="facebook-password-container">
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password (6+ characters)"
                                    className="facebook-input"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="facebook-password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                                </button>
                            </div>

                            <div className="facebook-password-container">
                                <input
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Confirm password"
                                    className="facebook-input"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="facebook-password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                                </button>
                            </div>

                            <div className="facebook-user-type">
                                <label className={`facebook-user-option ${formData.userType === 'student' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="userType"
                                        value="student"
                                        checked={formData.userType === 'student'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <User className="user-type-icon" />
                                    Student
                                </label>
                                <label className={`facebook-user-option ${formData.userType === 'faculty' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="userType"
                                        value="faculty"
                                        checked={formData.userType === 'faculty'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <Users className="user-type-icon" />
                                    Faculty
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !!success}
                                className={`facebook-login-btn ${success ? 'btn-success' : ''}`}
                            >
                                {loading ? (
                                    <div className="btn-loading">
                                        <div className="loading-spinner"></div>
                                        Creating Account...
                                    </div>
                                ) : success ? (
                                    <div className="btn-success-content">
                                        <CheckCircle className="btn-icon" />
                                        Account Created! Redirecting...
                                    </div>
                                ) : (
                                    <>
                                        Create Account
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="facebook-divider"></div>

                        {!success && (
                            <div className="login-redirect">
                                <p className="redirect-text">Already have an account?</p>
                                <Link href="/login" className="facebook-create-btn">
                                    Back to Login
                                </Link>
                            </div>
                        )}

                        {success && (
                            <div className="login-redirect">
                                <p className="redirect-text success-text">Ready to get started?</p>
                                <Link href="/login" className="facebook-create-btn btn-success">
                                    Go to Login
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="facebook-footer">
                        <p className="facebook-create-page">
                            By signing up, you agree to our <strong>Terms & Conditions</strong> and <strong>Privacy Policy</strong>
                        </p>
                        {success && (
                            <div className="firebase-notice">
                                <p className="firebase-text">
                                    🔥 Your account is being created with Firebase Authentication and Firestore!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateAccount;
